import type { ReactNode } from 'react';

type AppHeaderProps = {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
};

export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
    return (
        <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/88 px-4 pt-6 pb-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="font-heading text-2xl text-white">{title}</h1>
                    {subtitle ? (
                        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
        </div>
    );
}
