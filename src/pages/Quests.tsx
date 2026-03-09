import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Quest } from '../lib/database.types';
import { completeQuest, skipQuest } from '../lib/api';
import { ArrowLeft, Check, Swords, Shield, Skull, X } from 'lucide-react';

export default function Quests() {
    const navigate = useNavigate();
    const { user, refreshProfile } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [skippingId, setSkippingId] = useState<string | null>(null);
    const [tab, setTab] = useState<'daily' | 'side' | 'boss'>('daily');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchQuests = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('quests')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at');
        if (data) setQuests(data as Quest[]);

        const today = new Date().toISOString().split('T')[0];
        const { data: comps } = await supabase
            .from('user_quests')
            .select('quest_id')
            .eq('user_id', user.id)
            .eq('quest_date', today)
            .eq('is_completed', true);
        if (comps) setCompletedIds(new Set(comps.map((c: { quest_id: string }) => c.quest_id)));
    }, [user]);

    useEffect(() => { fetchQuests(); }, [fetchQuests]);

    const handleComplete = async (questId: string) => {
        if (completedIds.has(questId) || loadingId || skippingId) return;
        setLoadingId(questId);
        try {
            const result = await completeQuest(questId);
            setCompletedIds(prev => new Set([...prev, questId]));
            await refreshProfile();
            showToast(`+${result.xp_awarded} XP earned!`);
        } catch (err) {
            console.error(err);
            showToast('Failed to complete quest', 'error');
        }
        setLoadingId(null);
    };

    const handleSkip = async (questId: string, title: string) => {
        if (loadingId || skippingId) return;
        setSkippingId(questId);
        try {
            await skipQuest(questId, 'not interested');
            // Remove from local list
            setQuests(prev => prev.filter(q => q.id !== questId));
            showToast(`"${title}" removed. Future quests will adapt.`);
        } catch (err) {
            console.error(err);
            showToast('Failed to skip quest', 'error');
        }
        setSkippingId(null);
    };

    const filtered = quests.filter(q => q.quest_type === tab);

    const diffColors: Record<string, string> = {
        easy: 'text-emerald-400', medium: 'text-amber-400', hard: 'text-red-400', epic: 'text-purple-400',
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="px-4 pt-6 pb-3 flex items-center gap-3">
                <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors p-1">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-heading text-2xl text-white">Quests</h1>
            </div>

            {/* Tabs */}
            <div className="flex px-4 gap-2 mb-4">
                {(['daily', 'side', 'boss'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-heading tracking-wider uppercase transition-all ${tab === t
                            ? t === 'boss'
                                ? 'bg-red-900/40 text-red-400 border border-red-800'
                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
                            }`}
                    >
                        {t === 'daily' && <Shield className="w-4 h-4" />}
                        {t === 'side' && <Swords className="w-4 h-4" />}
                        {t === 'boss' && <Skull className="w-4 h-4" />}
                        {t}
                    </button>
                ))}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`mx-4 mb-3 px-4 py-2.5 rounded-lg text-sm text-center animate-in fade-in slide-in-from-top-2 duration-200 ${toast.type === 'error'
                        ? 'bg-red-900/40 border border-red-800 text-red-400'
                        : 'bg-emerald-900/40 border border-emerald-800 text-emerald-400'
                    }`}>
                    {toast.msg}
                </div>
            )}

            {/* Quest List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5">
                {filtered.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-8">No {tab} quests found.</p>
                )}
                {filtered.map(q => {
                    const done = completedIds.has(q.id);
                    const isLoading = loadingId === q.id;
                    const isSkipping = skippingId === q.id;
                    return (
                        <div key={q.id} className={`bg-slate-800 border rounded-lg p-4 flex items-start gap-3 shadow-hud transition-all ${done ? 'border-emerald-800/50 opacity-60' : q.quest_type === 'boss' ? 'border-red-900/60' : 'border-slate-700'
                            }`}>
                            <button
                                onClick={() => handleComplete(q.id)}
                                disabled={done || !!loadingId || !!skippingId}
                                className={`w-7 h-7 rounded mt-0.5 border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-600 hover:border-amber-500'
                                    }`}
                            >
                                {isLoading ? (
                                    <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                ) : done ? (
                                    <Check className="w-4 h-4 text-white" />
                                ) : null}
                            </button>
                            <div className="flex-1">
                                <p className={`font-medium text-sm ${done ? 'line-through text-slate-500' : 'text-white'}`}>
                                    {q.title}
                                </p>
                                {q.description && <p className="text-xs text-slate-500 mt-1">{q.description}</p>}
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-amber-500 text-xs font-mono">+{q.xp_reward} XP</span>
                                    <span className={`text-xs ${diffColors[q.difficulty] || 'text-slate-400'}`}>{q.difficulty}</span>
                                    {q.stat_affected && <span className="text-xs text-slate-500 capitalize">{q.stat_affected}</span>}
                                </div>
                            </div>
                            {/* Skip/Dislike button */}
                            {!done && (
                                <button
                                    onClick={() => handleSkip(q.id, q.title)}
                                    disabled={!!loadingId || !!skippingId}
                                    title="Skip this quest"
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1 mt-0.5 shrink-0"
                                >
                                    {isSkipping ? (
                                        <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <X className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
