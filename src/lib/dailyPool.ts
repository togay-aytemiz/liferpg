type DailyQuestLike = {
    title: string;
    description?: string | null;
    stat_affected?: string | null;
    created_at?: string;
    is_active?: boolean;
};

export const LATEST_QUEST_BATCH_WINDOW_MS = 5_000;

const TITLE_STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "my",
    "your",
    "our",
    "for",
    "to",
    "of",
    "in",
    "on",
    "at",
    "with",
    "into",
    "from",
    "up",
    "out",
    "today",
    "daily",
    "quest",
    "mission",
]);

const TITLE_SUFFIX_WORDS = new Set([
    "routine",
    "session",
    "challenge",
    "block",
    "ritual",
    "reset",
    "practice",
    "prep",
    "hour",
    "hours",
    "minute",
    "minutes",
]);

function stripAccents(value: string): string {
    return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeQuestText(value: string): string {
    return stripAccents(value)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeToken(token: string): string {
    return token
        .replace(/\d+/g, "n")
        .replace(/^(read|reading)$/, "read")
        .replace(/^(learn|learning)$/, "learn")
        .replace(/^(stretch|stretching)$/, "stretch")
        .replace(/^(walk|walking)$/, "walk")
        .replace(/^(cook|cooking)$/, "cook")
        .replace(/^(study|studying)$/, "study")
        .trim();
}

function tokenizeTitle(value: string): string[] {
    const rawTokens = normalizeQuestText(value)
        .split(" ")
        .map(normalizeToken)
        .filter(Boolean);

    if (rawTokens.length === 0) {
        return [];
    }

    const filteredTokens = rawTokens.filter((token) => !TITLE_STOP_WORDS.has(token));

    while (filteredTokens.length > 2 && TITLE_SUFFIX_WORDS.has(filteredTokens[filteredTokens.length - 1])) {
        filteredTokens.pop();
    }

    return filteredTokens.length > 0 ? filteredTokens : rawTokens;
}

export function normalizeDailyQuestTitle(title: string): string {
    const titleTokens = tokenizeTitle(title);
    if (titleTokens.length > 0) {
        return titleTokens.join(" ");
    }

    return normalizeQuestText(title);
}

export function getDailyQuestDedupKey(quest: DailyQuestLike): string {
    const titleKey = normalizeDailyQuestTitle(quest.title);
    if (titleKey) {
        return titleKey;
    }

    const descriptionTokens = tokenizeTitle(quest.description ?? "");
    if (descriptionTokens.length > 0) {
        return descriptionTokens.join(" ");
    }

    return normalizeQuestText(quest.title || quest.description || "quest");
}

export function getLatestQuestBatch<T extends { created_at: string }>(
    rows: T[],
    windowMs = LATEST_QUEST_BATCH_WINDOW_MS,
): T[] {
    if (rows.length === 0) {
        return [];
    }

    const newestCreatedAt = new Date(rows[0].created_at).getTime();
    if (!Number.isFinite(newestCreatedAt)) {
        return [];
    }

    return rows.filter((row) => {
        const createdAt = new Date(row.created_at).getTime();
        return Number.isFinite(createdAt) && Math.abs(newestCreatedAt - createdAt) <= windowMs;
    });
}

export function dedupeDailyPool<T extends DailyQuestLike>(
    rows: T[],
    options?: { preferActive?: boolean },
): T[] {
    const uniqueByKey = new Map<string, T>();

    for (const row of rows) {
        const dedupKey = getDailyQuestDedupKey(row);
        const existing = uniqueByKey.get(dedupKey);

        if (!existing) {
            uniqueByKey.set(dedupKey, row);
            continue;
        }

        if (options?.preferActive && row.is_active && !existing.is_active) {
            uniqueByKey.set(dedupKey, row);
        }
    }

    return Array.from(uniqueByKey.values());
}

export function dedupeQuestPoolByTitle<T extends DailyQuestLike>(
    rows: T[],
    options?: { preferActive?: boolean },
): T[] {
    return dedupeDailyPool(rows, options);
}

function rotateArray<T>(rows: T[], seed: number): T[] {
    if (rows.length <= 1) {
        return rows;
    }

    const startIndex = Math.abs(seed) % rows.length;
    return rows.slice(startIndex).concat(rows.slice(0, startIndex));
}

function takeWithStatVariety<T extends DailyQuestLike>(
    candidates: T[],
    limit: number,
    seenStats: Set<string>,
    selectedKeys: Set<string>,
): T[] {
    const pool = [...candidates];
    const selected: T[] = [];

    while (selected.length < limit && pool.length > 0) {
        let pickIndex = pool.findIndex((candidate) => {
            const stat = candidate.stat_affected ?? "";
            return stat && !seenStats.has(stat) && !selectedKeys.has(getDailyQuestDedupKey(candidate));
        });

        if (pickIndex === -1) {
            pickIndex = pool.findIndex((candidate) => !selectedKeys.has(getDailyQuestDedupKey(candidate)));
        }

        if (pickIndex === -1) {
            break;
        }

        const [picked] = pool.splice(pickIndex, 1);
        selected.push(picked);
        selectedKeys.add(getDailyQuestDedupKey(picked));

        if (picked.stat_affected) {
            seenStats.add(picked.stat_affected);
        }
    }

    return selected;
}

export function pickNovelDailySet<T extends DailyQuestLike>(
    rows: T[],
    options: { activeCount: number; seed: number; previousTitles?: string[]; preferActive?: boolean },
): T[] {
    const uniqueRows = dedupeDailyPool(rows, { preferActive: options.preferActive });
    const targetCount = Math.min(options.activeCount, uniqueRows.length);

    if (targetCount <= 0) {
        return [];
    }

    const orderedRows = rotateArray(uniqueRows, options.seed);
    const previousKeys = new Set((options.previousTitles ?? []).map((title) => normalizeDailyQuestTitle(title)));
    const selectedKeys = new Set<string>();
    const seenStats = new Set<string>();

    const novelRows = orderedRows.filter((row) => !previousKeys.has(getDailyQuestDedupKey(row)));
    const repeatedRows = orderedRows.filter((row) => previousKeys.has(getDailyQuestDedupKey(row)));

    const selected = [
        ...takeWithStatVariety(novelRows, targetCount, seenStats, selectedKeys),
    ];

    if (selected.length < targetCount) {
        selected.push(
            ...takeWithStatVariety(repeatedRows, targetCount - selected.length, seenStats, selectedKeys),
        );
    }

    return selected.slice(0, targetCount);
}
