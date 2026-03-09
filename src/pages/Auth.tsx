import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sword, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export default function Auth() {
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: authError } = isLogin
                ? await signIn(email, password)
                : await signUp(email, password);

            if (authError) {
                setError(authError.message);
            } else {
                // After auth, navigate to onboarding (for new users) or dashboard
                navigate('/onboarding');
            }
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center px-6 py-12 animate-in fade-in duration-500">

            {/* Logo / Brand */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-500/40 shadow-glow-gold mb-6">
                    <Sword className="w-10 h-10 text-amber-500" />
                </div>
                <h1 className="font-heading text-4xl text-amber-500 tracking-wider mb-1">lifeRPG</h1>
                <p className="text-slate-500 text-sm">Turn your life into a quest.</p>
            </div>

            {/* Tab Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1 mb-8 border border-slate-700">
                <button
                    type="button"
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-2.5 rounded-md text-sm font-heading tracking-wider transition-all duration-200 ${isLogin
                            ? 'bg-amber-500 text-slate-900 shadow-glow-gold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Login
                </button>
                <button
                    type="button"
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-2.5 rounded-md text-sm font-heading tracking-wider transition-all duration-200 ${!isLogin
                            ? 'bg-amber-500 text-slate-900 shadow-glow-gold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Register
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel text-sm"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        minLength={6}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel text-sm"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative group bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-heading font-bold text-lg py-4 rounded-lg shadow-glow-gold transition-all duration-300 disabled:shadow-none flex items-center justify-center gap-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : isLogin ? (
                        <>
                            <LogIn className="w-5 h-5" />
                            Enter the Realm
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-5 h-5" />
                            Begin Your Journey
                        </>
                    )}
                </button>
            </form>

            {/* Footer Note */}
            <p className="text-center text-xs text-slate-600 mt-8">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-amber-500 hover:text-amber-400 transition-colors"
                >
                    {isLogin ? 'Register' : 'Login'}
                </button>
            </p>
        </div>
    );
}
