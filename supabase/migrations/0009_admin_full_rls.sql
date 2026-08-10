-- 0009_admin_full_rls.sql
-- Add admin read/update access to all core tables that were missing it.
-- The admin console needs to see ALL data across the platform.
-- Existing per-user/merchant policies remain; these ADD admin access via OR.

-- ============================================================================
-- profiles : admin peut voir et modifier tous les profils
-- ============================================================================
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ============================================================================
-- merchants : admin peut voir, modifier, supprimer tous les marchands
-- ============================================================================
create policy "merchants_select_admin" on public.merchants
  for select using (public.is_admin());

create policy "merchants_update_admin" on public.merchants
  for update using (public.is_admin());

create policy "merchants_delete_admin" on public.merchants
  for delete using (public.is_admin());

-- ============================================================================
-- sellers : admin peut voir, modifier, supprimer tous les vendeurs
-- ============================================================================
create policy "sellers_select_admin" on public.sellers
  for select using (public.is_admin());

create policy "sellers_update_admin" on public.sellers
  for update using (public.is_admin());

create policy "sellers_delete_admin" on public.sellers
  for delete using (public.is_admin());

create policy "sellers_insert_admin" on public.sellers
  for insert with check (public.is_admin());

-- ============================================================================
-- products : admin peut voir, modifier, supprimer tous les produits
-- ============================================================================
create policy "products_select_admin" on public.products
  for select using (public.is_admin());

create policy "products_update_admin" on public.products
  for update using (public.is_admin());

create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ============================================================================
-- campaigns : admin peut voir, modifier toutes les campagnes
-- ============================================================================
create policy "campaigns_select_admin" on public.campaigns
  for select using (public.is_admin());

create policy "campaigns_update_admin" on public.campaigns
  for update using (public.is_admin());

-- ============================================================================
-- campaign_sellers : admin peut voir toutes les participations
-- ============================================================================
create policy "campaign_sellers_select_admin" on public.campaign_sellers
  for select using (public.is_admin());

create policy "campaign_sellers_delete_admin" on public.campaign_sellers
  for delete using (public.is_admin());

-- ============================================================================
-- orders : admin peut voir et modifier toutes les commandes
-- ============================================================================
create policy "orders_select_admin" on public.orders
  for select using (public.is_admin());

create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());

-- ============================================================================
-- order_items : admin peut voir tous les items
-- ============================================================================
create policy "order_items_select_admin" on public.order_items
  for select using (public.is_admin());

-- ============================================================================
-- commissions : admin peut voir et modifier toutes les commissions
-- ============================================================================
create policy "commissions_select_admin" on public.commissions
  for select using (public.is_admin());

create policy "commissions_update_admin" on public.commissions
  for update using (public.is_admin());

-- ============================================================================
-- delivery_zones : admin peut voir toutes les zones
-- ============================================================================
create policy "delivery_zones_select_admin" on public.delivery_zones
  for select using (public.is_admin());

create policy "delivery_zones_update_admin" on public.delivery_zones
  for update using (public.is_admin());

-- ============================================================================
-- tracking_links : admin peut voir tous les liens
-- ============================================================================
create policy "tracking_links_select_admin" on public.tracking_links
  for select using (public.is_admin());

-- ============================================================================
-- clicks : admin peut voir tous les clics
-- ============================================================================
create policy "clicks_select_admin" on public.clicks
  for select using (public.is_admin());

-- ============================================================================
-- reviews : admin peut voir et supprimer tous les avis
-- ============================================================================
create policy "reviews_select_admin" on public.reviews
  for select using (public.is_admin());

create policy "reviews_delete_admin" on public.reviews
  for delete using (public.is_admin());

-- ============================================================================
-- payouts : admin peut déjà select/update (0003), ajouter insert
-- ============================================================================
create policy "payouts_insert_admin" on public.payouts
  for insert with check (public.is_admin());

-- ============================================================================
-- disputes : admin peut déjà select/update (0003), ajouter insert/delete
-- ============================================================================
create policy "disputes_insert_admin" on public.disputes
  for insert with check (public.is_admin());

create policy "disputes_delete_admin" on public.disputes
  for delete using (public.is_admin());
