import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Swords, Crown, Settings, ShoppingBag } from 'lucide-react';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: 'dashboard', path: '/dashboard', icon: Shield, label: 'Dash' },
        { id: 'quests', path: '/quests', icon: Swords, label: 'Quests' },
        { id: 'shop', path: '/shop', icon: ShoppingBag, label: 'Shop' },
        { id: 'achievements', path: '/achievements', icon: Crown, label: 'Awards' },
        { id: 'settings', path: '/settings', icon: Settings, label: 'Set' }
    ];

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 flex justify-around items-center z-50">
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
                        <span className="text-[10px] font-heading tracking-widest uppercase truncate max-w-[50px] text-center">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
