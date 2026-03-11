import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Quest } from '../lib/database.types';
import { completeQuest, regenerateQuest, rerollDailyQuest, convertToHabit } from '../lib/api';
import {
    getDailyObjectiveProgress,
    getVisibleDailyQuests,
    getVisibleWeeklyBoss,
} from '../lib/gameplay';
import { dedupeQuestPoolByTitle } from '../lib/dailyPool';
import { Shield, Swords, Skull, Plus } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import DailyProgressCard from '../components/DailyProgressCard';
import QuestCard from '../components/QuestCard';
import CustomQuestModal from '../components/CustomQuestModal';
import RerollReasonModal from '../components/RerollReasonModal';
import { APP_RUNTIME_CHANGED_EVENT, emitHabitCreated, HABIT_RUNTIME_CHANGED_EVENT } from '../lib/habitEvents';
import { fetchQuestRuntime } from '../lib/questRuntime';
import type { RerollReasonBucket } from '../lib/rerollReasons';

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
    const [remainingDailyRerolls, setRemainingDailyRerolls] = useState(0);
    const [activeDailyHabitIds, setActiveDailyHabitIds] = useState<string[]>([]);
    const [loggedDailyHabitIds, setLoggedDailyHabitIds] = useState<string[]>([]);

    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [rerollModalQuest, setRerollModalQuest] = useState<Quest | null>(null);

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
        setRemainingDailyRerolls(snapshot.remainingDailyRerolls);
        setActiveDailyHabitIds(snapshot.activeDailyHabitIds);
        setLoggedDailyHabitIds(snapshot.loggedDailyHabitIds);
    }, [user]);

    useEffect(() => {
        fetchQuests();
    }, [fetchQuests]);

    useEffect(() => {
        const handleHabitRuntimeChanged = () => {
            fetchQuests({ force: true });
        };

        window.addEventListener(HABIT_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
        window.addEventListener(APP_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
        return () => {
            window.removeEventListener(HABIT_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
            window.removeEventListener(APP_RUNTIME_CHANGED_EVENT, handleHabitRuntimeChanged);
        };
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

    const handleOpenRerollDaily = (quest: Quest) => {
        if (loadingId || regeneratingId || rerollingId || habitActionId || completedIds.has(quest.id)) return;
        setRerollModalQuest(quest);
    };

    const handleConfirmRerollDaily = async (reasonBucket: RerollReasonBucket, reasonDetail?: string) => {
        if (!rerollModalQuest) return;
        setRerollingId(rerollModalQuest.id);

        try {
            const result = await rerollDailyQuest(rerollModalQuest.id, reasonBucket, reasonDetail);

            setQuests((prev) => {
                const withoutOldQuest = prev.filter((existingQuest) => existingQuest.id !== rerollModalQuest.id);
                if (!result.new_quest) return withoutOldQuest;

                return [...withoutOldQuest, result.new_quest].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            });

            showToast(result.message || 'Daily quest rerolled.');
            await fetchQuests({ force: true });
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to reroll daily quest', 'error');
        } finally {
            setRerollModalQuest(null);
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
    const sideQuests = dedupeQuestPoolByTitle(
        quests.filter((quest) => quest.quest_type === 'side'),
        { preferActive: true },
    );
    const dailyProgress = getDailyObjectiveProgress(
        visibleDailyQuests,
        completedIds,
        activeDailyHabitIds,
        loggedDailyHabitIds,
    );

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
                        onRerollDaily={quest.quest_type === 'daily' ? handleOpenRerollDaily : undefined}
                        remainingDailyRerolls={quest.quest_type === 'daily' ? remainingDailyRerolls : null}
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
                <CustomQuestModal
                    open={customModalOpen}
                    questType={tab === 'boss' ? 'side' : tab}
                    onClose={() => setCustomModalOpen(false)}
                    onCreated={async (quest) => {
                        setQuests((prev) => [...prev, quest].sort((a, b) =>
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        ));
                        showToast(`Custom quest created: ${quest.title}`);
                        await fetchQuests({ force: true });
                    }}
                    onError={(message) => {
                        console.error(message);
                        showToast(message, 'error');
                    }}
                />
            )}

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
