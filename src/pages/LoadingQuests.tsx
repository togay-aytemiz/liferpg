import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Compass } from 'lucide-react';
import { generateQuests, generateRewards } from '../lib/api';
import { supabase } from '../lib/supabase';

const GENERATION_STEPS = [
    "Analyzing your daily rhythm...",
    "Creating daily quests...",
    "Preparing weekly challenges...",
    "Crafting your rewards...",
    "Building your character profile..."
];

const TIPS = [
    "Tip: Daily quests reset every night at midnight. Consistency is key!",
    "Tip: Try converting a quest you enjoy into a daily habit.",
    "Tip: Missing a day resets your streak, but you can buy a Streak Freeze in the shop!",
    "Tip: Boss quests require effort but give massive XP and Gold.",
    "Tip: Adventure stats increase when you explore new places or hobbies.",
    "Tip: Social stats increase when you connect with friends, family, or colleagues.",
    "Tip: Wealth doesn't just mean money; it's about career and productivity too.",
    "Tip: Knowledge quests are great for reading, studying, or learning new skills.",
    "Tip: Strength quests test your physical limits and willpower.",
    "Tip: Need a break? Buy a Health Potion from the shop to restore HP.",
    "Tip: If you're stuck, use a custom quest to tailor the challenge.",
    "Tip: Over time, the AI learns your preferences. Be sure to skip quests you dislike.",
    "Tip: Your Life Rhythm controls your quests. Update it in settings anytime!",
    "Tip: Earning Gold allows you to buy real-life rewards you set for yourself.",
    "Tip: Achievements grant rare titles and a showcase for your profile."
];

export default function LoadingQuests() {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuth();
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [tipIndex, setTipIndex] = useState(0);
    const calledRef = useRef(false);

    useEffect(() => {
        setTipIndex(Math.floor(Math.random() * TIPS.length));
        const tipTimer = setInterval(() => {
            setTipIndex(Math.floor(Math.random() * TIPS.length));
        }, 4500);
        return () => clearInterval(tipTimer);
    }, []);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        const effectiveLifeRhythm = (location.state as { lifeRhythm?: string })?.lifeRhythm || profile?.life_rhythm;

        // Start the visual progress animation
        const totalVisualDuration = 6000; // 6s minimum visual duration
        const intervalTime = 60;
        const totalTicks = totalVisualDuration / intervalTime;
        let currentTick = 0;
        let aiDone = false;
        let aiSuccess = false;

        const timer = setInterval(() => {
            currentTick++;
            // Progress goes up to 90% during AI call, then jumps to 100% when done
            const maxProgress = aiDone ? 100 : 90;
            const currentProgress = Math.min((currentTick / totalTicks) * 100, maxProgress);
            setProgress(currentProgress);

            if (currentProgress < 20) setStepIndex(0);
            else if (currentProgress < 40) setStepIndex(1);
            else if (currentProgress < 60) setStepIndex(2);
            else if (currentProgress < 80) setStepIndex(3);
            else setStepIndex(4);

            if (aiDone && currentProgress >= 100) {
                clearInterval(timer);
                setIsFinished(true);
                if (aiSuccess) {
                    setTimeout(() => navigate('/dashboard'), 400);
                }
            }
        }, intervalTime);

        const callAI = async () => {
            try {
                // If coming straight from onboarding, save the profile first
                if (location.state?.isFirstTime && location.state?.lifeRhythm && profile?.id) {
                    await supabase
                        .from('profiles')
                        // @ts-ignore
                        .update({
                            life_rhythm: location.state.lifeRhythm,
                            likes: location.state.likes || null,
                            dislikes: location.state.dislikes || null,
                            focus_areas: location.state.focusAreas || null
                        })
                        .eq('id', profile.id);
                }

                if (effectiveLifeRhythm) {
                    await generateQuests(effectiveLifeRhythm);
                }
                // Generate personalized rewards after quests
                try {
                    await generateRewards();
                } catch (rewardErr) {
                    console.warn('Reward generation failed (non-blocking):', rewardErr);
                }
                aiSuccess = true;
            } catch (err: any) {
                console.error('Quest generation failed:', err);
                setError(err.message || 'Quest generation failed. Please try again.');
                aiSuccess = false; // Do not auto-navigate if failed
            } finally {
                aiDone = true;
            }
        };

        callAI();

        return () => clearInterval(timer);
    }, [navigate, location.state, profile?.life_rhythm]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">

            {/* Magic/Spinning Icon */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse"></div>
                <Compass className="w-16 h-16 text-amber-500 animate-[spin_4s_linear_infinite] relative z-10" />
            </div>

            <h2 className="font-heading text-2xl text-white mb-2">
                Generating your quests...
            </h2>

            <p className="text-slate-400 text-sm mb-12 max-w-[260px] mx-auto leading-relaxed">
                We are analyzing your routine and preparing your daily and weekly quests.
            </p>

            {/* RPG Progress Bar */}
            <div className="w-full max-w-xs space-y-4">
                <div className="h-6 flex items-center justify-center">
                    <p className="text-amber-500 text-sm font-mono tracking-wider animate-pulse">
                        {GENERATION_STEPS[stepIndex]}
                    </p>
                </div>

                <div className="w-full h-4 bg-slate-800 rounded-full shadow-inner-panel overflow-hidden border border-slate-700/50 p-0.5 relative">
                    <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-75 ease-linear shadow-glow-gold relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                </div>

                <p className="text-slate-500 font-mono text-xs">
                    {Math.floor(progress)}%
                </p>

                {error && isFinished && (
                    <div className="mt-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <p className="text-red-400 text-sm bg-red-950/40 p-3 rounded-lg border border-red-900/50">
                            {error}
                        </p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => navigate('/onboarding')}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors border border-slate-700 hover:border-slate-500"
                            >
                                Back to Onboarding
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-glow-gold"
                            >
                                Retry Generation
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Rotating Tips */}
            {!error && !isFinished && (
                <div className="absolute bottom-12 left-6 right-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                    <p className="text-amber-500/80 font-heading text-xs uppercase tracking-widest mb-2 opacity-80">Did you know?</p>
                    <p className="text-slate-400 text-sm italic transition-opacity duration-500 max-w-sm mx-auto min-h-[40px]">
                        "{TIPS[tipIndex]}"
                    </p>
                </div>
            )}

        </div>
    );
}
