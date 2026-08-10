import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { extractTokenFromUrl } from '@/lib/link';
import type { SellerAttribution } from './types';

export function useSellerAttribution(location: string) {
  const [sellerInfo, setSellerInfo] = useState<SellerAttribution>(null);

  useEffect(() => {
    const token = extractTokenFromUrl(window.location.href);
    const params = new URLSearchParams(window.location.search);
    const sellerParam = params.get('seller') || params.get('ref');
    if (!token && !sellerParam) return;
    validateSeller(token, sellerParam).then(setSellerInfo);
  }, [location]);

  return sellerInfo;
}

async function validateSeller(token: string | null, sellerParam: string | null): Promise<SellerAttribution> {
  if (token) {
    const { data: link } = await supabase
      .from('tracking_links')
      .select('id, seller_id, seller_code, is_active, expires_at')
      .eq('token', token)
      .maybeSingle();
    const tl = link as any;
    if (tl && tl.is_active && (!tl.expires_at || new Date(tl.expires_at) > new Date())) {
      return { sellerId: tl.seller_id, sellerCode: tl.seller_code, trackingLinkId: tl.id };
    }
  } else if (sellerParam) {
    const { data: links } = await supabase
      .from('tracking_links')
      .select('seller_id, seller_code')
      .eq('seller_code', sellerParam.toUpperCase())
      .eq('is_active', true)
      .limit(1);
    const found = (links as any)?.[0];
    if (found) return { sellerId: found.seller_id, sellerCode: found.seller_code, trackingLinkId: '' };
  }
  return null;
}
