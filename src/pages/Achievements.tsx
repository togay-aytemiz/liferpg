import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Achievement, UserAchievement } from '../lib/database.types';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function Achievements() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const { data: all } = await supabase.from('achievements').select('*').order('created_at');
            if (all) setAchievements(all as Achievement[]);

            const { data: unlocked } = await supabase
                .from('user_achievements')
                .select('achievement_id')
                .eq('user_id', user.id);
            if (unlocked) setUnlockedIds(new Set((unlocked as UserAchievement[]).map(u => u.achievement_id)));
        };
        load();
    }, [user]);

    const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
        common: { border: 'border-slate-600', bg: 'bg-slate-700', text: 'text-slate-400' },
        uncommon: { border: 'border-emerald-700', bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
        rare: { border: 'border-blue-700', bg: 'bg-blue-900/30', text: 'text-blue-400' },
        epic: { border: 'border-purple-700', bg: 'bg-purple-900/30', text: 'text-purple-400' },
        legendary: { border: 'border-amber-600', bg: 'bg-amber-900/30', text: 'text-amber-400' },
    };

    // Stats
    const statLabels: Record<string, { label: string; color: string }> = {
        stat_strength: { label: 'Strength', color: 'bg-red-500' },
        stat_knowledge: { label: 'Knowledge', color: 'bg-blue-500' },
        stat_wealth: { label: 'Wealth', color: 'bg-yellow-500' },
        stat_adventure: { label: 'Adventure', color: 'bg-purple-500' },
        stat_social: { label: 'Social', color: 'bg-pink-500' },
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="px-4 pt-6 pb-3 flex items-center gap-3">
                <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors p-1">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-heading text-2xl text-white">Character</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">

                {/* Character Card */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-hud text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-slate-700 border-2 border-amber-500/40 flex items-center justify-center shadow-glow-gold mb-3">
                        <span className="text-4xl">🧙‍♂️</span>
                    </div>
                    <h2 className="font-heading text-xl text-white">{profile?.username || 'Hero'}</h2>
                    <p className="text-amber-500 font-heading text-sm mt-0.5">Level {profile?.level ?? 1}</p>
                    <p className="text-slate-500 text-xs mt-1 font-mono">{profile?.xp ?? 0} XP • {profile?.gold ?? 0} Gold</p>
                </div>

                {/* Stats */}
                <div>
                    <h2 className="font-heading text-lg text-slate-300 mb-3">Stats</h2>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3 shadow-hud">
                        {Object.entries(statLabels).map(([key, { label, color }]) => {
                            const val = (profile as unknown as Record<string, unknown>)?.[key] as number ?? 0;
                            const pct = Math.min((val / 100) * 100, 100);
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 w-20">{label}</span>
                                    <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden shadow-inner-panel">
                                        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono w-8 text-right">{val}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Achievements */}
                <div>
                    <h2 className="font-heading text-lg text-slate-300 mb-1 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" /> Achievements
                    </h2>
                    <p className="text-xs text-slate-500 mb-3">{unlockedIds.size} / {achievements.length} unlocked</p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {achievements.map(ach => {
                            const isUnlocked = unlockedIds.has(ach.id);
                            const rc = rarityColors[ach.rarity] || rarityColors.common;
                            return (
                                <div key={ach.id} className={`border rounded-lg p-3 transition-all ${isUnlocked ? `${rc.border} ${rc.bg}` : 'border-slate-700/50 bg-slate-800/50 opacity-50'
                                    }`}>
                                    <div className="text-2xl mb-1">{ach.icon || '🏅'}</div>
                                    <p className={`text-xs font-medium ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{ach.description}</p>
                                    <span className={`text-[10px] font-heading uppercase tracking-wider mt-1 inline-block ${rc.text}`}>{ach.rarity}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
