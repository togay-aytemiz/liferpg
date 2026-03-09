import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { generateQuests, generateRewards } from '../lib/api';

const GENERATION_STEPS = [
    "Analyzing your daily rhythm...",
    "Creating daily quests...",
    "Preparing weekly challenges...",
    "Crafting your rewards...",
    "Building your character profile..."
];

export default function LoadingQuests() {
    const navigate = useNavigate();
    const location = useLocation();
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const calledRef = useRef(false);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        const lifeRhythm = (location.state as { lifeRhythm?: string })?.lifeRhythm;

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
                if (aiSuccess) {
                    setTimeout(() => navigate('/dashboard'), 400);
                }
            }
        }, intervalTime);

        const callAI = async () => {
            try {
                if (lifeRhythm) {
                    await generateQuests(lifeRhythm);
                }
                // Generate personalized rewards after quests
                try {
                    await generateRewards();
                } catch (rewardErr) {
                    console.warn('Reward generation failed (non-blocking):', rewardErr);
                }
                aiSuccess = true;
            } catch (err) {
                console.error('Quest generation failed:', err);
                setError('Quest generation failed. You can retry from Settings.');
                aiSuccess = true;
            } finally {
                aiDone = true;
            }
        };

        callAI();

        return () => clearInterval(timer);
    }, [navigate, location.state]);

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

                {error && (
                    <p className="text-red-400 text-xs mt-4">{error}</p>
                )}
            </div>

        </div>
    );
}
