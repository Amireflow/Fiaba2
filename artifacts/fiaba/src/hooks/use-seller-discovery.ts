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
  product_type?: 'physique' | 'digital' | null;
  digital_file_url?: string | null;
  digital_access_instructions?: string | null;
  merchant_id: string;
  merchant_name: string;
  merchant_slug: string | null;
  niche_id: string | null;
  niche_name: string | null;
  match_score: number;
  is_joined: boolean;
};

/**
 * Hook qu'exécute les requêtes de découverte en parallèle (Promise.all)
 * pour un chargement ultrarapide du catalogue vendeurs.
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
      // 1. Exécution simultanée des requêtes initiales (Vendeur, Campagnes, Produits, Profil)
      const [sellerRes, campRes, prodRes, profileRes] = await Promise.all([
        supabase.from('sellers').select('id, city').eq('profile_id', profile.id).maybeSingle(),
        supabase
          .from('campaigns')
          .select(`
            id, name, description, commission, commission_type, model, goal,
            product_id, niche_id, merchant_id,
            products:product_id (id, name, price, image_url, category, type, digital_file_url, digital_access_instructions),
            merchants:merchant_id (id, name, slug),
            niches:niche_id (id, name)
          `)
          .eq('status', 'active'),
        supabase
          .from('products')
          .select(`
            id, name, price, image_url, category, description, type, digital_file_url, digital_access_instructions, merchant_id,
            merchants:merchant_id (id, name, slug)
          `)
          .eq('status', 'actif'),
        supabase.from('profiles').select('city').eq('id', profile.id).maybeSingle(),
      ]);

      const sId = (sellerRes.data as { id: string; city: string | null } | null)?.id ?? null;
      setSellerId(sId);
      const sellerCity = (sellerRes.data as { city: string | null } | null)?.city
        ?? (profileRes.data as { city: string | null } | null)?.city
        ?? null;

      // 2. Exécution simultanée des niches, campagnes rejointes, zones de livraison, et historique ventes
      let sellerNicheIds: string[] = [];
      let joinedIds: string[] = [];
      let joinedProductIds = new Set<string>();
      let merchantZoneMap: Record<string, string[]> = {}; // merchant_id → zone names
      let sellerSalesCount = 0;

      if (sId) {
        const merchantIds = ((campRes.data as any[]) ?? []).map((c) => c.merchant_id);
        const [nicheRes, joinedRes, trackingRes, zonesRes, salesRes] = await Promise.all([
          supabase.from('seller_niches').select('niche_id').eq('seller_id', sId),
          supabase.from('campaign_sellers').select('campaign_id').eq('seller_id', sId),
          supabase.from('tracking_links').select('campaign_id').eq('seller_id', sId),
          merchantIds.length > 0
            ? supabase.from('delivery_zones').select('merchant_id, name').in('merchant_id', merchantIds).eq('is_active', true)
            : Promise.resolve({ data: [] as any[] }),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', sId),
        ]);
        sellerNicheIds = ((nicheRes.data as { niche_id: string }[] | null) ?? []).map((x) => x.niche_id);
        const csIds = ((joinedRes.data as { campaign_id: string }[] | null) ?? []).map((x) => x.campaign_id);
        const tlIds = ((trackingRes.data as { campaign_id: string }[] | null) ?? []).map((x) => x.campaign_id);
        joinedIds = Array.from(new Set([...csIds, ...tlIds]));
        sellerSalesCount = salesRes.count ?? 0;

        if (joinedIds.length > 0) {
          const { data: joinedCamps } = await supabase
            .from('campaigns')
            .select('product_id')
            .in('id', joinedIds);
          (joinedCamps as { product_id: string | null }[] | null)?.forEach((jc) => {
            if (jc.product_id) joinedProductIds.add(jc.product_id);
          });
        }

        // Build merchant → zone names map
        (zonesRes.data as { merchant_id: string; name: string }[] | null)?.forEach((z) => {
          if (!merchantZoneMap[z.merchant_id]) merchantZoneMap[z.merchant_id] = [];
          merchantZoneMap[z.merchant_id].push(z.name.toLowerCase());
        });
      }

      const rawCampaigns = campRes.data ?? [];
      const rawProducts = prodRes.data ?? [];

      const activeCampaignsList = (rawCampaigns as unknown[]).map((row): DiscoveryCampaign => {
        const c = row as {
          id: string; name: string; description: string | null;
          commission: number; commission_type: string | null; model: string;
          goal: number | null; product_id: string | null; niche_id: string | null;
          merchant_id: string;
          products: { id: string; name: string; price: number; image_url: string | null; category: string | null; type?: 'physique' | 'digital' | null; digital_file_url?: string | null; digital_access_instructions?: string | null } | null;
          merchants: { id: string; name: string; slug: string | null } | null;
          niches: { id: string; name: string } | null;
        };

        // ── Matching engine (CDC §10) ──
        let matchScore = 10;

        // Factor 1: Niche compatibility (40 points max)
        if (c.niche_id && sellerNicheIds.includes(c.niche_id)) {
          matchScore += 40;
        } else if (sellerNicheIds.length === 0) {
          matchScore += 15; // New seller, neutral
        }

        // Factor 2: Zone compatibility (30 points max)
        const merchantZones = merchantZoneMap[c.merchant_id] ?? [];
        if (sellerCity && merchantZones.length > 0) {
          const cityLower = sellerCity.toLowerCase();
          if (merchantZones.some((z) => z.includes(cityLower) || cityLower.includes(z))) {
            matchScore += 30;
          }
        } else if (merchantZones.length === 0) {
          matchScore += 10; // No zone restriction
        }

        // Factor 3: Performance history (15 points max)
        if (sellerSalesCount > 10) matchScore += 15;
        else if (sellerSalesCount > 3) matchScore += 10;
        else if (sellerSalesCount > 0) matchScore += 5;

        // Factor 4: Commission level (15 points max) — higher commission = more attractive
        const isFixed = c.commission_type === 'fixed' || c.model === 'marge' || (!c.commission_type && c.commission >= 100);
        const commissionPct = isFixed && c.products?.price
          ? (c.commission / c.products.price) * 100
          : c.commission;
        if (commissionPct >= 15) matchScore += 15;
        else if (commissionPct >= 10) matchScore += 10;
        else if (commissionPct >= 5) matchScore += 5;

        matchScore = Math.min(100, matchScore);

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
          product_type: c.products?.type ?? 'physique',
          digital_file_url: c.products?.digital_file_url ?? null,
          digital_access_instructions: c.products?.digital_access_instructions ?? null,
          merchant_id: c.merchant_id,
          merchant_name: c.merchants?.name ?? 'Boutique',
          merchant_slug: c.merchants?.slug ?? null,
          niche_id: c.niche_id,
          niche_name: c.niches?.name ?? null,
          match_score: matchScore,
          is_joined: joinedIds.includes(c.id) || (c.product_id ? joinedProductIds.has(c.product_id) : false),
        };
      });

      // 3. Synthèse ultra-rapide des produits actifs n'ayant pas encore de campagne explicite
      const existingProductIds = new Set(
        activeCampaignsList.map((c) => c.product_id).filter(Boolean)
      );

      const syntheticCampaigns: DiscoveryCampaign[] = (rawProducts as any[])
        .filter((p) => !existingProductIds.has(p.id))
        .map((p) => {
          const compId = `prod-camp-${p.id}`;

          // Apply same matching factors for synthetic campaigns
          let synthScore = 10;
          // Niche: match by category if seller has niches
          if (sellerNicheIds.length === 0) synthScore += 15;
          // Zone
          const merchantZones = merchantZoneMap[p.merchant_id] ?? [];
          if (sellerCity && merchantZones.length > 0) {
            const cityLower = sellerCity.toLowerCase();
            if (merchantZones.some((z) => z.includes(cityLower) || cityLower.includes(z))) {
              synthScore += 30;
            }
          } else if (merchantZones.length === 0) {
            synthScore += 10;
          }
          // Performance
          if (sellerSalesCount > 10) synthScore += 15;
          else if (sellerSalesCount > 3) synthScore += 10;
          else if (sellerSalesCount > 0) synthScore += 5;
          // Commission (default 10% for synthetic)
          synthScore += 10;
          synthScore = Math.min(100, synthScore);

          return {
            campaign_id: compId,
            campaign_name: `Offre ${p.name}`,
            campaign_description: p.description || `Recommandez ${p.name} auprès de vos proches.`,
            commission: 10,
            commission_type: 'percentage',
            model: 'commission',
            goal: 50,
            product_id: p.id,
            product_name: p.name,
            product_price: p.price,
            product_image_url: p.image_url,
            product_category: p.category,
            product_type: p.type ?? 'physique',
            digital_file_url: p.digital_file_url ?? null,
            digital_access_instructions: p.digital_access_instructions ?? null,
            merchant_id: p.merchant_id,
            merchant_name: p.merchants?.name ?? 'Boutique',
            merchant_slug: p.merchants?.slug ?? null,
            niche_id: null,
            niche_name: p.category ?? 'Général',
            match_score: synthScore,
            is_joined: joinedIds.includes(compId) || (p.id ? joinedProductIds.has(p.id) : false),
          };
        });

      const combined = [...activeCampaignsList, ...syntheticCampaigns];
      combined.sort((a, b) => b.match_score - a.match_score);
      setCampaigns(combined);
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
   * Rejoint une campagne avec mise à jour optimiste et création rapide du lien de suivi.
   */
  const joinCampaign = useCallback(async (campaignId: string): Promise<{ error: string | null }> => {
    if (!sellerId) return { error: 'Profil vendeur introuvable' };
    haptic('medium');

    let targetCampaignId = campaignId;

    // Mise à jour optimiste instantanée (0ms)
    setCampaigns((prev) =>
      prev.map((c) => (c.campaign_id === campaignId ? { ...c, is_joined: true } : c))
    );

    if (campaignId.startsWith('prod-camp-')) {
      const productId = campaignId.replace('prod-camp-', '');
      const { data: prod } = await supabase
        .from('products')
        .select('name, description, merchant_id')
        .eq('id', productId)
        .single();

      if (prod) {
        const { data: newCamp } = await supabase
          .from('campaigns')
          .insert({
            merchant_id: (prod as any).merchant_id,
            product_id: productId,
            name: `Offre ${(prod as any).name}`,
            description: (prod as any).description || `Recommandez ${(prod as any).name}`,
            commission: 10,
            commission_type: 'percentage',
            model: 'commission',
            status: 'active',
          } as never)
          .select('id')
          .single();

        if (newCamp) {
          targetCampaignId = (newCamp as any).id;
        }
      }
    }

    const { error: joinErr } = await supabase
      .from('campaign_sellers')
      .insert({ campaign_id: targetCampaignId, seller_id: sellerId } as never);

    if (joinErr && !joinErr.message.includes('unique constraint')) {
      haptic('error');
      // Annulation de la mise à jour optimiste en cas d'échec
      setCampaigns((prev) =>
        prev.map((c) => (c.campaign_id === campaignId ? { ...c, is_joined: false } : c))
      );
      return { error: joinErr.message };
    }

    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const sellerCode = `F-${sellerId.slice(0, 6).toUpperCase()}`;
    const signature = `${token}.${sellerCode}.${targetCampaignId.slice(0, 8)}`;

    await supabase.from('tracking_links').insert({
      seller_id: sellerId,
      campaign_id: targetCampaignId,
      token,
      seller_code: sellerCode,
      signature,
      is_active: true,
      clicks: 0,
    } as never);

    haptic('success');
    fetchDiscovery();
    return { error: null };
  }, [sellerId]);

  return { campaigns, loading, error, sellerId, joinCampaign, refetch: fetchDiscovery };
}
