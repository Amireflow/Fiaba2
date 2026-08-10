import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { ProductRow, CampaignRow, MerchantName, NicheName } from './types';

export function useAdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [nicheNames, setNicheNames] = useState<Map<string, string>>(new Map());
  const [campaignSellerCounts, setCampaignSellerCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toSuspend, setToSuspend] = useState<{ id: string; name: string; kind: 'product' | 'campaign' } | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const [prodRes, campRes] = await Promise.all([
        supabase.from('products').select('id, name, merchant_id, price, status, created_at, ai_headline, ai_generated_at, ai_generation_count').order('created_at', { ascending: false }).limit(100),
        supabase.from('campaigns').select('id, name, merchant_id, model, commission, commission_type, status, created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      if (prodRes.error) {
        console.error('[admin products] query error:', prodRes.error);
      }
      if (campRes.error) {
        console.error('[admin campaigns] query error:', campRes.error);
      }

      const prodRows = (prodRes.data as ProductRow[] | null) ?? [];
      const campRows = (campRes.data as CampaignRow[] | null) ?? [];
      setProducts(prodRows);
      setCampaigns(campRows);

      const merchantIds = [...new Set([...prodRows.map((p) => p.merchant_id), ...campRows.map((c) => c.merchant_id)])];
      if (merchantIds.length > 0) {
        const { data: mNames } = await supabase.from('merchants').select('id, name').in('id', merchantIds);
        setMerchantNames(new Map<string, string>(((mNames as MerchantName[] | null) ?? []).map((m) => [m.id, m.name])));
      }

      // Fetch niches via product_niches join table (products has no niche_id column)
      if (prodRows.length > 0) {
        const productIds = prodRows.map((p) => p.id);
        const { data: pnData } = await supabase
          .from('product_niches')
          .select('product_id, niche_id')
          .in('product_id', productIds);
        const pnRows = (pnData as { product_id: string; niche_id: string }[] | null) ?? [];
        const nicheIds = [...new Set(pnRows.map((pn) => pn.niche_id))];
        if (nicheIds.length > 0) {
          const { data: nNames } = await supabase.from('niches').select('id, name').in('id', nicheIds);
          const nicheNameMap = new Map<string, string>(((nNames as NicheName[] | null) ?? []).map((n) => [n.id, n.name]));
          // Map product_id → first niche name
          const productNicheMap = new Map<string, string>();
          pnRows.forEach((pn) => {
            if (!productNicheMap.has(pn.product_id)) {
              const name = nicheNameMap.get(pn.niche_id);
              if (name) productNicheMap.set(pn.product_id, name);
            }
          });
          setNicheNames(productNicheMap);
        }
      }

      const campaignIds = campRows.map((c) => c.id);
      if (campaignIds.length > 0) {
        const { data: csData } = await supabase.from('campaign_sellers').select('campaign_id').in('campaign_id', campaignIds);
        const counts = new Map<string, number>();
        ((csData as { campaign_id: string }[] | null) ?? []).forEach((cs) => counts.set(cs.campaign_id, (counts.get(cs.campaign_id) ?? 0) + 1));
        setCampaignSellerCounts(counts);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const suspend = useCallback(async () => {
    if (!toSuspend) return;
    haptic('medium');
    setSuspending(true);
    if (toSuspend.kind === 'product') {
      const { error } = await (supabase.from('products') as any).update({ status: 'epuise' }).eq('id', toSuspend.id);
      if (error) { haptic('error'); toast({ title: 'Erreur', description: error.message }); }
      else {
        setProducts((prev) => prev.map((p) => (p.id === toSuspend.id ? { ...p, status: 'epuise' } : p)));
        toast({ title: 'Produit suspendu', description: `${toSuspend.name} retiré de la diffusion.` });
      }
    } else {
      const { error } = await (supabase.from('campaigns') as any).update({ status: 'terminee' } as never).eq('id', toSuspend.id);
      if (error) { haptic('error'); toast({ title: 'Erreur', description: error.message }); }
      else {
        setCampaigns((prev) => prev.map((c) => (c.id === toSuspend.id ? { ...c, status: 'terminee' } : c)));
        toast({ title: 'Campagne suspendue', description: `${toSuspend.name} suspendue.` });
      }
    }
    setSuspending(false);
    setToSuspend(null);
  }, [toSuspend, toast]);

  return {
    products, campaigns, merchantNames, nicheNames, campaignSellerCounts,
    loading, toSuspend, suspending,
    setToSuspend, suspend,
  };
}