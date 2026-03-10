import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import { regenerateQuests } from '../lib/api';
import { Save, RefreshCw, LogOut, Scroll, PencilLine, X } from 'lucide-react';

export default function Settings() {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [lifeRhythm, setLifeRhythm] = useState('');
    const [username, setUsername] = useState('');
    const [likes, setLikes] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [focusAreas, setFocusAreas] = useState('');
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');
    const [isEditingQuestSetup, setIsEditingQuestSetup] = useState(false);

    useEffect(() => {
        if (profile) {
            setLifeRhythm(profile.life_rhythm || '');
            setUsername(profile.username || '');
            setLikes(profile.likes || '');
            setDislikes(profile.dislikes || '');
            setFocusAreas(profile.focus_areas || '');
        }
    }, [profile]);

    const normalizedQuestSetup = {
        lifeRhythm: lifeRhythm.trim(),
        likes: likes.trim(),
        dislikes: dislikes.trim(),
        focusAreas: focusAreas.trim(),
    };

    const initialQuestSetup = {
        lifeRhythm: profile?.life_rhythm?.trim() || '',
        likes: profile?.likes?.trim() || '',
        dislikes: profile?.dislikes?.trim() || '',
        focusAreas: profile?.focus_areas?.trim() || '',
    };

    const isQuestSetupDirty =
        normalizedQuestSetup.lifeRhythm !== initialQuestSetup.lifeRhythm ||
        normalizedQuestSetup.likes !== initialQuestSetup.likes ||
        normalizedQuestSetup.dislikes !== initialQuestSetup.dislikes ||
        normalizedQuestSetup.focusAreas !== initialQuestSetup.focusAreas;

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

    const handleCancelQuestEditing = () => {
        setLifeRhythm(profile?.life_rhythm || '');
        setLikes(profile?.likes || '');
        setDislikes(profile?.dislikes || '');
        setFocusAreas(profile?.focus_areas || '');
        setIsEditingQuestSetup(false);
    };

    const handleRegenerateQuests = async () => {
        if (!user || !normalizedQuestSetup.lifeRhythm || !isQuestSetupDirty) return;
        setRegenerating(true);
        setSavedMsg('');

        try {
            await supabase
                .from('profiles')
                // @ts-ignore
                .update({
                    life_rhythm: normalizedQuestSetup.lifeRhythm,
                    likes: normalizedQuestSetup.likes || null,
                    dislikes: normalizedQuestSetup.dislikes || null,
                    focus_areas: normalizedQuestSetup.focusAreas || null
                })
                .eq('id', user.id);

            await regenerateQuests(normalizedQuestSetup.lifeRhythm);

            await refreshProfile();
            setSavedMsg('Quest setup updated. Existing progression stayed intact.');
            setIsEditingQuestSetup(false);
            setTimeout(() => setSavedMsg(''), 3000);
        } catch (err) {
            console.error('Regeneration failed:', err);
            setSavedMsg('Failed to regenerate quests. Try again.');
        } finally {
            setRegenerating(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
            <AppHeader
                title="Settings"
                subtitle="Tune your profile, reroll quests, then sign out here when needed."
            />

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] space-y-8">

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
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Scroll className="w-5 h-5 text-amber-500" />
                            <h2 className="font-heading text-lg text-slate-300">Quest Setup</h2>
                        </div>
                        {!isEditingQuestSetup ? (
                            <button
                                onClick={() => setIsEditingQuestSetup(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-heading tracking-wide text-slate-200 transition-colors hover:bg-slate-700"
                            >
                                <PencilLine className="w-4 h-4 text-amber-400" />
                                Edit
                            </button>
                        ) : (
                            <button
                                onClick={handleCancelQuestEditing}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-heading tracking-wide text-slate-300 transition-colors hover:bg-slate-700"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                                Cancel
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Edit your routine only when you want a new quest set. Levels, XP, gold, streaks, stats, and achievements stay untouched.
                    </p>
                    {!isEditingQuestSetup ? (
                        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/70 p-4 shadow-inner-panel">
                            <div>
                                <p className="text-[0.7rem] font-heading tracking-[0.22em] text-slate-500 uppercase">Current Life Rhythm</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                                    {profile?.life_rhythm || 'No life rhythm saved yet.'}
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
                                    <p className="text-[10px] font-heading tracking-[0.18em] text-emerald-400 uppercase">Likes</p>
                                    <p className="mt-1 text-xs text-slate-400">{profile?.likes || 'None set'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
                                    <p className="text-[10px] font-heading tracking-[0.18em] text-red-400 uppercase">Dislikes</p>
                                    <p className="mt-1 text-xs text-slate-400">{profile?.dislikes || 'None set'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
                                    <p className="text-[10px] font-heading tracking-[0.18em] text-blue-400 uppercase">Focus</p>
                                    <p className="mt-1 text-xs text-slate-400">{profile?.focus_areas || 'None set'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
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
                                disabled={regenerating || normalizedQuestSetup.lifeRhythm.length < 10 || !isQuestSetupDirty}
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
                                        Regenerate Quests
                                    </>
                                )}
                            </button>
                            {!isQuestSetupDirty && (
                                <p className="text-xs text-slate-500 text-center">
                                    Change your quest setup first to enable regeneration.
                                </p>
                            )}
                        </>
                    )}
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
        </div>
    );
}
