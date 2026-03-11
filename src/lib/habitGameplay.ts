import type { Habit } from './database.types';

export const GOOD_HABIT_XP_REWARD = 5;
export const GOOD_HABIT_STAT_GAIN = 1;
export const BAD_HABIT_HP_LOSS = 5;
export const BAD_HABIT_GOLD_LOSS = 2;

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
