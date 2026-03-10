import type { Profile } from './database.types';

export function hasCompletedOnboarding(profile: Pick<Profile, 'life_rhythm'> | null | undefined): boolean {
    return typeof profile?.life_rhythm === 'string' && profile.life_rhythm.trim().length > 0;
}
