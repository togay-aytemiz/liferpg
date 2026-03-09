// Frontend API service for calling Supabase Edge Functions.
// All AI-related calls go through here.

import { supabase } from './supabase';
import type { Quest } from './database.types';

interface GenerateQuestsResponse {
    success: boolean;
    quests: Array<Record<string, unknown>>;
    summary: {
        daily: number;
        side: number;
        boss: number;
    };
}

/**
 * Call the generate-quests Edge Function.
 * Used after onboarding when user submits their life rhythm for the first time.
 */
export async function generateQuests(lifeRhythm: string): Promise<GenerateQuestsResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('generate-quests', {
        body: { life_rhythm: lifeRhythm },
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to generate quests');
    }

    return response.data as GenerateQuestsResponse;
}

/**
 * Call the regenerate-quests Edge Function.
 * Used when user updates their life rhythm in Settings.
 * Deactivates old AI quests and generates new ones.
 */
export async function regenerateQuests(lifeRhythm: string): Promise<GenerateQuestsResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('regenerate-quests', {
        body: { life_rhythm: lifeRhythm },
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to regenerate quests');
    }

    return response.data as GenerateQuestsResponse;
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
}

/**
 * Call the complete-quest Edge Function.
 * Handles XP award, level up, stat increase, streak, and achievements.
 */
export async function completeQuest(questId: string): Promise<CompleteQuestResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('complete-quest', {
        body: { quest_id: questId },
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to complete quest');
    }

    return response.data as CompleteQuestResponse;
}

/**
 * Call the generate-rewards Edge Function.
 * LLM decides personalized real-life rewards based on user's profile.
 */
export async function generateRewards(): Promise<{ success: boolean; rewards: Array<Record<string, unknown>> }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('generate-rewards', {
        body: {},
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to generate rewards');
    }

    return response.data as { success: boolean; rewards: Array<Record<string, unknown>> };
}

/**
 * Call the skip-quest Edge Function.
 * Records that the user doesn't want this quest type. Used as negative feedback for LLM.
 * Returns the replaced quest to immediately inject into the UI.
 */
export async function skipQuest(questId: string, reason: string): Promise<{ success: boolean; skipped_quest: string; remaining_skips: number; max_skips: number; new_quest: Quest | null; message: string; hp_lost: number; died: boolean; gold_lost: number; current_hp: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('skip-quest', {
        body: { quest_id: questId, reason },
    });

    if (response.error) {
        // Attempt to extract the custom message if the limit was reached
        if (response.error.context && typeof response.error.context === 'object') {
            const errorData = response.error.context as any;
            if (errorData?.body) {
                try {
                    const parsed = JSON.parse(errorData.body);
                    if (parsed.message) throw new Error(parsed.message);
                } catch {
                    // ignore parse errors
                }
            }
        }

        // Fallback standard error extraction (Supabase functions sometimes wrap errors differently depending on the client version)
        throw new Error(response.error.message || 'Failed to skip quest');
    }

    // Double check if Edge function returned a 400/429 without throwing 'response.error' but mapped differently (depends on library version)
    if (response.data && response.data.error && response.data.message) {
        throw new Error(response.data.message);
    }

    return response.data as { success: boolean; skipped_quest: string; remaining_skips: number; max_skips: number; new_quest: Quest | null; message: string; hp_lost: number; died: boolean; gold_lost: number; current_hp: number };
}

/**
 * Call the create-custom-quest Edge Function.
 * Sends a custom prompt to the AI to evaluate and create a personalized user quest (or avoidance goal).
 */
export async function createCustomQuest(prompt: string, questType: 'daily' | 'side'): Promise<{ success: boolean; message: string; quest: Quest }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('create-custom-quest', {
        body: { prompt, quest_type: questType },
    });

    if (response.error) {
        throw new Error(response.error.message || 'Failed to create custom quest');
    }

    return response.data as { success: boolean; message: string; quest: Quest };
}
