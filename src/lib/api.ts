// Frontend API service for calling Supabase Edge Functions.
// All AI-related calls go through here.

import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';
import type { Habit, Quest, ShopItem } from './database.types';
import { invalidateQuestRuntime } from './questRuntime';
import {
    getAwardsCacheKey,
    getDashboardStreakCacheKey,
    getHabitsCacheKey,
    getShopCacheKey,
    invalidateCachedValue,
} from './viewCache';

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

async function isAccessTokenValid(accessToken: string): Promise<boolean> {
    const { data, error } = await supabase.auth.getUser(accessToken);
    return !error && !!data.user;
}

async function getValidAccessToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const expiresSoon = session?.expires_at
        ? (session.expires_at * 1000) <= (Date.now() + 30_000)
        : false;

    if (session?.access_token && !expiresSoon && await isAccessTokenValid(session.access_token)) {
        return session.access_token;
    }

    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
        throw new Error('Session expired. Please sign in again.');
    }

    const refreshedTokenIsValid = await isAccessTokenValid(data.session.access_token);
    if (!refreshedTokenIsValid) {
        throw new Error('Session expired. Please sign in again.');
    }

    return data.session.access_token;
}

async function getValidUser() {
    const accessToken = await getValidAccessToken();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
        throw new Error('Session expired. Please sign in again.');
    }

    return { accessToken, user: data.user };
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
    let accessToken = await getValidAccessToken();
    let response = await postEdgeFunction(name, accessToken, body);
    let parsed = await parseEdgeResponse(response);

    if (isUnauthorizedStatus(response.status, parsed.message)) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session?.access_token) {
            throw new Error('Session expired. Please sign in again.');
        }

        accessToken = data.session.access_token;
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
    const { user } = await getValidUser();

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
    const { user } = await getValidUser();

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

export async function rerollDailyQuest(questId: string): Promise<{ success: boolean; rerolled_quest: string; new_quest: Quest | null; message: string }> {
    const response = await invokeEdgeFunction<{ success: boolean; rerolled_quest: string; new_quest: Quest | null; message: string }>(
        'skip-quest',
        { quest_id: questId, mode: 'reroll' },
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
export async function buyItem(itemId: string): Promise<{ success: boolean; message: string; updates: any }> {
    const data = await invokeEdgeFunction<{ success: boolean; message: string; updates: any; error?: string }>(
        'buy-item',
        { item_id: itemId },
        'Failed to buy item'
    );

    if (data.error) {
        throw new Error(data.error);
    }

    const userId = await getSessionUserId();
    if (userId) {
        invalidateCachedValue(getShopCacheKey(userId));
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

    return data;
}

/**
 * Converts a quest into a persistent Good Habit.
 */
export async function convertToHabit(questTitle: string, statAffected?: string | null, frequency: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<Habit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const normalizedTitle = questTitle.trim();
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
        } as any)
        .select()
        .single();

    if (error || !insertedHabit) {
        throw new Error(error.message || 'Failed to convert to habit');
    }

    invalidateCachedValue(getHabitsCacheKey(session.user.id));
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
export async function purchaseShopItem(itemId: string): Promise<{ success: boolean; item: ShopItem }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Fetch the item
    const { data: item, error: itemError } = await supabase
        .from('shop_items' as any)
        .select('*')
        .eq('id', itemId)
        .eq('user_id', session.user.id)
        .single() as any;

    if (itemError || !item) {
        throw new Error('Item not found');
    }

    if (item.is_purchased) {
        throw new Error('Item already purchased');
    }

    // Fetch user gold
    const { data: profile, error: profileError } = await supabase
        .from('profiles' as any)
        .select('gold')
        .eq('id', session.user.id)
        .single() as any;

    if (profileError || !profile) {
        throw new Error('Could not fetch user profile');
    }

    if ((profile as any).gold < (item as any).cost) {
        throw new Error('Not enough gold!');
    }

    // Deduct gold directly
    await (supabase.from('profiles' as any) as any)
        .update({ gold: (profile as any).gold - (item as any).cost } as any)
        .eq('id', session.user.id);

    // Mark item as purchased
    const { data: purchasedItem, error: updateError } = await (supabase
        .from('shop_items' as any) as any)
        .update({ is_purchased: true })
        .eq('id', itemId)
        .select()
        .single();

    if (updateError) {
        throw new Error('Failed to mark item as purchased');
    }

    invalidateCachedValue(getShopCacheKey(session.user.id));
    return { success: true, item: purchasedItem as ShopItem };
}
