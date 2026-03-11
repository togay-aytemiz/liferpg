type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

type CacheRead<T> =
    | { hit: true; value: T }
    | { hit: false; value: undefined };

const viewCache = new Map<string, CacheEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown>>();
const PERSISTENT_VIEW_CACHE_PREFIX = 'lifeRPG:view-cache:';

export const VIEW_CACHE_TTL_MS = 45_000;
export const STATIC_VIEW_CACHE_TTL_MS = 90_000;

export const getQuestRuntimeCacheKey = (userId: string) => `quest-runtime:${userId}`;
export const getDashboardStreakCacheKey = (userId: string) => `dashboard-streak:${userId}`;
export const getShopCacheKey = (userId: string) => `shop:${userId}`;
export const getInventoryCacheKey = (userId: string) => `inventory:${userId}`;
export const getAwardsCacheKey = (userId: string) => `awards:${userId}`;

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getPersistentStorageKey(cacheKey: string) {
    return `${PERSISTENT_VIEW_CACHE_PREFIX}${cacheKey}`;
}

function isPersistentCacheKey(cacheKey: string) {
    return cacheKey.startsWith('dashboard-streak:');
}

function readPersistentCacheEntry<T>(key: string): CacheEntry<T> | null {
    if (!isPersistentCacheKey(key) || !canUseStorage()) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(getPersistentStorageKey(key));
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (!parsed || typeof parsed.expiresAt !== 'number') {
            window.localStorage.removeItem(getPersistentStorageKey(key));
            return null;
        }

        if (parsed.expiresAt <= Date.now()) {
            window.localStorage.removeItem(getPersistentStorageKey(key));
            return null;
        }

        return parsed;
    } catch {
        window.localStorage.removeItem(getPersistentStorageKey(key));
        return null;
    }
}

function writePersistentCacheEntry<T>(key: string, entry: CacheEntry<T>) {
    if (!isPersistentCacheKey(key) || !canUseStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(getPersistentStorageKey(key), JSON.stringify(entry));
    } catch {
        // Ignore storage quota / private-mode failures and keep the in-memory cache path.
    }
}

function removePersistentCacheEntry(key: string) {
    if (!isPersistentCacheKey(key) || !canUseStorage()) {
        return;
    }

    window.localStorage.removeItem(getPersistentStorageKey(key));
}

export function readCachedValue<T>(key: string): CacheRead<T> {
    const entry = viewCache.get(key);
    if (!entry) {
        const persistentEntry = readPersistentCacheEntry<T>(key);
        if (!persistentEntry) {
            return { hit: false, value: undefined };
        }

        viewCache.set(key, persistentEntry);
        return { hit: true, value: persistentEntry.value };
    }

    if (entry.expiresAt <= Date.now()) {
        viewCache.delete(key);
        removePersistentCacheEntry(key);
        return readCachedValue<T>(key);
    }

    return { hit: true, value: entry.value as T };
}

export function writeCachedValue<T>(key: string, value: T, ttlMs = VIEW_CACHE_TTL_MS): T {
    const entry = {
        value,
        expiresAt: Date.now() + ttlMs,
    };

    viewCache.set(key, entry);
    writePersistentCacheEntry(key, entry);

    return value;
}

export function invalidateCachedValue(key: string) {
    viewCache.delete(key);
    inflightCache.delete(key);
    removePersistentCacheEntry(key);
}

export function invalidateCachedValuesByPrefix(prefix: string) {
    for (const key of viewCache.keys()) {
        if (key.startsWith(prefix)) {
            viewCache.delete(key);
            removePersistentCacheEntry(key);
        }
    }

    for (const key of inflightCache.keys()) {
        if (key.startsWith(prefix)) {
            inflightCache.delete(key);
        }
    }
}

export async function readCachedOrLoadValue<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs = VIEW_CACHE_TTL_MS,
): Promise<T> {
    const cached = readCachedValue<T>(key);
    if (cached.hit) {
        return cached.value;
    }

    const inflight = inflightCache.get(key);
    if (inflight) {
        return inflight as Promise<T>;
    }

    const promise = loader()
        .then((value) => writeCachedValue(key, value, ttlMs))
        .finally(() => {
            inflightCache.delete(key);
        });

    inflightCache.set(key, promise);
    return promise;
}
