import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { completeQuest, convertToHabit, type CompleteQuestResponse } from '../lib/api';
import type { Quest, Streak, Reward } from '../lib/database.types';
import { Flame, Coins, Check, Sparkles, LogOut, Gift, Lock, Heart, Plus, Repeat } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Habits from '../components/Habits';

// Stat bar component
function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20 truncate">{label}</span>
            <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner-panel">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500 font-mono w-8 text-right">{value}</span>
        </div>
    );
}

// Quest card component
function QuestCard({ quest, isCompleted, onComplete, onMakeHabit }: {
    quest: Quest;
    isCompleted: boolean;
    onComplete: (id: string) => void;
    onMakeHabit?: (quest: Quest) => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        if (isCompleted || loading) return;
        setLoading(true);
        await onComplete(quest.id);
        setLoading(false);
    };

    const difficultyColors: Record<string, string> = {
        easy: 'text-emerald-400',
        medium: 'text-amber-400',
        hard: 'text-red-400',
        epic: 'text-purple-400',
    };

    return (
        <div className={`bg-slate-800 border rounded-lg p-4 flex items-start gap-3 shadow-hud transition-all duration-300 ${isCompleted ? 'border-emerald-800/50 opacity-60' : quest.quest_type === 'boss' ? 'border-red-900/60' : 'border-slate-700'
            }`}>
            <button
                onClick={handleComplete}
                disabled={isCompleted || loading}
                className={`w-6 h-6 rounded mt-0.5 border-2 flex items-center justify-center transition-all shrink-0 ${isCompleted
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-slate-900 border-slate-600 hover:border-amber-500'
                    }`}
            >
                {loading ? (
                    <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                ) : null}
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                        {quest.title}
                    </p>
                    {quest.quest_type === 'boss' && <span className="text-xs">⚔️</span>}
                    {quest.chain_step && (
                        <span className="text-[10px] font-mono font-bold bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700/50 text-slate-500 ml-1">
                            {quest.chain_step}/{quest.chain_total}
                        </span>
                    )}
                </div>
                {quest.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{quest.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-amber-500 text-xs font-mono">+{quest.xp_reward} XP</span>
                    <span className={`text-xs ${difficultyColors[quest.difficulty] || 'text-slate-400'}`}>
                        {quest.difficulty}
                    </span>
                    {quest.stat_affected && (
                        <span className="text-xs text-slate-500">{quest.stat_affected}</span>
                    )}
                </div>
            </div>
            {/* Actions Container */}
            {!isCompleted && onMakeHabit && (
                <button
                    onClick={() => onMakeHabit(quest)}
                    title="Make this a daily habit"
                    className="text-slate-600 hover:text-emerald-400 transition-colors p-1 mt-0.5 shrink-0"
                >
                    <Repeat className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(new Set());
    const [streak, setStreak] = useState<Streak | null>(null);
    const [nextLevelXP, setNextLevelXP] = useState(100);
    const [levelUpToast, setLevelUpToast] = useState('');
    const [achievementToast, setAchievementToast] = useState('');
    const [actionToast, setActionToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);

    // Fetch data on mount
    const fetchData = useCallback(async () => {
        if (!user) return;

        // Fetch active quests
        const { data: questData } = await supabase
            .from('quests')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('quest_type');

        if (questData) setQuests(questData as Quest[]);

        // Fetch today's completions
        const today = new Date().toISOString().split('T')[0];
        const { data: completions } = await supabase
            .from('user_quests')
            .select('quest_id')
            .eq('user_id', user.id)
            .eq('quest_date', today)
            .eq('is_completed', true);

        if (completions) {
            setCompletedQuestIds(new Set(completions.map((c: { quest_id: string }) => c.quest_id)));
        }

        // Fetch streak
        const { data: streakData } = await supabase
            .from('streaks')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (streakData) setStreak(streakData as Streak);

        // Compute next level XP target using formula (replaces level_thresholds table)
        const currentLevel = profile?.level ?? 1;
        const xpForNextLevel = Math.floor(100 * Math.pow(currentLevel + 1, 1.8));
        setNextLevelXP(xpForNextLevel);

        // Fetch rewards
        const { data: rewardData } = await supabase
            .from('rewards')
            .select('*')
            .eq('user_id', user.id)
            .order('unlock_level');

        if (rewardData) setRewards(rewardData as Reward[]);
    }, [user, profile?.level]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCompleteQuest = async (questId: string) => {
        try {
            const result: CompleteQuestResponse = await completeQuest(questId);

            // Update local state
            setCompletedQuestIds(prev => new Set([...prev, questId]));

            // Refresh profile for updated XP/level/stats
            await refreshProfile();

            // Show toasts
            if (result.did_level_up) {
                setLevelUpToast(`Level Up! You are now Level ${result.new_level}!`);
                setTimeout(() => setLevelUpToast(''), 4000);
            }
            if (result.new_achievements.length > 0) {
                setAchievementToast(`🏆 ${result.new_achievements.join(', ')}`);
                setTimeout(() => setAchievementToast(''), 4000);
            }

            // Refresh streak
            if (result.streak !== streak?.current_streak) {
                setStreak(prev => prev ? { ...prev, current_streak: result.streak, xp_multiplier: result.xp_multiplier } : prev);
            }

            // Show chain unlock toast
            if (result.chain_unlocked) {
                setActionToast({ msg: `Next Step Unlocked: ${result.chain_unlocked}`, type: 'success' });
                setTimeout(() => setActionToast(null), 4000);
            }
        } catch (err) {
            console.error('Quest completion failed:', err);
        }
    };

    const handleMakeHabit = async (quest: Quest) => {
        try {
            await convertToHabit(quest.title, quest.stat_affected);
            setActionToast({ msg: `"${quest.title}" added to Habits!`, type: 'success' });
            setTimeout(() => setActionToast(null), 3000);
        } catch (error: any) {
            setActionToast({ msg: error.message || "Failed to make habit", type: 'error' });
            setTimeout(() => setActionToast(null), 3000);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    // Separate quests by type
    const dailyQuests = quests.filter(q => q.quest_type === 'daily');
    const sideQuests = quests.filter(q => q.quest_type === 'side');
    const bossQuest = quests.find(q => q.quest_type === 'boss');

    // XP progress calculation (formula-based infinite levels)
    const currentXP = profile?.xp ?? 0;
    const currentLevel = profile?.level ?? 1;
    const prevLevelXP = Math.floor(100 * Math.pow(currentLevel, 1.8));
    const xpInLevel = currentXP - prevLevelXP;
    const xpNeeded = nextLevelXP - prevLevelXP;
    const xpPercent = Math.min((xpInLevel / Math.max(xpNeeded, 1)) * 100, 100);

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 bg-slate-900 overflow-hidden relative">

            {/* Toast: Level Up */}
            {levelUpToast && (
                <div className="absolute top-4 left-4 right-4 z-50 bg-amber-500 text-slate-900 font-heading font-bold text-center py-3 px-4 rounded-lg shadow-glow-gold animate-in slide-in-from-top duration-300">
                    <Sparkles className="w-5 h-5 inline mr-2" />
                    {levelUpToast}
                </div>
            )}
            {/* Toast: Achievement */}
            {achievementToast && (
                <div className="absolute top-16 left-4 right-4 z-50 bg-emerald-600 text-white font-heading text-center py-3 px-4 rounded-lg shadow-glow-emerald animate-in slide-in-from-top duration-300 text-sm">
                    {achievementToast}
                </div>
            )}
            {/* Toast: Action */}
            {actionToast && (
                <div className={`absolute top-4 left-4 right-4 z-50 px-4 py-3 rounded-lg text-sm text-center shadow-lg animate-in slide-in-from-top-2 duration-200 ${actionToast.type === 'error'
                    ? 'bg-red-900/90 border border-red-800 text-red-100 shadow-glow-red'
                    : 'bg-emerald-900/90 border border-emerald-800 text-emerald-100 shadow-glow-emerald'
                    }`}>
                    {actionToast.msg}
                </div>
            )}

            <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 space-y-6">

                {/* Character Card */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-hud">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-slate-700 border-2 border-amber-500/40 flex items-center justify-center shrink-0 shadow-glow-gold">
                            <span className="text-2xl">🧙‍♂️</span>
                        </div>
                        <div className="flex-1">
                            <h1 className="font-heading text-xl text-white">{profile?.username || 'Hero'}</h1>
                            <p className="text-amber-500 font-heading text-sm">Level {currentLevel}</p>
                        </div>
                        <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-300 transition-colors p-2">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* XP Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">XP</span>
                            <span className="text-amber-500 font-mono">{currentXP} / {nextLevelXP}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden shadow-inner-panel">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-700 shadow-glow-gold"
                                style={{ width: `${xpPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* HP Bar */}
                    <div className="space-y-1 mt-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" fill="currentColor" /> HP</span>
                            <span className="text-red-500 font-mono">{profile?.hp ?? 100} / {profile?.max_hp ?? 100}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden shadow-inner-panel">
                            <div
                                className="h-full bg-red-500 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(((profile?.hp ?? 100) / Math.max(profile?.max_hp ?? 100, 1)) * 100, 100)}%`, boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}
                            />
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-slate-300 font-mono">{streak?.current_streak ?? 0}</span>
                            <span className="text-slate-500 text-xs">day streak</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="text-slate-300 font-mono">{profile?.gold ?? 0}</span>
                        </div>
                        {streak && streak.xp_multiplier > 1 && (
                            <span className="text-emerald-400 text-xs font-mono">×{streak.xp_multiplier} XP</span>
                        )}
                    </div>
                </div>

                {/* Daily Quests */}
                {dailyQuests.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-heading text-lg text-slate-300">Daily Quests</h2>
                            <button
                                onClick={() => navigate('/quests')}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            {dailyQuests.map(q => (
                                <QuestCard
                                    key={q.id}
                                    quest={q}
                                    isCompleted={completedQuestIds.has(q.id)}
                                    onComplete={handleCompleteQuest}
                                    onMakeHabit={handleMakeHabit}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Boss Quest */}
                {bossQuest && (
                    <div>
                        <h2 className="font-heading text-lg text-red-400 mb-3">⚔ Weekly Boss</h2>
                        <QuestCard
                            quest={bossQuest}
                            isCompleted={completedQuestIds.has(bossQuest.id)}
                            onComplete={handleCompleteQuest}
                        />
                    </div>
                )}

                {/* Side Quests */}
                {sideQuests.length > 0 && (
                    <div>
                        <h2 className="font-heading text-lg text-slate-400 mb-3">Side Quests</h2>
                        <div className="space-y-2.5">
                            {sideQuests.map(q => (
                                <QuestCard
                                    key={q.id}
                                    quest={q}
                                    isCompleted={completedQuestIds.has(q.id)}
                                    onComplete={handleCompleteQuest}
                                    onMakeHabit={handleMakeHabit}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Character Stats */}
                <div>
                    <h2 className="font-heading text-lg text-slate-300 mb-3">Character Stats</h2>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3 shadow-hud">
                        <StatBar label="Strength" value={profile?.stat_strength ?? 0} color="bg-red-500" />
                        <StatBar label="Knowledge" value={profile?.stat_knowledge ?? 0} color="bg-blue-500" />
                        <StatBar label="Wealth" value={profile?.stat_wealth ?? 0} color="bg-yellow-500" />
                        <StatBar label="Adventure" value={profile?.stat_adventure ?? 0} color="bg-purple-500" />
                        <StatBar label="Social" value={profile?.stat_social ?? 0} color="bg-pink-500" />
                    </div>
                </div>

                {/* Rewards (Milestone) */}
                {rewards.length > 0 && (
                    <div>
                        <h2 className="font-heading text-lg text-amber-400 mb-3 flex items-center gap-2">
                            <Gift className="w-5 h-5" /> Milestone Rewards
                        </h2>
                        <div className="space-y-2">
                            {rewards.map(r => {
                                const unlocked = currentLevel >= r.unlock_level;
                                return (
                                    <div key={r.id} className={`bg-slate-800 border rounded-lg p-4 flex items-center gap-3 transition-all duration-300 ${r.is_redeemed ? 'border-emerald-800/40 opacity-50' : unlocked ? 'border-amber-500/40 shadow-glow-gold' : 'border-slate-700/50 opacity-70'
                                        }`}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.is_redeemed ? 'bg-emerald-900/50' : unlocked ? 'bg-amber-500/20' : 'bg-slate-700'
                                            }`}>
                                            {r.is_redeemed ? (
                                                <Check className="w-5 h-5 text-emerald-400" />
                                            ) : unlocked ? (
                                                <Gift className="w-5 h-5 text-amber-500" />
                                            ) : (
                                                <Lock className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${r.is_redeemed ? 'line-through text-slate-500' : unlocked ? 'text-white' : 'text-slate-400'
                                                }`}>{r.title}</p>
                                            {r.description && (
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{r.description}</p>
                                            )}
                                        </div>
                                        <span className={`text-xs font-heading ${unlocked ? 'text-amber-500' : 'text-slate-600'
                                            }`}>Lv.{r.unlock_level}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Habits Section */}
                <div className="pt-2 border-t border-slate-800">
                    <Habits />
                </div>

                {/* Empty state (Quests only) */}
                {quests.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm">No quests yet. Complete onboarding to generate your quests!</p>
                    </div>
                )}
            </div>

            {/* Bottom HUD Navigation */}
            <BottomNav />

        </div>
    );
}
