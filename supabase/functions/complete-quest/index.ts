// supabase/functions/complete-quest/index.ts
// Edge Function: Handle quest completion.
//
// Flow:
//   1. Mark the quest as completed in user_quests
//   2. Calculate XP (base reward × streak multiplier)
//   3. Update user profile: add XP, check level up, increase stat
//   4. Update streak
//   5. Check achievement conditions
//   6. Return updated profile + any new achievements

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

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

        const { quest_id } = await req.json();
        if (!quest_id) {
            return new Response(
                JSON.stringify({ error: "quest_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 1. Fetch the quest details
        const { data: quest, error: questError } = await supabase
            .from("quests")
            .select("*")
            .eq("id", quest_id)
            .single();

        if (questError || !quest) {
            return new Response(
                JSON.stringify({ error: "Quest not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Guard: check if already completed today (prevent duplicate XP)
        const today = new Date().toISOString().split("T")[0];
        const { data: existingCompletion } = await supabase
            .from("user_quests")
            .select("id")
            .eq("user_id", user.id)
            .eq("quest_id", quest_id)
            .eq("quest_date", today)
            .eq("is_completed", true)
            .maybeSingle();

        if (existingCompletion) {
            return new Response(
                JSON.stringify({ error: "Quest already completed today", already_completed: true }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Fetch user profile and streak
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        const { data: streak } = await supabase
            .from("streaks")
            .select("*")
            .eq("user_id", user.id)
            .single();

        const xpMultiplier = streak?.xp_multiplier ?? 1.0;
        const baseXP = quest.xp_reward ?? 15;
        const awardedXP = Math.round(baseXP * xpMultiplier);
        const awardedGold = quest.gold_reward ?? 0;

        // 3. Insert user_quest completion record (reuse `today` from guard above)
        const { error: uqError } = await supabase
            .from("user_quests")
            .upsert({
                user_id: user.id,
                quest_id,
                quest_date: today,
                is_completed: true,
                completed_at: new Date().toISOString(),
                xp_awarded: awardedXP,
                gold_awarded: awardedGold,
            }, { onConflict: "user_id,quest_id,quest_date" });

        if (uqError) {
            return new Response(
                JSON.stringify({ error: "Failed to record completion", details: uqError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 4. Update profile: XP, Gold, Stat
        const newXP = (profile?.xp ?? 0) + awardedXP;
        const newGold = (profile?.gold ?? 0) + awardedGold;

        // Calculate new level from level_thresholds
        const { data: thresholds } = await supabase
            .from("level_thresholds")
            .select("*")
            .order("level", { ascending: false });

        let newLevel = 1;
        if (thresholds) {
            for (const t of thresholds) {
                if (newXP >= t.xp_required) {
                    newLevel = t.level;
                    break;
                }
            }
        }
        const didLevelUp = newLevel > (profile?.level ?? 1);

        // Build stat update
        const maxHp = profile?.max_hp ?? 100;
        const currentHp = profile?.hp ?? 100;
        const newHp = Math.min(maxHp, currentHp + 2); // Heal +2 HP

        const statField = quest.stat_affected ? `stat_${quest.stat_affected}` : null;
        const statUpdate: Record<string, unknown> = {
            xp: newXP,
            gold: newGold,
            level: newLevel,
            hp: newHp,
        };
        if (statField && profile) {
            const currentStatValue = (profile as Record<string, unknown>)[statField] as number ?? 0;
            statUpdate[statField] = currentStatValue + (quest.stat_points ?? 1);
        }

        await supabase
            .from("profiles")
            .update(statUpdate)
            .eq("id", user.id);

        // 5. Update streak
        const lastActive = streak?.last_active_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = 1;
        if (lastActive === yesterdayStr) {
            newStreak = (streak?.current_streak ?? 0) + 1;
        } else if (lastActive === today) {
            newStreak = streak?.current_streak ?? 1;
        }

        const longestStreak = Math.max(newStreak, streak?.longest_streak ?? 0);

        // Calculate XP multiplier based on streak
        let newMultiplier = 1.0;
        if (newStreak >= 30) newMultiplier = 1.25;
        else if (newStreak >= 7) newMultiplier = 1.10;
        else if (newStreak >= 3) newMultiplier = 1.05;

        await supabase
            .from("streaks")
            .upsert({
                user_id: user.id,
                current_streak: newStreak,
                longest_streak: longestStreak,
                last_active_date: today,
                xp_multiplier: newMultiplier,
            }, { onConflict: "user_id" });

        // 6. Check achievements
        const newAchievements: string[] = [];

        // Count total completed quests
        const { count: totalCompleted } = await supabase
            .from("user_quests")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_completed", true);

        // Count boss quests defeated
        const { count: bossCount } = await supabase
            .from("user_quests")
            .select("*, quests!inner(quest_type)", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_completed", true)
            .eq("quests.quest_type", "boss");

        // Fetch all achievements not yet unlocked by user
        const { data: userAchievements } = await supabase
            .from("user_achievements")
            .select("achievement_id")
            .eq("user_id", user.id);

        const unlockedIds = new Set((userAchievements ?? []).map((a: Record<string, string>) => a.achievement_id));

        const { data: allAchievements } = await supabase
            .from("achievements")
            .select("*");

        for (const ach of (allAchievements ?? [])) {
            if (unlockedIds.has(ach.id)) continue;

            const cond = ach.unlock_condition as { type: string; value: number };
            let earned = false;

            switch (cond.type) {
                case "quest_count":
                    earned = (totalCompleted ?? 0) >= cond.value;
                    break;
                case "streak_days":
                    earned = newStreak >= cond.value;
                    break;
                case "level_reached":
                    earned = newLevel >= cond.value;
                    break;
                case "boss_defeated":
                    earned = (bossCount ?? 0) >= cond.value;
                    break;
            }

            if (earned) {
                await supabase
                    .from("user_achievements")
                    .insert({ user_id: user.id, achievement_id: ach.id });
                newAchievements.push(ach.title);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                xp_awarded: awardedXP,
                gold_awarded: awardedGold,
                new_xp: newXP,
                new_level: newLevel,
                did_level_up: didLevelUp,
                streak: newStreak,
                xp_multiplier: newMultiplier,
                new_achievements: newAchievements,
                stat_updated: quest.stat_affected,
                new_hp: newHp,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("complete-quest error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
