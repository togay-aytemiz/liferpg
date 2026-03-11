import { supabase } from './supabase';
import type { Quest } from './database.types';
import { getAppDayKey, getCurrentAppDayWindow } from './appDay';
import { MAX_DAILY_QUEST_REGENERATIONS } from './gameplay';
import { dedupeDailyPool, getDailyQuestDedupKey, getLatestQuestBatch } from './dailyPool';
import { getQuestRuntimeCacheKey, readCachedValue, VIEW_CACHE_TTL_MS, writeCachedValue, invalidateCachedValue } from './viewCache';

export type QuestRuntimeSnapshot = {
    quests: Quest[];
    completedQuestIds: string[];
    completedBossIds: string[];
    remainingRegenerations: number;
    remainingDailyRerolls: number;
    activeDailyHabitIds: string[];
    loggedDailyHabitIds: string[];
};

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
    if (!options?.force) {
        const cached = readCachedQuestRuntime(userId);
        if (cached.hit) {
            return cached.value;
        }
    }

    const today = getAppDayKey();
    const todayWindow = getCurrentAppDayWindow();

    const [
        { data: questRows },
        { data: completionRows },
        { data: completedBossRows },
        { count: todayRegenerations },
        { data: latestDailyPoolRows },
        { data: activeDailyHabitRows },
        { data: loggedDailyHabitRows },
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
            .from('quests')
            .select('id, title, description, created_at, is_active')
            .eq('user_id', userId)
            .eq('quest_type', 'daily')
            .eq('is_ai_generated', true)
            .eq('is_custom', false)
            .order('created_at', { ascending: false })
            .limit(20),
        supabase
            .from('habits')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .eq('is_good', true)
            .eq('frequency', 'daily'),
        supabase
            .from('habit_logs')
            .select('habit_id, habits!inner(id, is_active, is_good, frequency)')
            .eq('user_id', userId)
            .gte('created_at', todayWindow.startIso)
            .lt('created_at', todayWindow.endIso)
            .eq('habits.is_active', true)
            .eq('habits.is_good', true)
            .eq('habits.frequency', 'daily'),
    ]);

    const completedQuestIds = new Set((completionRows || []).map((row: { quest_id: string }) => row.quest_id));
    const activeDailyHabitIds = (activeDailyHabitRows ?? []).map((row: { id: string }) => row.id);
    const loggedDailyHabitIds = [...new Set((loggedDailyHabitRows ?? []).map((row: { habit_id: string }) => row.habit_id))];
    const latestDailyPool = (latestDailyPoolRows ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        created_at: string;
        is_active: boolean;
    }>;
    const latestDailyBatch = dedupeDailyPool(
        getLatestQuestBatch(latestDailyPool).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        { preferActive: true },
    );
    const activeDailyKeys = new Set(
        latestDailyBatch.filter((quest) => quest.is_active).map((quest) => getDailyQuestDedupKey(quest)),
    );
    const remainingDailyRerolls = latestDailyBatch.filter(
        (quest) =>
            !quest.is_active &&
            !completedQuestIds.has(quest.id) &&
            !activeDailyKeys.has(getDailyQuestDedupKey(quest)),
    ).length;

    const snapshot: QuestRuntimeSnapshot = {
        quests: (questRows as Quest[]) || [],
        completedQuestIds: [...completedQuestIds],
        completedBossIds: (completedBossRows || []).map((row: { quest_id: string }) => row.quest_id),
        remainingRegenerations: Math.max(0, MAX_DAILY_QUEST_REGENERATIONS - (todayRegenerations ?? 0)),
        remainingDailyRerolls,
        activeDailyHabitIds,
        loggedDailyHabitIds,
    };

    return writeCachedQuestRuntime(userId, snapshot);
}
