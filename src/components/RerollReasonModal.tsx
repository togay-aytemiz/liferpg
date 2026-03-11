import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Quest } from '../lib/database.types';
import { REROLL_REASON_OPTIONS, type RerollReasonBucket } from '../lib/rerollReasons';

type RerollReasonModalProps = {
    open: boolean;
    quest: Quest | null;
    remainingAlternatives: number;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (reasonBucket: RerollReasonBucket, reasonDetail?: string) => void | Promise<void>;
};

export default function RerollReasonModal({
    open,
    quest,
    remainingAlternatives,
    loading = false,
    onClose,
    onConfirm,
}: RerollReasonModalProps) {
    const [selectedReason, setSelectedReason] = useState<RerollReasonBucket>('wrong_time');
    const [customReason, setCustomReason] = useState('');

    useEffect(() => {
        if (!open) return;
        setSelectedReason('wrong_time');
        setCustomReason('');
    }, [open, quest?.id]);

    const selectedOption = useMemo(
        () => REROLL_REASON_OPTIONS.find((option) => option.id === selectedReason) ?? REROLL_REASON_OPTIONS[0],
        [selectedReason],
    );

    if (!open || !quest) return null;

    const requiresCustomReason = selectedReason === 'custom';
    const isConfirmDisabled = loading || remainingAlternatives <= 0 || (requiresCustomReason && customReason.trim().length === 0);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                        <RotateCcw className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-heading text-lg text-white">Reroll Daily</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                            Why should we replace <span className="text-white">{quest.title}</span>?
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            {remainingAlternatives > 0
                                ? `${remainingAlternatives} alternate ${remainingAlternatives === 1 ? 'daily is' : 'dailies are'} available in your reserve.`
                                : 'No alternate dailies are left in the current reserve.'}
                        </p>
                    </div>
                </div>

                <div className="mt-5 space-y-2">
                    {REROLL_REASON_OPTIONS.map((option) => {
                        const selected = option.id === selectedReason;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedReason(option.id)}
                                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selected
                                    ? 'border-amber-500/40 bg-amber-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                <div className="text-sm font-medium">{option.label}</div>
                                <div className="mt-1 text-xs text-slate-500">{option.helper}</div>
                            </button>
                        );
                    })}
                </div>

                {requiresCustomReason && (
                    <div className="mt-4">
                        <label className="mb-2 ml-1 block text-xs font-heading tracking-[0.14em] text-slate-400 uppercase">
                            Custom Reason
                        </label>
                        <textarea
                            value={customReason}
                            onChange={(event) => setCustomReason(event.target.value.slice(0, 280))}
                            placeholder="Tell the system what kind of daily would fit better."
                            className="min-h-[96px] w-full resize-none rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        />
                    </div>
                )}

                {!requiresCustomReason && selectedOption ? (
                    <p className="mt-4 text-xs text-slate-500">
                        This reason will be remembered for future daily generation too.
                    </p>
                ) : null}

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-heading text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void onConfirm(selectedReason, customReason.trim() || undefined)}
                        disabled={isConfirmDisabled}
                        className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500 px-4 py-3 text-sm font-heading text-slate-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-500"
                    >
                        {loading ? 'Rerolling...' : 'Reroll Daily'}
                    </button>
                </div>
            </div>
        </div>
    );
}
