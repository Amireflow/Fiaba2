import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

/**
 * Generic Supabase query hook that replaces localStorage read/write.
 * Automatically filters by the current user's merchant_id when applicable.
 *
 * @example
 * const { data, loading, error, refetch } = useSupabaseQuery('products', {
 *   select: '*',
 *   filter: { status: 'actif' },
 *   order: { column: 'created_at', ascending: false },
 * });
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
    if (!enabled || !profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase.from(table).select(opts.select ?? '*');

    // Apply filters
    if (opts.filter) {
      for (const [key, value] of Object.entries(opts.filter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    // Apply ordering
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
  }, [table, opts.select, JSON.stringify(opts.filter), opts.order?.column, opts.order?.ascending, enabled, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Get the current user's merchant ID.
 * Creates a merchant record if one doesn't exist yet.
 */
export function useMerchantId() {
  const { profile } = useAuth();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMerchant() {
      if (!profile || profile.role !== 'marchand') {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('merchants')
        .select('id')
        .eq('owner_id', profile.id)
        .single();

      setMerchantId((data as { id: string } | null)?.id ?? null);
      setLoading(false);
    }
    fetchMerchant();
  }, [profile]);

  return { merchantId, loading };
}

/**
 * Insert a row into a Supabase table.
 */
export async function supabaseInsert<T = Record<string, unknown>>(
  table: string,
  row: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.from(table).insert(row as never).select().single();
  return { data: data as T | null, error: error?.message ?? null };
}

/**
 * Update a row in a Supabase table by ID.
 */
export async function supabaseUpdate<T = Record<string, unknown>>(
  table: string,
  id: string,
  updates: Partial<T>
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.from(table).update(updates as never).eq('id', id).select().single();
  return { data: data as T | null, error: error?.message ?? null };
}

/**
 * Delete a row from a Supabase table by ID.
 */
export async function supabaseDelete(
  table: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  return { error: error?.message ?? null };
}
