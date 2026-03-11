import type { QuestDifficulty, QuestType } from './database.types';

const GOLD_BY_TYPE_AND_DIFFICULTY: Record<QuestType, Record<QuestDifficulty, number>> = {
    daily: {
        easy: 8,
        medium: 10,
        hard: 14,
        epic: 18,
    },
    side: {
        easy: 12,
        medium: 18,
        hard: 24,
        epic: 32,
    },
    boss: {
        easy: 25,
        medium: 35,
        hard: 60,
        epic: 90,
    },
};

export function getQuestGoldReward(
    questType: QuestType,
    difficulty: QuestDifficulty,
    existingGoldReward?: number | null
): number {
    const baseline = GOLD_BY_TYPE_AND_DIFFICULTY[questType]?.[difficulty] ?? 0;

    if (typeof existingGoldReward === 'number' && existingGoldReward > 0) {
        return Math.max(existingGoldReward, baseline);
    }

    return baseline;
}
