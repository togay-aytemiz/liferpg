// supabase/functions/daily-cron/index.ts
// Edge Function: Daily background job for HP penalties and streak resets.
//
// Triggered via HTTP (e.g. pg_net scheduled cron job).
// Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS and update all users.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getRequiredDailyCompletions } from "../../../src/lib/dailyRules.ts";

const RECENT_BATCH_WINDOW_MS = 60_000;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getActiveDailyLimit(poolSize: number): number {
    if (poolSize <= 0) return 0;
    if (poolSize <= 3) return poolSize;
    return Math.min(Math.max(poolSize - 2, 3), 5);
}

function getUtcDayIndex(date: Date): number {
    return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

function buildRotatedDailyIds(ids: string[], dayIndex: number, activeCount: number): string[] {
    if (ids.length === 0 || activeCount <= 0) return [];

    const normalizedCount = Math.min(activeCount, ids.length);
    const startIndex = dayIndex % ids.length;
    const selected: string[] = [];

    for (let i = 0; i < normalizedCount; i++) {
        selected.push(ids[(startIndex + i) % ids.length]);
    }

    return selected;
}

function selectVisibleBossQuestId(
    bosses: Array<{ id: string; chain_id: string | null; chain_step: number | null; created_at: string; is_active: boolean }>,
    completedBossIds: Set<string>,
): string | null {
    const incompleteBosses = bosses.filter((boss) => !completedBossIds.has(boss.id));
    if (incompleteBosses.length === 0) return null;

    const sorted = [...incompleteBosses].sort((a, b) => {
        const aActive = a.is_active ? 0 : 1;
        const bActive = b.is_active ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;

        const sameChain = a.chain_id && b.chain_id && a.chain_id === b.chain_id;
        if (sameChain) {
            return (a.chain_step ?? 1) - (b.chain_step ?? 1);
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sorted[0]?.id ?? null;
}

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
            .select("id, hp, max_hp, gold, streak_freezes");

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
                const completedCount = dailyQuests.filter(q => completedQuestIds.has(q.id)).length;
                const requiredCompletions = getRequiredDailyCompletions(dailyQuests.length);

                if (completedCount < requiredCompletions) {
                    // Every uncompleted daily quest incurs a -10 HP penalty
                    const uncompletedCount = dailyQuests.filter(q => !completedQuestIds.has(q.id)).length;
                    hpPenalty = uncompletedCount * 10;
                }
            }

            // Streak Penalty: If user didn't complete ANY quests yesterday, and last_active_date wasn't yesterday, streak breaks.
            const { data: streakRow } = await supabaseAdmin
                .from("streaks")
                .select("current_streak, last_active_date")
                .eq("user_id", userId)
                .single();

            let freezeConsumed = false;

            // Apply Penalties (HP or Streak loss)
            if (hpPenalty > 0 || (streakRow && streakRow.last_active_date !== yesterdayStr && streakRow.last_active_date !== today.toISOString().split("T")[0])) {

                // If user has a freeze, consume the freeze instead of penalizing!
                if (profile.streak_freezes > 0) {
                    await supabaseAdmin
                        .from("profiles")
                        .update({ streak_freezes: profile.streak_freezes - 1 })
                        .eq("id", userId);
                    console.log(`User ${userId} consumed a streak freeze. Zero penalties applied.`);
                    freezeConsumed = true;
                }

                if (!freezeConsumed) {
                    let newHP = profile.hp - hpPenalty;
                    let newGold = profile.gold;

                    let resetStreak = false;

                    // If HP drops to 0 or below, trigger Death Penalty
                    if (newHP <= 0) {
                        newHP = profile.max_hp; // Heal to full
                        newGold = Math.floor(newGold / 2); // Lose half gold
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

            // Rotate AI-generated daily quests from the most recent generation batch.
            // This keeps the visible daily list short without requiring another LLM call.
            const { data: latestDailyPool, error: latestDailyPoolError } = await supabaseAdmin
                .from("quests")
                .select("id, created_at")
                .eq("user_id", userId)
                .eq("quest_type", "daily")
                .eq("is_ai_generated", true)
                .eq("is_custom", false)
                .order("created_at", { ascending: false })
                .limit(20);

            if (latestDailyPoolError) {
                console.warn(`Failed to fetch daily quest pool for user ${userId}: ${latestDailyPoolError.message}`);
                continue;
            }

            if (!latestDailyPool || latestDailyPool.length === 0) {
                continue;
            }

            const newestCreatedAt = new Date(latestDailyPool[0].created_at).getTime();
            const latestBatch = latestDailyPool
                .filter((quest) => {
                    const createdAt = new Date(quest.created_at).getTime();
                    return Number.isFinite(createdAt) && Math.abs(newestCreatedAt - createdAt) <= RECENT_BATCH_WINDOW_MS;
                })
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const activeDailyIds = buildRotatedDailyIds(
                latestBatch.map((quest) => quest.id),
                getUtcDayIndex(today),
                getActiveDailyLimit(latestBatch.length),
            );

            const { error: deactivateDailyError } = await supabaseAdmin
                .from("quests")
                .update({ is_active: false })
                .eq("user_id", userId)
                .eq("quest_type", "daily")
                .eq("is_ai_generated", true)
                .eq("is_custom", false);

            if (deactivateDailyError) {
                console.warn(`Failed to reset daily quest pool for user ${userId}: ${deactivateDailyError.message}`);
                continue;
            }

            if (activeDailyIds.length > 0) {
                const { error: activateDailyError } = await supabaseAdmin
                    .from("quests")
                    .update({ is_active: true })
                    .in("id", activeDailyIds);

                if (activateDailyError) {
                    console.warn(`Failed to activate rotated dailies for user ${userId}: ${activateDailyError.message}`);
                }
            }

            const { data: bossPool, error: bossPoolError } = await supabaseAdmin
                .from("quests")
                .select("id, chain_id, chain_step, created_at, is_active")
                .eq("user_id", userId)
                .eq("quest_type", "boss")
                .eq("is_ai_generated", true)
                .eq("is_custom", false)
                .order("created_at", { ascending: false })
                .limit(30);

            if (bossPoolError) {
                console.warn(`Failed to fetch boss quest pool for user ${userId}: ${bossPoolError.message}`);
                continue;
            }

            if (!bossPool || bossPool.length === 0) {
                continue;
            }

            const { data: completedBossRows } = await supabaseAdmin
                .from("user_quests")
                .select("quest_id")
                .eq("user_id", userId)
                .eq("is_completed", true);

            const completedBossIds = new Set((completedBossRows ?? []).map((row) => row.quest_id));
            const visibleBossId = selectVisibleBossQuestId(bossPool, completedBossIds);

            const { error: deactivateBossError } = await supabaseAdmin
                .from("quests")
                .update({ is_active: false })
                .eq("user_id", userId)
                .eq("quest_type", "boss")
                .eq("is_ai_generated", true)
                .eq("is_custom", false);

            if (deactivateBossError) {
                console.warn(`Failed to normalize boss visibility for user ${userId}: ${deactivateBossError.message}`);
                continue;
            }

            if (visibleBossId) {
                const { error: activateBossError } = await supabaseAdmin
                    .from("quests")
                    .update({ is_active: true })
                    .eq("id", visibleBossId);

                if (activateBossError) {
                    console.warn(`Failed to activate the visible boss for user ${userId}: ${activateBossError.message}`);
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
