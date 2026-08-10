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

      // Auto-promote admin@fiaba.com or email starting with admin@
      const { data: sessionData } = await supabase.auth.getSession();
      const currentEmail = sessionData.session?.user?.email;
      const isSystemAdminEmail = currentEmail === 'admin@fiaba.com' || currentEmail?.startsWith('admin@');

      if (isSystemAdminEmail && (!prof || prof.role !== 'admin')) {
        await (supabase.from('profiles') as any).upsert({
          id: userId,
          email: currentEmail,
          full_name: prof?.full_name || 'Administrateur Fiaba',
          role: 'admin',
          city: prof?.city || 'Dakar',
          verification_status: 'verified',
          trust_score: 100,
        });

        const { data: updatedProf } = await (supabase.from('profiles') as any)
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (updatedProf) {
          prof = updatedProf as Profile;
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

      // 2. Fetch or create Merchant
      const { data: merchRows } = await (supabase.from('merchants') as any)
        .select('*')
        .eq('owner_id', userId)
        .limit(1);

      let merch = (merchRows as Merchant[] | null)?.[0] ?? null;

      if (merch) {
        if (merch.name && /^Boutique\s+Boutique\s+/i.test(merch.name)) {
          const cleanName = merch.name.replace(/^(Boutique\s+)+/i, 'Boutique ').trim();
          await (supabase.from('merchants') as any).update({ name: cleanName }).eq('id', merch.id);
          merch.name = cleanName;
        }
        setMerchant(merch);
      } else if (prof.role === 'marchand' || prof.role === 'admin') {
        let cleanShopName = (prof.full_name || 'Ma Boutique').trim();
        if (cleanShopName.includes('(') && cleanShopName.includes(')')) {
          const match = cleanShopName.match(/\(([^)]+)\)/);
          if (match && match[1]) cleanShopName = match[1].trim();
        }
        cleanShopName = cleanShopName.replace(/^(Boutique\s+)+/i, '').trim();
        if (!cleanShopName) cleanShopName = 'Ma Boutique';

        const slugName = cleanShopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const uniqueSlug = `${slugName}-${userId.slice(0, 6)}-${Date.now().toString(36).slice(-4)}`;

        const { data: newMerch } = await (supabase.from('merchants') as any)
          .insert({
            owner_id: userId,
            name: cleanShopName,
            slug: uniqueSlug,
            phone: prof.phone || null,
            email: prof.email || null,
            is_active: true,
          })
          .select()
          .maybeSingle();

        if (newMerch) {
          setMerchant(newMerch as Merchant);
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
