import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Quest } from '../lib/database.types';
import { createCustomQuest } from '../lib/api';

type CustomQuestModalProps = {
    open: boolean;
    questType: 'daily' | 'side';
    onClose: () => void;
    onCreated?: (quest: Quest, message: string) => void | Promise<void>;
    onError?: (message: string) => void;
};

export default function CustomQuestModal({
    open,
    questType,
    onClose,
    onCreated,
    onError,
}: CustomQuestModalProps) {
    const [prompt, setPrompt] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!open) {
            setPrompt('');
            setIsCreating(false);
        }
    }, [open]);

    if (!open) return null;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!prompt.trim() || isCreating) return;

        setIsCreating(true);

        try {
            const result = await createCustomQuest(prompt, questType);
            await onCreated?.(result.quest, result.message || 'Custom quest added!');
            onClose();
            setPrompt('');
        } catch (error: any) {
            onError?.(error.message || 'Failed to create quest');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-heading text-lg text-white mb-2">Create Custom Quest</h3>
                <p className="text-slate-400 text-sm mb-4">
                    Write the challenge you want to add.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder='e.g. "No fast food today" or "Finish my presentation outline"'
                        className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!prompt.trim() || isCreating}
                            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-heading text-slate-900 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
                        >
                            {isCreating ? <RefreshCw className="mx-auto w-4 h-4 animate-spin" /> : 'Forge Quest'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
