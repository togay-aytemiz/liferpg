import { getAppDayKey, getPreviousAppDayKey } from "../../../src/lib/appDay.ts";
import { normalizeDailyQuestTitle } from "../../../src/lib/dailyPool.ts";

type SupabaseLike = {
    from: (table: string) => {
        select: (columns: string) => any;
    };
};

type QuestHistoryRow = {
    quest_date: string;
    is_completed: boolean;
    skip_reason: string | null;
    quests?: {
        title?: string | null;
        quest_type?: string | null;
        stat_affected?: string | null;
    } | null;
};

type RecentDailyQuestRow = {
    title: string | null;
};

type QuestFeedbackRow = {
    quest_title: string;
    feedback_type: string;
    reason_bucket: string;
    reason_detail: string | null;
};

function buildRecentDayKeys(days: number, now = new Date()): string[] {
    const keys: string[] = [];
    let cursor = getAppDayKey(now);

    for (let index = 0; index < days; index += 1) {
        keys.push(cursor);
        cursor = getPreviousAppDayKey(cursor);
    }

    return keys;
}

function formatDayLabel(dayKey: string, todayKey: string): string {
    if (dayKey === todayKey) return `${dayKey} (current app day)`;
    if (dayKey === getPreviousAppDayKey(todayKey)) return `${dayKey} (previous app day)`;
    return dayKey;
}

function summarizeTitles(rows: string[], limit: number) {
    if (rows.length === 0) return "none";
    const limited = rows.slice(0, limit);
    const suffix = rows.length > limit ? ` (+${rows.length - limit} more)` : "";
    return `${limited.join(", ")}${suffix}`;
}

export async function buildRecentQuestBehaviorContext(
    supabase: SupabaseLike,
    userId: string,
    options?: { appDays?: number },
) {
    const appDays = options?.appDays ?? 7;
    const dayKeys = buildRecentDayKeys(appDays);
    const todayKey = dayKeys[0];
    const oldestKey = dayKeys[dayKeys.length - 1];

    const [{ data: historyRows }, { data: recentDailyQuestRows }, { data: feedbackRows }] = await Promise.all([
        supabase
            .from("user_quests")
            .select("quest_date, is_completed, skip_reason, quests(title, quest_type, stat_affected)")
            .eq("user_id", userId)
            .gte("quest_date", oldestKey)
            .order("quest_date", { ascending: false })
            .limit(160),
        supabase
            .from("quests")
            .select("title")
            .eq("user_id", userId)
            .eq("quest_type", "daily")
            .eq("is_ai_generated", true)
            .eq("is_custom", false)
            .order("created_at", { ascending: false })
            .limit(24),
        supabase
            .from("quest_feedback")
            .select("quest_title, feedback_type, reason_bucket, reason_detail")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(24),
    ]);

    const rows = (historyRows ?? []) as QuestHistoryRow[];
    const feedback = (feedbackRows ?? []) as QuestFeedbackRow[];
    const recentDailyTitles = Array.from(
        new Set(
            ((recentDailyQuestRows ?? []) as RecentDailyQuestRow[])
                .map((row) => row.title?.trim())
                .filter((title): title is string => Boolean(title))
                .map((title) => normalizeDailyQuestTitle(title)),
        ),
    ).slice(0, 10);

    const byDay = new Map<string, QuestHistoryRow[]>();
    for (const row of rows) {
        const bucket = byDay.get(row.quest_date) ?? [];
        bucket.push(row);
        byDay.set(row.quest_date, bucket);
    }

    const daySummaries = dayKeys.map((dayKey) => {
        const entries = byDay.get(dayKey) ?? [];
        const completedTitles = entries
            .filter((entry) => entry.is_completed)
            .map((entry) => entry.quests?.title?.trim())
            .filter((title): title is string => Boolean(title));

        const skippedTitles = entries
            .filter((entry) => !entry.is_completed && entry.skip_reason)
            .map((entry) => {
                const title = entry.quests?.title?.trim() || "Unknown";
                return `${title} (reason: ${entry.skip_reason})`;
            });

        return `- ${formatDayLabel(dayKey, todayKey)}\n  Completed well: ${summarizeTitles(completedTitles, 4)}\n  Skipped / disliked: ${summarizeTitles(skippedTitles, 3)}`;
    });

    const successfulStats = Array.from(
        rows
            .filter((row) => row.is_completed && row.quests?.stat_affected)
            .reduce((acc, row) => {
                const key = row.quests?.stat_affected ?? "unknown";
                acc.set(key, (acc.get(key) ?? 0) + 1);
                return acc;
            }, new Map<string, number>())
            .entries(),
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([stat, count]) => `${stat} x${count}`);

    const recentFeedbackSummary = feedback
        .slice(0, 5)
        .map((entry) => {
            const detail = entry.reason_detail?.trim();
            const suffix = detail ? `: ${detail}` : "";
            return `${entry.quest_title} [${entry.feedback_type}/${entry.reason_bucket}]${suffix}`;
        });

    const context = [
        `\n\nRECENT APP-DAY BEHAVIOR (last ${appDays} app days, reset at 03:00):`,
        ...daySummaries,
        `- Successful recent stat lanes: ${successfulStats.length > 0 ? successfulStats.join(", ") : "none yet"}`,
        `- Recent reroll/regeneration feedback to respect: ${recentFeedbackSummary.length > 0 ? recentFeedbackSummary.join(" | ") : "none yet"}`,
        `- Recently generated daily titles to avoid repeating too closely: ${recentDailyTitles.length > 0 ? recentDailyTitles.join(", ") : "none yet"}`,
        "- Use this history to create novelty: build on what the user actually completed, avoid what they skipped or disliked, and do not recycle the same daily titles unless there is no better fit.",
    ].join("\n");

    return {
        context,
        recentDailyTitles,
        dayKeys,
    };
}
