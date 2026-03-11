import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logHabit } from '../lib/api';
import type { Habit } from '../lib/database.types';
import HabitCard from './HabitCard';
import { emitHabitRuntimeChanged, HABIT_CREATED_EVENT } from '../lib/habitEvents';
import { Plus, Activity } from 'lucide-react';
import { invalidateQuestRuntime } from '../lib/questRuntime';
import { getSuggestedHabitRewards } from '../lib/habitGameplay';
import {
    fetchHabitSnapshot,
    readCachedHabitSnapshot,
    writeCachedHabitSnapshot,
} from '../lib/habitSnapshot';

export default function Habits() {
    const { user, profile } = useAuth();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loggedTodayIds, setLoggedTodayIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loggingId, setLoggingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

    // Modal state
    const [title, setTitle] = useState('');
    const [isGood, setIsGood] = useState(true);
    const [stat, setStat] = useState<string>('strength');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [submitting, setSubmitting] = useState(false);

    const persistHabitSnapshot = (nextHabits: Habit[], nextLoggedTodayIds: Iterable<string>) => {
        if (!user) return;

        const loggedToday = [...new Set(Array.from(nextLoggedTodayIds))];
        writeCachedHabitSnapshot(user.id, {
            habits: nextHabits,
            loggedTodayIds: loggedToday,
            activeDailyHabitIds: nextHabits
                .filter((habit) => habit.is_good && habit.frequency === 'daily')
                .map((habit) => habit.id),
        });
    };

    useEffect(() => {
        if (!user) return;
        const cachedSnapshot = readCachedHabitSnapshot(user.id);

        if (cachedSnapshot.hit) {
            setHabits(cachedSnapshot.value.habits);
            setLoggedTodayIds(new Set(cachedSnapshot.value.loggedTodayIds));
            setLoading(false);
            return;
        }

        void fetchHabits();
    }, [user]);

    useEffect(() => {
        const handleHabitCreated = (event: Event) => {
            if (!(event instanceof CustomEvent)) return;
            const newHabit = event.detail as Habit;

            if (!user || newHabit.user_id !== user.id) return;

            setHabits((prev) => {
                let nextHabits = prev;

                if (!prev.some((habit) => habit.id === newHabit.id)) {
                    nextHabits = [newHabit, ...prev];
                }

                persistHabitSnapshot(nextHabits, loggedTodayIds);
                return nextHabits;
            });
            setLoading(false);
        };

        window.addEventListener(HABIT_CREATED_EVENT, handleHabitCreated as EventListener);
        return () => window.removeEventListener(HABIT_CREATED_EVENT, handleHabitCreated as EventListener);
    }, [loggedTodayIds, user]);

    const fetchHabits = async (options?: { force?: boolean }) => {
        if (!user) return;

        const snapshot = await fetchHabitSnapshot(user.id, options);
        setHabits(snapshot.habits);
        setLoggedTodayIds(new Set(snapshot.loggedTodayIds));
        setLoading(false);
    };

    const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreateHabit = async () => {
        if (!title.trim() || !user) return;
        setSubmitting(true);
        const { data, error } = await supabase
            .from('habits')
            .insert({
                user_id: user.id,
                title: title.trim(),
                is_good: isGood,
                stat_affected: stat,
                frequency: frequency,
                ...getSuggestedHabitRewards({ frequency, isGood, level: profile?.level }),
            } as any)
            .select()
            .single();

        setSubmitting(false);

        if (error) {
            showToast("Failed to create habit.", "error");
        } else if (data) {
            const nextHabits = [data as Habit, ...habits];
            setHabits(nextHabits);
            persistHabitSnapshot(nextHabits, loggedTodayIds);
            invalidateQuestRuntime(user.id);
            emitHabitRuntimeChanged();
            setShowModal(false);
            setTitle('');
            showToast("Habit created successfully!");
        }
    };

    const handleLogHabit = async (habit: Habit) => {
        if (loggedTodayIds.has(habit.id)) return;

        try {
            setLoggingId(habit.id);
            const result = await logHabit(habit.id);
            if (result.success) {
                const nextLoggedTodayIds = [...loggedTodayIds, habit.id];
                setLoggedTodayIds(new Set(nextLoggedTodayIds));
                persistHabitSnapshot(habits, nextLoggedTodayIds);

                if (result.died) {
                    showToast("You died from a bad habit! HP restored, but you lost half your gold and your streak was reset.", "error");
                } else if (habit.is_good) {
                    showToast(`+${result.xp_awarded ?? habit.xp_reward} XP | +${result.gold_awarded ?? habit.gold_reward} Gold | +${result.stat_points_awarded ?? habit.stat_points} ${habit.stat_affected}`, "success");
                } else {
                    showToast(`-5 HP | -2 Gold | -1 ${habit.stat_affected}`, "warning");
                }
            }
        } catch (err: any) {
            showToast(err.message || "Failed to log habit", "error");
        } finally {
            setLoggingId(null);
        }
    };

    const confirmDeleteHabit = async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget.id);

        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', deleteTarget.id); // Using delete for simplicity as is_active strict update causes issues

        if (error) {
            showToast('Failed to remove habit.', 'error');
            setDeletingId(null);
            return;
        }

        const nextHabits = habits.filter((habit) => habit.id !== deleteTarget.id);
        const nextLoggedTodayIds = new Set(loggedTodayIds);
        nextLoggedTodayIds.delete(deleteTarget.id);

        setHabits(nextHabits);
        setLoggedTodayIds(nextLoggedTodayIds);
        persistHabitSnapshot(nextHabits, nextLoggedTodayIds);

        if (user) {
            invalidateQuestRuntime(user.id);
            emitHabitRuntimeChanged();
        }
        setDeleteTarget(null);
        setDeletingId(null);
        showToast('Habit removed.');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg text-slate-300 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Habits
                </h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`px-4 py-2 rounded-lg text-xs font-mono text-center animate-in fade-in duration-200 ${toast.type === 'error' ? 'bg-red-900/50 text-red-200' : toast.type === 'warning' ? 'bg-amber-900/50 text-amber-200' : 'bg-emerald-900/50 text-emerald-200'}`}>
                    {toast.msg}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : habits.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No habits yet. Add some daily actions you want to track.</p>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                    {habits.map(h => (
                        <HabitCard
                            key={h.id}
                            habit={h}
                            isLoggedToday={loggedTodayIds.has(h.id)}
                            isLogging={loggingId === h.id}
                            onLog={handleLogHabit}
                            onRemove={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 shadow-xl animate-in zoom-in-95 duration-200">
                        <h3 className="font-heading text-lg text-white mb-4">New Habit</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 ml-1 mb-1 block">Habit Name</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Drink Water, Eat Sugar"
                                    className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsGood(true)}
                                    className={`flex-1 py-2 text-xs font-heading tracking-wider rounded-lg border transition-colors ${isGood
                                        ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-glow-emerald'
                                        : 'bg-slate-800 border-slate-700 text-slate-500'
                                        }`}
                                >
                                    Good Habit
                                </button>
                                <button
                                    onClick={() => setIsGood(false)}
                                    className={`flex-1 py-2 text-xs font-heading tracking-wider rounded-lg border transition-colors ${!isGood
                                        ? 'bg-red-900/40 border-red-500 text-red-400 shadow-glow-red'
                                        : 'bg-slate-800 border-slate-700 text-slate-500'
                                        }`}
                                >
                                    Bad Habit
                                </button>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 ml-1 mb-1 block">Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={e => setFrequency(e.target.value as any)}
                                    className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 ml-1 mb-1 block">Affected Stat</label>
                                <select
                                    value={stat}
                                    onChange={e => setStat(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"
                                >
                                    <option value="strength">Strength (Fitness/Willpower)</option>
                                    <option value="knowledge">Knowledge (Learning/Reading)</option>
                                    <option value="wealth">Wealth (Money/Career)</option>
                                    <option value="adventure">Adventure (Exploration/Fun)</option>
                                    <option value="social">Social (Connecting/Networking)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateHabit}
                                disabled={!title.trim() || submitting}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all font-heading tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Creating...' : 'Create Habit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl animate-in zoom-in-95 duration-200">
                        <h3 className="font-heading text-lg text-white">Remove Habit</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            Remove <span className="font-medium text-white">"{deleteTarget.title}"</span> from your habit tracker?
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            This removes it from the active habit list. You can always create it again later.
                        </p>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deletingId === deleteTarget.id}
                                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-heading text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteHabit}
                                disabled={deletingId === deleteTarget.id}
                                className="flex-1 rounded-lg border border-red-500/30 bg-red-900/40 px-4 py-2.5 text-sm font-heading text-red-200 transition-colors hover:bg-red-800/50 disabled:opacity-50"
                            >
                                {deletingId === deleteTarget.id ? 'Removing...' : 'Remove Habit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
