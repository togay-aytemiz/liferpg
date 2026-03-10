import { supabase } from './supabase';
import type { Quest } from './database.types';
import { MAX_DAILY_QUEST_REGENERATIONS } from './gameplay';
import { getQuestRuntimeCacheKey, readCachedValue, VIEW_CACHE_TTL_MS, writeCachedValue, invalidateCachedValue } from './viewCache';

export type QuestRuntimeSnapshot = {
    quests: Quest[];
    completedQuestIds: string[];
    completedBossIds: string[];
    remainingRegenerations: number;
};

function getTodayQuestDate() {
    return new Date().toISOString().split('T')[0];
}

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

    const today = getTodayQuestDate();

    const [
        { data: questRows },
        { data: completionRows },
        { data: completedBossRows },
        { count: todayRegenerations },
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
    ]);

    const snapshot: QuestRuntimeSnapshot = {
        quests: (questRows as Quest[]) || [],
        completedQuestIds: (completionRows || []).map((row: { quest_id: string }) => row.quest_id),
        completedBossIds: (completedBossRows || []).map((row: { quest_id: string }) => row.quest_id),
        remainingRegenerations: Math.max(0, MAX_DAILY_QUEST_REGENERATIONS - (todayRegenerations ?? 0)),
    };

    return writeCachedQuestRuntime(userId, snapshot);
}
