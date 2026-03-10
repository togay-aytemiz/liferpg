// supabase/functions/skip-quest/index.ts
// Edge Function: Handle quest skip/dislike with REASON tracking.
//
// Records WHY the user doesn't want this quest.
// Enforces a daily skip limit (max 3 per day).
// This data is passed as enriched context to regenerate-quests
// so the LLM avoids generating similar quests in the future.
//
// Flow:
//   1. Check daily skip count (max 3)
//   2. Record the skip in user_quests with skip reason
//   3. Deactivate the quest
//   4. Return remaining skips for the day

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { getQuestGoldReward } from "../../../src/lib/questEconomy.ts";

const MAX_DAILY_SKIPS = 3;
const RECENT_BATCH_WINDOW_MS = 60_000;
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard", "epic"]);
const VALID_STATS = new Set(["strength", "knowledge", "wealth", "adventure", "social"]);

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

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

        const { quest_id, reason, mode } = await req.json();
        if (!quest_id) {
            return new Response(
                JSON.stringify({ error: "quest_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const today = new Date().toISOString().split("T")[0];

        // 2. Fetch the quest to get its details
        const { data: quest } = await supabase
            .from("quests")
            .select("title, quest_type, stat_affected, difficulty")
            .eq("id", quest_id)
            .single();

        if (!quest) {
            return new Response(
                JSON.stringify({ error: "Quest not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (mode === "reroll") {
            if (quest.quest_type !== "daily") {
                return new Response(
                    JSON.stringify({ error: "Only daily quests can be rerolled" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { data: latestDailyPool, error: latestDailyPoolError } = await supabase
                .from("quests")
                .select("id, title, created_at, is_active")
                .eq("user_id", user.id)
                .eq("quest_type", "daily")
                .eq("is_ai_generated", true)
                .eq("is_custom", false)
                .order("created_at", { ascending: false })
                .limit(20);

            if (latestDailyPoolError || !latestDailyPool || latestDailyPool.length === 0) {
                return new Response(
                    JSON.stringify({ error: "No daily quest pool available for reroll" }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const newestCreatedAt = new Date(latestDailyPool[0].created_at).getTime();
            const latestBatch = latestDailyPool
                .filter((dailyQuest) => {
                    const createdAt = new Date(dailyQuest.created_at).getTime();
                    return Number.isFinite(createdAt) && Math.abs(newestCreatedAt - createdAt) <= RECENT_BATCH_WINDOW_MS;
                })
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const { data: completedToday } = await supabase
                .from("user_quests")
                .select("quest_id")
                .eq("user_id", user.id)
                .eq("quest_date", today)
                .eq("is_completed", true);

            const completedQuestIds = new Set((completedToday ?? []).map((entry: { quest_id: string }) => entry.quest_id));
            const replacementQuest = latestBatch.find((dailyQuest) =>
                dailyQuest.id !== quest_id &&
                !dailyQuest.is_active &&
                !completedQuestIds.has(dailyQuest.id)
            );

            if (!replacementQuest) {
                return new Response(
                    JSON.stringify({ error: "No alternate daily quest available right now" }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            await supabase
                .from("quests")
                .update({ is_active: false })
                .eq("id", quest_id)
                .eq("user_id", user.id);

            const { data: activatedQuest, error: activatedQuestError } = await supabase
                .from("quests")
                .update({ is_active: true })
                .eq("id", replacementQuest.id)
                .eq("user_id", user.id)
                .select("*")
                .single();

            if (activatedQuestError || !activatedQuest) {
                return new Response(
                    JSON.stringify({ error: "Failed to activate alternate daily quest" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    rerolled_quest: quest.title,
                    new_quest: activatedQuest,
                    message: `Daily rerolled: "${activatedQuest.title}"`,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!reason || typeof reason !== "string") {
            return new Response(
                JSON.stringify({ error: "reason is required (why are you skipping?)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const safeReason = reason.trim();
        if (!safeReason) {
            return new Response(
                JSON.stringify({ error: "reason is required (why are you skipping?)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (safeReason.length > 280) {
            return new Response(
                JSON.stringify({ error: "reason is too long (max 280 chars)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 1. Check daily skip count
        const { count: todaySkips } = await supabase
            .from("user_quests")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("quest_date", today)
            .eq("is_completed", false)
            .not("xp_awarded", "gt", 0); // skipped quests have xp_awarded = 0

        if ((todaySkips ?? 0) >= MAX_DAILY_SKIPS) {
            return new Response(
                JSON.stringify({
                    error: "Daily skip limit reached",
                    limit_reached: true,
                    max_skips: MAX_DAILY_SKIPS,
                    message: `You can only skip ${MAX_DAILY_SKIPS} quests per day. Try completing this one or come back tomorrow!`,
                }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Record skip in user_quests with the skip reason
        await supabase
            .from("user_quests")
            .upsert({
                user_id: user.id,
                quest_id,
                quest_date: today,
                is_completed: false,
                xp_awarded: 0,
                gold_awarded: 0,
                skip_reason: safeReason,
            }, { onConflict: "user_id,quest_id,quest_date" });

        // 4. Deactivate the quest so it no longer appears
        await supabase
            .from("quests")
            .update({ is_active: false })
            .eq("id", quest_id);

        const remainingSkips = MAX_DAILY_SKIPS - ((todaySkips ?? 0) + 1);

        // =================================================================
        // 5. GENERATE REPLACEMENT QUEST
        // Pass full user context + skip reasons so LLM learns immediately.
        // =================================================================

        // 5a. Fetch user profile (rhythm, preferences, stats, hp, gold)
        const { data: profile } = await supabase
            .from("profiles")
            .select("hp, max_hp, gold, life_rhythm, likes, dislikes, focus_areas, level, stat_strength, stat_knowledge, stat_wealth, stat_adventure, stat_social")
            .eq("id", user.id)
            .single();

        // --- HP PENALTY & DEATH SYSTEM ---
        let died = false;
        let hpLost = 5;
        let goldLost = 0;
        let newHP = (profile?.hp ?? 100) - hpLost;
        let newGold = profile?.gold ?? 0;

        if (newHP <= 0) {
            died = true;
            newHP = profile?.max_hp ?? 100;
            goldLost = Math.floor(newGold / 2);
            newGold -= goldLost;

            // Reset streak
            await supabase
                .from("streaks")
                .update({ current_streak: 0, last_active_date: null })
                .eq("user_id", user.id);
        }

        // Apply HP/Gold update
        await supabase
            .from("profiles")
            .update({ hp: newHP, gold: newGold })
            .eq("id", user.id);
        // ---------------------------------

        // 5b. Fetch history (completed & skipped)
        const { data: completedQuests } = await supabase
            .from("user_quests")
            .select("quests(title, quest_type)")
            .eq("user_id", user.id)
            .eq("is_completed", true)
            .limit(10);

        const { data: skippedQuests } = await supabase
            .from("user_quests")
            .select("skip_reason, quests(title, quest_type, stat_affected)")
            .eq("user_id", user.id)
            .eq("is_completed", false)
            .limit(10);

        const historyContext = completedQuests && completedQuests.length > 0
            ? `\n\nPreviously completed quests: ${completedQuests.map((q: any) => q.quests?.title ?? "").join(", ")}`
            : "";

        const skipContext = skippedQuests && skippedQuests.length > 0
            ? `\n\nQuests the user SKIPPED/DISLIKED (avoid similar ones): ${skippedQuests.map((q: any) => {
                const title = q.quests?.title ?? "Unknown";
                const reasonStr = q.skip_reason ? `(Reason skipped: ${q.skip_reason})` : "";
                return `${title} ${reasonStr}`.trim();
            }).join(" | ")}`
            : "";

        const likesText = profile?.likes ? `\nWhat I LIKE/ENJOY: ${profile.likes}` : "";
        const dislikesText = profile?.dislikes ? `\nWhat I HATE/DISLIKE (AVOID THESE): ${profile.dislikes}` : "";
        const focusText = profile?.focus_areas ? `\nMy FOCUS AREAS to improve: ${profile.focus_areas}` : "";

        const replacementPrompt = `The user just skipped a ${quest.quest_type} quest titled "${quest.title}" because: "${safeReason}".
        
Your job is to generate EXACTLY ONE replacement ${quest.quest_type} quest that fits their routine but AVOIDS what they disliked. Feel free to make it a meaningful "Avoidance/Negative" goal (e.g., "Do not smoke", "No sugar today") that tests their willpower if it fits their profile.

User's Daily Routine:
${profile?.life_rhythm || "General healthy lifestyle"}${likesText}${dislikesText}${focusText}

Stats - Strength: ${profile?.stat_strength}, Knowledge: ${profile?.stat_knowledge}, Wealth: ${profile?.stat_wealth}, Adventure: ${profile?.stat_adventure}, Social: ${profile?.stat_social}
${historyContext}${skipContext}

Return valid JSON:
{
  "title": "String (concise, RPG themed)",
  "description": "String (short)",
  "difficulty": "easy", "medium", "hard", or "epic",
  "xp_reward": number (10 to 100),
  "stat_affected": "strength", "knowledge", "wealth", "adventure", or "social",
  "stat_points": number (1 to 5)
}`;

        let newQuest = null;
        try {
            const aiResponse = await callOpenAI(
                [
                    {
                        role: "system",
                        content: "You are a LifeRPG quest designer. Generate exactly ONE replacement quest as valid JSON only. Never return markdown.",
                    },
                    { role: "user", content: replacementPrompt },
                ],
                { model: "gpt-4o-mini", temperature: 0.8, response_format: { type: "json_object" } }
            );

            const generated = JSON.parse(aiResponse) as Record<string, unknown>;

            const difficultyRaw = typeof generated.difficulty === "string" ? generated.difficulty : "medium";
            const statRaw = typeof generated.stat_affected === "string" ? generated.stat_affected : "strength";

            const safeTitle = typeof generated.title === "string"
                ? generated.title.trim().slice(0, 200)
                : "Mystery Quest";
            const safeDescription = typeof generated.description === "string"
                ? generated.description.trim().slice(0, 500)
                : "";
            const safeDifficulty = VALID_DIFFICULTIES.has(difficultyRaw) ? difficultyRaw : "medium";
            const safeStat = VALID_STATS.has(statRaw) ? statRaw : "strength";
            const safeXp = clamp(Number(generated.xp_reward) || 15, 5, 120);
            const safePoints = clamp(Number(generated.stat_points) || 1, 1, 5);

            // Insert the replacement quest
            const { data: insertedQuest } = await supabase
                .from("quests")
                .insert({
                    title: safeTitle || "Mystery Quest",
                    description: safeDescription,
                    quest_type: quest.quest_type, // keep same type as skipped
                    difficulty: safeDifficulty,
                    xp_reward: safeXp,
                    stat_affected: safeStat,
                    stat_points: safePoints,
                    user_id: user.id,
                    is_ai_generated: true,
                    is_active: true,
                    gold_reward: getQuestGoldReward(quest.quest_type, safeDifficulty as "easy" | "medium" | "hard" | "epic"),
                })
                .select()
                .single();

            newQuest = insertedQuest;
        } catch (e) {
            console.error("Replacement generation failed:", e);
            // We don't fail the whole skip request if regeneration fails, just return null for new_quest
        }

        return new Response(
            JSON.stringify({
                success: true,
                skipped_quest: quest.title,
                skip_reason: safeReason,
                remaining_skips: remainingSkips,
                max_skips: MAX_DAILY_SKIPS,
                message: newQuest
                    ? `Quest skipped. Generated replacement: "${newQuest.title}"`
                    : `Quest skipped.`,
                new_quest: newQuest,
                hp_lost: hpLost,
                died: died,
                gold_lost: goldLost,
                current_hp: newHP
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("skip-quest error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
