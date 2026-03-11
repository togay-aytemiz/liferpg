type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

type CacheRead<T> =
    | { hit: true; value: T }
    | { hit: false; value: undefined };

const viewCache = new Map<string, CacheEntry<unknown>>();

export const VIEW_CACHE_TTL_MS = 45_000;
export const STATIC_VIEW_CACHE_TTL_MS = 90_000;

export const getQuestRuntimeCacheKey = (userId: string) => `quest-runtime:${userId}`;
export const getDashboardStreakCacheKey = (userId: string) => `dashboard-streak:${userId}`;
export const getHabitsCacheKey = (userId: string) => `habits:${userId}`;
export const getHabitsTodayLogCacheKey = (userId: string) => `habits-today:${userId}`;
export const getShopCacheKey = (userId: string) => `shop:${userId}`;
export const getAwardsCacheKey = (userId: string) => `awards:${userId}`;

export function readCachedValue<T>(key: string): CacheRead<T> {
    const entry = viewCache.get(key);
    if (!entry) {
        return { hit: false, value: undefined };
    }

    if (entry.expiresAt <= Date.now()) {
        viewCache.delete(key);
        return { hit: false, value: undefined };
    }

    return { hit: true, value: entry.value as T };
}

export function writeCachedValue<T>(key: string, value: T, ttlMs = VIEW_CACHE_TTL_MS): T {
    viewCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });

    return value;
}

export function invalidateCachedValue(key: string) {
    viewCache.delete(key);
}

export function invalidateCachedValuesByPrefix(prefix: string) {
    for (const key of viewCache.keys()) {
        if (key.startsWith(prefix)) {
            viewCache.delete(key);
        }
    }
}
