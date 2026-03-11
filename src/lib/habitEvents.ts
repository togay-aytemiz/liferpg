import type { Habit } from './database.types';

export const HABIT_CREATED_EVENT = 'liferpg:habit-created';
export const HABIT_RUNTIME_CHANGED_EVENT = 'liferpg:habit-runtime-changed';
export const APP_RUNTIME_CHANGED_EVENT = 'liferpg:app-runtime-changed';

export function emitHabitCreated(habit: Habit) {
    window.dispatchEvent(new CustomEvent<Habit>(HABIT_CREATED_EVENT, { detail: habit }));
}

export function emitHabitRuntimeChanged() {
    window.dispatchEvent(new Event(HABIT_RUNTIME_CHANGED_EVENT));
}

export function emitAppRuntimeChanged() {
    window.dispatchEvent(new Event(APP_RUNTIME_CHANGED_EVENT));
}
