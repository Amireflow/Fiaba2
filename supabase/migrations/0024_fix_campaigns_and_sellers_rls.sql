-- ============================================================================
-- Fiaba — Migration 0024 : Correction des Politiques RLS (Sellers, Tracking Links, Campaign Sellers, Subscriptions)
-- ============================================================================

-- 1. Refonte complète des politiques RLS sur public.sellers
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers_select" ON public.sellers;
DROP POLICY IF EXISTS "sellers_insert" ON public.sellers;
DROP POLICY IF EXISTS "sellers_update" ON public.sellers;
DROP POLICY IF EXISTS "sellers_delete" ON public.sellers;

CREATE POLICY "sellers_select_v2" ON public.sellers
  FOR SELECT USING (true); -- Accessible pour lecture publique et marketplace

CREATE POLICY "sellers_insert_v2" ON public.sellers
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      profile_id = auth.uid()
      OR (merchant_id IS NOT NULL AND public.is_merchant_owner(merchant_id))
      OR public.is_admin()
    )
  );

CREATE POLICY "sellers_update_v2" ON public.sellers
  FOR UPDATE USING (
    profile_id = auth.uid()
    OR (merchant_id IS NOT NULL AND public.is_merchant_owner(merchant_id))
    OR public.is_admin()
  );

CREATE POLICY "sellers_delete_v2" ON public.sellers
  FOR DELETE USING (
    (merchant_id IS NOT NULL AND public.is_merchant_owner(merchant_id))
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 2. Refonte des politiques RLS sur public.campaign_sellers
-- ----------------------------------------------------------------------------
ALTER TABLE public.campaign_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_sellers_select" ON public.campaign_sellers;
DROP POLICY IF EXISTS "campaign_sellers_insert" ON public.campaign_sellers;
DROP POLICY IF EXISTS "campaign_sellers_delete" ON public.campaign_sellers;

CREATE POLICY "campaign_sellers_select_v2" ON public.campaign_sellers
  FOR SELECT USING (true); -- Accessible pour décompte et vérification d'affiliation

CREATE POLICY "campaign_sellers_insert_v2" ON public.campaign_sellers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = campaign_sellers.seller_id
      AND (
        s.profile_id = auth.uid()
        OR (s.merchant_id IS NOT NULL AND public.is_merchant_owner(s.merchant_id))
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "campaign_sellers_delete_v2" ON public.campaign_sellers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = campaign_sellers.seller_id
      AND (
        s.profile_id = auth.uid()
        OR (s.merchant_id IS NOT NULL AND public.is_merchant_owner(s.merchant_id))
        OR public.is_admin()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Ajout des politiques RLS sur public.tracking_links
-- ----------------------------------------------------------------------------
ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_links_select" ON public.tracking_links;
DROP POLICY IF EXISTS "tracking_links_insert" ON public.tracking_links;
DROP POLICY IF EXISTS "tracking_links_update" ON public.tracking_links;

CREATE POLICY "tracking_links_select_v2" ON public.tracking_links
  FOR SELECT USING (true); -- Public pour résolution de token et checkout

CREATE POLICY "tracking_links_insert_v2" ON public.tracking_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = tracking_links.seller_id
      AND (
        s.profile_id = auth.uid()
        OR (s.merchant_id IS NOT NULL AND public.is_merchant_owner(s.merchant_id))
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "tracking_links_update_v2" ON public.tracking_links
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = tracking_links.seller_id
      AND (
        s.profile_id = auth.uid()
        OR (s.merchant_id IS NOT NULL AND public.is_merchant_owner(s.merchant_id))
        OR public.is_admin()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Politiques RLS sur public.merchant_subscriptions
-- ----------------------------------------------------------------------------
ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ms_select" ON public.merchant_subscriptions;
DROP POLICY IF EXISTS "ms_insert" ON public.merchant_subscriptions;
DROP POLICY IF EXISTS "ms_update" ON public.merchant_subscriptions;

CREATE POLICY "ms_select_v2" ON public.merchant_subscriptions
  FOR SELECT USING (
    public.is_admin()
    OR public.is_merchant_owner(merchant_id)
  );

CREATE POLICY "ms_insert_v2" ON public.merchant_subscriptions
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR public.is_merchant_owner(merchant_id)
  );

CREATE POLICY "ms_update_v2" ON public.merchant_subscriptions
  FOR UPDATE USING (
    public.is_admin()
    OR public.is_merchant_owner(merchant_id)
  );

-- ----------------------------------------------------------------------------
-- 5. Politiques RLS sur seller_niches
-- ----------------------------------------------------------------------------
ALTER TABLE public.seller_niches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_niches_select" ON public.seller_niches;
DROP POLICY IF EXISTS "seller_niches_all" ON public.seller_niches;

CREATE POLICY "seller_niches_select_v2" ON public.seller_niches
  FOR SELECT USING (true);

CREATE POLICY "seller_niches_all_v2" ON public.seller_niches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = seller_niches.seller_id
      AND (s.profile_id = auth.uid() OR public.is_admin())
    )
  );
