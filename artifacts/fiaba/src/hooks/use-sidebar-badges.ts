import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export function useMerchantSidebarBadges() {
  const { profile, merchantId } = useAuth();
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    async function load() {
      if (!merchantId) {
        setOrderCount(0);
        return;
      }
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .in('status', ['a_preparer', 'en_livraison']);
      setOrderCount(count ?? 0);
    }
    load();
  }, [merchantId]);

  return { orderCount };
}

export function useSellerSidebarBadges() {
  const { profile, sellerId } = useAuth();
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    async function load() {
      if (!sellerId) {
        setSalesCount(0);
        return;
      }
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .in('status', ['a_preparer', 'en_livraison']);
      setSalesCount(count ?? 0);
    }
    load();
  }, [sellerId]);

  return { salesCount };
}
