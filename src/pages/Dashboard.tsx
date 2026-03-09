import { Shield, Swords, Search, Crown } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-slate-900 overflow-hidden relative">

            <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
                {/* Placeholder Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-2xl">🧙‍♂️</span>
                    </div>
                    <div className="flex-1">
                        <h1 className="font-heading text-2xl text-white">Player One</h1>
                        <p className="text-amber-500 font-heading text-sm">Level 1 Novice</p>
                    </div>
                </div>

                {/* Placeholder Quests list to show redirect worked */}
                <div className="space-y-4">
                    <h2 className="font-heading text-xl text-slate-300">Daily Quests</h2>

                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-start gap-4 shadow-hud opacity-60">
                        <div className="w-6 h-6 rounded bg-slate-900 border border-slate-600 mt-0.5"></div>
                        <div>
                            <p className="font-medium text-white">(Generated Quests will appear here)</p>
                            <p className="text-amber-500 text-sm font-mono mt-1">+15 XP</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom HUD Navigation */}
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 pb-safe flex justify-around items-center">
                <button className="flex flex-col items-center gap-1 text-amber-500 group">
                    <Shield className="w-6 h-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-heading tracking-widest uppercase">Dash</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors group">
                    <Swords className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-heading tracking-widest uppercase">Quests</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors group">
                    <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-heading tracking-widest uppercase">Stats</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors group">
                    <Crown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-heading tracking-widest uppercase">Awards</span>
                </button>
            </div>

        </div>
    );
}
