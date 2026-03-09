// supabase/functions/regenerate-quests/index.ts
// Edge Function: Regenerate quests when user updates their Life Rhythm in Settings.
//
// Flow:
//   1. Deactivate all existing AI-generated quests for this user
//   2. Update the user's life_rhythm in their profile
//   3. Call OpenAI to generate new quests based on the updated text
//   4. Optionally include completed quest history for smarter generation
//
// Auth: Requires valid Supabase JWT

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI, validateQuestResponse } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

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
  }
}

Rules:
- Generate 4-6 daily quests, 2-3 side quests, 1 boss quest
- If the user has completed quests before, make new quests slightly more challenging or varied
- If the user has SKIPPED/DISLIKED certain quests, do NOT generate similar ones
- Match activities to stats: exercise→strength, reading→knowledge, work→wealth, travel→adventure, social→social
- Keep titles concise and RPG-themed`;

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
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { life_rhythm } = await req.json();
        if (!life_rhythm || typeof life_rhythm !== "string") {
            return new Response(
                JSON.stringify({ error: "life_rhythm is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 1. Deactivate existing AI-generated quests
        await supabase
            .from("quests")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .eq("is_ai_generated", true);

        // 2. Update user's life_rhythm in profile
        await supabase
            .from("profiles")
            .update({ life_rhythm })
            .eq("id", user.id);

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

        // 4. Call OpenAI
        const aiResponse = await callOpenAI(
            [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Here is my updated daily routine:\n\n${life_rhythm}${likesText}${dislikesText}${focusText}${historyContext}${skipContext}\n\nPlease generate quests highly tailored to my routine, my focus areas, and my likes. Strictly AVOID what I hate! Feel free to occasionally include meaningful "Avoidance/Negative" goals (e.g., "Do not smoke", "Less than 1 hour on social media") that test my willpower (usually boosting Strength).`,
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

        // 5. Insert new quests — explicit field mapping, no raw AI spread
        const allQuests = [
            ...generatedQuests.daily_quests.map(q => ({
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
                gold_reward: 0,
            })),
            ...generatedQuests.side_quests.map(q => ({
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
                gold_reward: 0,
            })),
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
                gold_reward: 5,
            },
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

        return new Response(
            JSON.stringify({
                success: true,
                quests: insertedQuests,
                summary: {
                    daily: generatedQuests.daily_quests.length,
                    side: generatedQuests.side_quests.length,
                    boss: 1,
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
