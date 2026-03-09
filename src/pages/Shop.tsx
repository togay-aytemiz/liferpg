import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { buyItem } from '../lib/api';
import { Coins, Heart, Star, Shield, AlertCircle, Check, ArrowLeft } from 'lucide-react';

type Item = {
    id: string;
    title: string;
    description: string;
    cost: number;
    icon: React.ReactNode;
    color: string;
};

const ITEMS: Item[] = [
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

export default function Shop() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [gold, setGold] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchGold();
    }, [user]);

    const fetchGold = async () => {
        setLoading(true);
        const { data } = await supabase.from('profiles').select('gold').eq('id', user!.id).single();
        if (data && typeof (data as any).gold === 'number') setGold((data as any).gold);
        setLoading(false);
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBuy = async (item: Item) => {
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
            <div className="px-4 pt-6 pb-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors p-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-heading text-2xl text-amber-500">Merchant</h1>
                        <p className="text-xs text-slate-500 font-heading tracking-wide uppercase">Magical Wares</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-glow-gold">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-mono text-amber-500 font-bold">{loading ? '...' : gold}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-slate-400 text-sm italic text-center mb-6 px-4">
                    "Got gold? I've got goods. No refunds for the weary."
                </p>

                {ITEMS.map(item => {
                    const canAfford = gold >= item.cost;
                    const isBuying = buyingId === item.id;

                    return (
                        <div key={item.id} className={`bg-gradient-to-br ${item.color} border rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 relative overflow-hidden group`}>
                            {/* Background glow effect */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

                            <div className="flex gap-4 relative z-10">
                                <div className="w-16 h-16 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                                    {item.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-heading text-lg text-white mb-1">{item.title}</h3>
                                    <p className="text-sm text-slate-400 leading-snug">{item.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                                <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${canAfford ? 'text-amber-500' : 'text-red-500/70'}`}>
                                    <Coins className="w-4 h-4" />
                                    {item.cost}
                                </div>
                                <button
                                    onClick={() => handleBuy(item)}
                                    disabled={!canAfford || isBuying}
                                    className={`px-6 py-2 rounded-lg font-heading uppercase tracking-wide text-xs transition-colors flex items-center justify-center min-w-[100px] ${canAfford
                                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-glow-gold'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        }`}
                                >
                                    {isBuying ? (
                                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Purchase'
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
