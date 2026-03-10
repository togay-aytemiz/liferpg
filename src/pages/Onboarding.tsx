import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Scroll, Sparkles } from 'lucide-react';

export default function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lifeRhythm, setLifeRhythm] = useState('');
    const [likes, setLikes] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [focusAreas, setFocusAreas] = useState('');
    const [surpriseMe, setSurpriseMe] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lifeRhythm.trim() || !user) return;

        // Navigate immediately to the quest generation loading screen, passing all context
        navigate('/generating', {
            state: {
                lifeRhythm: lifeRhythm.trim(),
                likes: likes.trim() || null,
                dislikes: dislikes.trim() || null,
                focusAreas: surpriseMe ? 'Surprise me / You choose' : (focusAreas.trim() || null),
                isFirstTime: true
            }
        });
    };

    return (
        <div className="flex-1 flex flex-col pt-8 sm:pt-12 px-4 sm:px-6 pb-[max(2.75rem,env(safe-area-inset-bottom))] animate-in fade-in duration-500">

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
                    Share your routine and preferences so we can craft quests that fit your life.
                </p>
            </div>

            {/* Form Area */}
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex flex-col gap-5 pb-2">
                    {/* Life Rhythm (Required) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="rhythm" className="text-[0.92rem] font-heading tracking-wide text-slate-300 ml-1 text-left">
                            Describe your typical day / routine <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            id="rhythm"
                            value={lifeRhythm}
                            onChange={(e) => setLifeRhythm(e.target.value)}
                            placeholder={`"I wake up at 7:30, work 9-5, hit the gym in the evening..."`}
                            className="w-full min-h-[120px] p-3 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none"
                            autoFocus
                        />
                    </div>

                    {/* Likes & Hobbies (Optional) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="likes" className="text-[0.92rem] font-heading tracking-wide text-slate-300 ml-1 text-left">
                            What do you enjoy doing?
                        </label>
                        <textarea
                            id="likes"
                            value={likes}
                            onChange={(e) => setLikes(e.target.value)}
                            placeholder={`"Gaming, reading fantasy books, cooking Italian food..."`}
                            className="w-full min-h-[70px] p-2.5 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none"
                        />
                    </div>

                    {/* Dislikes (Optional) */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="dislikes" className="text-[0.92rem] font-heading tracking-wide text-slate-300 ml-1 text-left">
                            What do you hate doing?
                        </label>
                        <textarea
                            id="dislikes"
                            value={dislikes}
                            onChange={(e) => setDislikes(e.target.value)}
                            placeholder={`"I hate running, crowded places, doing the dishes..."`}
                            className="w-full min-h-[70px] p-2.5 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none"
                        />
                    </div>

                    {/* Focus Areas (Optional) */}
                    <div className="flex flex-col gap-2.5">
                        <label htmlFor="focusAreas" className="text-[0.92rem] font-heading tracking-wide text-slate-300 ml-1 text-left">
                            What should we focus on?
                        </label>
                        <button
                            type="button"
                            onClick={() => setSurpriseMe((prev) => !prev)}
                            aria-pressed={surpriseMe}
                            className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${surpriseMe
                                ? 'border-amber-500/50 bg-amber-500/10 shadow-glow-gold'
                                : 'border-slate-700/70 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold transition-all ${surpriseMe
                                    ? 'border-amber-400 bg-amber-500 text-slate-900'
                                    : 'border-slate-500 text-transparent'
                                    }`}>
                                    ✓
                                </span>
                                <span className="flex flex-col">
                                    <span className={`text-sm font-heading tracking-wide ${surpriseMe ? 'text-amber-300' : 'text-slate-200'}`}>
                                        Let fate decide
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Skip manual input and let lifeRPG choose your focus path.
                                    </span>
                                </span>
                            </div>
                        </button>
                        <textarea
                            id="focusAreas"
                            value={surpriseMe ? 'Fate mode enabled. lifeRPG will choose your focus.' : focusAreas}
                            disabled={surpriseMe}
                            onChange={(e) => setFocusAreas(e.target.value)}
                            placeholder={`"I want to focus on my career, learn a new language, save money..."`}
                            className="w-full min-h-[70px] p-2.5 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none disabled:cursor-not-allowed disabled:border-amber-500/20 disabled:bg-slate-800/35 disabled:text-slate-500"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-slate-800 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    <button
                        type="submit"
                        disabled={lifeRhythm.trim().length < 10}
                        className="w-full relative group bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-heading font-bold text-lg py-4 rounded-lg shadow-glow-gold transition-all duration-300 disabled:shadow-none overflow-hidden flex items-center justify-center gap-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Sparkles className="w-5 h-5" />
                        Generate My Quests
                    </button>

                    <p className="text-center text-xs text-slate-500 mt-4">
                        You can change this later in Settings.
                    </p>
                </div>
            </form>

        </div>
    );
}
