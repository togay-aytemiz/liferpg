import type { ReactNode } from 'react';

type PixelResourceBarProps = {
    label: string;
    icon: ReactNode;
    current: number;
    max: number;
    percent: number;
    tone: 'xp' | 'hp';
    segments?: number;
};

const TONE_STYLES = {
    xp: {
        labelClass: 'text-amber-300',
        valueClass: 'text-amber-400',
        frameClass: 'border-amber-900/50 bg-slate-950',
        iconFrameClass: 'border-amber-800/70 bg-amber-950/20 text-amber-300',
        segmentBaseClass: 'border-amber-950/60 bg-slate-950',
        fillStyle: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 52%, #b45309 100%)',
        highlightClass: 'bg-amber-100/25',
    },
    hp: {
        labelClass: 'text-red-300',
        valueClass: 'text-red-400',
        frameClass: 'border-red-900/50 bg-slate-950',
        iconFrameClass: 'border-red-800/70 bg-red-950/20 text-red-300',
        segmentBaseClass: 'border-red-950/60 bg-slate-950',
        fillStyle: 'linear-gradient(180deg, #fb7185 0%, #ef4444 52%, #991b1b 100%)',
        highlightClass: 'bg-red-100/20',
    },
} as const;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export default function PixelResourceBar({
    label,
    icon,
    current,
    max,
    percent,
    tone,
    segments = 12,
}: PixelResourceBarProps) {
    const styles = TONE_STYLES[tone];
    const safePercent = clamp(percent, 0, 100);
    const normalizedSegments = Math.max(8, segments);
    const filledSegments = (safePercent / 100) * normalizedSegments;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em]">
                <span className={`font-heading ${styles.labelClass}`}>{label}</span>
                <span className={`font-mono ${styles.valueClass}`}>{current} / {max}</span>
            </div>

            <div className="flex items-center gap-2">
                <div className={`grid h-8 w-8 shrink-0 place-items-center border-2 shadow-[0_0_0_1px_rgba(2,6,23,0.85),inset_0_-2px_0_rgba(2,6,23,0.45)] ${styles.iconFrameClass}`}>
                    {icon}
                </div>

                <div className={`flex-1 border-2 p-[3px] shadow-[0_0_0_1px_rgba(2,6,23,0.85),inset_0_-2px_0_rgba(2,6,23,0.45)] ${styles.frameClass}`}>
                    <div className="flex h-4 gap-[2px]">
                        {Array.from({ length: normalizedSegments }).map((_, index) => {
                            const fillAmount = clamp(filledSegments - index, 0, 1);
                            return (
                                <div
                                    key={`${label}-${index}`}
                                    className={`relative h-full flex-1 overflow-hidden border ${styles.segmentBaseClass}`}
                                >
                                    <div
                                        className="absolute inset-[1px] origin-left transition-transform duration-700"
                                        style={{
                                            transform: `scaleX(${fillAmount})`,
                                            background: styles.fillStyle,
                                        }}
                                    />
                                    <div
                                        className={`pointer-events-none absolute inset-x-[1px] top-[1px] h-[2px] ${styles.highlightClass}`}
                                        style={{ opacity: fillAmount > 0 ? 1 : 0 }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
