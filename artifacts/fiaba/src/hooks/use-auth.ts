import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }, []);

  const signInWithOtp = useCallback(async (phone: string) => {
    return supabase.auth.signInWithOtp({ phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string, role: 'marchand' | 'vendeur') => {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signInWithOtp,
    verifyOtp,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}

export type { User, Profile };
