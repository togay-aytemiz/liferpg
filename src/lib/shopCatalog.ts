export type StaticShopItemKey = 'health_potion' | 'xp_scroll' | 'streak_freeze';

export type StaticShopItemDefinition = {
    id: StaticShopItemKey;
    title: string;
    description: string;
    cost: number;
    inventoryCategory: 'recovery' | 'progression' | 'protection';
    inventoryUseLabel: string;
    isConsumable: boolean;
};

export const STATIC_SHOP_ITEMS: Record<StaticShopItemKey, StaticShopItemDefinition> = {
    health_potion: {
        id: 'health_potion',
        title: 'Health Potion',
        description: 'Restores 50 HP when you decide to drink it.',
        cost: 100,
        inventoryCategory: 'recovery',
        inventoryUseLabel: 'Drink',
        isConsumable: true,
    },
    xp_scroll: {
        id: 'xp_scroll',
        title: 'Scroll of Experience',
        description: 'Grants +250 XP when you decide to burn it.',
        cost: 300,
        inventoryCategory: 'progression',
        inventoryUseLabel: 'Use Scroll',
        isConsumable: true,
    },
    streak_freeze: {
        id: 'streak_freeze',
        title: 'Streak Freeze',
        description: 'Adds one Streak Freeze to your protection stash when you activate it.',
        cost: 500,
        inventoryCategory: 'protection',
        inventoryUseLabel: 'Activate',
        isConsumable: true,
    },
};

export const STATIC_SHOP_ITEM_LIST = Object.values(STATIC_SHOP_ITEMS);
