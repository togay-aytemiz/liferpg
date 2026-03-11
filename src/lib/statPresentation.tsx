import type { ReactNode } from 'react';
import { Brain, Coins, Compass, Dumbbell, Users } from 'lucide-react';
import type { StatCategory, Profile } from './database.types';

type StatPresentation = {
    label: string;
    color: string;
    icon: ReactNode;
    iconClass: string;
};

export const STAT_PRESENTATION: Record<StatCategory, StatPresentation> = {
    strength: {
        label: 'Strength',
        color: 'bg-red-500',
        icon: <Dumbbell className="h-4 w-4" />,
        iconClass: 'text-red-400',
    },
    knowledge: {
        label: 'Knowledge',
        color: 'bg-blue-500',
        icon: <Brain className="h-4 w-4" />,
        iconClass: 'text-blue-400',
    },
    wealth: {
        label: 'Wealth',
        color: 'bg-amber-500',
        icon: <Coins className="h-4 w-4" />,
        iconClass: 'text-amber-400',
    },
    adventure: {
        label: 'Adventure',
        color: 'bg-emerald-500',
        icon: <Compass className="h-4 w-4" />,
        iconClass: 'text-emerald-400',
    },
    social: {
        label: 'Social',
        color: 'bg-fuchsia-500',
        icon: <Users className="h-4 w-4" />,
        iconClass: 'text-fuchsia-400',
    },
};

export function getStatPresentation(stat: StatCategory | null | undefined): StatPresentation | null {
    if (!stat) return null;
    return STAT_PRESENTATION[stat] ?? null;
}

export function getProfileStatRows(profile: Profile | null | undefined) {
    return (Object.entries(STAT_PRESENTATION) as Array<[StatCategory, StatPresentation]>).map(([statKey, presentation]) => ({
        key: `stat_${statKey}` as keyof Profile,
        statKey,
        ...presentation,
        value: (profile?.[`stat_${statKey}` as keyof Profile] as number | undefined) ?? 0,
    }));
}
