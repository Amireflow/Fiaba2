import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { CampaignRow, MerchantName } from './types';

export function useAdminCampaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [campaignSellerCounts, setCampaignSellerCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toSuspend, setToSuspend] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: campRes } = await supabase
        .from('campaigns')
        .select('id, name, merchant_id, model, commission, commission_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const campRows = (campRes as CampaignRow[] | null) ?? [];
      setCampaigns(campRows);

      const merchantIds = [...new Set(campRows.map((c) => c.merchant_id))];
      if (merchantIds.length > 0) {
        const { data: mNames } = await supabase.from('merchants').select('id, name').in('id', merchantIds);
        setMerchantNames(new Map<string, string>(((mNames as MerchantName[] | null) ?? []).map((m) => [m.id, m.name])));
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
    const { error } = await (supabase.from('campaigns') as any).update({ status: 'terminee' } as never).eq('id', toSuspend.id);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      setCampaigns((prev) => prev.map((c) => (c.id === toSuspend.id ? { ...c, status: 'terminee' } : c)));
      toast({ title: 'Campagne suspendue', description: `${toSuspend.name} suspendue.` });
    }
    setToSuspend(null);
  }, [toSuspend, toast]);

  return {
    campaigns, merchantNames, campaignSellerCounts,
    loading, toSuspend,
    setToSuspend, suspend,
  };
}