// supabase/functions/daily-cron/index.ts
// Edge Function: Daily background job for HP penalties and streak resets.
//
// Triggered via HTTP (e.g. pg_net scheduled cron job).
// Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS and update all users.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Use service role to bypass RLS for background processing
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // 1. Get all users (profiles)
        const { data: profiles, error: profErr } = await supabaseAdmin
            .from("profiles")
            .select("id, hp, max_hp, gold");

        if (profErr || !profiles) {
            throw new Error(`Failed to fetch profiles: ${profErr?.message}`);
        }

        // 2. Iterate each user to apply end-of-day logic
        // (In a production app with millions of users, this should be done purely via SQL RPC or chunked)
        for (const profile of profiles) {
            const userId = profile.id;

            // Find their active 'daily' quests
            const { data: dailyQuests } = await supabaseAdmin
                .from("quests")
                .select("id")
                .eq("user_id", userId)
                .eq("is_active", true)
                .eq("quest_type", "daily");

            let hpPenalty = 0;

            if (dailyQuests && dailyQuests.length > 0) {
                // Check completions for yesterday
                const { data: completions } = await supabaseAdmin
                    .from("user_quests")
                    .select("quest_id")
                    .eq("user_id", userId)
                    .eq("quest_date", yesterdayStr)
                    .eq("is_completed", true);

                const completedQuestIds = new Set((completions || []).map(c => c.quest_id));

                // Every uncompleted daily quest incurs a -10 HP penalty
                const uncompletedCount = dailyQuests.filter(q => !completedQuestIds.has(q.id)).length;
                hpPenalty = uncompletedCount * 10;
            }

            // Streak Penalty: If user didn't complete ANY quests yesterday, and last_active_date wasn't yesterday, streak breaks.
            const { data: streakRow } = await supabaseAdmin
                .from("streaks")
                .select("current_streak, last_active_date")
                .eq("user_id", userId)
                .single();

            // Apply HP Penalty
            if (hpPenalty > 0 || (streakRow && streakRow.last_active_date !== yesterdayStr && streakRow.last_active_date !== today.toISOString().split("T")[0])) {
                let newHP = profile.hp - hpPenalty;
                let newGold = profile.gold;

                let died = false;
                let resetStreak = false;

                // If HP drops to 0 or below, trigger Death Penalty
                if (newHP <= 0) {
                    newHP = profile.max_hp; // Heal to full
                    newGold = Math.floor(newGold / 2); // Lose half gold
                    died = true;
                    resetStreak = true;
                }

                // If user was inactive all of yesterday (and today so far), break streak silently regardless of HP
                if (streakRow && streakRow.last_active_date !== yesterdayStr && streakRow.last_active_date !== today.toISOString().split("T")[0]) {
                    resetStreak = true;
                }

                // Update Profile
                await supabaseAdmin
                    .from("profiles")
                    .update({ hp: newHP, gold: newGold })
                    .eq("id", userId);

                // Update Streak
                if (resetStreak) {
                    await supabaseAdmin
                        .from("streaks")
                        .update({ current_streak: 0 })
                        .eq("user_id", userId);
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: "Daily cron executed successfully" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("daily-cron error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
