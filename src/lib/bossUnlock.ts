import type { QuestDifficulty } from './database.types';

export type BossUnlockRuleMode = 'any' | 'all';

export type BossUnlockConfig = {
    unlock_daily_required: number;
    unlock_side_required: number;
    unlock_rule_mode: BossUnlockRuleMode;
};

export type BossUnlockProgress = BossUnlockConfig & {
    daily_completed: number;
    side_completed: number;
    remaining_daily: number;
    remaining_side: number;
    unlocked: boolean;
};

type BossUnlockOptions = {
    difficulty: QuestDifficulty;
    activeDailyCount: number;
    sideQuestCount: number;
};

function clampRequirement(value: number, maxAvailable: number): number {
    if (maxAvailable <= 0) return 0;
    return Math.max(1, Math.min(value, maxAvailable));
}

export function getBossUnlockConfig({
    difficulty,
    activeDailyCount,
    sideQuestCount,
}: BossUnlockOptions): BossUnlockConfig {
    if (difficulty === 'epic') {
        return {
            unlock_daily_required: clampRequirement(4, activeDailyCount),
            unlock_side_required: sideQuestCount > 0 ? 1 : 0,
            unlock_rule_mode: sideQuestCount > 0 ? 'all' : 'all',
        };
    }

    return {
        unlock_daily_required: clampRequirement(3, activeDailyCount),
        unlock_side_required: sideQuestCount > 0 ? 1 : 0,
        unlock_rule_mode: sideQuestCount > 0 ? 'any' : 'all',
    };
}

export function evaluateBossUnlock(
    config: BossUnlockConfig,
    counts: { daily_completed: number; side_completed: number },
): BossUnlockProgress {
    const remainingDaily = Math.max(0, config.unlock_daily_required - counts.daily_completed);
    const remainingSide = Math.max(0, config.unlock_side_required - counts.side_completed);

    const hasDailyRequirement = config.unlock_daily_required > 0;
    const hasSideRequirement = config.unlock_side_required > 0;

    const dailyMet = !hasDailyRequirement || remainingDaily === 0;
    const sideMet = !hasSideRequirement || remainingSide === 0;

    let unlocked = false;
    if (!hasDailyRequirement && !hasSideRequirement) {
        unlocked = true;
    } else if (config.unlock_rule_mode === 'any') {
        unlocked = (hasDailyRequirement && dailyMet) || (hasSideRequirement && sideMet);
    } else {
        unlocked = dailyMet && sideMet;
    }

    return {
        ...config,
        daily_completed: counts.daily_completed,
        side_completed: counts.side_completed,
        remaining_daily: remainingDaily,
        remaining_side: remainingSide,
        unlocked,
    };
}

function pluralize(label: string, count: number): string {
    return `${count} ${label}${count === 1 ? '' : 's'}`;
}

export function formatBossUnlockRequirement(progress: BossUnlockConfig): string {
    const hasDailyRequirement = progress.unlock_daily_required > 0;
    const hasSideRequirement = progress.unlock_side_required > 0;

    if (hasDailyRequirement && hasSideRequirement) {
        const joiner = progress.unlock_rule_mode === 'any' ? 'or' : 'and';
        return `Unlocks after ${pluralize('daily objective', progress.unlock_daily_required)} ${joiner} ${pluralize('side quest', progress.unlock_side_required)}.`;
    }

    if (hasDailyRequirement) {
        return `Unlocks after ${pluralize('daily objective', progress.unlock_daily_required)}.`;
    }

    if (hasSideRequirement) {
        return `Unlocks after ${pluralize('side quest', progress.unlock_side_required)}.`;
    }

    return 'Ready now.';
}

export function formatBossUnlockRemaining(progress: BossUnlockProgress): string {
    if (progress.unlocked) {
        return 'Boss unlocked. The weekly fight is ready.';
    }

    const hasDailyRequirement = progress.unlock_daily_required > 0;
    const hasSideRequirement = progress.unlock_side_required > 0;

    if (hasDailyRequirement && hasSideRequirement) {
        if (progress.unlock_rule_mode === 'any') {
            return `${pluralize('daily objective', progress.remaining_daily)} or ${pluralize('side quest', progress.remaining_side)} remaining.`;
        }

        return `${pluralize('daily objective', progress.remaining_daily)} and ${pluralize('side quest', progress.remaining_side)} remaining.`;
    }

    if (hasDailyRequirement) {
        return `${pluralize('daily objective', progress.remaining_daily)} remaining.`;
    }

    if (hasSideRequirement) {
        return `${pluralize('side quest', progress.remaining_side)} remaining.`;
    }

    return 'Boss unlocked. The weekly fight is ready.';
}
