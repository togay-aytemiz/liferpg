import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_INIT_TIMEOUT_MS = 8000;
const PROFILE_FETCH_TIMEOUT_MS = 8000;

type TimeoutResult<T> =
    | { timedOut: true }
    | { timedOut: false; value: T };

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const profileFetchIdRef = useRef(0);

    const runWithTimeout = async <T,>(promiseLike: PromiseLike<T>, timeoutMs: number): Promise<TimeoutResult<T>> => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
            timeoutId = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
        });

        const promise = Promise.resolve(promiseLike);

        const result = await Promise.race([
            promise.then((value) => ({ timedOut: false as const, value })),
            timeoutPromise,
        ]);

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        return result;
    };

    const fetchProfile = async (userId: string) => {
        const fetchId = ++profileFetchIdRef.current;

        try {
            const profileQuery = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const profileResult = await runWithTimeout(
                profileQuery,
                PROFILE_FETCH_TIMEOUT_MS
            );

            if (fetchId !== profileFetchIdRef.current) return;

            if (profileResult.timedOut) {
                console.error(`Profile fetch timed out after ${PROFILE_FETCH_TIMEOUT_MS}ms`);
                setProfile(null);
                return;
            }

            const { data, error } = profileResult.value;

            if (error) {
                console.error('Failed to fetch profile:', error);
            }
            setProfile(data as Profile | null);
        } catch (err) {
            if (fetchId !== profileFetchIdRef.current) return;
            console.error('Exception while fetching profile:', err);
            setProfile(null);
        }
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    useEffect(() => {
        let mounted = true;

        const initializeSession = async () => {
            try {
                const sessionQuery = supabase.auth.getSession();
                const sessionResult = await runWithTimeout(
                    sessionQuery,
                    SESSION_INIT_TIMEOUT_MS
                );

                if (sessionResult.timedOut) {
                    console.error(`Initial session fetch timed out after ${SESSION_INIT_TIMEOUT_MS}ms`);
                    if (mounted) {
                        profileFetchIdRef.current += 1;
                        setSession(null);
                        setUser(null);
                        setProfile(null);
                    }
                    return;
                }

                const { data: { session }, error } = sessionResult.value;
                if (error) {
                    console.error('Error getting initial session:', error);
                }

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        await fetchProfile(session.user.id);
                    } else {
                        profileFetchIdRef.current += 1;
                        setProfile(null);
                    }
                }
            } catch (err) {
                console.error('Exception during getSession:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (!session?.user) {
                    profileFetchIdRef.current += 1;
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                setLoading(true);

                // Keep the Supabase auth callback synchronous to avoid lock issues.
                setTimeout(() => {
                    if (!mounted) return;

                    void (async () => {
                        try {
                            await fetchProfile(session.user.id);
                        } catch (err) {
                            console.error('Exception during onAuthStateChange:', err);
                        } finally {
                            if (mounted) setLoading(false);
                        }
                    })();
                }, 0);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error as Error | null };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        profileFetchIdRef.current += 1;
        await supabase.auth.signOut();
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
