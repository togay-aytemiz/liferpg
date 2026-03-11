import { useEffect, useRef, useState } from 'react';
import { Check, Coins, Lock, MoreHorizontal, RefreshCw } from 'lucide-react';
import type { Quest } from '../lib/database.types';
import { getQuestGoldReward } from '../lib/questEconomy';
import type { BossUnlockProgress } from '../lib/bossUnlock';
import { formatBossUnlockRemaining, formatBossUnlockRequirement } from '../lib/bossUnlock';
import { getStatPresentation } from '../lib/statPresentation';

type QuestCardProps = {
    quest: Quest;
    isCompleted: boolean;
    isCompleting?: boolean;
    isActionLoading?: boolean;
    onComplete: (quest: Quest) => void | Promise<void>;
    onMakeHabit?: (quest: Quest) => void | Promise<void>;
    onRerollDaily?: (quest: Quest) => void | Promise<void>;
    onRegenerate?: (quest: Quest) => void;
    remainingRegenerations?: number | null;
    remainingDailyRerolls?: number | null;
    dailyRerollQuotaRemaining?: number | null;
    dailyRerollReserveRemaining?: number | null;
    bossUnlockProgress?: BossUnlockProgress | null;
    disableActions?: boolean;
};

export default function QuestCard({
    quest,
    isCompleted,
    isCompleting = false,
    isActionLoading = false,
    onComplete,
    onMakeHabit,
    onRerollDaily,
    onRegenerate,
    remainingRegenerations,
    remainingDailyRerolls,
    dailyRerollQuotaRemaining,
    dailyRerollReserveRemaining,
    bossUnlockProgress = null,
    disableActions = false,
}: QuestCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!menuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [menuOpen]);

    const difficultyColors: Record<string, string> = {
        easy: 'text-emerald-400',
        medium: 'text-amber-400',
        hard: 'text-red-400',
        epic: 'text-purple-400',
    };

    const canMakeHabit = !!onMakeHabit && quest.quest_type !== 'boss';
    const canRerollDaily = !!onRerollDaily && quest.quest_type === 'daily';
    const canRegenerate = !!onRegenerate && quest.quest_type !== 'daily';
    const hasMenuActions = canMakeHabit || canRerollDaily || canRegenerate;
    const regenerateDisabled = typeof remainingRegenerations === 'number' && remainingRegenerations <= 0;
    const rerollDisabled = typeof remainingDailyRerolls === 'number' && remainingDailyRerolls <= 0;
    const rerollStatusText = typeof remainingDailyRerolls === 'number'
        ? remainingDailyRerolls > 0
            ? `${remainingDailyRerolls} reroll${remainingDailyRerolls === 1 ? '' : 's'} left today`
            : (dailyRerollQuotaRemaining ?? 0) <= 0
                ? 'No rerolls left today'
                : (dailyRerollReserveRemaining ?? 0) <= 0
                    ? 'No alternate dailies left in the current reserve'
                    : 'No rerolls available right now'
        : 'Checking reroll availability...';
    const goldReward = getQuestGoldReward(quest.quest_type, quest.difficulty, quest.gold_reward);
    const isBossLocked = quest.quest_type === 'boss' && bossUnlockProgress !== null && !bossUnlockProgress.unlocked;
    const statPresentation = getStatPresentation(quest.stat_affected);

    return (
        <div
            className={`relative bg-slate-800 border rounded-lg p-4 flex items-start gap-3 shadow-hud transition-all duration-300 ${isCompleted
                ? 'border-emerald-800/50 opacity-60'
                : quest.quest_type === 'boss'
                    ? isBossLocked
                        ? 'border-amber-900/60'
                        : 'border-red-900/60'
                    : 'border-slate-700'
                }`}
        >
            <button
                onClick={() => onComplete(quest)}
                disabled={isCompleted || isCompleting || disableActions || isBossLocked}
                className={`w-6 h-6 rounded mt-0.5 border-2 flex items-center justify-center transition-all shrink-0 ${isCompleted
                    ? 'bg-emerald-500 border-emerald-500'
                    : isBossLocked
                        ? 'bg-amber-950/40 border-amber-700'
                    : 'bg-slate-900 border-slate-600 hover:border-amber-500'
                    }`}
            >
                {isCompleting ? (
                    <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                ) : isBossLocked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                ) : null}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {statPresentation && (
                            <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                <span className={`${statPresentation.iconClass} opacity-70`}>
                                    {statPresentation.icon}
                                </span>
                                <span className="text-slate-400">{statPresentation.label}</span>
                            </div>
                        )}
                        <p className={`line-clamp-2 pr-2 font-medium text-sm leading-snug ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                            {quest.title}
                        </p>
                    </div>
                    {quest.chain_step && (
                        <span className="text-[10px] font-mono font-bold bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700/50 text-slate-500 shrink-0">
                            {quest.chain_step}/{quest.chain_total}
                        </span>
                    )}
                </div>

                {quest.description && (
                    <p className="mt-0.5 line-clamp-3 text-xs text-slate-500">{quest.description}</p>
                )}

                {isBossLocked && bossUnlockProgress && (
                    <div className="mt-1.5 space-y-1 rounded-lg border border-amber-900/40 bg-amber-950/10 px-2.5 py-2">
                        <p className="text-[11px] font-heading tracking-wide text-amber-300">Locked Weekly Boss</p>
                        <p className="text-[11px] text-slate-400">{formatBossUnlockRequirement(bossUnlockProgress)}</p>
                        <p className="text-[11px] text-amber-200">{formatBossUnlockRemaining(bossUnlockProgress)}</p>
                    </div>
                )}

                <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className="text-amber-500 text-xs font-mono">+{quest.xp_reward} XP</span>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-yellow-300">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        +{goldReward} Gold
                    </span>
                    <span className={`text-xs ${difficultyColors[quest.difficulty] || 'text-slate-400'}`}>
                        {quest.difficulty}
                    </span>
                </div>
            </div>

            {!isCompleted && hasMenuActions && (
                <div ref={menuRef} className="relative shrink-0">
                    <button
                        onClick={() => setMenuOpen((open) => !open)}
                        disabled={disableActions}
                        className="mt-0.5 rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-500 transition-colors hover:text-slate-200"
                        title="More actions"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
                            {canMakeHabit && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        void onMakeHabit?.(quest);
                                    }}
                                    disabled={disableActions || isActionLoading}
                                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800"
                                >
                                    <span className="text-sm text-slate-200">Make Habit</span>
                                    <span className="text-[11px] text-slate-500">Add this quest to your habit list.</span>
                                </button>
                            )}

                            {canRerollDaily && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        void onRerollDaily?.(quest);
                                    }}
                                    disabled={disableActions || isActionLoading || rerollDisabled}
                                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-200">
                                        {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : null}
                                        Reroll Daily
                                    </span>
                                    <span className="text-[11px] text-slate-500">2 rerolls per day. Swap this slot with another daily from the current pool.</span>
                                    <span className="mt-1 text-[11px] text-slate-500">
                                        {rerollStatusText}
                                    </span>
                                </button>
                            )}

                            {canRegenerate && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onRegenerate?.(quest);
                                    }}
                                    disabled={disableActions || isActionLoading || regenerateDisabled}
                                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-200">
                                        {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : null}
                                        Regenerate Quest
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        {typeof remainingRegenerations === 'number'
                                            ? `${remainingRegenerations} refreshes left today`
                                            : 'Generate a better-fit replacement.'}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
