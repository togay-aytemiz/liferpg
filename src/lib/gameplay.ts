import type { Quest } from './database.types';
import { dedupeDailyPool } from './dailyPool';
import {
    DAILY_RESET_HOUR,
    formatDailyResetClock,
    getNextDailyResetDate,
} from './appDay';

export const MAX_DAILY_QUEST_REGENERATIONS = 3;

export function xpRequiredForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.8));
}

export function getManageableDailyCount(poolSize: number): number {
    if (poolSize <= 0) return 0;
    if (poolSize <= 3) return poolSize;
    return Math.min(Math.max(poolSize - 2, 3), 5);
}

function byCreatedAtAscending(a: Quest, b: Quest): number {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function compareVisibleDailyPriority(a: Quest, b: Quest): number {
    const aCustomPriority = a.is_custom ? 0 : 1;
    const bCustomPriority = b.is_custom ? 0 : 1;
    if (aCustomPriority !== bCustomPriority) {
        return aCustomPriority - bCustomPriority;
    }

    if (a.is_custom && b.is_custom) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return byCreatedAtAscending(a, b);
}

export function getVisibleDailyQuests(quests: Quest[]): Quest[] {
    const dailyQuests = quests
        .filter((quest) => quest.quest_type === 'daily')
        .sort(compareVisibleDailyPriority);

    const customDailyQuests = dedupeDailyPool(
        dailyQuests.filter((quest) => quest.is_custom),
        { preferActive: true },
    ).sort(compareVisibleDailyPriority);

    const aiDailyQuests = dedupeDailyPool(
        dailyQuests.filter((quest) => !quest.is_custom),
        { preferActive: true },
    );

    return [
        ...customDailyQuests,
        ...aiDailyQuests.slice(0, getManageableDailyCount(aiDailyQuests.length)),
    ];
}

export function getDailyQuestProgress(visibleDailyQuests: Quest[], completedIds: Set<string>) {
    const total = visibleDailyQuests.length;
    const completed = visibleDailyQuests.filter((quest) => completedIds.has(quest.id)).length;

    return { completed, total };
}

export function getDailyObjectiveProgress(
    visibleDailyQuests: Quest[],
    completedQuestIds: Set<string>,
    activeDailyHabitIds: string[],
    loggedDailyHabitIds: string[],
) {
    const completedHabitIds = new Set(loggedDailyHabitIds);
    const total = visibleDailyQuests.length + activeDailyHabitIds.length;
    const completed =
        visibleDailyQuests.filter((quest) => completedQuestIds.has(quest.id)).length +
        activeDailyHabitIds.filter((habitId) => completedHabitIds.has(habitId)).length;

    return { completed, total };
}

export function getVisibleWeeklyBoss(quests: Quest[], completedIds: Set<string>): Quest | null {
    const bosses = quests.filter((quest) => quest.quest_type === 'boss');
    if (bosses.length === 0) return null;

    const sortedBosses = [...bosses].sort((a, b) => {
        const aCompleted = completedIds.has(a.id) ? 1 : 0;
        const bCompleted = completedIds.has(b.id) ? 1 : 0;
        if (aCompleted !== bCompleted) return aCompleted - bCompleted;

        const aStep = a.chain_step ?? 1;
        const bStep = b.chain_step ?? 1;
        if (a.chain_id && b.chain_id && a.chain_id === b.chain_id && aStep !== bStep) {
            return aStep - bStep;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sortedBosses[0] ?? null;
}

export function formatCountdownToDailyReset(now = new Date(), resetHour = DAILY_RESET_HOUR): string {
    const diffMs = Math.max(0, getNextDailyResetDate(now, { resetHour }).getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export { DAILY_RESET_HOUR, formatDailyResetClock, getNextDailyResetDate };
