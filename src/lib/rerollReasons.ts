export type RerollReasonBucket =
    | 'wrong_time'
    | 'too_easy'
    | 'too_hard'
    | 'not_interested'
    | 'not_relevant'
    | 'energy_mismatch'
    | 'custom';

export type RerollReasonOption = {
    id: RerollReasonBucket;
    label: string;
    helper: string;
    promptLabel: string;
};

export const REROLL_REASON_OPTIONS: RerollReasonOption[] = [
    {
        id: 'wrong_time',
        label: 'Wrong Time',
        helper: 'Good idea, bad timing for today.',
        promptLabel: 'Wrong time in today\'s schedule',
    },
    {
        id: 'energy_mismatch',
        label: 'Energy Mismatch',
        helper: 'Too draining for my current energy.',
        promptLabel: 'Energy mismatch for today',
    },
    {
        id: 'too_easy',
        label: 'Too Easy',
        helper: 'I want something more meaningful.',
        promptLabel: 'Too easy / not meaningful enough',
    },
    {
        id: 'too_hard',
        label: 'Too Hard',
        helper: 'Too much for this specific day.',
        promptLabel: 'Too hard for today',
    },
    {
        id: 'not_relevant',
        label: 'Not Relevant',
        helper: 'Doesn\'t fit what I need right now.',
        promptLabel: 'Not relevant to current goals',
    },
    {
        id: 'not_interested',
        label: 'Not Interested',
        helper: 'I want a different flavor of task.',
        promptLabel: 'Not interested in this theme',
    },
    {
        id: 'custom',
        label: 'Custom Reason',
        helper: 'Write your own reason.',
        promptLabel: 'Custom reason',
    },
];

export function getRerollReasonOption(bucket: string | null | undefined) {
    return REROLL_REASON_OPTIONS.find((option) => option.id === bucket) ?? null;
}

export function buildRerollReasonPrompt(bucket: RerollReasonBucket, detail?: string | null) {
    const option = getRerollReasonOption(bucket);
    const base = option?.promptLabel ?? 'Custom reason';
    const trimmedDetail = detail?.trim();
    return trimmedDetail ? `${base}: ${trimmedDetail}` : base;
}
