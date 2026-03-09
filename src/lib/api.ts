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
