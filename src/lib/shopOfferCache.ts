import type { ShopItem } from './database.types';
import { getShopOfferExpiresAtMs, isShopOfferExpired } from './shopCycle';

type PersistedShopOffers = {
    items: ShopItem[];
};

const SHOP_OFFERS_CACHE_PREFIX = 'liferpg-shop-offers:';

function getShopOffersCacheKey(userId: string) {
    return `${SHOP_OFFERS_CACHE_PREFIX}${userId}`;
}

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function dedupeShopOffers(items: ShopItem[]) {
    const uniqueOffers: ShopItem[] = [];
    const seenCategories = new Set<string>();

    for (const item of items) {
        if (seenCategories.has(item.category)) continue;
        seenCategories.add(item.category);
        uniqueOffers.push(item);
    }

    return uniqueOffers;
}

export function readPersistedShopOffers(userId: string): ShopItem[] | null {
    if (!canUseStorage()) return null;

    try {
        const rawValue = window.localStorage.getItem(getShopOffersCacheKey(userId));
        if (!rawValue) return null;

        const parsed = JSON.parse(rawValue) as PersistedShopOffers;
        if (!Array.isArray(parsed.items)) {
            window.localStorage.removeItem(getShopOffersCacheKey(userId));
            return null;
        }

        const now = Date.now();
        const activeOffers = parsed.items
            .filter((item) => !item.is_purchased && !isShopOfferExpired(item, now))
            .map((item) => ({
                ...item,
                expires_at: new Date(getShopOfferExpiresAtMs(item)).toISOString(),
            }))
            .sort((a, b) => a.cost - b.cost);

        const uniqueOffers = dedupeShopOffers(activeOffers);

        if (uniqueOffers.length === 0) {
            window.localStorage.removeItem(getShopOffersCacheKey(userId));
            return null;
        }

        if (uniqueOffers.length !== parsed.items.length) {
            writePersistedShopOffers(userId, uniqueOffers);
        }

        return uniqueOffers;
    } catch {
        window.localStorage.removeItem(getShopOffersCacheKey(userId));
        return null;
    }
}

export function writePersistedShopOffers(userId: string, items: ShopItem[]) {
    const activeUniqueOffers = dedupeShopOffers(
        items
            .filter((item) => !item.is_purchased && !isShopOfferExpired(item, Date.now()))
            .map((item) => ({
                ...item,
                expires_at: new Date(getShopOfferExpiresAtMs(item)).toISOString(),
            }))
            .sort((a, b) => a.cost - b.cost)
    );

    if (!canUseStorage()) {
        return activeUniqueOffers;
    }

    if (activeUniqueOffers.length === 0) {
        clearPersistedShopOffers(userId);
        return activeUniqueOffers;
    }

    window.localStorage.setItem(
        getShopOffersCacheKey(userId),
        JSON.stringify({ items: activeUniqueOffers } satisfies PersistedShopOffers)
    );

    return activeUniqueOffers;
}

export function clearPersistedShopOffers(userId: string) {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(getShopOffersCacheKey(userId));
}
