import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { haptic } from '@/lib/utils';

export type DiscoveryCampaign = {
  campaign_id: string;
  campaign_name: string;
  campaign_description: string | null;
  commission: number;
  commission_type: string | null;
  model: string;
  goal: number | null;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  product_image_url: string | null;
  product_category: string | null;
  merchant_id: string;
  merchant_name: string;
  merchant_slug: string | null;
  niche_id: string | null;
  niche_name: string | null;
  match_score: number; // 0-100, based on niche overlap
  is_joined: boolean;
};

/**
 * Hook that fetches active campaigns with product + merchant info,
 * matches them against the seller's niches, and tracks which campaigns
 * the seller has already joined.
 */
export function useSellerDiscovery() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<DiscoveryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);

  const fetchDiscovery = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Get seller record
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      const sId = (seller as { id: string } | null)?.id ?? null;
      setSellerId(sId);

      // 2. Get seller niches
      let sellerNicheIds: string[] = [];
      if (sId) {
        const { data: sn } = await supabase
          .from('seller_niches')
          .select('niche_id')
          .eq('seller_id', sId);
        sellerNicheIds = ((sn as { niche_id: string }[] | null) ?? []).map((x) => x.niche_id);
      }

      // 3. Get joined campaign IDs
      let joinedIds: string[] = [];
      if (sId) {
        const { data: joined } = await supabase
          .from('campaign_sellers')
          .select('campaign_id')
          .eq('seller_id', sId);
        joinedIds = ((joined as { campaign_id: string }[] | null) ?? []).map((x) => x.campaign_id);
      }

      // 4. Fetch active campaigns with product + merchant
      const { data: rawCampaigns, error: err } = await supabase
        .from('campaigns')
        .select(`
          id, name, description, commission, commission_type, model, goal,
          product_id, niche_id, merchant_id,
          products:product_id (id, name, price, image_url, category),
          merchants:merchant_id (id, name, slug),
          niches:niche_id (id, name)
        `)
        .eq('status', 'active');

      if (err) {
        setError(err.message);
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // 5. Transform + compute match score
      const typed = (rawCampaigns as unknown[] ?? []).map((row): DiscoveryCampaign => {
        const c = row as {
          id: string; name: string; description: string | null;
          commission: number; commission_type: string | null; model: string;
          goal: number | null; product_id: string | null; niche_id: string | null;
          merchant_id: string;
          products: { id: string; name: string; price: number; image_url: string | null; category: string | null } | null;
          merchants: { id: string; name: string; slug: string | null } | null;
          niches: { id: string; name: string } | null;
        };

        // Match score: 100 if niche matches, 50 if seller has no niches (new seller), 10 otherwise
        let matchScore = 10;
        if (c.niche_id && sellerNicheIds.includes(c.niche_id)) {
          matchScore = 100;
        } else if (sellerNicheIds.length === 0) {
          matchScore = 50;
        }

        return {
          campaign_id: c.id,
          campaign_name: c.name,
          campaign_description: c.description,
          commission: c.commission,
          commission_type: c.commission_type,
          model: c.model,
          goal: c.goal,
          product_id: c.product_id,
          product_name: c.products?.name ?? null,
          product_price: c.products?.price ?? null,
          product_image_url: c.products?.image_url ?? null,
          product_category: c.products?.category ?? null,
          merchant_id: c.merchant_id,
          merchant_name: c.merchants?.name ?? 'Boutique',
          merchant_slug: c.merchants?.slug ?? null,
          niche_id: c.niche_id,
          niche_name: c.niches?.name ?? null,
          match_score: matchScore,
          is_joined: joinedIds.includes(c.id),
        };
      });

      // Sort by match score descending
      typed.sort((a, b) => b.match_score - a.match_score);
      setCampaigns(typed);
    } catch (e) {
      setError('Erreur lors du chargement des campagnes');
      setCampaigns([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchDiscovery();
  }, [fetchDiscovery]);

  /**
   * Join a campaign: insert into campaign_sellers + create tracking link
   */
  const joinCampaign = useCallback(async (campaignId: string): Promise<{ error: string | null }> => {
    if (!sellerId) return { error: 'Profil vendeur introuvable' };
    haptic('medium');

    // Insert campaign_sellers
    const { error: joinErr } = await supabase
      .from('campaign_sellers')
      .insert({ campaign_id: campaignId, seller_id: sellerId } as never);

    if (joinErr) {
      haptic('error');
      return { error: joinErr.message };
    }

    // Create tracking link
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const sellerCode = `F-${sellerId.slice(0, 6).toUpperCase()}`;
    const signature = `${token}.${sellerCode}.${campaignId.slice(0, 8)}`;

    await supabase.from('tracking_links').insert({
      seller_id: sellerId,
      campaign_id: campaignId,
      token,
      seller_code: sellerCode,
      signature,
      is_active: true,
      clicks: 0,
    } as never);

    haptic('success');
    // Refetch to update is_joined status
    fetchDiscovery();
    return { error: null };
  }, [sellerId, fetchDiscovery]);

  return { campaigns, loading, error, sellerId, joinCampaign, refetch: fetchDiscovery };
}
