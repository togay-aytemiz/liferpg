import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Scroll, Sparkles } from 'lucide-react';

export default function Onboarding() {
    const navigate = useNavigate();
    const { user, refreshProfile } = useAuth();
    const [lifeRhythm, setLifeRhythm] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lifeRhythm.trim() || !user) return;

        setSaving(true);

        // Save life_rhythm to user profile in Supabase
        const { error } = await supabase
            .from('profiles')
            .update({ life_rhythm: lifeRhythm.trim() })
            .eq('id', user.id);

        if (error) {
            console.error('Failed to save life rhythm:', error);
            setSaving(false);
            return;
        }

        // Refresh the profile in context so routing knows life_rhythm is set
        await refreshProfile();

        // Navigate to the quest generation loading screen, passing the text
        navigate('/generating', { state: { lifeRhythm: lifeRhythm.trim() } });
    };

    return (
        <div className="flex-1 flex flex-col pt-12 px-6 pb-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-500/30 shadow-glow-gold mb-6">
                    <Scroll className="w-8 h-8 text-amber-500" />
                </div>
                <h1 className="font-heading text-3xl text-white mb-3 tracking-wide">
                    Understand Your<br />
                    <span className="text-amber-500">Life Rhythm</span>
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                    Tell us about your typical day so we can generate quests that fit your routine.
                </p>
            </div>

            {/* Form Area */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col gap-2">
                    <label htmlFor="rhythm" className="text-sm font-semibold text-slate-300 ml-1">
                        Describe your life or a typical day.
                    </label>
                    <textarea
                        id="rhythm"
                        value={lifeRhythm}
                        onChange={(e) => setLifeRhythm(e.target.value)}
                        placeholder={`"I usually wake up around 7:30. I work from 9 to 18. I go to the gym in the evenings. I want to read more and improve my skills..."`}
                        className="w-full flex-1 min-h-[200px] max-h-[300px] p-4 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel resize-none"
                        autoFocus
                    />

                    <div className="bg-slate-800/50 rounded-lg p-4 mt-2 border border-slate-700/50">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Include things like:</h4>
                        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                            <li>When you wake up</li>
                            <li>Work or school schedule</li>
                            <li>When you exercise</li>
                            <li>When you relax</li>
                            <li>Your general lifestyle goals</li>
                        </ul>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8">
                    <button
                        type="submit"
                        disabled={lifeRhythm.trim().length < 10 || saving}
                        className="w-full relative group bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-heading font-bold text-lg py-4 rounded-lg shadow-glow-gold transition-all duration-300 disabled:shadow-none overflow-hidden flex items-center justify-center gap-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {saving ? (
                            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate My Quests
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-500 mt-4">
                        You can change this later in Settings.
                    </p>
                </div>
            </form>

        </div>
    );
}
