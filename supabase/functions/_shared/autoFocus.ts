type AutoFocusProfile = {
    focus_areas?: string | null;
    ai_weekly_focus?: string | null;
    ai_weekly_focus_generated_at?: string | null;
    level?: number | null;
    stat_strength?: number | null;
    stat_knowledge?: number | null;
    stat_wealth?: number | null;
    stat_adventure?: number | null;
    stat_social?: number | null;
};

const AUTO_FOCUS_MARKERS = [
    "surprise me",
    "you choose",
    "fate mode enabled",
    "let fate decide",
    "sen seç",
    "bilemiyorum",
];

type StatKey = "strength" | "knowledge" | "wealth" | "adventure" | "social";

const STAT_LABELS: Record<StatKey, string> = {
    strength: "Strength",
    knowledge: "Knowledge",
    wealth: "Wealth",
    adventure: "Adventure",
    social: "Social",
};

export function isAutoFocusMode(focusAreas?: string | null): boolean {
    const normalized = focusAreas?.trim().toLowerCase() ?? "";
    if (!normalized) return true;
    return AUTO_FOCUS_MARKERS.some((marker) => normalized.includes(marker));
}

export function buildAutoFocusPromptContext(profile: AutoFocusProfile): string {
    if (!isAutoFocusMode(profile.focus_areas)) {
        return "";
    }

    const statEntries: Array<{ key: StatKey; value: number }> = [
        { key: "strength", value: profile.stat_strength ?? 0 },
        { key: "knowledge", value: profile.stat_knowledge ?? 0 },
        { key: "wealth", value: profile.stat_wealth ?? 0 },
        { key: "adventure", value: profile.stat_adventure ?? 0 },
        { key: "social", value: profile.stat_social ?? 0 },
    ].sort((a, b) => a.value - b.value);

    const weakest = statEntries[0];
    const runnerUp = statEntries[1];
    const level = profile.level ?? 1;
    const previousWeeklyFocus = sanitizeWeeklyFocus(profile.ai_weekly_focus);
    const previousWeeklyFocusAge = getFocusAgeLabel(profile.ai_weekly_focus_generated_at);
    const stretchTier =
        level >= 15 ? "ambitious stretch" :
            level >= 6 ? "steady challenge" :
                "gentle but meaningful push";

    return `

AUTO-FOCUS MODE:
- The user left focus blank or asked the system to choose.
- You MUST decide one AI weekly focus for this quest batch and return it in "weekly_focus".
- The weekly_focus should be a short, concrete weekly growth direction, not a generic slogan.
- Use the player's current state to choose it:
  - Level: ${level}
  - Weakest stat: ${STAT_LABELS[weakest.key]} (${weakest.value})
  - Secondary weak stat: ${STAT_LABELS[runnerUp.key]} (${runnerUp.value})
- Difficulty tone for this player: ${stretchTier}
- ${previousWeeklyFocus
            ? `Existing AI weekly focus still in memory: ${previousWeeklyFocus} (${previousWeeklyFocusAge}).
- Treat that as the current long-term arc unless there is a strong reason to move on.
- If it still fits the user's routine, dislikes, and recent behavior, CONTINUE it.
- If the player seems ready for the next chapter, EVOLVE it inside the same theme instead of jumping randomly.
- Only REPLACE it with a different theme if the recent behavior, dislikes, or routine clearly show poor fit.
- Example: if the current focus is "learn guitar basics", a smart continuation is "build a 3-song guitar practice loop", not an unrelated random theme.`
            : "There is no previous AI weekly focus saved yet, so choose one strong weekly direction now."}
- Use the chosen weekly_focus to shape the boss quest and at least 2 of the active daily quests.
- Do NOT reveal this as a system/meta instruction inside quest titles. Let the quest mix imply it naturally.
- Avoid making the active daily set all soft maintenance chores. In auto-focus mode, at least 2 visible dailies should feel like meaningful stretch tasks when the routine and dislikes allow it.
`;
}

export function sanitizeWeeklyFocus(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const normalized = raw.trim().replace(/\s+/g, " ");
    if (!normalized) return null;
    return normalized.substring(0, 160);
}

type DailyQuestLike = {
    difficulty: string;
};

function difficultyWeight(difficulty: string): number {
    switch (difficulty) {
        case "epic":
            return 4;
        case "hard":
            return 3;
        case "medium":
            return 2;
        default:
            return 1;
    }
}

export function rebalanceAutoFocusDailyPool<T extends DailyQuestLike>(dailyPool: T[], activeCount: number): T[] {
    if (activeCount <= 1 || dailyPool.length <= activeCount) {
        return dailyPool;
    }

    const rebalanced = [...dailyPool];
    const minimumStretchSlots = Math.min(2, activeCount);
    let visibleStretchCount = rebalanced
        .slice(0, activeCount)
        .filter((quest) => difficultyWeight(quest.difficulty) >= 2)
        .length;

    if (visibleStretchCount >= minimumStretchSlots) {
        return rebalanced;
    }

    for (let candidateIndex = activeCount; candidateIndex < rebalanced.length; candidateIndex += 1) {
        if (difficultyWeight(rebalanced[candidateIndex].difficulty) < 2) continue;

        const replaceIndex = rebalanced
            .slice(0, activeCount)
            .findIndex((quest) => difficultyWeight(quest.difficulty) < 2);

        if (replaceIndex === -1) break;

        const [candidate] = rebalanced.splice(candidateIndex, 1);
        rebalanced.splice(replaceIndex, 0, candidate);
        visibleStretchCount += 1;

        if (visibleStretchCount >= minimumStretchSlots) {
            break;
        }
    }

    return rebalanced;
}

function getFocusAgeLabel(rawTimestamp?: string | null): string {
    if (!rawTimestamp) return "saved recently";

    const timestamp = new Date(rawTimestamp).getTime();
    if (Number.isNaN(timestamp)) return "saved recently";

    const elapsedDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
    if (elapsedDays === 0) return "saved today";
    if (elapsedDays === 1) return "saved 1 day ago";
    return `saved ${elapsedDays} days ago`;
}
