import type { Habit } from './database.types';

export const HABIT_CREATED_EVENT = 'liferpg:habit-created';

export function emitHabitCreated(habit: Habit) {
    window.dispatchEvent(new CustomEvent<Habit>(HABIT_CREATED_EVENT, { detail: habit }));
}
