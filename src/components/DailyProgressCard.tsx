import { useMemo, useState } from 'react';
import DailyResetCountdown from './DailyResetCountdown';
import { DAILY_RESET_HOUR, formatDailyResetClock } from '../lib/gameplay';
import { DAILY_SUCCESS_THRESHOLD_PERCENT, getRequiredDailyCompletions } from '../lib/dailyRules';

type DailyProgressCardProps = {
    completed: number;
    total: number;
};

export default function DailyProgressCard({ completed, total }: DailyProgressCardProps) {
    const [isRuleOpen, setIsRuleOpen] = useState(false);

    const dailyRule = useMemo(() => {
        const required = getRequiredDailyCompletions(total);
        return {
            required,
            percent: DAILY_SUCCESS_THRESHOLD_PERCENT,
            thresholdLabel: total > 0 ? `${required}/${total}` : `${DAILY_SUCCESS_THRESHOLD_PERCENT}%`,
            resetLabel: formatDailyResetClock(DAILY_RESET_HOUR),
        };
    }, [total]);

    return (
        <>
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 shadow-hud">
                <div className="flex items-stretch justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-heading">Today's Progress</p>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="shrink-0 text-2xl font-heading text-white">{completed}/{total}</span>
                            <span className="max-w-[10rem] text-sm leading-tight text-slate-400">daily objectives cleared</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsRuleOpen(true)}
                            className="mt-3 w-fit text-left text-[11px] font-heading tracking-[0.08em] text-slate-400 transition-colors hover:text-amber-400"
                        >
                            How do daily objectives work?
                        </button>
                    </div>
                    <DailyResetCountdown />
                </div>
            </div>

            {isRuleOpen ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 animate-in fade-in duration-200">
                    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-heading text-lg text-white">Daily Rule</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            Clear at least <span className="font-mono text-amber-400">{dailyRule.thresholdLabel}</span> of your active daily objectives
                            {' '}({dailyRule.percent}%) before <span className="font-mono text-slate-100">{dailyRule.resetLabel}</span> and the day counts as cleared.
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400">
                            Daily quests and good daily habits both count here. If you fall short, each unfinished objective can cost HP overnight. Streak freezes still protect you if you have one.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsRuleOpen(false)}
                            className="mt-5 w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-heading text-slate-200 transition-colors hover:bg-slate-700"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );
}
