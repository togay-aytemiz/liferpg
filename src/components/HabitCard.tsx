import { useEffect, useRef, useState } from 'react';
import { Check, MoreHorizontal, ShieldAlert, Trash2 } from 'lucide-react';
import type { Habit } from '../lib/database.types';

type HabitCardProps = {
    habit: Habit;
    isLogging?: boolean;
    onLog: (habit: Habit) => void | Promise<void>;
    onRemove: (habit: Habit) => void;
};

export default function HabitCard({
    habit,
    isLogging = false,
    onLog,
    onRemove,
}: HabitCardProps) {
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

    const isGoodHabit = habit.is_good;
    const actionClass = isGoodHabit
        ? 'bg-slate-900 border-emerald-700/70 hover:border-emerald-400'
        : 'bg-slate-900 border-red-700/70 hover:border-red-400';
    const metaAccentClass = isGoodHabit ? 'text-emerald-400' : 'text-red-400';
    const cardBorderClass = isGoodHabit ? 'border-slate-700' : 'border-red-900/40';
    const tagClass = isGoodHabit
        ? 'border-emerald-900/40 bg-emerald-900/10 text-emerald-300'
        : 'border-red-900/40 bg-red-900/10 text-red-300';

    return (
        <div className={`relative flex items-start gap-3 rounded-lg border bg-slate-800 p-4 shadow-hud transition-all duration-300 ${cardBorderClass}`}>
            <button
                onClick={() => void onLog(habit)}
                disabled={isLogging}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-all ${actionClass}`}
                title={isGoodHabit ? 'Log habit' : 'Log slip'}
            >
                {isLogging ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                ) : (
                    <Check className={`h-4 w-4 ${isGoodHabit ? 'text-emerald-400/85' : 'text-red-400/85'}`} />
                )}
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="pr-2 text-sm font-medium leading-snug text-white">
                            {habit.title}
                        </p>
                    </div>
                    <div ref={menuRef} className="relative shrink-0">
                        <button
                            onClick={() => setMenuOpen((open) => !open)}
                            className="mt-0.5 rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-500 transition-colors hover:text-slate-200"
                            title="More actions"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onRemove(habit);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800"
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                    <span className="text-sm text-slate-200">Remove Habit</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-heading uppercase tracking-[0.16em] ${metaAccentClass}`}>
                        {isGoodHabit ? <Check className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                        {habit.stat_affected}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-heading uppercase tracking-[0.16em] ${tagClass}`}>
                        {habit.frequency}
                    </span>
                    <span className="text-xs text-slate-500">
                        {isGoodHabit ? 'Track a positive routine.' : 'Track a slip / avoidable action.'}
                    </span>
                </div>
            </div>
        </div>
    );
}
