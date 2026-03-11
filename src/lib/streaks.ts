import { getAppDayKey, getPreviousAppDayKey } from './appDay.ts';

export type StreakStateLike = {
    current_streak?: number | null;
    longest_streak?: number | null;
    last_active_date?: string | null;
};

export type AppDayCheckInResult = {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
    xpMultiplier: number;
    checkedInToday: boolean;
    incremented: boolean;
};

export type AppDayCheckInOptions = {
    previousSettledAppDay?: string | null;
    legacyPreviousAppActivity?: boolean;
};

export function getXpMultiplierForStreak(streak: number) {
    if (streak >= 30) return 1.25;
    if (streak >= 7) return 1.10;
    if (streak >= 3) return 1.05;
    return 1.0;
}

export function applyAppDayCheckIn(
    streak: StreakStateLike | null | undefined,
    today = getAppDayKey(),
    options?: AppDayCheckInOptions,
): AppDayCheckInResult {
    const previousDay = getPreviousAppDayKey(today);
    const previousStreak = Math.max(0, streak?.current_streak ?? 0);
    const previousLongest = Math.max(0, streak?.longest_streak ?? 0);
    const lastActiveDate = streak?.last_active_date ?? null;
    const canRecoverLegacyPreviousDay = previousStreak <= 1 && (
        options?.previousSettledAppDay === previousDay ||
        options?.legacyPreviousAppActivity === true
    );

    let currentStreak = previousStreak;
    let checkedInToday = false;
    let incremented = false;

    if (lastActiveDate === today) {
        currentStreak = Math.max(previousStreak, 1);
        checkedInToday = true;
        if (currentStreak === 1 && canRecoverLegacyPreviousDay) {
            currentStreak = 2;
            incremented = true;
        }
    } else if (lastActiveDate === previousDay) {
        currentStreak = Math.max(previousStreak, 0) + 1;
        checkedInToday = true;
        incremented = true;
    } else if (canRecoverLegacyPreviousDay) {
        currentStreak = Math.max(previousStreak, 1) + 1;
        checkedInToday = true;
        incremented = true;
    } else {
        currentStreak = 1;
        checkedInToday = true;
    }

    const longestStreak = Math.max(previousLongest, currentStreak);

    return {
        currentStreak,
        longestStreak,
        lastActiveDate: today,
        xpMultiplier: getXpMultiplierForStreak(currentStreak),
        checkedInToday,
        incremented,
    };
}
