import type { Habit } from './database.types';

export const BAD_HABIT_HP_LOSS = 5;
export const BAD_HABIT_GOLD_LOSS = 2;

export type HabitRewardProfile = {
    xpReward: number;
    goldReward: number;
    statPoints: number;
};

export function getSuggestedHabitRewards(options: {
    frequency: Habit['frequency'];
    isGood: boolean;
    level?: number | null;
}) {
    const level = Math.max(1, options.level ?? 1);

    if (!options.isGood) {
        return {
            xpReward: 0,
            goldReward: 0,
            statPoints: 1,
        } satisfies HabitRewardProfile;
    }

    const levelTier = Math.floor((level - 1) / 10);

    switch (options.frequency) {
        case 'weekly':
            return {
                xpReward: 16 + levelTier * 2,
                goldReward: 8 + levelTier * 2,
                statPoints: 2,
            } satisfies HabitRewardProfile;
        case 'monthly':
            return {
                xpReward: 35 + levelTier * 4,
                goldReward: 18 + levelTier * 3,
                statPoints: 3,
            } satisfies HabitRewardProfile;
        case 'daily':
        default:
            return {
                xpReward: 5 + levelTier,
                goldReward: 2 + Math.min(levelTier, 3),
                statPoints: 1,
            } satisfies HabitRewardProfile;
    }
}

export function getHabitXpReward(habit: Habit) {
    return Math.max(habit.xp_reward ?? 0, 0);
}

export function getHabitGoldReward(habit: Habit) {
    return Math.max(habit.gold_reward ?? 0, 0);
}

export function getHabitStatPoints(habit: Habit) {
    return Math.max(habit.stat_points ?? 1, 0);
}

export function getHabitSubtitle(habit: Habit, isLoggedToday: boolean): string {
    if (habit.is_good) {
        return isLoggedToday
            ? 'Completed for today. Counts toward your daily progress.'
            : 'Build a positive routine and strengthen your consistency.';
    }

    return isLoggedToday
        ? 'Tracked today. This one does not help daily progress.'
        : 'Track a slip or avoidable action to stay honest with yourself.';
}
