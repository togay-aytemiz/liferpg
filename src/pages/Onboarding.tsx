import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Scroll, Sparkles } from 'lucide-react';

export default function Onboarding() {
    const navigate = useNavigate();
    const { user, refreshProfile } = useAuth();
    const [lifeRhythm, setLifeRhythm] = useState('');
    const [likes, setLikes] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [focusAreas, setFocusAreas] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lifeRhythm.trim() || !user) return;

        setSaving(true);

        // Save life_rhythm and preferences to user profile in Supabase
        const { error } = await supabase
            .from('profiles')
            // @ts-ignore
            .update({
                life_rhythm: lifeRhythm.trim(),
                likes: likes.trim() || null,
                dislikes: dislikes.trim() || null,
                focus_areas: focusAreas.trim() || null
            })
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
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-4 pr-2 custom-scrollbar">
                    {/* Life Rhythm (Required) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="rhythm" className="text-sm font-semibold text-slate-300 ml-1">
                            Describe your typical day / routine <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            id="rhythm"
                            value={lifeRhythm}
                            onChange={(e) => setLifeRhythm(e.target.value)}
                            placeholder={`"I wake up at 7:30, work 9-5, hit the gym in the evening..."`}
                            className="w-full min-h-[120px] p-4 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none"
                            autoFocus
                        />
                    </div>

                    {/* Likes & Hobbies (Optional) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="likes" className="text-sm font-semibold text-slate-300 ml-1">
                            What do you enjoy doing? (Optional)
                        </label>
                        <textarea
                            id="likes"
                            value={likes}
                            onChange={(e) => setLikes(e.target.value)}
                            placeholder={`"Gaming, reading fantasy books, cooking Italian food..."`}
                            className="w-full min-h-[80px] p-3 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none"
                        />
                    </div>

                    {/* Dislikes (Optional) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="dislikes" className="text-sm font-semibold text-slate-300 ml-1">
                            What do you hate doing? (Optional)
                        </label>
                        <textarea
                            id="dislikes"
                            value={dislikes}
                            onChange={(e) => setDislikes(e.target.value)}
                            placeholder={`"I hate running, crowded places, doing the dishes..."`}
                            className="w-full min-h-[80px] p-3 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none"
                        />
                    </div>

                    {/* Focus Areas (Optional) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="focusAreas" className="text-sm font-semibold text-slate-300 ml-1">
                            What do you want to improve? (Optional)
                        </label>
                        <textarea
                            id="focusAreas"
                            value={focusAreas}
                            onChange={(e) => setFocusAreas(e.target.value)}
                            placeholder={`"I want to focus on my career, learn a new language, save money..."`}
                            className="w-full min-h-[80px] p-3 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-4 border-t border-slate-800">
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
