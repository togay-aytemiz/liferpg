import { getAppDayKey, getAppDaySeed, getAppDayWindow, getPreviousAppDayKey } from "../../../src/lib/appDay.ts";
import { dedupeDailyPool, getDailyQuestDedupKey, getLatestQuestBatch, pickNovelDailySet } from "../../../src/lib/dailyPool.ts";
import { getRequiredDailyCompletions } from "../../../src/lib/dailyRules.ts";

type SupabaseAdminLike = {
    from: (table: string) => {
        select: (columns: string, options?: Record<string, unknown>) => any;
        update: (values: Record<string, unknown>) => any;
    };
};

export type DailySettlementResult = {
    settled: boolean;
    current_app_day: string;
    previous_app_day: string;
    hp_penalty: number;
    freeze_consumed: boolean;
    streak_reset: boolean;
    rotated_daily_pool: boolean;
};

function getActiveDailyLimit(poolSize: number): number {
    if (poolSize <= 0) return 0;
    if (poolSize <= 3) return poolSize;
    return Math.min(Math.max(poolSize - 2, 3), 5);
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

export async function settleDailyStateForUser(
    supabaseAdmin: SupabaseAdminLike,
    userId: string,
    now = new Date(),
): Promise<DailySettlementResult> {
    const currentAppDay = getAppDayKey(now);
    const previousAppDay = getPreviousAppDayKey(currentAppDay);
    const previousAppDayWindow = getAppDayWindow(previousAppDay);

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, hp, max_hp, gold, streak_freezes, created_at, last_daily_settlement_day")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        throw new Error(`Failed to fetch profile for daily settlement: ${profileError?.message ?? "missing profile"}`);
    }

    if (profile.last_daily_settlement_day === currentAppDay) {
        return {
            settled: false,
            current_app_day: currentAppDay,
            previous_app_day: previousAppDay,
            hp_penalty: 0,
            freeze_consumed: false,
            streak_reset: false,
            rotated_daily_pool: false,
        };
    }

    const eligibleForPreviousDayPenalty = !profile.created_at || new Date(profile.created_at).getTime() < previousAppDayWindow.end.getTime();

    const { data: dailyQuests } = await supabaseAdmin
        .from("quests")
        .select("id, title, description, stat_affected")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("quest_type", "daily");

    const { data: dailyHabits } = await supabaseAdmin
        .from("habits")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("is_good", true)
        .eq("frequency", "daily")
        .lt("created_at", previousAppDayWindow.endIso);

    let hpPenalty = 0;
    const uniqueDailyQuests = dedupeDailyPool(dailyQuests ?? []);
    const totalDailyObjectives = uniqueDailyQuests.length + (dailyHabits?.length ?? 0);

    if (eligibleForPreviousDayPenalty && totalDailyObjectives > 0) {
        const { data: completions } = await supabaseAdmin
            .from("user_quests")
            .select("quest_id")
            .eq("user_id", userId)
            .eq("quest_date", previousAppDay)
            .eq("is_completed", true);

        const { data: habitLogs } = await supabaseAdmin
            .from("habit_logs")
            .select("habit_id, habits!inner(id, is_active, is_good, frequency)")
            .eq("user_id", userId)
            .gte("created_at", previousAppDayWindow.startIso)
            .lt("created_at", previousAppDayWindow.endIso)
            .eq("habits.is_active", true)
            .eq("habits.is_good", true)
            .eq("habits.frequency", "daily");

        const completedQuestIds = new Set((completions ?? []).map((entry: { quest_id: string }) => entry.quest_id));
        const completedHabitIds = new Set((habitLogs ?? []).map((entry: { habit_id: string }) => entry.habit_id));
        const completedDailyKeys = new Set(
            uniqueDailyQuests
                .filter((quest) => completedQuestIds.has(quest.id))
                .map((quest) => getDailyQuestDedupKey(quest)),
        );

        const completedCount =
            uniqueDailyQuests.filter((quest) => completedDailyKeys.has(getDailyQuestDedupKey(quest))).length +
            (dailyHabits ?? []).filter((habit) => completedHabitIds.has(habit.id)).length;
        const requiredCompletions = getRequiredDailyCompletions(totalDailyObjectives);

        if (completedCount < requiredCompletions) {
            const uncompletedQuestCount = uniqueDailyQuests.filter(
                (quest) => !completedDailyKeys.has(getDailyQuestDedupKey(quest)),
            ).length;
            const uncompletedHabitCount = (dailyHabits ?? []).filter((habit) => !completedHabitIds.has(habit.id)).length;
            hpPenalty = (uncompletedQuestCount + uncompletedHabitCount) * 10;
        }
    }

    const { data: streakRow } = await supabaseAdmin
        .from("streaks")
        .select("current_streak, last_active_date")
        .eq("user_id", userId)
        .single();

    const shouldResetStreakFromInactivity = Boolean(
        eligibleForPreviousDayPenalty &&
        streakRow &&
        streakRow.last_active_date !== previousAppDay &&
        streakRow.last_active_date !== currentAppDay,
    );

    let freezeConsumed = false;
    let streakReset = false;

    if (hpPenalty > 0 || shouldResetStreakFromInactivity) {
        if ((profile.streak_freezes ?? 0) > 0) {
            await supabaseAdmin
                .from("profiles")
                .update({ streak_freezes: (profile.streak_freezes ?? 0) - 1 })
                .eq("id", userId);
            freezeConsumed = true;
        } else {
            let newHp = profile.hp;
            let newGold = profile.gold;

            if (hpPenalty > 0) {
                newHp -= hpPenalty;
            }

            if (newHp <= 0) {
                newHp = profile.max_hp;
                newGold = Math.floor(newGold / 2);
                streakReset = true;
            }

            if (shouldResetStreakFromInactivity) {
                streakReset = true;
            }

            await supabaseAdmin
                .from("profiles")
                .update({ hp: newHp, gold: newGold })
                .eq("id", userId);

            if (streakReset) {
                await supabaseAdmin
                    .from("streaks")
                    .update({ current_streak: 0, xp_multiplier: 1.0 })
                    .eq("user_id", userId);
            }
        }
    }

    let rotatedDailyPool = false;

    const { data: latestDailyPool, error: latestDailyPoolError } = await supabaseAdmin
        .from("quests")
        .select("id, title, description, stat_affected, created_at, is_active")
        .eq("user_id", userId)
        .eq("quest_type", "daily")
        .eq("is_ai_generated", true)
        .eq("is_custom", false)
        .order("created_at", { ascending: false })
        .limit(20);

    if (latestDailyPoolError) {
        throw new Error(`Failed to fetch daily quest pool: ${latestDailyPoolError.message}`);
    }

    if (latestDailyPool && latestDailyPool.length > 0) {
        const latestBatch = dedupeDailyPool(
            getLatestQuestBatch(latestDailyPool).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
            { preferActive: true },
        );

        if (latestBatch.length > 0) {
            const activeDailyIds = pickNovelDailySet(latestBatch, {
                activeCount: getActiveDailyLimit(latestBatch.length),
                seed: getAppDaySeed(currentAppDay),
                previousTitles: uniqueDailyQuests.map((quest) => quest.title),
                preferActive: true,
            }).map((quest) => quest.id);

            const { error: deactivateDailyError } = await supabaseAdmin
                .from("quests")
                .update({ is_active: false })
                .eq("user_id", userId)
                .eq("quest_type", "daily")
                .eq("is_ai_generated", true)
                .eq("is_custom", false);

            if (deactivateDailyError) {
                throw new Error(`Failed to reset daily quest pool: ${deactivateDailyError.message}`);
            }

            if (activeDailyIds.length > 0) {
                const { error: activateDailyError } = await supabaseAdmin
                    .from("quests")
                    .update({ is_active: true })
                    .in("id", activeDailyIds);

                if (activateDailyError) {
                    throw new Error(`Failed to activate rotated dailies: ${activateDailyError.message}`);
                }
            }

            rotatedDailyPool = true;
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
        throw new Error(`Failed to fetch boss quest pool: ${bossPoolError.message}`);
    }

    if (bossPool && bossPool.length > 0) {
        const { data: completedBossRows } = await supabaseAdmin
            .from("user_quests")
            .select("quest_id")
            .eq("user_id", userId)
            .eq("is_completed", true);

        const completedBossIds = new Set((completedBossRows ?? []).map((row: { quest_id: string }) => row.quest_id));
        const visibleBossId = selectVisibleBossQuestId(bossPool, completedBossIds);

        const { error: deactivateBossError } = await supabaseAdmin
            .from("quests")
            .update({ is_active: false })
            .eq("user_id", userId)
            .eq("quest_type", "boss")
            .eq("is_ai_generated", true)
            .eq("is_custom", false);

        if (deactivateBossError) {
            throw new Error(`Failed to normalize boss visibility: ${deactivateBossError.message}`);
        }

        if (visibleBossId) {
            const { error: activateBossError } = await supabaseAdmin
                .from("quests")
                .update({ is_active: true })
                .eq("id", visibleBossId);

            if (activateBossError) {
                throw new Error(`Failed to activate visible boss: ${activateBossError.message}`);
            }
        }
    }

    await supabaseAdmin
        .from("profiles")
        .update({ last_daily_settlement_day: currentAppDay })
        .eq("id", userId);

    return {
        settled: true,
        current_app_day: currentAppDay,
        previous_app_day: previousAppDay,
        hp_penalty: hpPenalty,
        freeze_consumed: freezeConsumed,
        streak_reset: streakReset,
        rotated_daily_pool: rotatedDailyPool,
    };
}

