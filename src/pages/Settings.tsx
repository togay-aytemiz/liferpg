import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { regenerateQuests, generateRewards } from '../lib/api';
import { ArrowLeft, Save, RefreshCw, LogOut, Scroll } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function Settings() {
    const navigate = useNavigate();
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [lifeRhythm, setLifeRhythm] = useState('');
    const [username, setUsername] = useState('');
    const [likes, setLikes] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [focusAreas, setFocusAreas] = useState('');
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    useEffect(() => {
        if (profile) {
            setLifeRhythm(profile.life_rhythm || '');
            setUsername(profile.username || '');
            setLikes(profile.likes || '');
            setDislikes(profile.dislikes || '');
            setFocusAreas(profile.focus_areas || '');
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setSavedMsg('');

        await supabase
            .from('profiles')
            // @ts-ignore
            .update({ username: username.trim() || null })
            .eq('id', user.id);

        await refreshProfile();
        setSaving(false);
        setSavedMsg('Profile saved!');
        setTimeout(() => setSavedMsg(''), 2000);
    };

    const handleRegenerateQuests = async () => {
        if (!user || !lifeRhythm.trim()) return;
        setRegenerating(true);
        setSavedMsg('');

        try {
            // Save updated life rhythm
            await supabase
                .from('profiles')
                // @ts-ignore
                .update({
                    life_rhythm: lifeRhythm.trim(),
                    likes: likes.trim() || null,
                    dislikes: dislikes.trim() || null,
                    focus_areas: focusAreas.trim() || null
                })
                .eq('id', user.id);

            // Regenerate quests via Edge Function
            await regenerateQuests(lifeRhythm.trim());

            // Regenerate rewards too
            try {
                await generateRewards();
            } catch (e) {
                console.warn('Reward regeneration failed:', e);
            }

            await refreshProfile();
            setSavedMsg('Quests & rewards regenerated!');
            setTimeout(() => setSavedMsg(''), 3000);
        } catch (err) {
            console.error('Regeneration failed:', err);
            setSavedMsg('Failed to regenerate. Try again.');
        } finally {
            setRegenerating(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="px-4 pt-6 pb-4 flex items-center gap-3">
                <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors p-1">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-heading text-2xl text-white">Settings</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-8">

                {/* Profile Section */}
                <div className="space-y-4">
                    <h2 className="font-heading text-lg text-slate-300">Profile</h2>
                    <div>
                        <label htmlFor="username" className="text-[0.85rem] font-heading tracking-wide text-slate-400 ml-1 block mb-1">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter a username"
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 rounded-lg text-sm font-heading tracking-wide transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Profile
                    </button>
                </div>

                {/* Life Rhythm Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Scroll className="w-5 h-5 text-amber-500" />
                        <h2 className="font-heading text-lg text-slate-300">Life Rhythm</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                        Update your daily routine. Saving will regenerate your quests and rewards based on the new description.
                    </p>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[0.85rem] font-heading tracking-wide text-slate-400 ml-1 block mb-1">Your Daily Routine <span className="text-red-400">*</span></label>
                            <textarea
                                value={lifeRhythm}
                                onChange={(e) => setLifeRhythm(e.target.value)}
                                placeholder="Describe your typical day..."
                                className="w-full min-h-[120px] p-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-inner-panel resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[0.85rem] font-heading tracking-wide text-slate-400 ml-1 block mb-1">What do you enjoy doing? (Likes)</label>
                            <textarea
                                value={likes}
                                onChange={(e) => setLikes(e.target.value)}
                                placeholder="Gaming, reading, cooking..."
                                className="w-full min-h-[60px] p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[0.85rem] font-heading tracking-wide text-slate-400 ml-1 block mb-1">What do you hate doing? (Dislikes)</label>
                            <textarea
                                value={dislikes}
                                onChange={(e) => setDislikes(e.target.value)}
                                placeholder="Running, crowds, washing dishes..."
                                className="w-full min-h-[60px] p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[0.85rem] font-heading tracking-wide text-slate-400 ml-1 block mb-1">What do you want to improve? (Focus Areas)</label>
                            <textarea
                                value={focusAreas}
                                onChange={(e) => setFocusAreas(e.target.value)}
                                placeholder="Career, saving money, learning Spanish..."
                                className="w-full min-h-[60px] p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none text-sm"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleRegenerateQuests}
                        disabled={regenerating || lifeRhythm.trim().length < 10}
                        className="w-full relative group bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-heading font-bold py-3 rounded-lg shadow-glow-gold transition-all duration-300 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                        {regenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Regenerate Quests & Rewards
                            </>
                        )}
                    </button>
                </div>

                {/* Success Message */}
                {savedMsg && (
                    <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-sm px-4 py-3 rounded-lg text-center animate-in fade-in duration-200">
                        {savedMsg}
                    </div>
                )}

                {/* Sign Out */}
                <div className="pt-4 border-t border-slate-800">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 py-3 rounded-lg text-sm font-heading tracking-wide transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

            </div>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
