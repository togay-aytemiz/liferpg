import { supabase } from './supabase';
import type { Habit } from './database.types';
import { getCurrentAppDayWindow } from './appDay';
import {
    readCachedOrLoadValue,
    readCachedValue,
    VIEW_CACHE_TTL_MS,
    writeCachedValue,
    invalidateCachedValue,
} from './viewCache';

export type HabitSnapshot = {
    habits: Habit[];
    loggedTodayIds: string[];
    activeDailyHabitIds: string[];
};

export const getHabitSnapshotCacheKey = (userId: string) => `habit-snapshot:${userId}`;

async function loadHabitSnapshot(userId: string): Promise<HabitSnapshot> {
    const todayWindow = getCurrentAppDayWindow();

    const [{ data: habitRows }, { data: logRows }] = await Promise.all([
        supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        supabase
            .from('habit_logs')
            .select('habit_id')
            .eq('user_id', userId)
            .gte('created_at', todayWindow.startIso)
            .lt('created_at', todayWindow.endIso),
    ]);

    const habits = (habitRows as Habit[] | null) ?? [];
    const loggedTodayIds = [...new Set((logRows ?? []).map((row: { habit_id: string }) => row.habit_id))];
    const activeDailyHabitIds = habits
        .filter((habit) => habit.is_good && habit.frequency === 'daily')
        .map((habit) => habit.id);

    return {
        habits,
        loggedTodayIds,
        activeDailyHabitIds,
    };
}

export async function fetchHabitSnapshot(userId: string, options?: { force?: boolean }) {
    if (options?.force) {
        const snapshot = await loadHabitSnapshot(userId);
        return writeCachedValue(getHabitSnapshotCacheKey(userId), snapshot, VIEW_CACHE_TTL_MS);
    }

    return readCachedOrLoadValue(
        getHabitSnapshotCacheKey(userId),
        () => loadHabitSnapshot(userId),
        VIEW_CACHE_TTL_MS,
    );
}

export function readCachedHabitSnapshot(userId: string) {
    return readCachedValue<HabitSnapshot>(getHabitSnapshotCacheKey(userId));
}

export function writeCachedHabitSnapshot(userId: string, snapshot: HabitSnapshot) {
    return writeCachedValue(getHabitSnapshotCacheKey(userId), snapshot, VIEW_CACHE_TTL_MS);
}

export function invalidateHabitSnapshot(userId: string) {
    invalidateCachedValue(getHabitSnapshotCacheKey(userId));
}
