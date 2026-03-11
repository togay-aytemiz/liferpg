// Frontend API service for calling Supabase Edge Functions.
// All AI-related calls go through here.

import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';
import type { Habit, InventoryItem, Quest, ShopItem } from './database.types';
import { getAppDayKey } from './appDay';
import { invalidateQuestRuntime } from './questRuntime';
import {
    getAwardsCacheKey,
    getDashboardStreakCacheKey,
    getInventoryCacheKey,
    getShopCacheKey,
    invalidateCachedValue,
} from './viewCache';
import { emitAppRuntimeChanged, emitHabitRuntimeChanged } from './habitEvents';
import type { RerollReasonBucket } from './rerollReasons';
import { getSuggestedHabitRewards } from './habitGameplay';
import { invalidateHabitSnapshot } from './habitSnapshot';

interface GenerateQuestsResponse {
    success: boolean;
    quests: Array<Record<string, unknown>>;
    summary: {
        daily: number;
        side: number;
        boss: number;
        chain: number;
    };
}

type EdgeJsonBody = Record<string, any> | undefined;

interface ParsedEdgeResponse {
    contentType: string;
    data: unknown;
    message: string | null;
}

const EDGE_FUNCTIONS_BASE_URL = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
const dailySettlementInflight = new Map<string, Promise<DailySettlementResponse>>();
const dailySettlementResultCache = new Map<string, { result: DailySettlementResponse; expiresAt: number }>();
const DAILY_SETTLEMENT_RESULT_TTL_MS = 60_000;

function isUnauthorizedStatus(status: number, message: string | null): boolean {
    if (status === 401) return true;
    return /(^|\W)401(\W|$)|unauthorized|missing authorization/i.test(message ?? '');
}

async function parseEdgeResponse(response: Response): Promise<ParsedEdgeResponse> {
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();

    if (response.status === 204) {
        return { contentType, data: null, message: null };
    }

    if (contentType === 'application/json') {
        const json = await response.json().catch(() => null);
        const payload = json as { message?: string; error?: string } | null;
        return {
            contentType,
            data: json,
            message: payload?.message ?? payload?.error ?? null,
        };
    }

    const text = await response.text().catch(() => '');
    return {
        contentType,
        data: text,
        message: text || null,
    };
}

async function getSessionContext(options?: { forceRefresh?: boolean }) {
    const { data: { session } } = await supabase.auth.getSession();
    let activeSession = session;
    const expiresSoon = activeSession?.expires_at
        ? (activeSession.expires_at * 1000) <= (Date.now() + 30_000)
        : false;

    if (options?.forceRefresh || expiresSoon) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session?.access_token || !data.session.user) {
            throw new Error('Session expired. Please sign in again.');
        }
        activeSession = data.session;
    }

    if (!activeSession?.access_token || !activeSession.user) {
        throw new Error('Session expired. Please sign in again.');
    }

    return {
        accessToken: activeSession.access_token,
        user: activeSession.user,
    };
}

async function getSessionUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user.id ?? null;
}

async function postEdgeFunction(
    name: string,
    accessToken: string,
    body: EdgeJsonBody
) {
    return fetch(`${EDGE_FUNCTIONS_BASE_URL}/${name}`, {
        method: 'POST',
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
    });
}

async function invokeEdgeFunction<T>(
    name: string,
    body: EdgeJsonBody,
    fallbackError: string
): Promise<T> {
    let { accessToken } = await getSessionContext();
    let response = await postEdgeFunction(name, accessToken, body);
    let parsed = await parseEdgeResponse(response);

    if (isUnauthorizedStatus(response.status, parsed.message)) {
        ({ accessToken } = await getSessionContext({ forceRefresh: true }));
        response = await postEdgeFunction(name, accessToken, body);
        parsed = await parseEdgeResponse(response);

        if (isUnauthorizedStatus(response.status, parsed.message)) {
            throw new Error(parsed.message || 'Session expired. Please sign in again.');
        }
    }

    if (!response.ok) {
        throw new Error(parsed.message || fallbackError);
    }

    return parsed.data as T;
}

/**
 * Call the generate-quests Edge Function.
 * Used after onboarding when user submits their life rhythm for the first time.
 */
export async function generateQuests(lifeRhythm: string): Promise<GenerateQuestsResponse> {
    const { user } = await getSessionContext();

    // Fetch active habits context
    const { data: activeHabits } = await supabase
        .from('habits')
        .select('title, frequency')
        .eq('user_id', user.id)
        .eq('is_active', true);

    const response = await invokeEdgeFunction<GenerateQuestsResponse>(
        'generate-quests',
        { life_rhythm: lifeRhythm, active_habits: activeHabits || [] },
        'Failed to generate quests'
    );

    invalidateQuestRuntime(user.id);
    return response;
}

/**
 * Call the regenerate-quests Edge Function.
 * Used when user updates their life rhythm in Settings.
 * Deactivates old AI quests and generates new ones.
 */
export async function regenerateQuests(lifeRhythm: string): Promise<GenerateQuestsResponse> {
    const { user } = await getSessionContext();

    // Fetch active habits context
    const { data: activeHabits } = await supabase
        .from('habits')
        .select('title, frequency')
        .eq('user_id', user.id)
        .eq('is_active', true);

    const response = await invokeEdgeFunction<GenerateQuestsResponse>(
        'regenerate-quests',
        { life_rhythm: lifeRhythm, active_habits: activeHabits || [] },
        'Failed to regenerate quests'
    );

    invalidateQuestRuntime(user.id);
    return response;
}

export interface CompleteQuestResponse {
    success: boolean;
    xp_awarded: number;
    gold_awarded: number;
    new_xp: number;
    new_level: number;
    did_level_up: boolean;
    streak: number;
    xp_multiplier: number;
    new_achievements: string[];
    stat_updated: string | null;
    new_hp: number;
    chain_unlocked: string | null;
}

export interface DailySettlementResponse {
    success: boolean;
    settled: boolean;
    checked_in: boolean;
    current_app_day: string;
    previous_app_day: string;
    hp_penalty: number;
    freeze_consumed: boolean;
    streak_reset: boolean;
    rotated_daily_pool: boolean;
    streak: number;
    xp_multiplier: number;
}

/**
 * Call the complete-quest Edge Function.
 * Handles XP award, level up, stat increase, streak, and achievements.
 */
export async function completeQuest(questId: string): Promise<CompleteQuestResponse> {
    const response = await invokeEdgeFunction<CompleteQuestResponse>(
        'complete-quest',
        { quest_id: questId },
        'Failed to complete quest'
    );

    const userId = await getSessionUserId();
    if (userId) {
        invalidateQuestRuntime(userId);
        invalidateCachedValue(getDashboardStreakCacheKey(userId));
        invalidateCachedValue(getAwardsCacheKey(userId));
        invalidateCachedValue(getShopCacheKey(userId));
    }

    return response;
}

export async function settleDailyIfNeeded(): Promise<DailySettlementResponse> {
    const { user } = await getSessionContext();
    const cacheKey = `${user.id}:${getAppDayKey()}`;
    const cached = dailySettlementResultCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.result;
    }

    const existing = dailySettlementInflight.get(cacheKey);
    if (existing) {
        return existing;
    }

    const request = invokeEdgeFunction<DailySettlementResponse>(
        'settle-daily',
        {},
        'Failed to settle daily state',
    ).then((response) => {
        if (response.settled || response.checked_in) {
            invalidateQuestRuntime(user.id);
            invalidateCachedValue(getDashboardStreakCacheKey(user.id));
            invalidateCachedValue(getShopCacheKey(user.id));
            emitAppRuntimeChanged();
        }

        dailySettlementResultCache.set(cacheKey, {
            result: response,
            expiresAt: Date.now() + DAILY_SETTLEMENT_RESULT_TTL_MS,
        });
        return response;
    }).finally(() => {
        dailySettlementInflight.delete(cacheKey);
    });

    dailySettlementInflight.set(cacheKey, request);
    return request;
}

/**
 * Call the generate-rewards Edge Function.
 * LLM decides personalized real-life rewards based on user's profile.
 */
export async function generateRewards(forceRegenerate = false): Promise<{ success: boolean; rewards: Array<Record<string, unknown>> }> {
    return invokeEdgeFunction<{ success: boolean; rewards: Array<Record<string, unknown>> }>(
        'generate-rewards',
        { force_regenerate: forceRegenerate },
        'Failed to generate rewards'
    );
}

/**
 * Call the skip-quest Edge Function.
 * Records that the user doesn't want this quest type. Used as negative feedback for LLM.
 * Returns the replaced quest to immediately inject into the UI.
 */
export async function skipQuest(questId: string, reason: string): Promise<{ success: boolean; skipped_quest: string; remaining_skips: number; max_skips: number; new_quest: Quest | null; message: string; hp_lost: number; died: boolean; gold_lost: number; current_hp: number }> {
    const data = await invokeEdgeFunction<{ success: boolean; skipped_quest: string; remaining_skips: number; max_skips: number; new_quest: Quest | null; message: string; hp_lost: number; died: boolean; gold_lost: number; current_hp: number }>(
        'skip-quest',
        { quest_id: questId, reason },
        'Failed to skip quest'
    );

    // Double check if Edge function returned a 400/429 without throwing 'response.error' but mapped differently (depends on library version)
    if ((data as any)?.error && (data as any)?.message) {
        throw new Error((data as any).message);
    }

    const userId = await getSessionUserId();
    if (userId) {
        invalidateQuestRuntime(userId);
        invalidateCachedValue(getShopCacheKey(userId));
        invalidateCachedValue(getDashboardStreakCacheKey(userId));
    }

    return data;
}

export async function regenerateQuest(questId: string, reason: string): Promise<{ success: boolean; skipped_quest: string; remaining_skips: number; max_skips: number; new_quest: Quest | null; message: string; hp_lost: number; died: boolean; gold_lost: number; current_hp: number }> {
    return skipQuest(questId, reason);
}

export async function rerollDailyQuest(
    questId: string,
    reasonBucket: RerollReasonBucket,
    reasonDetail?: string,
): Promise<{ success: boolean; rerolled_quest: string; new_quest: Quest | null; message: string; reroll_reason?: string }> {
    const response = await invokeEdgeFunction<{ success: boolean; rerolled_quest: string; new_quest: Quest | null; message: string }>(
        'skip-quest',
        {
            quest_id: questId,
            mode: 'reroll',
            reason_bucket: reasonBucket,
            reason_detail: reasonDetail?.trim() || undefined,
        },
        'Failed to reroll daily quest'
    );

    const userId = await getSessionUserId();
    if (userId) {
        invalidateQuestRuntime(userId);
    }

    return response;
}

/**
 * Call the create-custom-quest Edge Function.
 * Sends a custom prompt to the AI to evaluate and create a personalized user quest (or avoidance goal).
 */
export async function createCustomQuest(prompt: string, questType: 'daily' | 'side'): Promise<{ success: boolean; message: string; quest: Quest }> {
    const response = await invokeEdgeFunction<{ success: boolean; message: string; quest: Quest }>(
        'create-custom-quest',
        { prompt, quest_type: questType },
        'Failed to create custom quest'
    );

    const userId = await getSessionUserId();
    if (userId) {
        invalidateQuestRuntime(userId);
    }

    return response;
}

/**
 * Call the buy-item Edge Function.
 * Spends user gold to purchase items like Health Potions, XP Scrolls, or Streak Freezes.
 */
export async function buyItem(itemId: string): Promise<{ success: boolean; message: string; inventory_item?: InventoryItem; gold_remaining?: number }> {
    const data = await invokeEdgeFunction<{ success: boolean; message: string; inventory_item?: InventoryItem; gold_remaining?: number; error?: string }>(
        'buy-item',
        { item_id: itemId, item_source: 'static' },
        'Failed to buy item'
    );

    if (data.error) {
        throw new Error(data.error);
    }

    const userId = await getSessionUserId();
    if (userId) {
        invalidateCachedValue(getShopCacheKey(userId));
        invalidateCachedValue(getInventoryCacheKey(userId));
    }

    return data;
}

/**
 * Call the log_habit Postgres RPC function.
 * Tracks a daily habit and applies Stat/XP/HP/Gold changes based on whether it is good or bad.
 */
export async function logHabit(habitId: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('log_habit' as any, {
        p_habit_id: habitId,
    } as any);

    if (error) {
        throw new Error(error.message || 'Failed to log habit');
    }

    invalidateCachedValue(getAwardsCacheKey(session.user.id));
    invalidateCachedValue(getShopCacheKey(session.user.id));
    invalidateCachedValue(getDashboardStreakCacheKey(session.user.id));
    invalidateQuestRuntime(session.user.id);
    invalidateHabitSnapshot(session.user.id);
    emitHabitRuntimeChanged();

    return data;
}

/**
 * Converts a quest into a persistent Good Habit.
 */
export async function convertToHabit(questTitle: string, statAffected?: string | null, frequency: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<Habit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data: profile } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', session.user.id)
        .single() as { data: { level: number } | null; error: unknown };

    const normalizedTitle = questTitle.trim();
    const habitRewards = getSuggestedHabitRewards({
        frequency,
        isGood: true,
        level: profile?.level,
    });
    const { data: existingHabit } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('title', normalizedTitle)
        .eq('is_active', true)
        .maybeSingle();

    if (existingHabit) {
        return existingHabit as Habit;
    }

    const { data: insertedHabit, error } = await supabase
        .from('habits')
        .insert({
            user_id: session.user.id,
            title: normalizedTitle,
            is_good: true,
            stat_affected: statAffected || 'strength',
            frequency: frequency,
            xp_reward: habitRewards.xpReward,
            gold_reward: habitRewards.goldReward,
            stat_points: habitRewards.statPoints,
        } as any)
        .select()
        .single();

    if (error || !insertedHabit) {
        throw new Error(error.message || 'Failed to convert to habit');
    }

    invalidateHabitSnapshot(session.user.id);
    invalidateQuestRuntime(session.user.id);
    emitHabitRuntimeChanged();
    return insertedHabit as Habit;
}

/**
 * Call the generate-shop Edge Function.
 * AI designs personalized real-life rewards (expires in 7 days).
 */
export async function generateShopItems(): Promise<{ success: boolean; items: ShopItem[] }> {
    const response = await invokeEdgeFunction<{ success: boolean; items: ShopItem[] }>(
        'generate-shop',
        {},
        'Failed to generate shop items'
    );

    const userId = await getSessionUserId();
    if (userId) {
        invalidateCachedValue(getShopCacheKey(userId));
    }

    return response;
}

/**
 * Purchase a dynamic real-life shop item.
 * Deducts gold and marks the item as purchased.
 */
export async function purchaseShopItem(itemId: string): Promise<{ success: boolean; message: string; inventory_item?: InventoryItem; gold_remaining?: number }> {
    const data = await invokeEdgeFunction<{ success: boolean; message: string; inventory_item?: InventoryItem; gold_remaining?: number; error?: string }>(
        'buy-item',
        { item_id: itemId, item_source: 'dynamic' },
        'Failed to purchase shop item',
    );

    if (data.error) {
        throw new Error(data.error);
    }

    const userId = await getSessionUserId();
    if (userId) {
        invalidateCachedValue(getShopCacheKey(userId));
        invalidateCachedValue(getInventoryCacheKey(userId));
    }

    return data;
}

export async function useInventoryItem(inventoryItemId: string): Promise<{ success: boolean; message: string; inventory_item?: InventoryItem | null; profile_updates?: Record<string, unknown> }> {
    const response = await invokeEdgeFunction<{ success: boolean; message: string; inventory_item?: InventoryItem | null; profile_updates?: Record<string, unknown> }>(
        'use-inventory-item',
        { inventory_item_id: inventoryItemId },
        'Failed to use inventory item',
    );

    const userId = await getSessionUserId();
    if (userId) {
        invalidateCachedValue(getInventoryCacheKey(userId));
        invalidateCachedValue(getShopCacheKey(userId));
        invalidateCachedValue(getDashboardStreakCacheKey(userId));
        invalidateCachedValue(getAwardsCacheKey(userId));
    }

    return response;
}
