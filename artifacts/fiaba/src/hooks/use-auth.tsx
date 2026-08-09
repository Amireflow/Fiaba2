import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Merchant = Database['public']['Tables']['merchants']['Row'];
export type Seller = Database['public']['Tables']['sellers']['Row'];

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  merchant: Merchant | null;
  merchantId: string | null;
  seller: Seller | null;
  sellerId: string | null;
  loading: boolean;
  refetchProfile: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  signInWithOtp: (phone: string) => Promise<{ data: any; error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ data: any; error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    role: 'marchand' | 'vendeur' | 'admin'
  ) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: rawProf, error: profErr } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let prof = rawProf as Profile | null;

      if (!prof) {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData.session?.user;
        if (authUser && authUser.id === userId) {
          const userEmail = authUser.email || '';
          const metaRole = authUser.user_metadata?.role;
          const isAdmin = userEmail.toLowerCase().includes('admin') || metaRole === 'admin';
          const defaultRole = isAdmin ? 'admin' : (metaRole || 'marchand');
          const fullName = authUser.user_metadata?.full_name || (isAdmin ? 'Administrateur Fiaba' : 'Utilisateur Fiaba');

          const { data: newProf } = await (supabase.from('profiles') as any)
            .upsert({
              id: userId,
              email: userEmail,
              full_name: fullName,
              role: defaultRole,
              city: 'Dakar',
              verification_status: isAdmin ? 'verified' : 'pending',
              trust_score: isAdmin ? 100 : 50,
            })
            .select('*')
            .single();

          if (newProf) {
            prof = newProf as Profile;
          }
        }
      }

      if (!prof) {
        setProfile(null);
        setMerchant(null);
        setSeller(null);
        setLoading(false);
        return;
      }

      setProfile(prof);

      // 2. Fetch or create Merchant if role === 'marchand' or 'admin'
      if (prof.role === 'marchand' || prof.role === 'admin') {
        const { data: merch } = await (supabase.from('merchants') as any)
          .select('*')
          .eq('owner_id', userId)
          .maybeSingle();

        if (merch) {
          setMerchant(merch as Merchant);
        } else {
          // Auto-create merchant if none exists yet
          const slugName = (prof.full_name || 'Boutique').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const { data: newMerch } = await (supabase.from('merchants') as any)
            .insert({
              owner_id: userId,
              name: prof.full_name ? `Boutique ${prof.full_name}` : 'Maison Ndar',
              slug: `${slugName}-${userId.slice(0, 6)}`,
              phone: prof.phone || null,
              email: prof.email || null,
            })
            .select()
            .single();

          if (newMerch) {
            setMerchant(newMerch as Merchant);
          }
        }
      } else {
        setMerchant(null);
      }

      // 3. Fetch or create Seller if role === 'vendeur'
      if (prof.role === 'vendeur') {
        const { data: sell } = await (supabase.from('sellers') as any)
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();

        if (sell) {
          setSeller(sell as Seller);
        } else {
          // Auto-create seller record if none exists yet
          const { data: newSell } = await (supabase.from('sellers') as any)
            .insert({
              profile_id: userId,
              display_name: prof.full_name || 'Vendeur Fiaba',
              phone: prof.phone || null,
              status: 'actif',
            })
            .select()
            .single();

          if (newSell) {
            setSeller(newSell as Seller);
          }
        }
      } else {
        setSeller(null);
      }
    } catch (err) {
      console.error('Error fetching user auth context data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchUserData(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchUserData(newSession.user.id);
      } else {
        setProfile(null);
        setMerchant(null);
        setSeller(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchUserData]);

  const refetchProfile = useCallback(async () => {
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
  }, [session, fetchUserData]);

  const fetchProfile = useCallback(async (userId: string) => {
    await fetchUserData(userId);
  }, [fetchUserData]);

  const signInWithOtp = useCallback(async (phone: string) => {
    return supabase.auth.signInWithOtp({ phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string, role: 'marchand' | 'vendeur' | 'admin') => {
      return supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            phone: null,
          },
        },
      });
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setMerchant(null);
    setSeller(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        merchant,
        merchantId: merchant?.id ?? null,
        seller,
        sellerId: seller?.id ?? null,
        loading,
        refetchProfile,
        fetchProfile,
        signInWithOtp,
        verifyOtp,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider');
  }
  return context;
}

export type { User };
