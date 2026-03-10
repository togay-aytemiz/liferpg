export const DAILY_SUCCESS_THRESHOLD = 0.8;
export const DAILY_SUCCESS_THRESHOLD_PERCENT = Math.round(DAILY_SUCCESS_THRESHOLD * 100);

export function getRequiredDailyCompletions(activeCount: number): number {
    if (activeCount <= 0) return 0;
    return Math.ceil(activeCount * DAILY_SUCCESS_THRESHOLD);
}
