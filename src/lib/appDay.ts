export const APP_TIME_ZONE = 'Europe/Istanbul';
export const APP_TIME_ZONE_OFFSET_MINUTES = 180;
export const DAILY_RESET_HOUR = 3;

const DAY_MS = 86_400_000;

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

function parseDayKey(dayKey: string) {
    const [year, month, day] = dayKey.split('-').map(Number);
    return { year, month, day };
}

export function formatUtcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function shiftDayKey(dayKey: string, deltaDays: number): string {
    const shifted = new Date(`${dayKey}T00:00:00.000Z`);
    shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
    return formatUtcDateKey(shifted);
}

export function getAppDayKey(
    now = new Date(),
    options?: { resetHour?: number; offsetMinutes?: number },
): string {
    const resetHour = options?.resetHour ?? DAILY_RESET_HOUR;
    const offsetMinutes = options?.offsetMinutes ?? APP_TIME_ZONE_OFFSET_MINUTES;
    const shiftedMs = now.getTime() + offsetMinutes * 60_000 - resetHour * 3_600_000;
    return formatUtcDateKey(new Date(shiftedMs));
}

export function getPreviousAppDayKey(
    nowOrDayKey: Date | string = new Date(),
    options?: { resetHour?: number; offsetMinutes?: number },
): string {
    const dayKey = typeof nowOrDayKey === 'string' ? nowOrDayKey : getAppDayKey(nowOrDayKey, options);
    return shiftDayKey(dayKey, -1);
}

export function getAppDayWindow(
    dayKey = getAppDayKey(),
    options?: { resetHour?: number; offsetMinutes?: number },
) {
    const resetHour = options?.resetHour ?? DAILY_RESET_HOUR;
    const offsetMinutes = options?.offsetMinutes ?? APP_TIME_ZONE_OFFSET_MINUTES;
    const { year, month, day } = parseDayKey(dayKey);
    const startMs = Date.UTC(year, month - 1, day, resetHour, 0, 0, 0) - offsetMinutes * 60_000;
    const start = new Date(startMs);
    const end = new Date(startMs + DAY_MS);

    return {
        dayKey,
        start,
        end,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
    };
}

export function getCurrentAppDayWindow(
    now = new Date(),
    options?: { resetHour?: number; offsetMinutes?: number },
) {
    return getAppDayWindow(getAppDayKey(now, options), options);
}

export function getNextDailyResetDate(
    now = new Date(),
    options?: { resetHour?: number; offsetMinutes?: number },
): Date {
    return getCurrentAppDayWindow(now, options).end;
}

export function getAppDaySeed(
    nowOrDayKey: Date | string = new Date(),
    options?: { resetHour?: number; offsetMinutes?: number },
): number {
    const dayKey = typeof nowOrDayKey === 'string' ? nowOrDayKey : getAppDayKey(nowOrDayKey, options);
    return Math.floor(new Date(`${dayKey}T00:00:00.000Z`).getTime() / DAY_MS);
}

export function formatDailyResetClock(resetHour = DAILY_RESET_HOUR): string {
    return `${pad(resetHour)}:00`;
}

