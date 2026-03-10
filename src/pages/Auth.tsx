import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sword, Mail, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
                if (isLogin) {
                    navigate('/onboarding');
                } else {
                    setIsSubmitted(true);
                }
            }
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 animate-in fade-in duration-500">

            {/* Logo / Brand */}
            <div className="text-center mb-5 sm:mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 flex-shrink-0 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-amber-500/40 shadow-glow-gold mb-1 sm:mb-4">
                    <Sword className="w-6 h-6 sm:w-10 sm:h-10 text-amber-500" />
                </div>
                <h1 className="font-heading text-3xl sm:text-4xl text-amber-500 tracking-wider mb-0.5">lifeRPG</h1>
                <p className="text-slate-500 text-xs sm:text-sm">Turn your life into a quest.</p>
            </div>

            {isSubmitted && !isLogin ? (
                <div className="text-center bg-slate-800/50 p-6 sm:p-8 rounded-xl border border-amber-500/20 shadow-inner-panel">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border border-slate-700 mb-4">
                        <Mail className="w-6 h-6 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-heading text-slate-100 mb-2">Check your email</h2>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        We sent a confirmation link to <strong className="text-slate-200">{email}</strong>.
                        Please check your inbox and click the link to continue your journey.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSubmitted(false);
                            setIsLogin(true);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-amber-500 border border-slate-700 font-heading tracking-wider py-3 rounded-lg transition-colors text-sm"
                    >
                        Return to Login
                    </button>
                </div>
            ) : (
                <>
                    {/* Tab Toggle */}
                    <div className="flex bg-slate-800 rounded-lg p-1 mb-4 sm:mb-8 border border-slate-700">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(true); setError(''); }}
                            className={`flex-1 py-1.5 sm:py-2.5 rounded-md text-sm font-heading tracking-wider transition-all duration-200 ${isLogin
                                ? 'bg-amber-500 text-slate-900 shadow-glow-gold'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(false); setError(''); }}
                            className={`flex-1 py-1.5 sm:py-2.5 rounded-md text-sm font-heading tracking-wider transition-all duration-200 ${!isLogin
                                ? 'bg-amber-500 text-slate-900 shadow-glow-gold'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel text-base"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                minLength={6}
                                className="w-full pl-10 sm:pl-12 pr-12 py-2.5 sm:py-3.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel text-base"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
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
                            className="w-full relative group bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-heading font-bold text-base sm:text-lg py-2.5 sm:py-4 rounded-lg shadow-glow-gold transition-all duration-300 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                            {loading ? (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
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
                    <p className="text-center text-xs text-slate-600 mt-2 sm:mt-6">
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-amber-500 hover:text-amber-400 transition-colors"
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </button>
                    </p>
                </>
            )}
        </div>
    );
}
