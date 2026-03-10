import type { Quest } from './database.types';

export const DAILY_RESET_HOUR = 3;
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

export function getVisibleDailyQuests(quests: Quest[]): Quest[] {
    const dailyQuests = quests
        .filter((quest) => quest.quest_type === 'daily')
        .sort(byCreatedAtAscending);

    return dailyQuests.slice(0, getManageableDailyCount(dailyQuests.length));
}

export function getDailyQuestProgress(visibleDailyQuests: Quest[], completedIds: Set<string>) {
    const total = visibleDailyQuests.length;
    const completed = visibleDailyQuests.filter((quest) => completedIds.has(quest.id)).length;

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

export function getNextDailyResetDate(now = new Date(), resetHour = DAILY_RESET_HOUR): Date {
    const nextReset = new Date(now);
    nextReset.setHours(resetHour, 0, 0, 0);

    if (now.getTime() >= nextReset.getTime()) {
        nextReset.setDate(nextReset.getDate() + 1);
    }

    return nextReset;
}

export function formatDailyResetClock(resetHour = DAILY_RESET_HOUR): string {
    return `${String(resetHour).padStart(2, '0')}:00`;
}

export function formatCountdownToDailyReset(now = new Date(), resetHour = DAILY_RESET_HOUR): string {
    const diffMs = Math.max(0, getNextDailyResetDate(now, resetHour).getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}
