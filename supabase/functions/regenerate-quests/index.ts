// supabase/functions/regenerate-quests/index.ts
// Edge Function: Regenerate quests when user updates their Life Rhythm in Settings.
//
// Flow:
//   1. Read current context and previous quest history
//   2. Call OpenAI to generate new quests
//   3. Insert newly generated quests
//   4. Deactivate old auto-generated quests only after successful insertion
//
// Auth: Requires valid Supabase JWT

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI, validateQuestResponse } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { getQuestGoldReward } from "../../../src/lib/questEconomy.ts";

const DAILY_POOL_LIMIT = 7;
const SIDE_QUEST_LIMIT = 2;
const CHAIN_QUEST_LIMIT = 3;

function getActiveDailyLimit(poolSize: number): number {
    if (poolSize <= 0) return 0;
    if (poolSize <= 3) return poolSize;
    return Math.min(Math.max(poolSize - 2, 3), 5);
}

const SYSTEM_PROMPT = `You are a game master for LifeRPG, a gamified productivity app.

The user is updating their life rhythm. You need to generate NEW personalized quests.

You will receive:
1. Their updated daily routine description
2. (Optional) A summary of quests they previously completed, so you can build on their progress

You MUST return valid JSON with this exact structure:
{
  "daily_quests": [
    {
      "title": "Quest title",
      "description": "Brief description",
      "quest_type": "daily",
      "difficulty": "easy" | "medium" | "hard",
      "xp_reward": number (10-30),
      "stat_affected": "strength" | "knowledge" | "wealth" | "adventure" | "social",
      "stat_points": number (1-3)
    }
  ],
  "side_quests": [...],
  "boss_quest": {
    "title": "...",
    "description": "...",
    "quest_type": "boss",
    "difficulty": "hard" | "epic",
    "xp_reward": number (80-150),
    "stat_affected": "...",
    "stat_points": number (3-5)
  },
  "chain_quests": [
    {
      "title": "Follow-up step title",
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
- Generate 5-7 daily quests as a SMALL weekly pool
- The first daily quests in the array should be the best fit for TODAY; later ones should feel like alternate dailies for the next few days
- Generate 1-2 side quests and 1 boss quest
- Generate 2-3 chain_quests that form a QUEST CHAIN with the boss quest:
  - Each chain quest is a progressively harder continuation of the boss quest
  - Think of it as chapters in a story: Step 1 (boss_quest) → Step 2 → Step 3 → Step 4
  - The boss_quest is the ONLY current weekly boss the user should see right away
  - chain_quests are FUTURE weekly chapters, not simultaneous active bosses
  - Chain quests start LOCKED (inactive) and unlock as the user completes each step
- If the user has completed quests before, make new quests slightly more challenging or varied
- If the user has SKIPPED/DISLIKED certain quests, do NOT generate similar ones
- Keep the user's ACTIVE list small and game-like. Do not create an overwhelming wall of chores.
- Match activities to stats: exercise→strength, reading→knowledge, work→wealth, travel→adventure, social→social
- Keep titles concise and RPG-themed
- IMPORTANT CONTEXT AVOIDANCE: If the user provides 'active_habits', DO NOT generate Daily or Side quests that perfectly match these existing habits. Generate complementary or entirely new quests instead.`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createSupabaseClient(authHeader);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { life_rhythm, active_habits } = await req.json();
        if (!life_rhythm || typeof life_rhythm !== "string") {
            return new Response(
                JSON.stringify({ error: "life_rhythm is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Track current active auto-generated quests (exclude custom quests)
        const { data: oldAiQuests, error: oldAiQuestError } = await supabase
            .from("quests")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_ai_generated", true)
            .eq("is_custom", false)
            .eq("is_active", true);

        if (oldAiQuestError) {
            return new Response(
                JSON.stringify({ error: "Failed to read existing quests", details: oldAiQuestError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const oldAiQuestIds = (oldAiQuests ?? []).map((q: { id: string }) => q.id);

        // 3. Fetch completed quest history for context
        const { data: completedQuests } = await supabase
            .from("user_quests")
            .select("quest_id, quests(title, quest_type)")
            .eq("user_id", user.id)
            .eq("is_completed", true)
            .limit(20);

        const historyContext = completedQuests && completedQuests.length > 0
            ? `\n\nPreviously completed quests: ${completedQuests.map((q: Record<string, unknown>) => {
                const quest = q.quests as Record<string, string> | null;
                return quest?.title ?? "Unknown";
            }).join(", ")}`
            : "";

        // 3b. Fetch skipped/disliked quests for negative feedback
        const { data: skippedQuests } = await supabase
            .from("user_quests")
            .select("quest_id, skip_reason, quests(title, quest_type, stat_affected)")
            .eq("user_id", user.id)
            .eq("is_completed", false)
            .limit(20);

        const skipContext = skippedQuests && skippedQuests.length > 0
            ? `\n\nQuests the user SKIPPED/DISLIKED (avoid similar ones): ${skippedQuests.map((q: Record<string, unknown>) => {
                const quest = q.quests as Record<string, string> | null;
                const reasonStr = q.skip_reason ? `(Reason skipped: ${q.skip_reason})` : "";
                return `${quest?.title ?? "Unknown"} ${reasonStr}`.trim();
            }).join(" | ")}`
            : "";

        // 3c. Fetch preferences from profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("likes, dislikes, focus_areas")
            .eq("id", user.id)
            .single();

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

        // 4. Call OpenAI
        const aiResponse = await callOpenAI(
            [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Here is my updated daily routine:\n\n${life_rhythm}${likesText}${dislikesText}${focusText}${historyContext}${skipContext}${habitsContext}\n\nPlease generate quests highly tailored to my routine, my focus areas, and my likes. Strictly AVOID what I hate! Feel free to occasionally include meaningful "Avoidance/Negative" goals (e.g., "Do not smoke", "Less than 1 hour on social media") that test my willpower (usually boosting Strength).`,
                },
            ],
            {
                model: "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: "json_object" },
            }
        );

        const generatedQuests = validateQuestResponse(aiResponse);
        const dailyQuestPool = generatedQuests.daily_quests.slice(0, DAILY_POOL_LIMIT);
        const activeDailyCount = getActiveDailyLimit(dailyQuestPool.length);
        const sideQuests = generatedQuests.side_quests.slice(0, SIDE_QUEST_LIMIT);

        // Generate a chain_id for boss + chain quests
        const chainId = crypto.randomUUID();
        const chainQuests = (generatedQuests.chain_quests || []).slice(0, CHAIN_QUEST_LIMIT);
        const chainTotal = 1 + chainQuests.length; // boss = step 1

        // 5. Insert new quests — explicit field mapping, no raw AI spread
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

        const { data: insertedQuests, error: insertError } = await supabase
            .from("quests")
            .insert(allQuests)
            .select();

        if (insertError) {
            return new Response(
                JSON.stringify({ error: "Failed to save quests", details: insertError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update life rhythm and deactivate old generated quests after successful insert.
        const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update({ life_rhythm })
            .eq("id", user.id);

        if (profileUpdateError) {
            console.warn("Failed to update life_rhythm during regeneration:", profileUpdateError.message);
        }

        if (oldAiQuestIds.length > 0) {
            const { error: deactivateError } = await supabase
                .from("quests")
                .update({ is_active: false })
                .in("id", oldAiQuestIds);

            if (deactivateError) {
                console.warn("Failed to deactivate old quests after regeneration:", deactivateError.message);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                quests: insertedQuests,
                summary: {
                    daily: generatedQuests.daily_quests.length,
                    side: generatedQuests.side_quests.length,
                    boss: 1,
                    chain: chainQuests.length,
                },
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("regenerate-quests error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
