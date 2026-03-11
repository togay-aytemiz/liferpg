// supabase/functions/generate-quests/index.ts
// Edge Function: Generate personalized quests from user's life rhythm.
//
// Called after onboarding or when user updates their life rhythm in Settings.
// Flow:
//   1. Frontend sends { life_rhythm: string }
//   2. We call OpenAI to analyze the text and generate quests
//   3. We insert the generated quests into the `quests` table
//   4. We return the generated quests to the frontend
//
// Auth: Requires valid Supabase JWT (user must be logged in)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI, validateQuestResponse } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { buildRecentQuestBehaviorContext } from "../_shared/recentQuestBehavior.ts";
import { dedupeDailyPool, dedupeQuestPoolByTitle, getLatestQuestBatch } from "../../../src/lib/dailyPool.ts";
import { getQuestGoldReward } from "../../../src/lib/questEconomy.ts";

const MIN_GENERATED_BATCH_SIZE = 7;
const PROFILE_SYNC_GRACE_MS = 2_000;
const DAILY_POOL_LIMIT = 7;
const SIDE_QUEST_LIMIT = 2;
const CHAIN_QUEST_LIMIT = 3;

function getActiveDailyLimit(poolSize: number): number {
    if (poolSize <= 0) return 0;
    if (poolSize <= 3) return poolSize;
    return Math.min(Math.max(poolSize - 2, 3), 5);
}

const SYSTEM_PROMPT = `You are a game master for LifeRPG, a gamified productivity app.

Your job is to analyze a user's daily routine description and generate personalized quests.

You MUST return valid JSON with this exact structure:
{
  "daily_quests": [
    {
      "title": "Quest title (short, action-oriented)",
      "description": "Brief encouraging description",
      "quest_type": "daily",
      "difficulty": "easy" | "medium" | "hard",
      "xp_reward": number (10-30),
      "stat_affected": "strength" | "knowledge" | "wealth" | "adventure" | "social",
      "stat_points": number (1-3)
    }
  ],
  "side_quests": [
    {
      "title": "...",
      "description": "...",
      "quest_type": "side",
      "difficulty": "easy" | "medium",
      "xp_reward": number (5-15),
      "stat_affected": "...",
      "stat_points": 1
    }
  ],
  "boss_quest": {
    "title": "A big weekly challenge based on their goals",
    "description": "Epic description",
    "quest_type": "boss",
    "difficulty": "hard" | "epic",
    "xp_reward": number (80-150),
    "stat_affected": "...",
    "stat_points": number (3-5)
  },
  "chain_quests": [
    {
      "title": "Follow-up step title (natural continuation of boss quest)",
      "description": "...",
      "quest_type": "boss",
      "difficulty": "hard" | "epic",
      "xp_reward": number (60-120),
      "stat_affected": "...",
      "stat_points": number (2-4)
    }
  ]
}

Rules:
- Generate 5-7 daily quests as a SMALL weekly pool based on the user's routine
- The first daily quests in the array should be the best fit for TODAY; later ones should feel like alternate dailies for the next few days
- Daily quests MUST be distinct from each other. Do not return duplicate or near-duplicate micro-actions in the same weekly pool
- Spread the daily pool across multiple life areas/stats when the user's routine allows it
- If it does not conflict with dislikes or the described routine, include at least one knowledge-oriented daily (reading, studying, learning, language practice, etc.)
- Generate 1-2 fun side quests for variety
- Side quests MUST also be distinct from each other. Do not return duplicate or near-duplicate optional quests
- Generate 1 boss quest as a weekly challenge
- Generate 2-3 chain_quests that form a QUEST CHAIN with the boss quest:
  - Each chain quest is a progressively harder continuation of the boss quest
  - Think of it as chapters in a story: Step 1 (boss_quest) → Step 2 → Step 3 → Step 4
  - The boss_quest is the ONLY current weekly boss the user should see right away
  - chain_quests are FUTURE weekly chapters, not simultaneous active bosses
  - Each step should escalate in difficulty and ambition
  - Example: "Run 2km" → "Run 5km" → "Run 10km race"
  - Chain quests start LOCKED (inactive) and unlock as the user completes each step
- Keep the user's ACTIVE list small and game-like. Do not create an overwhelming wall of chores.
- Match activities to the correct stat category:
  - Exercise/fitness → strength
  - Reading/learning/studying → knowledge
  - Work/career/finance → wealth
  - Travel/new experiences/creativity → adventure
  - Social events/networking/relationships → social
- Make quests specific to what the user described, not generic
- Quest titles should be concise and action-oriented (like RPG quest names)
- XP rewards should match difficulty
- Keep the tone motivating and RPG-themed
- IMPORTANT CONTEXT AVOIDANCE: If the user provides 'active_habits', DO NOT generate Daily or Side quests that perfectly match these existing habits. Generate complementary or entirely new quests instead.
- IMPORTANT RECENT MEMORY: If the prompt includes recent app-day behavior, treat it as a hard anti-repetition signal. Avoid recently skipped/disliked patterns, and avoid reusing the same daily titles from the recent generated history unless there is no stronger alternative.`;

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createSupabaseClient(authHeader);

        // Get current user
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const { life_rhythm, active_habits } = await req.json();
        if (!life_rhythm || typeof life_rhythm !== "string") {
            return new Response(
                JSON.stringify({ error: "life_rhythm is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch preferences/profile snapshot first so we can decide whether a recent quest
        // batch still matches the user's current onboarding state.
        const { data: profile } = await supabase
            .from("profiles")
            .select("likes, dislikes, focus_areas, updated_at")
            .eq("id", user.id)
            .single();

        const profileUpdatedAtMs = profile?.updated_at
            ? new Date(profile.updated_at).getTime()
            : 0;

        // Reuse the latest generated onboarding batch to avoid duplicate OpenAI cost
        // when the loading screen remounts or the request is replayed.
        const { data: latestAiQuests, error: latestAiQuestsError } = await supabase
            .from("quests")
            .select("id, title, description, quest_type, difficulty, xp_reward, gold_reward, stat_affected, stat_points, is_active, is_ai_generated, is_custom, chain_id, chain_step, chain_total, created_at, updated_at")
            .eq("user_id", user.id)
            .eq("is_ai_generated", true)
            .eq("is_custom", false)
            .order("created_at", { ascending: false })
            .limit(20);

        if (latestAiQuestsError) {
            console.warn("Failed to read latest AI quests before generation:", latestAiQuestsError.message);
        } else if ((latestAiQuests?.length ?? 0) > 0) {
            const newestCreatedAt = new Date(latestAiQuests![0].created_at).getTime();
            const recentBatch = getLatestQuestBatch(latestAiQuests!)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const batchMatchesCurrentProfile = newestCreatedAt >= (profileUpdatedAtMs - PROFILE_SYNC_GRACE_MS);

            if (recentBatch.length >= MIN_GENERATED_BATCH_SIZE && batchMatchesCurrentProfile) {
                const bossCount = recentBatch.filter((quest) =>
                    quest.quest_type === "boss" && (quest.chain_step === null || quest.chain_step === 1)
                ).length;
                const chainCount = recentBatch.filter((quest) =>
                    typeof quest.chain_step === "number" && quest.chain_step > 1
                ).length;

                return new Response(
                    JSON.stringify({
                        success: true,
                        quests: recentBatch,
                        summary: {
                            daily: dedupeDailyPool(recentBatch.filter((quest) => quest.quest_type === "daily")).length,
                            side: recentBatch.filter((quest) => quest.quest_type === "side").length,
                            boss: bossCount,
                            chain: chainCount,
                        },
                        reused_existing: true,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        const likesText = profile?.likes ? `\nWhat I LIKE/ENJOY: ${profile.likes}` : "";
        const dislikesText = profile?.dislikes ? `\nWhat I HATE/DISLIKE (AVOID THESE): ${profile.dislikes}` : "";
        const focusText = profile?.focus_areas ? `\nMy FOCUS AREAS to improve: ${profile.focus_areas}` : "";
        const habitsFromRequest = Array.isArray(active_habits) ? active_habits.slice(0, 20) : [];

        const { data: activeHabitsFromDb } = habitsFromRequest.length === 0
            ? await supabase
                .from("habits")
                .select("title, frequency")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .limit(20)
            : { data: null };

        const resolvedActiveHabits = habitsFromRequest.length > 0 ? habitsFromRequest : (activeHabitsFromDb ?? []);

        const habitsContext = resolvedActiveHabits.length > 0
            ? `\n\nI ALREADY HAVE THESE HABITS (Do NOT give me quests for these): ${resolvedActiveHabits
                .map((habit: unknown) => {
                    const h = habit as Record<string, unknown>;
                    const title = typeof h.title === "string" ? h.title : "Unnamed";
                    const frequency = typeof h.frequency === "string" ? h.frequency : "daily";
                    return `${title} (${frequency})`;
                })
                .join(", ")}`
            : "";

        const { context: recentBehaviorContext } = await buildRecentQuestBehaviorContext(supabase as any, user.id, { appDays: 7 });

        // Call OpenAI to generate quests
        const aiResponse = await callOpenAI(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Here is my daily routine:\n\n${life_rhythm}${likesText}${dislikesText}${focusText}${habitsContext}${recentBehaviorContext}\n\nPlease generate quests highly tailored to this routine, my focus areas, my likes, and my recent real behavior. Strictly AVOID what I hate, what I recently skipped, and stale repetitions of the same daily titles. Feel free to occasionally include meaningful "Avoidance/Negative" goals (e.g., "Do not smoke", "Less than 1 hour on social media") that test my willpower (usually boosting Strength).` },
            ],
            {
                model: "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: "json_object" },
            }
        );

        // Parse and VALIDATE the AI-generated quests (whitelists fields)
        const generatedQuests = validateQuestResponse(aiResponse);
        const dailyQuestPool = dedupeDailyPool(generatedQuests.daily_quests).slice(0, DAILY_POOL_LIMIT);
        const activeDailyCount = getActiveDailyLimit(dailyQuestPool.length);
        const sideQuests = dedupeQuestPoolByTitle(generatedQuests.side_quests).slice(0, SIDE_QUEST_LIMIT);

        // Generate a chain_id for boss + chain quests
        const chainId = crypto.randomUUID();
        const chainQuests = (generatedQuests.chain_quests || []).slice(0, CHAIN_QUEST_LIMIT);
        const chainTotal = 1 + chainQuests.length; // boss = step 1

        // Prepare quests for database insertion — only known columns
        const allQuests = [
            ...dailyQuestPool.map((q, index) => ({
                title: q.title,
                description: q.description,
                quest_type: q.quest_type,
                difficulty: q.difficulty,
                xp_reward: q.xp_reward,
                stat_affected: q.stat_affected,
                stat_points: q.stat_points,
                user_id: user.id,
                is_ai_generated: true,
                is_active: index < activeDailyCount,
                gold_reward: getQuestGoldReward(q.quest_type, q.difficulty),
            })),
            ...sideQuests.map(q => ({
                title: q.title,
                description: q.description,
                quest_type: q.quest_type,
                difficulty: q.difficulty,
                xp_reward: q.xp_reward,
                stat_affected: q.stat_affected,
                stat_points: q.stat_points,
                user_id: user.id,
                is_ai_generated: true,
                is_active: true,
                gold_reward: getQuestGoldReward(q.quest_type, q.difficulty),
            })),
            // Boss quest = chain step 1 (active)
            {
                title: generatedQuests.boss_quest.title,
                description: generatedQuests.boss_quest.description,
                quest_type: generatedQuests.boss_quest.quest_type,
                difficulty: generatedQuests.boss_quest.difficulty,
                xp_reward: generatedQuests.boss_quest.xp_reward,
                stat_affected: generatedQuests.boss_quest.stat_affected,
                stat_points: generatedQuests.boss_quest.stat_points,
                user_id: user.id,
                is_ai_generated: true,
                is_active: true,
                gold_reward: getQuestGoldReward(generatedQuests.boss_quest.quest_type, generatedQuests.boss_quest.difficulty),
                chain_id: chainTotal > 1 ? chainId : null,
                chain_step: chainTotal > 1 ? 1 : null,
                chain_total: chainTotal > 1 ? chainTotal : null,
            },
            // Chain follow-up quests (step 2, 3, ... — start LOCKED)
            ...chainQuests.map((q, i: number) => ({
                title: q.title || `Chain Step ${i + 2}`,
                description: q.description || "",
                quest_type: 'boss',
                difficulty: q.difficulty || "hard",
                xp_reward: Number(q.xp_reward) || 80,
                stat_affected: q.stat_affected || generatedQuests.boss_quest.stat_affected,
                stat_points: Number(q.stat_points) || 3,
                user_id: user.id,
                is_ai_generated: true,
                is_active: false, //  LOCKED until previous step completed
                gold_reward: getQuestGoldReward('boss', (q.difficulty || "hard") as "easy" | "medium" | "hard" | "epic"),
                chain_id: chainId,
                chain_step: i + 2,
                chain_total: chainTotal,
            })),
        ];

        // Insert quests into database
        const { data: insertedQuests, error: insertError } = await supabase
            .from("quests")
            .insert(allQuests)
            .select();

        if (insertError) {
            console.error("Quest insert error:", insertError);
            return new Response(
                JSON.stringify({ error: "Failed to save quests", details: insertError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Also initialize streak record for this user if not exists
        await supabase
            .from("streaks")
            .upsert({ user_id: user.id, current_streak: 0, longest_streak: 0, xp_multiplier: 1.0 },
                { onConflict: "user_id" }
            );

        return new Response(
            JSON.stringify({
                success: true,
                quests: insertedQuests,
                summary: {
                    daily: dailyQuestPool.length,
                    side: sideQuests.length,
                    boss: 1,
                    chain: chainQuests.length,
                },
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("generate-quests error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
