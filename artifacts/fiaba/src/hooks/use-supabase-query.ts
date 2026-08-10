import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { formatShopName } from '@/lib/utils';

// Cache en mémoire ultrarapide pour un affichage instantané (0ms) lors de la navigation entre onglets
const queryCacheMap = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 secondes de validité en cache

export function clearQueryCache() {
  queryCacheMap.clear();
}

/**
 * Hook générique d'interrogation Supabase avec Caching SWR (Stale-While-Revalidate).
 * Permet un rendu instantané à 0ms si les données sont déjà en mémoire.
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
  const enabled = opts.enabled !== false;

  const cacheKey = `${table}:${opts.select ?? '*'}:${JSON.stringify(opts.filter ?? {})}:${opts.order?.column}:${opts.order?.ascending}`;
  const cached = queryCacheMap.get(cacheKey);

  const [data, setData] = useState<T[]>(() => (cached ? (cached.data as T[]) : []));
  const [loading, setLoading] = useState<boolean>(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!isSilent && !queryCacheMap.has(cacheKey)) {
      setLoading(true);
    }
    setError(null);

    let query = (supabase.from(table) as any).select(opts.select ?? '*');

    if (opts.filter) {
      for (const [key, value] of Object.entries(opts.filter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    if (opts.order) {
      query = query.order(opts.order.column, { ascending: opts.order.ascending ?? false });
    }

    const { data: result, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      const freshData = (result ?? []) as T[];
      setData(freshData);
      queryCacheMap.set(cacheKey, { data: freshData, timestamp: Date.now() });
    }
    setLoading(false);
  }, [table, opts.select, JSON.stringify(opts.filter), opts.order?.column, opts.order?.ascending, enabled, cacheKey]);

  useEffect(() => {
    const cachedItem = queryCacheMap.get(cacheKey);
    if (cachedItem) {
      setData(cachedItem.data as T[]);
      setLoading(false);
      // Re-validate in background silently
      fetchData(true);
    } else {
      fetchData(false);
    }
  }, [fetchData, cacheKey]);

  return { data, loading, error, refetch: () => fetchData(false) };
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
    const { data: userData } = await supabase.auth.getUser();
    let userId = userData.user?.id;
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData.session?.user?.id;
    }
    if (!userId) return null;

    // 1. Chercher la boutique existante
    const { data: merchRows } = await (supabase.from('merchants') as any)
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (merchRows && merchRows.length > 0) {
      return merchRows[0].id;
    }

    // 2. Chercher les infos de profil
    const { data: prof } = await (supabase.from('profiles') as any)
      .select('full_name, phone, email')
      .eq('id', userId)
      .maybeSingle();

    const cleanShopName = formatShopName(prof?.full_name);

    const slugName = cleanShopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const uniqueSlug = `${slugName}-${userId.slice(0, 6)}-${Date.now().toString(36).slice(-4)}`;

    // 3. Créer automatiquement la boutique
    const { data: newMerch } = await (supabase.from('merchants') as any)
      .insert({
        owner_id: userId,
        name: cleanShopName,
        slug: uniqueSlug,
        phone: prof?.phone || null,
        email: prof?.email || null,
        is_active: true,
      })
      .select('id')
      .maybeSingle();

    if (newMerch?.id) return newMerch.id;

    // Fallback de sécurité
    const { data: fallbackMerch } = await (supabase.from('merchants') as any)
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    return fallbackMerch?.[0]?.id ?? null;
  } catch (err) {
    console.error('getOrCreateMerchantId error:', err);
    return null;
  }
}

/**
 * Récupère ou crée automatiquement l'identifiant Vendeur (seller_id) pour l'utilisateur connecté.
 */
export async function getOrCreateSellerId(userId?: string): Promise<string | null> {
  let targetId = userId;
  if (!targetId) {
    const { data: userData } = await supabase.auth.getUser();
    targetId = userData.user?.id;
  }
  if (!targetId) return null;

  try {
    const { data: existing } = await supabase
      .from('sellers')
      .select('id')
      .eq('profile_id', targetId)
      .maybeSingle();

    if (existing?.id) return existing.id;

    // Création automatique du profil vendeur
    const { data: prof } = await supabase.from('profiles').select('full_name, phone').eq('id', targetId).maybeSingle();
    const cleanName = prof?.full_name ? prof.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'vendeur';
    const handle = `${cleanName}-${targetId.slice(0, 4)}-${Date.now().toString(36).slice(-3)}`;

    const { data: newSeller } = await (supabase.from('sellers') as any)
      .insert({
        profile_id: targetId,
        handle,
        bio: 'Créateur & Vendeur affilié',
      })
      .select('id')
      .maybeSingle();

    if (newSeller?.id) return newSeller.id;

    const { data: fallback } = await supabase.from('sellers').select('id').eq('profile_id', targetId).limit(1);
    return fallback?.[0]?.id ?? null;
  } catch (err) {
    console.error('getOrCreateSellerId error:', err);
    return null;
  }
}

/**
 * Inserer une ligne dans une table Supabase et réinitialiser le cache local.
 */
export async function supabaseInsert<T = Record<string, unknown>>(
  table: string,
  row: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  clearQueryCache();
  const { data, error } = await (supabase.from(table) as any).insert(row as never).select().single();
  return { data: data as T | null, error: error?.message ?? null };
}

/**
 * Mettre à jour une ligne dans une table Supabase par ID et réinitialiser le cache local.
 */
export async function supabaseUpdate<T = Record<string, unknown>>(
  table: string,
  id: string,
  updates: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  clearQueryCache();
  const { data, error } = await (supabase.from(table) as any).update(updates as never).eq('id', id).select().single();
  return { data: data as T | null, error: error?.message ?? null };
}

/**
 * Supprimer une ligne dans une table Supabase par ID et réinitialiser le cache local.
 */
export async function supabaseDelete(
  table: string,
  id: string
): Promise<{ error: string | null }> {
  clearQueryCache();
  const { error } = await (supabase.from(table) as any).delete().eq('id', id);
  return { error: error?.message ?? null };
}
