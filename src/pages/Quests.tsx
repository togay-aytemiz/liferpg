import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Quest } from '../lib/database.types';
import { completeQuest, regenerateQuest, rerollDailyQuest, createCustomQuest, convertToHabit } from '../lib/api';
import {
    getDailyQuestProgress,
    getVisibleDailyQuests,
    getVisibleWeeklyBoss,
} from '../lib/gameplay';
import { Shield, Swords, Skull, Plus, RefreshCw } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import DailyProgressCard from '../components/DailyProgressCard';
import QuestCard from '../components/QuestCard';
import { emitHabitCreated } from '../lib/habitEvents';
import { fetchQuestRuntime } from '../lib/questRuntime';

export default function Quests() {
    const { user, refreshProfile } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [completedBossIds, setCompletedBossIds] = useState<Set<string>>(new Set());
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [rerollingId, setRerollingId] = useState<string | null>(null);
    const [habitActionId, setHabitActionId] = useState<string | null>(null);
    const [regenerateModalOpen, setRegenerateModalOpen] = useState<{ id: string; title: string } | null>(null);
    const [tab, setTab] = useState<'daily' | 'side' | 'boss'>('daily');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [remainingRegenerations, setRemainingRegenerations] = useState(0);

    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isCreatingCustom, setIsCreatingCustom] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchQuests = useCallback(async (options?: { force?: boolean }) => {
        if (!user) return;

        const snapshot = await fetchQuestRuntime(user.id, { force: options?.force });
        setQuests(snapshot.quests);
        setCompletedIds(new Set(snapshot.completedQuestIds));
        setCompletedBossIds(new Set(snapshot.completedBossIds));
        setRemainingRegenerations(snapshot.remainingRegenerations);
    }, [user]);

    useEffect(() => {
        fetchQuests();
    }, [fetchQuests]);

    const handleComplete = async (quest: Quest) => {
        if (completedIds.has(quest.id) || loadingId || regeneratingId || rerollingId || habitActionId) return;
        setLoadingId(quest.id);

        try {
            const result = await completeQuest(quest.id);
            setCompletedIds((prev) => new Set([...prev, quest.id]));
            await refreshProfile();

            if (result.chain_unlocked) {
                showToast(`+${result.xp_awarded} XP • +${result.gold_awarded} Gold. Next chapter unlocked: ${result.chain_unlocked}`);
            } else {
                showToast(`+${result.xp_awarded} XP • +${result.gold_awarded} Gold`);
            }

            await fetchQuests({ force: true });
        } catch (err) {
            console.error(err);
            showToast('Failed to complete quest', 'error');
        } finally {
            setLoadingId(null);
        }
    };

    const handleOpenRegenerate = (quest: Quest) => {
        if (loadingId || regeneratingId || rerollingId || habitActionId) return;
        setRegenerateModalOpen({ id: quest.id, title: quest.title });
    };

    const handleRerollDaily = async (quest: Quest) => {
        if (loadingId || regeneratingId || rerollingId || habitActionId || completedIds.has(quest.id)) return;
        setRerollingId(quest.id);

        try {
            const result = await rerollDailyQuest(quest.id);

            setQuests((prev) => {
                const withoutOldQuest = prev.filter((existingQuest) => existingQuest.id !== quest.id);
                if (!result.new_quest) return withoutOldQuest;

                return [...withoutOldQuest, result.new_quest].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            });

            showToast(result.message || 'Daily quest rerolled.');
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to reroll daily quest', 'error');
        } finally {
            setRerollingId(null);
        }
    };

    const confirmRegenerate = async (reason: string) => {
        if (!regenerateModalOpen) return;

        const { id } = regenerateModalOpen;
        setRegeneratingId(id);
        setRegenerateModalOpen(null);

        try {
            const result = await regenerateQuest(id, reason);

            setQuests((prev) => {
                const filtered = prev.filter((quest) => quest.id !== id);
                if (!result.new_quest) return filtered;

                return [...filtered, result.new_quest].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            });

            setRemainingRegenerations(result.remaining_skips);
            await refreshProfile();

            if (result.died) {
                showToast('You died during regeneration. Half your gold and your streak were lost.', 'error');
            } else if (result.hp_lost) {
                showToast(`-${result.hp_lost} HP. ${result.message || 'Quest regenerated.'}`, 'error');
            } else {
                showToast(result.message || `Quest regenerated. ${result.remaining_skips} refreshes left today.`);
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to regenerate quest', 'error');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleCreateCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customPrompt.trim() || isCreatingCustom) return;

        setIsCreatingCustom(true);
        try {
            const targetType = tab === 'boss' ? 'side' : tab;
            const result = await createCustomQuest(customPrompt, targetType);

            setQuests((prev) => [...prev, result.quest].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ));

            showToast(`Custom quest created: ${result.quest.title}`);
            setCustomModalOpen(false);
            setCustomPrompt('');
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to create quest', 'error');
        } finally {
            setIsCreatingCustom(false);
        }
    };

    const handleMakeHabit = async (quest: Quest) => {
        try {
            setHabitActionId(quest.id);
            const habit = await convertToHabit(quest.title, quest.stat_affected);
            emitHabitCreated(habit);
            showToast(`"${quest.title}" added to Habits!`);
        } catch (err: any) {
            showToast(err.message || 'Failed to create habit', 'error');
        } finally {
            setHabitActionId(null);
        }
    };

    const visibleDailyQuests = getVisibleDailyQuests(quests);
    const visibleWeeklyBoss = getVisibleWeeklyBoss(quests, completedBossIds);
    const sideQuests = quests.filter((quest) => quest.quest_type === 'side');
    const dailyProgress = getDailyQuestProgress(visibleDailyQuests, completedIds);

    const displayedQuests = tab === 'daily'
        ? visibleDailyQuests
        : tab === 'boss'
            ? (visibleWeeklyBoss ? [visibleWeeklyBoss] : [])
            : sideQuests;

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            <AppHeader
                title="Quests"
                subtitle="Focused chapters only. No backlog wall."
                actions={(
                    <button
                        onClick={() => setCustomModalOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-slate-900 shadow-glow-gold transition-colors hover:bg-amber-400"
                        title="Add Custom Quest"
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                )}
            />

            <div className="px-4 pt-4">
                <DailyProgressCard
                    completed={dailyProgress.completed}
                    total={dailyProgress.total}
                />
            </div>

            <div className="flex px-4 pt-4 gap-2">
                {(['daily', 'side', 'boss'] as const).map((questTab) => (
                    <button
                        key={questTab}
                        onClick={() => setTab(questTab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-heading tracking-wider uppercase transition-all ${tab === questTab
                            ? questTab === 'boss'
                                ? 'bg-red-900/40 text-red-400 border border-red-800'
                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
                            }`}
                    >
                        {questTab === 'daily' && <Shield className="w-4 h-4" />}
                        {questTab === 'side' && <Swords className="w-4 h-4" />}
                        {questTab === 'boss' && <Skull className="w-4 h-4" />}
                        {questTab}
                    </button>
                ))}
            </div>

            {toast && (
                <div className={`mx-4 mt-4 px-4 py-2.5 rounded-lg text-sm text-center animate-in fade-in slide-in-from-top-2 duration-200 ${toast.type === 'error'
                    ? 'bg-red-900/40 border border-red-800 text-red-400'
                    : 'bg-emerald-900/40 border border-emerald-800 text-emerald-400'
                    }`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-4">
                {displayedQuests.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-8">No {tab} quests found.</p>
                )}

                {displayedQuests.map((quest) => (
                    <QuestCard
                        key={quest.id}
                        quest={quest}
                        isCompleted={completedIds.has(quest.id)}
                        isCompleting={loadingId === quest.id}
                        isActionLoading={regeneratingId === quest.id || rerollingId === quest.id || habitActionId === quest.id}
                        onComplete={handleComplete}
                        onMakeHabit={handleMakeHabit}
                        onRerollDaily={quest.quest_type === 'daily' ? handleRerollDaily : undefined}
                        onRegenerate={quest.quest_type !== 'daily' ? handleOpenRegenerate : undefined}
                        remainingRegenerations={quest.quest_type !== 'daily' ? remainingRegenerations : null}
                        disableActions={!!loadingId || !!regeneratingId || !!rerollingId || !!habitActionId}
                    />
                ))}
            </div>

            {regenerateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-heading text-lg text-white mb-2">Regenerate Quest</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Why should we replace "<span className="text-white">{regenerateModalOpen.title}</span>"?
                        </p>
                        <p className="text-xs text-slate-500 mb-4">
                            {remainingRegenerations} refreshes left today.
                        </p>
                        <div className="space-y-2 mb-5">
                            {['Takes too much time', 'Too difficult right now', 'Not interested', "Doesn't fit my routine"].map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => confirmRegenerate(reason)}
                                    className="w-full text-left px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors text-sm"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setRegenerateModalOpen(null)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {customModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-heading text-lg text-white mb-2">Create Custom Quest</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Write the challenge you want to add.
                        </p>

                        <form onSubmit={handleCreateCustom} className="space-y-4">
                            <textarea
                                value={customPrompt}
                                onChange={(event) => setCustomPrompt(event.target.value)}
                                placeholder='e.g. "No fast food today" or "Finish my presentation outline"'
                                className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCustomModalOpen(false)}
                                    className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!customPrompt.trim() || isCreatingCustom}
                                    className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-heading text-slate-900 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
                                >
                                    {isCreatingCustom ? <RefreshCw className="mx-auto w-4 h-4 animate-spin" /> : 'Forge Quest'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
