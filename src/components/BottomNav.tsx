import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Swords, Crown, Settings, ShoppingBag } from 'lucide-react';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: 'dashboard', path: '/dashboard', icon: Shield, label: 'Home' },
        { id: 'quests', path: '/quests', icon: Swords, label: 'Quests' },
        { id: 'shop', path: '/shop', icon: ShoppingBag, label: 'Bazaar' },
        { id: 'achievements', path: '/achievements', icon: Crown, label: 'CHAR' },
        { id: 'settings', path: '/settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/90 bg-slate-950/92 px-4 pt-3 pb-[calc(0.95rem+env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-18px_40px_rgba(2,6,23,0.55)]">
            <div className="flex justify-around items-center">
                {tabs.map(tab => {
                    const isActive = location.pathname.startsWith(tab.path);
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={`flex flex-col items-center gap-1 group transition-colors ${isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Icon className={`w-6 h-6 transition-transform ${isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-110' : 'group-hover:scale-110'}`} />
                            <span className="max-w-[64px] text-center text-[9px] leading-tight font-heading tracking-[0.22em] uppercase">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
