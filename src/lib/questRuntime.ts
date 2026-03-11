import { supabase } from './supabase';
import type { Quest } from './database.types';
import { getAppDayKey } from './appDay';
import { MAX_DAILY_QUEST_REGENERATIONS } from './gameplay';
import { dedupeDailyPool, getDailyQuestDedupKey } from './dailyPool';
import { getQuestRuntimeCacheKey, readCachedValue, VIEW_CACHE_TTL_MS, writeCachedValue, invalidateCachedValue, readCachedOrLoadValue } from './viewCache';
import { fetchHabitSnapshot } from './habitSnapshot';
import type { BossUnlockProgress } from './bossUnlock';
import { evaluateBossUnlock } from './bossUnlock';

export type QuestRuntimeSnapshot = {
    quests: Quest[];
    completedQuestIds: string[];
    completedBossIds: string[];
    remainingRegenerations: number;
    remainingDailyRerolls: number;
    dailyRerollQuotaRemaining: number;
    dailyRerollReserveRemaining: number;
    activeDailyHabitIds: string[];
    loggedDailyHabitIds: string[];
    bossUnlockStatusById: Record<string, BossUnlockProgress>;
};

export const MAX_DAILY_REROLLS = 2;

export function readCachedQuestRuntime(userId: string) {
    return readCachedValue<QuestRuntimeSnapshot>(getQuestRuntimeCacheKey(userId));
}

export function writeCachedQuestRuntime(userId: string, snapshot: QuestRuntimeSnapshot) {
    return writeCachedValue(getQuestRuntimeCacheKey(userId), snapshot, VIEW_CACHE_TTL_MS);
}

export function invalidateQuestRuntime(userId: string) {
    invalidateCachedValue(getQuestRuntimeCacheKey(userId));
}

export async function fetchQuestRuntime(userId: string, options?: { force?: boolean }): Promise<QuestRuntimeSnapshot> {
    const loadSnapshot = async (): Promise<QuestRuntimeSnapshot> => {
        const today = getAppDayKey();
        const habitSnapshot = await fetchHabitSnapshot(userId, { force: options?.force });

        const [
            { data: questRows },
            { data: completionRows },
            { data: completedBossRows },
            { count: todayRegenerations },
            { count: todayRerolls },
            { data: latestDailyPoolRows },
        ] = await Promise.all([
            supabase
                .from('quests')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('quest_type', { ascending: true })
                .order('created_at', { ascending: true }),
            supabase
                .from('user_quests')
                .select('quest_id')
                .eq('user_id', userId)
                .eq('quest_date', today)
                .eq('is_completed', true),
            supabase
                .from('user_quests')
                .select('quest_id, quests!inner(quest_type)')
                .eq('user_id', userId)
                .eq('is_completed', true)
                .eq('quests.quest_type', 'boss'),
            supabase
                .from('user_quests')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('quest_date', today)
                .eq('is_completed', false)
                .not('xp_awarded', 'gt', 0),
            supabase
                .from('quest_feedback')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('feedback_type', 'reroll')
                .eq('app_day_key', today),
            supabase
                .from('quests')
                .select('id, title, description, created_at, is_active')
                .eq('user_id', userId)
                .eq('quest_type', 'daily')
                .eq('is_ai_generated', true)
                .eq('is_custom', false)
                .order('created_at', { ascending: false })
                .limit(60),
        ]);

        const activeBosses = ((questRows as Quest[]) || []).filter((quest) =>
            quest.quest_type === 'boss' && ((quest.unlock_daily_required ?? 0) > 0 || (quest.unlock_side_required ?? 0) > 0),
        );
        const earliestBossCreatedAt = activeBosses.reduce<string | null>((earliest, quest) => {
            if (!earliest) return quest.created_at;
            return new Date(quest.created_at).getTime() < new Date(earliest).getTime() ? quest.created_at : earliest;
        }, null);

        const bossProgressRows = earliestBossCreatedAt
            ? await supabase
                .from('user_quests')
                .select('quest_id, completed_at, quests!inner(quest_type)')
                .eq('user_id', userId)
                .eq('is_completed', true)
                .gte('completed_at', earliestBossCreatedAt)
            : { data: null };

        const completedQuestIds = new Set((completionRows || []).map((row: { quest_id: string }) => row.quest_id));
        const latestDailyPool = (latestDailyPoolRows ?? []) as Array<{
            id: string;
            title: string;
            description: string | null;
            created_at: string;
            is_active: boolean;
        }>;
        const latestDailyBatch = dedupeDailyPool(
            latestDailyPool,
            { preferActive: true },
        );
        const activeDailyKeys = new Set(
            latestDailyBatch.filter((quest) => quest.is_active).map((quest) => getDailyQuestDedupKey(quest)),
        );
        const dailyRerollReserveRemaining = latestDailyBatch.filter(
            (quest) =>
                !quest.is_active &&
                !completedQuestIds.has(quest.id) &&
                !activeDailyKeys.has(getDailyQuestDedupKey(quest)),
        ).length;
        const dailyRerollQuotaRemaining = Math.max(0, MAX_DAILY_REROLLS - (todayRerolls ?? 0));
        const remainingDailyRerolls = Math.min(dailyRerollReserveRemaining, dailyRerollQuotaRemaining);
        const prerequisiteCompletions = (bossProgressRows.data ?? []) as Array<{
            completed_at: string | null;
            quests?: { quest_type?: string | null } | null;
        }>;
        const bossUnlockStatusById = activeBosses.reduce<Record<string, BossUnlockProgress>>((acc, bossQuest) => {
            const relevantRows = prerequisiteCompletions.filter((row) =>
                row.completed_at &&
                new Date(row.completed_at).getTime() >= new Date(bossQuest.created_at).getTime(),
            );
            const dailyCompleted = relevantRows.filter((row) => row.quests?.quest_type === 'daily').length;
            const sideCompleted = relevantRows.filter((row) => row.quests?.quest_type === 'side').length;

            acc[bossQuest.id] = evaluateBossUnlock(
                {
                    unlock_daily_required: bossQuest.unlock_daily_required ?? 0,
                    unlock_side_required: bossQuest.unlock_side_required ?? 0,
                    unlock_rule_mode: bossQuest.unlock_rule_mode ?? 'all',
                },
                {
                    daily_completed: dailyCompleted,
                    side_completed: sideCompleted,
                },
            );
            return acc;
        }, {});

        return {
            quests: (questRows as Quest[]) || [],
            completedQuestIds: [...completedQuestIds],
            completedBossIds: (completedBossRows || []).map((row: { quest_id: string }) => row.quest_id),
            remainingRegenerations: Math.max(0, MAX_DAILY_QUEST_REGENERATIONS - (todayRegenerations ?? 0)),
            remainingDailyRerolls,
            dailyRerollQuotaRemaining,
            dailyRerollReserveRemaining,
            activeDailyHabitIds: habitSnapshot.activeDailyHabitIds,
            loggedDailyHabitIds: habitSnapshot.loggedTodayIds,
            bossUnlockStatusById,
        };
    };

    if (options?.force) {
        return writeCachedQuestRuntime(userId, await loadSnapshot());
    }

    return readCachedOrLoadValue(
        getQuestRuntimeCacheKey(userId),
        loadSnapshot,
        VIEW_CACHE_TTL_MS,
    );
}
