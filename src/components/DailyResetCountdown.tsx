import { useEffect, useState } from 'react';
import { DAILY_RESET_HOUR, formatCountdownToDailyReset, formatDailyResetClock } from '../lib/gameplay';

export default function DailyResetCountdown() {
    const [now, setNow] = useState(() => new Date());
    const countdown = formatCountdownToDailyReset(now, DAILY_RESET_HOUR);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="inline-flex min-h-[96px] min-w-[164px] flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-center shadow-inner-panel">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                New dailies in
            </span>
            <span className="mt-1 font-mono text-lg tabular-nums text-slate-100 sm:text-xl">
                {countdown}
            </span>
            <span className="mt-1 text-[10px] text-slate-500">
                Resets nightly at {formatDailyResetClock(DAILY_RESET_HOUR)}
            </span>
        </div>
    );
}
