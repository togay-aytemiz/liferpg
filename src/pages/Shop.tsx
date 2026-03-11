import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import { buyItem, generateShopItems, purchaseShopItem, useInventoryItem } from '../lib/api';
import type { InventoryItem, ShopItem, ShopCategory } from '../lib/database.types';
import { clearPersistedShopOffers, readPersistedShopOffers, writePersistedShopOffers } from '../lib/shopOfferCache';
import {
    Coins, Heart, Star, Shield, AlertCircle, Check,
    Coffee, Tv, Sparkles, BookOpen, Dumbbell, Map, Gamepad2, Users,
    RefreshCw, Package
} from 'lucide-react';
import { STATIC_SHOP_ITEM_LIST, type StaticShopItemKey } from '../lib/shopCatalog';
import {
    getInventoryCacheKey,
    readCachedValue,
    STATIC_VIEW_CACHE_TTL_MS,
    writeCachedValue,
} from '../lib/viewCache';
import { normalizeInventoryStacks } from '../lib/inventoryStack';

type StaticItemStyle = {
    icon: React.ReactNode;
    color: string;
};

const STATIC_ITEM_STYLES: Record<StaticShopItemKey, StaticItemStyle> = {
    health_potion: {
        icon: <Heart className="w-8 h-8 text-red-500" fill="currentColor" />,
        color: 'from-red-900/40 to-slate-900 border-red-900/50 hover:border-red-500/50',
    },
    xp_scroll: {
        icon: <Star className="w-8 h-8 text-amber-500" fill="currentColor" />,
        color: 'from-amber-900/40 to-slate-900 border-amber-900/50 hover:border-amber-500/50',
    },
    streak_freeze: {
        icon: <Shield className="w-8 h-8 text-blue-400" fill="currentColor" />,
        color: 'from-blue-900/40 to-slate-900 border-blue-900/50 hover:border-blue-500/50',
    },
};

// Helper to map dynamic categories to gorgeous styles
const CATEGORY_STYLES: Record<ShopCategory, { icon: React.ReactNode; color: string; label: string }> = {
    food_drink: { icon: <Coffee className="w-7 h-7 text-orange-400" />, color: 'from-orange-900/40 border-orange-900/50 hover:border-orange-500/50', label: 'Treat' },
    entertainment: { icon: <Tv className="w-7 h-7 text-purple-400" />, color: 'from-purple-900/40 border-purple-900/50 hover:border-purple-500/50', label: 'Fun' },
    self_care: { icon: <Sparkles className="w-7 h-7 text-pink-400" />, color: 'from-pink-900/40 border-pink-900/50 hover:border-pink-500/50', label: 'Wellness' },
    learning: { icon: <BookOpen className="w-7 h-7 text-blue-400" />, color: 'from-blue-900/40 border-blue-900/50 hover:border-blue-500/50', label: 'Growth' },
    gear: { icon: <Dumbbell className="w-7 h-7 text-stone-400" />, color: 'from-stone-800/60 border-stone-700/50 hover:border-stone-400/50', label: 'Gear' },
    experience: { icon: <Map className="w-7 h-7 text-emerald-400" />, color: 'from-emerald-900/40 border-emerald-900/50 hover:border-emerald-500/50', label: 'Journey' },
    digital: { icon: <Gamepad2 className="w-7 h-7 text-cyan-400" />, color: 'from-cyan-900/40 border-cyan-900/50 hover:border-cyan-500/50', label: 'Digital' },
    social: { icon: <Users className="w-7 h-7 text-yellow-400" />, color: 'from-yellow-900/40 border-yellow-900/50 hover:border-yellow-500/50', label: 'Social' },
};

export default function Shop() {
    const { user, profile, refreshProfile } = useAuth();

    const [gold, setGold] = useState<number>(0);
    const [dynamicItems, setDynamicItems] = useState<ShopItem[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [usingInventoryId, setUsingInventoryId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const isRefreshingExpiredOffersRef = useRef(false);

    useEffect(() => {
        if (typeof profile?.gold === 'number') {
            setGold(profile.gold);
        }
    }, [profile?.gold]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleGenerateShop = useCallback(async () => {
        if (!user) return;

        setGenerating(true);
        try {
            const res = await generateShopItems();
            if (res.success && res.items) {
                const sorted = writePersistedShopOffers(user.id, [...res.items].sort((a, b) => a.cost - b.cost));
                setDynamicItems(sorted);
                showToast("The Merchant has fresh wares for you!", "success");
            }
        } catch (error: any) {
            console.error("Failed to generate shop:", error);
            showToast("The Merchant is currently away gathering new items.", "error");
        }
        setGenerating(false);
    }, [user]);

    const fetchData = useCallback(async () => {
        if (!user) return;

        setLoading(true);

        const nowIso = new Date().toISOString();
        const [{ data: items }, { data: inventoryRows }] = await Promise.all([
            supabase
                .from('shop_items')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_purchased', false)
                .gt('expires_at', nowIso)
                .order('created_at', { ascending: true })
                .order('cost', { ascending: true }),
            supabase
                .from('inventory_items')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_redeemed', false)
                .order('updated_at', { ascending: false }),
        ]);

        if (items && items.length > 0) {
            const nextItems = writePersistedShopOffers(user.id, items as ShopItem[]);
            setDynamicItems(nextItems);
        } else {
            await handleGenerateShop();
        }

        const nextInventory = normalizeInventoryStacks((inventoryRows as InventoryItem[] | null) ?? []);
        setInventoryItems(nextInventory);
        writeCachedValue(getInventoryCacheKey(user.id), nextInventory, STATIC_VIEW_CACHE_TTL_MS);

        setLoading(false);
    }, [handleGenerateShop, user]);

    useEffect(() => {
        if (!user) return;
        const cachedOffers = readPersistedShopOffers(user.id);
        const cachedInventory = readCachedValue<InventoryItem[]>(getInventoryCacheKey(user.id));

        if (cachedOffers) {
            setDynamicItems(cachedOffers);
        }

        if (cachedInventory.hit) {
            setInventoryItems(normalizeInventoryStacks(cachedInventory.value));
        }

        if (cachedOffers && cachedInventory.hit) {
            setLoading(false);
            return;
        }

        void fetchData();
    }, [fetchData, user]);

    const upsertInventoryItem = (inventoryItem?: InventoryItem | null) => {
        if (!inventoryItem) return;
        setInventoryItems((prev) => {
            const nextItems = normalizeInventoryStacks([
                inventoryItem,
                ...prev.filter((existingItem) => existingItem.id !== inventoryItem.id),
            ]);
            if (user) {
                writeCachedValue(getInventoryCacheKey(user.id), nextItems, STATIC_VIEW_CACHE_TTL_MS);
            }
            return nextItems;
        });
    };

    const getInventoryActionLabel = (item: InventoryItem) => {
        if (item.source_type === 'dynamic') return 'Redeem';
        if (item.item_key === 'health_potion') return 'Drink';
        if (item.item_key === 'xp_scroll') return 'Use Scroll';
        if (item.item_key === 'streak_freeze') return 'Activate';
        return 'Use';
    };

    const getInventoryVisual = (item: InventoryItem) => {
        if (item.source_type === 'static' && item.item_key && item.item_key in STATIC_ITEM_STYLES) {
            return {
                icon: STATIC_ITEM_STYLES[item.item_key as StaticShopItemKey].icon,
                color: STATIC_ITEM_STYLES[item.item_key as StaticShopItemKey].color,
                label: item.item_key === 'streak_freeze' ? 'Ward' : 'Supply',
            };
        }

        const category = (item.category as ShopCategory | null) ?? 'entertainment';
        const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.entertainment;
        return style;
    };

    const handleBuyStatic = async (itemId: StaticShopItemKey) => {
        const item = STATIC_SHOP_ITEM_LIST.find((entry) => entry.id === itemId);
        if (!item) return;

        if (gold < item.cost) {
            showToast("Not enough gold, hero! Complete more quests.", "error");
            return;
        }

        setBuyingId(item.id);
        try {
            const res = await buyItem(item.id);
            const nextGold = typeof res.gold_remaining === 'number' ? res.gold_remaining : gold - item.cost;
            setGold(nextGold);
            upsertInventoryItem(res.inventory_item ?? null);
            await refreshProfile();
            showToast(res.message, 'success');
        } catch (error: any) {
            console.error("Purchase failed:", error);
            showToast(error.message || "Failed to purchase item.", "error");
        }
        setBuyingId(null);
    };

    const handleBuyDynamic = async (item: ShopItem) => {
        if (gold < item.cost) {
            showToast("Not enough gold, hero. Keep grinding!", "error");
            return;
        }

        setBuyingId(item.id);
        try {
            const res = await purchaseShopItem(item.id);
            const nextGold = typeof res.gold_remaining === 'number' ? res.gold_remaining : gold - item.cost;
            setGold(nextGold);
            upsertInventoryItem(res.inventory_item ?? null);
            showToast(res.message || `You bought: ${item.title}. It is now in your inventory.`, 'success');
            setDynamicItems(prev => {
                const nextItems = prev.filter(i => i.id !== item.id);
                if (user && nextItems.length > 0) {
                    writePersistedShopOffers(user.id, nextItems);
                } else if (user) {
                    clearPersistedShopOffers(user.id);
                }
                return nextItems;
            });
            await refreshProfile();
        } catch (error: any) {
            console.error("Purchase failed:", error);
            showToast(error.message || "Failed to purchase item.", "error");
        }
        setBuyingId(null);
    };

    const handleUseInventoryItem = async (item: InventoryItem) => {
        setUsingInventoryId(item.id);
        try {
            const res = await useInventoryItem(item.id);
            if (res.inventory_item) {
                upsertInventoryItem(res.inventory_item);
            } else {
                setInventoryItems((prev) => {
                    const nextItems = normalizeInventoryStacks(prev.filter((inventoryEntry) => inventoryEntry.id !== item.id));
                    if (user) {
                        writeCachedValue(getInventoryCacheKey(user.id), nextItems, STATIC_VIEW_CACHE_TTL_MS);
                    }
                    return nextItems;
                });
            }
            await refreshProfile();
            showToast(res.message, 'success');
        } catch (error: any) {
            console.error('Inventory use failed:', error);
            showToast(error.message || 'Failed to use inventory item.', 'error');
        } finally {
            setUsingInventoryId(null);
        }
    };

    const personalizedOfferExpiresAt = useMemo(() => {
        if (dynamicItems.length === 0) return null;
        return Math.min(...dynamicItems.map((item) => new Date(item.expires_at).getTime()));
    }, [dynamicItems]);

    useEffect(() => {
        if (dynamicItems.length === 0) return undefined;

        const interval = window.setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, [dynamicItems.length]);

    useEffect(() => {
        if (!user || !personalizedOfferExpiresAt || loading || generating) return;
        if (personalizedOfferExpiresAt > nowMs) return;
        if (isRefreshingExpiredOffersRef.current) return;

        isRefreshingExpiredOffersRef.current = true;
        clearPersistedShopOffers(user.id);
        setDynamicItems([]);

        void fetchData().finally(() => {
            isRefreshingExpiredOffersRef.current = false;
        });
    }, [fetchData, generating, loading, nowMs, personalizedOfferExpiresAt, user]);

    const formatOfferRotationCountdown = (expiresAtMs: number | null) => {
        if (!expiresAtMs) return null;

        const diff = Math.max(0, expiresAtMs - nowMs);
        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86_400);
        const hours = Math.floor((totalSeconds % 86_400) / 3_600);
        const minutes = Math.floor((totalSeconds % 3_600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }

        return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    };

    const personalizedOfferCountdown = formatOfferRotationCountdown(personalizedOfferExpiresAt);

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 bg-slate-950">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 left-4 right-4 z-50 px-4 py-3 rounded-lg text-sm text-center shadow-lg animate-in slide-in-from-top-2 duration-200 ${toast.type === 'error'
                    ? 'bg-red-900/90 border border-red-800 text-red-100 shadow-glow-red'
                    : 'bg-emerald-900/90 border border-emerald-800 text-emerald-100 shadow-glow-emerald'
                    }`}>
                    <div className="flex items-center justify-center gap-2">
                        {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {toast.msg}
                    </div>
                </div>
            )}

            <AppHeader
                title="Bazaar"
                subtitle="Spend your quest gold on curated rewards and magical goods."
                actions={(
                    <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-slate-900 px-3 py-1.5 shadow-glow-gold">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span className="font-mono font-bold text-amber-500">{loading ? '...' : gold}</span>
                    </div>
                )}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-8">

                <section className="space-y-4">
                    <div className="px-2">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-400" />
                            <h2 className="font-heading text-lg text-white">
                                Inventory
                            </h2>
                        </div>
                        <p className="mt-1 pl-7 text-xs text-slate-500">
                            Bought items stay here until you use or redeem them.
                        </p>
                    </div>

                    {inventoryItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {inventoryItems.map((item) => {
                                const style = getInventoryVisual(item);
                                const isUsing = usingInventoryId === item.id;
                                const quantityLabel = item.quantity > 1 ? `x${item.quantity}` : null;

                                return (
                                    <div key={item.id} className={`bg-gradient-to-br to-slate-900 ${style.color} border rounded-xl p-3 flex gap-3 items-start transition-all duration-300 relative overflow-hidden group`}>
                                        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/5 blur-2xl transition-colors group-hover:bg-white/10" />

                                        <div className="relative z-10 w-12 h-12 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                                            <div className="scale-90">
                                                {style.icon}
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="line-clamp-2 pr-1 font-heading text-base leading-tight text-white">{item.title}</h3>
                                                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-400">{item.description}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {quantityLabel && (
                                                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
                                                                {quantityLabel}
                                                            </span>
                                                        )}
                                                        <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                                            {item.source_type === 'dynamic' ? 'Reward' : 'Item'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/5 pt-2">
                                                    <p className="line-clamp-1 text-[11px] text-slate-500">
                                                        {item.source_type === 'dynamic' ? 'Stored from the Bazaar for later redemption.' : 'Stored until you choose to use it.'}
                                                    </p>
                                                    <button
                                                        onClick={() => void handleUseInventoryItem(item)}
                                                        disabled={isUsing}
                                                        className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-2 text-[11px] font-heading uppercase tracking-wide text-slate-900 transition-colors shadow-glow-gold hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
                                                    >
                                                        {isUsing ? <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : getInventoryActionLabel(item)}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-6 border border-slate-800 rounded-xl bg-slate-900/30">
                            <p className="text-slate-500 text-sm">Your inventory is empty. Buy something now, use it later.</p>
                        </div>
                    )}
                </section>

                {/* DYNAMIC REAL-LIFE REWARDS */}
                <section className="space-y-4">
                    <div className="px-2">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-heading text-lg text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                Personalized Offers
                            </h2>
                            {generating && (
                                <span className="text-xs text-amber-500/80 flex items-center gap-1 animate-pulse shrink-0">
                                    <RefreshCw className="w-3 h-3 animate-spin text-amber-500" /> Merchant is thinking...
                                </span>
                            )}
                        </div>
                        {personalizedOfferCountdown && !generating && (
                            <p className="mt-1 pl-7 text-xs text-slate-500">
                                Refreshes in {personalizedOfferCountdown}
                            </p>
                        )}
                    </div>

                    {generating && dynamicItems.length === 0 ? (
                        <div className="border border-amber-900/30 bg-amber-900/10 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
                            <RefreshCw className="w-8 h-8 text-amber-500/50 animate-spin" />
                            <p className="text-sm text-amber-500/70 font-heading tracking-wide">The Merchant is checking your life rhythm and curating special rewards...</p>
                        </div>
                    ) : dynamicItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {dynamicItems.map(item => {
                                const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.entertainment;
                                const canAfford = gold >= item.cost;
                                const isBuying = buyingId === item.id;

                                return (
                                    <div key={item.id} className={`bg-gradient-to-br to-slate-900 ${style.color} border rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 relative overflow-hidden group`}>
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

                                        <div className="flex gap-4 relative z-10">
                                            <div className="w-16 h-16 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="mb-1 flex items-start justify-between gap-2">
                                                    <h3 className="line-clamp-2 pr-1 font-heading text-lg leading-tight text-white">{item.title}</h3>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                                                        {style.label}
                                                    </span>
                                                </div>
                                                <p className="line-clamp-3 text-sm leading-snug text-slate-400">{item.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                                            <div className="flex flex-col">
                                                <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${canAfford ? 'text-amber-500' : 'text-red-500/70'}`}>
                                                    <Coins className="w-4 h-4" />
                                                    {item.cost}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleBuyDynamic(item)}
                                                disabled={!canAfford || isBuying}
                                                className={`px-6 py-2 rounded-lg font-heading uppercase tracking-wide text-xs transition-colors flex items-center justify-center min-w-[100px] ${canAfford
                                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-glow-gold'
                                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                    }`}
                                            >
                                                {isBuying ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : 'Buy'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-6 border border-slate-800 rounded-xl bg-slate-900/30">
                            <p className="text-slate-500 text-sm">No special offers at the moment. Check back later!</p>
                        </div>
                    )}
                </section>

                <hr className="border-slate-800" />

                {/* STATIC MAGICAL GOODS */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="font-heading text-lg text-white flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-400" />
                            Magical Goods
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 opacity-90">
                        {STATIC_SHOP_ITEM_LIST.map(item => {
                            const style = STATIC_ITEM_STYLES[item.id];
                            const canAfford = gold >= item.cost;
                            const isBuying = buyingId === item.id;

                            return (
                                <div key={item.id} className={`bg-gradient-to-br ${style.color} border rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 relative overflow-hidden group`}>
                                    <div className="flex gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            {style.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-heading text-md text-white mb-0.5">{item.title}</h3>
                                            <p className="text-xs text-slate-400 leading-snug">{item.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                                        <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${canAfford ? 'text-amber-500' : 'text-red-500/70'}`}>
                                            <Coins className="w-4 h-4" />
                                            {item.cost}
                                        </div>
                                        <button
                                            onClick={() => handleBuyStatic(item.id)}
                                            disabled={!canAfford || isBuying}
                                            className={`px-4 py-1.5 rounded-lg font-heading uppercase tracking-wide text-xs transition-colors flex items-center justify-center min-w-[80px] ${canAfford
                                                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                }`}
                                        >
                                            {isBuying ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Buy'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
