// Frontend API service for calling Supabase Edge Functions.
// All AI-related calls go through here.

import { supabase } from './supabase';

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
