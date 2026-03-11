import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import type { Achievement, UserAchievement } from '../lib/database.types';
import { getAwardsCacheKey, readCachedValue, STATIC_VIEW_CACHE_TTL_MS, writeCachedValue } from '../lib/viewCache';
import { Brain, Coins, Compass, Dumbbell, Trophy, Users } from 'lucide-react';

type AwardsSnapshot = {
    achievements: Achievement[];
    unlockedIds: string[];
    unlockedAtById: Record<string, string>;
};

export default function Achievements() {
    const { user, profile } = useAuth();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [unlockedAtById, setUnlockedAtById] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const cacheKey = getAwardsCacheKey(user.id);
            const cachedSnapshot = readCachedValue<AwardsSnapshot>(cacheKey);
            if (cachedSnapshot.hit) {
                setAchievements(cachedSnapshot.value.achievements);
                setUnlockedIds(new Set(cachedSnapshot.value.unlockedIds));
                setUnlockedAtById(cachedSnapshot.value.unlockedAtById);
                return;
            }

            const [{ data: all }, { data: unlocked }] = await Promise.all([
                supabase.from('achievements').select('*').order('created_at'),
                supabase
                    .from('user_achievements')
                    .select('achievement_id, unlocked_at')
                    .eq('user_id', user.id)
            ]);

            const nextAchievements = (all as Achievement[]) || [];
            const unlockedRows = (unlocked as UserAchievement[]) || [];
            const nextUnlockedIds = unlockedRows.map((row) => row.achievement_id);
            const nextUnlockedAtById = unlockedRows.reduce<Record<string, string>>((acc, row) => {
                acc[row.achievement_id] = row.unlocked_at;
                return acc;
            }, {});

            setAchievements(nextAchievements);
            setUnlockedIds(new Set(nextUnlockedIds));
            setUnlockedAtById(nextUnlockedAtById);
            writeCachedValue(cacheKey, {
                achievements: nextAchievements,
                unlockedIds: nextUnlockedIds,
                unlockedAtById: nextUnlockedAtById,
            }, STATIC_VIEW_CACHE_TTL_MS);
        };
        load();
    }, [user]);

    const formatUnlockedAt = (value: string | undefined) => {
        if (!value) return null;

        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(value));
    };

    const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
        common: { border: 'border-slate-600', bg: 'bg-slate-700', text: 'text-slate-400' },
        uncommon: { border: 'border-emerald-700', bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
        rare: { border: 'border-blue-700', bg: 'bg-blue-900/30', text: 'text-blue-400' },
        epic: { border: 'border-purple-700', bg: 'bg-purple-900/30', text: 'text-purple-400' },
        legendary: { border: 'border-amber-600', bg: 'bg-amber-900/30', text: 'text-amber-400' },
    };

    // Stats
    const statLabels: Record<string, { label: string; color: string; icon: ReactNode; iconClass: string }> = {
        stat_strength: {
            label: 'Strength',
            color: 'bg-red-500',
            icon: <Dumbbell className="h-4 w-4" />,
            iconClass: 'text-red-400',
        },
        stat_knowledge: {
            label: 'Knowledge',
            color: 'bg-blue-500',
            icon: <Brain className="h-4 w-4" />,
            iconClass: 'text-blue-400',
        },
        stat_wealth: {
            label: 'Wealth',
            color: 'bg-amber-500',
            icon: <Coins className="h-4 w-4" />,
            iconClass: 'text-amber-400',
        },
        stat_adventure: {
            label: 'Adventure',
            color: 'bg-emerald-500',
            icon: <Compass className="h-4 w-4" />,
            iconClass: 'text-emerald-400',
        },
        stat_social: {
            label: 'Social',
            color: 'bg-fuchsia-500',
            icon: <Users className="h-4 w-4" />,
            iconClass: 'text-fuchsia-400',
        },
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            <AppHeader
                title="Character"
                subtitle="Stats and milestones earned on your run."
            />

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-6">

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
                        {Object.entries(statLabels).map(([key, { label, color, icon, iconClass }]) => {
                            const val = (profile as unknown as Record<string, unknown>)?.[key] as number ?? 0;
                            const pct = Math.min((val / 100) * 100, 100);
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className={`inline-flex w-28 items-center gap-2 text-xs ${iconClass}`}>
                                        {icon}
                                        <span className="text-slate-300">{label}</span>
                                    </span>
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
                                    {isUnlocked && (
                                        <p className="mt-1 text-[10px] text-slate-400">
                                            Earned {formatUnlockedAt(unlockedAtById[ach.id])}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
