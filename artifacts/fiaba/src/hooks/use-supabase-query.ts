import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

/**
 * Hook générique d'interrogation Supabase.
 * Récupère les données réelles en base avec filtres et tri.
 */
export function useSupabaseQuery<T = Record<string, unknown>>(
  table: string,
  opts: {
    select?: string;
    filter?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    enabled?: boolean;
  } = {}
) {
  const { profile } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = opts.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = (supabase.from(table) as any).select(opts.select ?? '*');

    // Appliquer les filtres
    if (opts.filter) {
      for (const [key, value] of Object.entries(opts.filter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    // Appliquer le tri
    if (opts.order) {
      query = query.order(opts.order.column, { ascending: opts.order.ascending ?? false });
    }

    const { data: result, error: err } = await query;
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setData((result ?? []) as T[]);
    }
    setLoading(false);
  }, [table, opts.select, JSON.stringify(opts.filter), opts.order?.column, opts.order?.ascending, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook d'interrogation Supabase filtré sur le commerçant connecté (merchant_id).
 */
export function useMerchantQuery<T = Record<string, unknown>>(
  table: string,
  opts: {
    select?: string;
    filter?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    enabled?: boolean;
  } = {}
) {
  const { merchantId } = useAuth();
  const filterWithMerchant = {
    ...opts.filter,
    ...(merchantId ? { merchant_id: merchantId } : {}),
  };

  return useSupabaseQuery<T>(table, {
    ...opts,
    filter: filterWithMerchant,
    enabled: opts.enabled !== false && !!merchantId,
  });
}

/**
 * Hook d'interrogation Supabase filtré sur le vendeur connecté (seller_id).
 */
export function useSellerQuery<T = Record<string, unknown>>(
  table: string,
  opts: {
    select?: string;
    filter?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    enabled?: boolean;
  } = {}
) {
  const { sellerId } = useAuth();
  const filterWithSeller = {
    ...opts.filter,
    ...(sellerId ? { seller_id: sellerId } : {}),
  };

  return useSupabaseQuery<T>(table, {
    ...opts,
    filter: filterWithSeller,
    enabled: opts.enabled !== false && !!sellerId,
  });
}

/**
 * Helper legacy pour merchantId
 */
export function useMerchantId() {
  const { merchantId, loading } = useAuth();
  return { merchantId, loading };
}

/**
 * Résolution automatique et sécurisée du merchantId pour l'utilisateur actuellement connecté.
 */
export async function getOrCreateMerchantId(cachedMerchantId?: string | null): Promise<string | null> {
  if (cachedMerchantId) return cachedMerchantId;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return null;

    // 1. Chercher la boutique existante
    const { data: merch } = await (supabase.from('merchants') as any)
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (merch?.id) return merch.id;

    // 2. Chercher les infos de profil
    const { data: prof } = await (supabase.from('profiles') as any)
      .select('full_name, phone, email')
      .eq('id', userId)
      .maybeSingle();

    const nameToUse = prof?.full_name ? `Boutique ${prof.full_name}` : 'Ma Boutique Fiaba';
    const slugName = nameToUse.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 3. Créer automatiquement la boutique
    const { data: newMerch } = await (supabase.from('merchants') as any)
      .insert({
        owner_id: userId,
        name: nameToUse,
        slug: `${slugName}-${userId.slice(0, 6)}`,
        phone: prof?.phone || null,
        email: prof?.email || null,
      })
      .select('id')
      .single();

    return newMerch?.id ?? null;
  } catch (err) {
    console.error('getOrCreateMerchantId error:', err);
    return null;
  }
}

/**
 * Inserer une ligne dans une table Supabase.
 */
export async function supabaseInsert<T = Record<string, unknown>>(
  table: string,
  row: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await (supabase.from(table) as any).insert(row as never).select().single();
  return { data: data as T | null, error: error?.message ?? null };
}

/**
 * Mettre à jour une ligne dans une table Supabase par ID.
 */
export async function supabaseUpdate<T = Record<string, unknown>>(
  table: string,
  id: string,
  updates: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await (supabase.from(table) as any).update(updates as never).eq('id', id).select().single();
  return { data: data as T | null, error: error?.message ?? null };
}

/**
 * Supprimer une ligne dans une table Supabase par ID.
 */
export async function supabaseDelete(
  table: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await (supabase.from(table) as any).delete().eq('id', id);
  return { error: error?.message ?? null };
}
