import { getAppDayKey, getAppDayWindow, shiftDayKey } from './appDay';
import type { ShopItem } from './database.types';

export const WEEKLY_SHOP_APP_DAYS = 7;

export function getWeeklyShopExpiresAt(date = new Date()) {
    const createdDayKey = getAppDayKey(date);
    const expiryDayKey = shiftDayKey(createdDayKey, WEEKLY_SHOP_APP_DAYS);
    return getAppDayWindow(expiryDayKey).start;
}

export function getWeeklyShopExpiresAtFromIso(createdAtIso: string) {
    return getWeeklyShopExpiresAt(new Date(createdAtIso));
}

export function getShopOfferExpiresAtMs(item: Pick<ShopItem, 'created_at' | 'expires_at'>) {
    const canonicalExpiresAt = getWeeklyShopExpiresAtFromIso(item.created_at).getTime();
    const storedExpiresAt = new Date(item.expires_at).getTime();

    if (Number.isNaN(canonicalExpiresAt)) {
        return storedExpiresAt;
    }

    return canonicalExpiresAt;
}

export function isShopOfferExpired(item: Pick<ShopItem, 'created_at' | 'expires_at'>, nowMs = Date.now()) {
    return getShopOfferExpiresAtMs(item) <= nowMs;
}
