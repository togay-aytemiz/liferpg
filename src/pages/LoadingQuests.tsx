import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Compass } from 'lucide-react';
import { generateQuests, generateRewards } from '../lib/api';
import { supabase } from '../lib/supabase';

const STEP_ROTATION_MS = 4200;
const STEP_FADE_MS = 450;

const GENERATION_STEPS = [
    "Reading the rhythm of your realm...",
    "Mapping your daily questline...",
    "Scanning your hero routine...",
    "Forging tasks from your timeline...",
    "Weaving your weekly campaign...",
    "Tuning your stat progression path...",
    "Decoding your habit patterns...",
    "Summoning quests from your schedule...",
    "Aligning goals with your character build...",
    "Finalizing your adventure blueprint..."
];

type LoadingLocationState = {
    generationId?: string;
    lifeRhythm?: string;
    likes?: string;
    dislikes?: string;
    focusAreas?: string;
    isFirstTime?: boolean;
};

type GenerationRun = {
    status: 'pending' | 'success' | 'error';
    promise: Promise<void>;
    error?: string;
};

const generationRunCache = new Map<string, GenerationRun>();

async function executeGeneration(params: {
    userId: string;
    isFirstTime: boolean;
    lifeRhythmFromState?: string;
    effectiveLifeRhythm?: string | null;
    likes?: string;
    dislikes?: string;
    focusAreas?: string;
}) {
    const {
        userId,
        isFirstTime,
        lifeRhythmFromState,
        effectiveLifeRhythm,
        likes,
        dislikes,
        focusAreas,
    } = params;

    if (isFirstTime && lifeRhythmFromState) {
        await supabase
            .from('profiles')
            // @ts-ignore
            .update({
                life_rhythm: lifeRhythmFromState,
                likes: likes || null,
                dislikes: dislikes || null,
                focus_areas: focusAreas || null,
            })
            .eq('id', userId);
    }

    if (effectiveLifeRhythm) {
        await generateQuests(effectiveLifeRhythm);
    }

    try {
        await generateRewards();
    } catch (rewardErr) {
        console.warn('Reward generation failed (non-blocking):', rewardErr);
    }
}

function getOrCreateGenerationRun(key: string, params: {
    userId: string;
    isFirstTime: boolean;
    lifeRhythmFromState?: string;
    effectiveLifeRhythm?: string | null;
    likes?: string;
    dislikes?: string;
    focusAreas?: string;
}) {
    const existingRun = generationRunCache.get(key);
    if (existingRun) {
        return existingRun;
    }

    let run!: GenerationRun;
    run = {
        status: 'pending',
        promise: (async () => {
            try {
                await executeGeneration(params);
                run.status = 'success';
            } catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : 'Quest generation failed. Please try again.';
                run.status = 'error';
                run.error = message;
                throw error;
            }
        })(),
    };

    generationRunCache.set(key, run);
    return run;
}

export default function LoadingQuests() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, session, profile, loading: authLoading } = useAuth();
    const [stepIndex, setStepIndex] = useState(0);
    const [stepVisible, setStepVisible] = useState(true);
    const [error, setError] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const locationState = (location.state as LoadingLocationState | null) ?? null;
    const generationId = locationState?.generationId;
    const lifeRhythmFromState = locationState?.lifeRhythm;
    const effectiveLifeRhythm = lifeRhythmFromState || profile?.life_rhythm;
    const isFirstTime = locationState?.isFirstTime === true;
    const generationKey = generationId ?? `${user?.id ?? 'anonymous'}::${lifeRhythmFromState ?? effectiveLifeRhythm ?? 'empty'}`;

    useEffect(() => {
        if (isFinished) return;
        let fadeTimer: ReturnType<typeof setTimeout> | null = null;
        const stepTimer = setInterval(() => {
            setStepVisible(false);
            fadeTimer = setTimeout(() => {
                setStepIndex((prev) => (prev + 1) % GENERATION_STEPS.length);
                setStepVisible(true);
            }, STEP_FADE_MS);
        }, STEP_ROTATION_MS);
        return () => {
            clearInterval(stepTimer);
            if (fadeTimer) clearTimeout(fadeTimer);
        };
    }, [isFinished]);

    useEffect(() => {
        if (authLoading || !session?.access_token || !user?.id) return;

        let cancelled = false;
        const run = getOrCreateGenerationRun(generationKey, {
            userId: user.id,
            isFirstTime,
            lifeRhythmFromState,
            effectiveLifeRhythm,
            likes: locationState?.likes,
            dislikes: locationState?.dislikes,
            focusAreas: locationState?.focusAreas,
        });

        run.promise
            .then(() => {
                if (cancelled) return;
                setError('');
                setIsFinished(true);
                setTimeout(() => {
                    generationRunCache.delete(generationKey);
                    navigate('/dashboard');
                }, 400);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                console.error('Quest generation failed:', err);
                const message = err instanceof Error
                    ? err.message
                    : run.error || 'Quest generation failed. Please try again.';
                setIsFinished(true);
                if (/session expired|unauthorized|not authenticated|invalid jwt/i.test(message)) {
                    setError('Session expired. Redirecting to login...');
                    setTimeout(() => navigate('/auth', { replace: true }), 900);
                } else {
                    setError(message);
                }
            });

        if (run.status === 'error' && run.error) {
            setError(run.error);
            setIsFinished(true);
        }

        return () => {
            cancelled = true;
        };
    }, [
        authLoading,
        navigate,
        session?.access_token,
        user?.id,
        profile?.id,
        effectiveLifeRhythm,
        generationKey,
        isFirstTime,
        lifeRhythmFromState,
        locationState?.likes,
        locationState?.dislikes,
        locationState?.focusAreas
    ]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">

            {/* Magic/Spinning Icon */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse"></div>
                <Compass className="w-16 h-16 text-amber-500 animate-[spin_4s_linear_infinite] relative z-10" />
            </div>

            <h2 className="font-heading text-2xl text-white mb-3">
                Generating your quests...
            </h2>

            {/* Rotating RPG Loading Text */}
            <div className="w-full max-w-xs space-y-4">
                <div className="h-6 flex items-center justify-center">
                    <p
                        className={`text-amber-500/95 text-sm font-mono tracking-wider transition-all duration-500 ease-out ${stepVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                            }`}
                    >
                        {GENERATION_STEPS[stepIndex]}
                    </p>
                </div>

                {error && isFinished && (
                    <div className="mt-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <p className="text-red-400 text-sm bg-red-950/40 p-3 rounded-lg border border-red-900/50">
                            {error}
                        </p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => {
                                    generationRunCache.delete(generationKey);
                                    navigate('/onboarding');
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors border border-slate-700 hover:border-slate-500"
                            >
                                Back to Onboarding
                            </button>
                            <button
                                onClick={() => {
                                    generationRunCache.delete(generationKey);
                                    window.location.reload();
                                }}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-glow-gold"
                            >
                                Retry Generation
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
