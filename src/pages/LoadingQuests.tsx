import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

const GENERATION_STEPS = [
    "Analyzing your daily rhythm...",
    "Creating daily quests...",
    "Preparing weekly challenges...",
    "Building your character profile..."
];

export default function LoadingQuests() {
    const navigate = useNavigate();
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Total simulated loading time: ~4 seconds
        const totalDuration = 4000;
        const intervalTime = 50; // Update frequency
        const totalTicks = totalDuration / intervalTime;
        let currentTick = 0;

        const timer = setInterval(() => {
            currentTick++;
            const currentProgress = Math.min((currentTick / totalTicks) * 100, 100);
            setProgress(currentProgress);

            // Determine the text step based on progress
            if (currentProgress < 25) setStepIndex(0);
            else if (currentProgress < 50) setStepIndex(1);
            else if (currentProgress < 85) setStepIndex(2);
            else setStepIndex(3);

            if (currentProgress >= 100) {
                clearInterval(timer);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 500); // Tiny pause at 100% before jumping
            }
        }, intervalTime);

        return () => clearInterval(timer);
    }, [navigate]);

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
                {/* Step Text (Simulated logs) */}
                <div className="h-6 flex items-center justify-center">
                    <p className="text-amber-500 text-sm font-mono tracking-wider animate-pulse">
                        {GENERATION_STEPS[stepIndex]}
                    </p>
                </div>

                {/* The Bar Track */}
                <div className="w-full h-4 bg-slate-800 rounded-full shadow-inner-panel overflow-hidden border border-slate-700/50 p-0.5 relative">
                    {/* The Glowing Fill */}
                    <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-75 ease-linear shadow-glow-gold relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer effect inside the bar */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                </div>

                {/* Percentage Counter */}
                <p className="text-slate-500 font-mono text-xs">
                    {Math.floor(progress)}%
                </p>
            </div>

        </div>
    );
}
