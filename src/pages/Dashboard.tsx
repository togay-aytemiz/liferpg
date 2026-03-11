import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { completeQuest, convertToHabit, rerollDailyQuest, type CompleteQuestResponse } from '../lib/api';
import type { Quest, Streak } from '../lib/database.types';
import { fetchQuestRuntime } from '../lib/questRuntime';
import {
    getDailyObjectiveProgress,
    getVisibleDailyQuests,
    xpRequiredForLevel,
} from '../lib/gameplay';
import { getDashboardStreakCacheKey, readCachedValue, VIEW_CACHE_TTL_MS, writeCachedValue } from '../lib/viewCache';
import { Flame, Coins, Sparkles, Heart, Plus } from 'lucide-react';
import DailyProgressCard from '../components/DailyProgressCard';
import Habits from '../components/Habits';
import QuestCard from '../components/QuestCard';
import CustomQuestModal from '../components/CustomQuestModal';
import RerollReasonModal from '../components/RerollReasonModal';
import { APP_RUNTIME_CHANGED_EVENT, emitHabitCreated, HABIT_RUNTIME_CHANGED_EVENT } from '../lib/habitEvents';
import type { RerollReasonBucket } from '../lib/rerollReasons';

export default function Dashboard() {
    const { user, profile, refreshProfile } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(new Set());
    const [streak, setStreak] = useState<Streak | null>(null);
    const [levelUpToast, setLevelUpToast] = useState('');
    const [achievementToast, setAchievementToast] = useState('');
    const [actionToast, setActionToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);
    const [rerollingId, setRerollingId] = useState<string | null>(null);
    const [remainingDailyRerolls, setRemainingDailyRerolls] = useState(0);
    const [activeDailyHabitIds, setActiveDailyHabitIds] = useState<string[]>([]);
    const [loggedDailyHabitIds, setLoggedDailyHabitIds] = useState<string[]>([]);
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [rerollModalQuest, setRerollModalQuest] = useState<Quest | null>(null);

    const fetchData = useCallback(async (options?: { force?: boolean }) => {
        if (!user) return;

        const questRuntime = await fetchQuestRuntime(user.id, { force: options?.force });
        setQuests(questRuntime.quests);
        setCompletedQuestIds(new Set(questRuntime.completedQuestIds));
        setRemainingDailyRerolls(questRuntime.remainingDailyRerolls);
        setActiveDailyHabitIds(questRuntime.activeDailyHabitIds);
        setLoggedDailyHabitIds(questRuntime.loggedDailyHabitIds);

        const streakCacheKey = getDashboardStreakCacheKey(user.id);
        if (!options?.force) {
            const cachedStreak = readCachedValue<Streak | null>(streakCacheKey);
            if (cachedStreak.hit) {
                setStreak(cachedStreak.value);
                return;
            }
        }

        const { data: streakData } = await supabase
            .from('streaks')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const nextStreak = (streakData as Streak | null) ?? null;
        setStreak(nextStreak);
        writeCachedValue(streakCacheKey, nextStreak, VIEW_CACHE_TTL_MS);
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleHabitRuntimeChanged = () => {
            fetchData({ force: true });
        };

        window.addEventListener(HABIT_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
        window.addEventListener(APP_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
        return () => {
            window.removeEventListener(HABIT_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
            window.removeEventListener(APP_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
        };
    }, [fetchData]);

    const handleCompleteQuest = async (quest: Quest) => {
        try {
            setLoadingId(quest.id);
            const result: CompleteQuestResponse = await completeQuest(quest.id);

            setCompletedQuestIds((prev) => new Set([...prev, quest.id]));
            await refreshProfile();

            if (result.did_level_up) {
                setLevelUpToast(`Level Up! You are now Level ${result.new_level}!`);
                setTimeout(() => setLevelUpToast(''), 4000);
            }

            if (result.new_achievements.length > 0) {
                setAchievementToast(`🏆 ${result.new_achievements.join(', ')}`);
                setTimeout(() => setAchievementToast(''), 4000);
            }

            if (result.streak !== streak?.current_streak) {
                setStreak((prev) => prev ? { ...prev, current_streak: result.streak, xp_multiplier: result.xp_multiplier } : prev);
            }

            if (result.chain_unlocked) {
                setActionToast({ msg: `+${result.xp_awarded} XP • +${result.gold_awarded} Gold. Next Step Unlocked: ${result.chain_unlocked}`, type: 'success' });
                setTimeout(() => setActionToast(null), 4000);
            } else {
                setActionToast({ msg: `+${result.xp_awarded} XP • +${result.gold_awarded} Gold`, type: 'success' });
                setTimeout(() => setActionToast(null), 3000);
            }

            await fetchData({ force: true });
        } catch (err) {
            console.error('Quest completion failed:', err);
            setActionToast({ msg: 'Failed to complete quest', type: 'error' });
            setTimeout(() => setActionToast(null), 3000);
        } finally {
            setLoadingId(null);
        }
    };

    const handleMakeHabit = async (quest: Quest) => {
        try {
            setActionId(quest.id);
            const habit = await convertToHabit(quest.title, quest.stat_affected);
            emitHabitCreated(habit);
            setActionToast({ msg: `"${quest.title}" added to Habits!`, type: 'success' });
            setTimeout(() => setActionToast(null), 3000);
        } catch (error: any) {
            setActionToast({ msg: error.message || 'Failed to make habit', type: 'error' });
            setTimeout(() => setActionToast(null), 3000);
        } finally {
            setActionId(null);
        }
    };

    const handleOpenRerollDaily = (quest: Quest) => {
        if (loadingId || actionId || rerollingId || completedQuestIds.has(quest.id)) return;
        setRerollModalQuest(quest);
    };

    const handleConfirmRerollDaily = async (reasonBucket: RerollReasonBucket, reasonDetail?: string) => {
        if (!rerollModalQuest) return;

        try {
            setRerollingId(rerollModalQuest.id);
            const result = await rerollDailyQuest(rerollModalQuest.id, reasonBucket, reasonDetail);

            setQuests((prev) => {
                const withoutOldQuest = prev.filter((existingQuest) => existingQuest.id !== rerollModalQuest.id);
                if (!result.new_quest) return withoutOldQuest;

                return [...withoutOldQuest, result.new_quest].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            });

            showToast(result.message || 'Daily quest rerolled.');
            await fetchData({ force: true });
        } catch (error: any) {
            setActionToast({ msg: error.message || 'Failed to reroll daily quest', type: 'error' });
            setTimeout(() => setActionToast(null), 3000);
        } finally {
            setRerollModalQuest(null);
            setRerollingId(null);
        }
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setActionToast({ msg, type });
        setTimeout(() => setActionToast(null), 3000);
    };

    const visibleDailyQuests = getVisibleDailyQuests(quests);
    const dailyProgress = getDailyObjectiveProgress(
        visibleDailyQuests,
        completedQuestIds,
        activeDailyHabitIds,
        loggedDailyHabitIds,
    );

    const currentXP = profile?.xp ?? 0;
    const currentLevel = profile?.level ?? 1;
    const nextLevelXP = xpRequiredForLevel(currentLevel + 1);
    const prevLevelXP = currentLevel <= 1 ? 0 : xpRequiredForLevel(currentLevel);
    const xpInLevel = currentXP - prevLevelXP;
    const xpNeeded = nextLevelXP - prevLevelXP;
    const xpPercent = Math.max(0, Math.min((xpInLevel / Math.max(xpNeeded, 1)) * 100, 100));

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 bg-slate-900 overflow-hidden relative">
            {levelUpToast && (
                <div className="absolute top-4 left-4 right-4 z-50 bg-amber-500 text-slate-900 font-heading font-bold text-center py-3 px-4 rounded-lg shadow-glow-gold animate-in slide-in-from-top duration-300">
                    <Sparkles className="w-5 h-5 inline mr-2" />
                    {levelUpToast}
                </div>
            )}

            {achievementToast && (
                <div className="absolute top-16 left-4 right-4 z-50 bg-emerald-600 text-white font-heading text-center py-3 px-4 rounded-lg shadow-glow-emerald animate-in slide-in-from-top duration-300 text-sm">
                    {achievementToast}
                </div>
            )}

            {actionToast && (
                <div className={`absolute top-4 left-4 right-4 z-50 px-4 py-3 rounded-lg text-sm text-center shadow-lg animate-in slide-in-from-top-2 duration-200 ${actionToast.type === 'error'
                    ? 'bg-red-900/90 border border-red-800 text-red-100 shadow-glow-red'
                    : 'bg-emerald-900/90 border border-emerald-800 text-emerald-100 shadow-glow-emerald'
                    }`}>
                    {actionToast.msg}
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-hud">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-700 border-2 border-amber-500/40 flex items-center justify-center shrink-0 shadow-glow-gold">
                            <span className="text-2xl">🧙‍♂️</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="font-heading text-xl text-white truncate">{profile?.username || 'Hero'}</h1>
                                    <p className="mt-1 text-amber-500 font-heading text-sm">Level {currentLevel}</p>
                                    {streak && streak.xp_multiplier > 1 && (
                                        <span className="mt-2 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-mono text-emerald-300">
                                            x{streak.xp_multiplier} XP
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[11px] font-mono text-orange-300">
                                        <Flame className="w-3 h-3 text-orange-400" />
                                        {streak?.current_streak ?? 0}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-mono text-amber-300">
                                        <Coins className="w-3 h-3 text-amber-400" />
                                        {profile?.gold ?? 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 mt-4">
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
                </div>

                <DailyProgressCard
                    completed={dailyProgress.completed}
                    total={dailyProgress.total}
                />

                {visibleDailyQuests.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="font-heading text-lg text-slate-300">Today's Dailies</h2>
                                <p className="text-xs text-slate-500">Only the active focus set lives here. More rotate in later.</p>
                            </div>
                            <button
                                onClick={() => setCustomModalOpen(true)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                title="Forge a daily quest"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            {visibleDailyQuests.map((quest) => (
                                <QuestCard
                                    key={quest.id}
                                    quest={quest}
                                    isCompleted={completedQuestIds.has(quest.id)}
                                    isCompleting={loadingId === quest.id}
                                    isActionLoading={actionId === quest.id || rerollingId === quest.id}
                                    onComplete={handleCompleteQuest}
                                    onMakeHabit={handleMakeHabit}
                                    onRerollDaily={handleOpenRerollDaily}
                                    remainingDailyRerolls={remainingDailyRerolls}
                                    disableActions={!!loadingId || !!actionId || !!rerollingId}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-slate-800">
                    <Habits />
                </div>

                {quests.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm">No quests yet. Complete onboarding to generate your quests!</p>
                    </div>
                )}
            </div>

            <CustomQuestModal
                open={customModalOpen}
                questType="daily"
                onClose={() => setCustomModalOpen(false)}
                onCreated={async (quest) => {
                    setQuests((prev) => [...prev, quest].sort((a, b) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    ));
                    showToast(`Custom quest created: ${quest.title}`);
                    await fetchData({ force: true });
                }}
                onError={(message) => {
                    console.error(message);
                    showToast(message, 'error');
                }}
            />

            <RerollReasonModal
                open={!!rerollModalQuest}
                quest={rerollModalQuest}
                remainingAlternatives={remainingDailyRerolls}
                loading={!!rerollingId}
                onClose={() => {
                    if (rerollingId) return;
                    setRerollModalQuest(null);
                }}
                onConfirm={handleConfirmRerollDaily}
            />
        </div>
    );
}
