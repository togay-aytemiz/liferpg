import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { buyItem, generateShopItems, purchaseShopItem } from '../lib/api';
import type { ShopItem, ShopCategory } from '../lib/database.types';
import {
    Coins, Heart, Star, Shield, AlertCircle, Check, ArrowLeft,
    Coffee, Tv, Sparkles, BookOpen, Dumbbell, Map, Gamepad2, Users,
    RefreshCw, Clock
} from 'lucide-react';

type StaticItem = {
    id: string;
    title: string;
    description: string;
    cost: number;
    icon: React.ReactNode;
    color: string;
};

const STATIC_ITEMS: StaticItem[] = [
    {
        id: 'health_potion',
        title: 'Health Potion',
        description: 'Restores 50 HP immediately. Drink wisely before you succumb to exhaustion.',
        cost: 100,
        icon: <Heart className="w-8 h-8 text-red-500" fill="currentColor" />,
        color: 'from-red-900/40 to-slate-900 border-red-900/50 hover:border-red-500/50'
    },
    {
        id: 'xp_scroll',
        title: 'Scroll of Experience',
        description: 'Instantly grants +250 XP. A magical shortcut to your next level.',
        cost: 300,
        icon: <Star className="w-8 h-8 text-amber-500" fill="currentColor" />,
        color: 'from-amber-900/40 to-slate-900 border-amber-900/50 hover:border-amber-500/50'
    },
    {
        id: 'streak_freeze',
        title: 'Streak Freeze',
        description: 'Protects your active streak and HP from dropping for one missed day. Max 3.',
        cost: 500,
        icon: <Shield className="w-8 h-8 text-blue-400" fill="currentColor" />,
        color: 'from-blue-900/40 to-slate-900 border-blue-900/50 hover:border-blue-500/50'
    }
];

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
    const navigate = useNavigate();
    const { user } = useAuth();

    const [gold, setGold] = useState<number>(0);
    const [dynamicItems, setDynamicItems] = useState<ShopItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);

        // 1. Fetch Gold
        const { data: profile } = await supabase.from('profiles').select('gold').eq('id', user!.id).single() as any;
        if (profile && typeof (profile as any).gold === 'number') setGold((profile as any).gold);

        // 2. Fetch Dynamic Items that are not expired and not purchased
        const nowIso = new Date().toISOString();
        const { data: items } = await supabase
            .from('shop_items')
            .select('*')
            .eq('user_id', user!.id)
            .eq('is_purchased', false)
            .gt('expires_at', nowIso)
            .order('cost', { ascending: true });

        if (items && items.length > 0) {
            setDynamicItems(items as ShopItem[]);
        } else {
            // Need to generate new items!
            handleGenerateShop();
        }

        setLoading(false);
    };

    const handleGenerateShop = async () => {
        setGenerating(true);
        try {
            const res = await generateShopItems();
            if (res.success && res.items) {
                // Sort by cost
                const sorted = [...res.items].sort((a, b) => a.cost - b.cost);
                setDynamicItems(sorted);
                showToast("The Merchant has fresh wares for you!", "success");
            }
        } catch (error: any) {
            console.error("Failed to generate shop:", error);
            showToast("The Merchant is currently away gathering new items.", "error");
        }
        setGenerating(false);
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBuyStatic = async (item: StaticItem) => {
        if (gold < item.cost) {
            showToast("Not enough gold, hero! Complete more quests.", "error");
            return;
        }

        setBuyingId(item.id);
        try {
            const res = await buyItem(item.id);
            setGold(prev => prev - item.cost);
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
            await purchaseShopItem(item.id);
            setGold(prev => prev - item.cost);
            showToast(`You bought: ${item.title}! Enjoy your reward!`, 'success');
            // Remove from list
            setDynamicItems(prev => prev.filter(i => i.id !== item.id));
        } catch (error: any) {
            console.error("Purchase failed:", error);
            showToast(error.message || "Failed to purchase item.", "error");
        }
        setBuyingId(null);
    };

    const formatDaysLeft = (isoString: string) => {
        const diff = new Date(isoString).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? `${days}d left` : 'Expiring soon';
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 bg-slate-950 pb-20">
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

            {/* Header */}
            <div className="px-4 pt-6 pb-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 sticky top-0 z-40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors p-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-heading text-2xl text-amber-500">The Bazaar</h1>
                        <p className="text-xs text-slate-500 font-heading tracking-wide uppercase">Real & Magical Wares</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-glow-gold">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-mono text-amber-500 font-bold">{loading ? '...' : gold}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8">

                {/* DYNAMIC REAL-LIFE REWARDS */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="font-heading text-lg text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Personalized Offers
                        </h2>
                        {generating && (
                            <span className="text-xs text-amber-500/80 flex items-center gap-1 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" /> Merchant is thinking...
                            </span>
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
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h3 className="font-heading text-lg text-white leading-tight truncate">{item.title}</h3>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                                                        {style.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 leading-snug line-clamp-2">{item.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                                            <div className="flex flex-col">
                                                <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${canAfford ? 'text-amber-500' : 'text-red-500/70'}`}>
                                                    <Coins className="w-4 h-4" />
                                                    {item.cost}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                                                    <Clock className="w-3 h-3" /> {formatDaysLeft(item.expires_at)}
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
                                                {isBuying ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : 'Claim'}
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
                        <h2 className="font-heading text-lg text-slate-400">Magical Goods</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 opacity-90">
                        {STATIC_ITEMS.map(item => {
                            const canAfford = gold >= item.cost;
                            const isBuying = buyingId === item.id;

                            return (
                                <div key={item.id} className={`bg-gradient-to-br ${item.color} border rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 relative overflow-hidden group`}>
                                    <div className="flex gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            {item.icon}
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
                                            onClick={() => handleBuyStatic(item)}
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
