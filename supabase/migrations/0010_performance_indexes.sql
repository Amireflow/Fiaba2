-- ============================================================================
-- Fiaba — Migration 0010 : Indexation Haute Performance & Accélération des Requêtes
-- ============================================================================

-- 1. Indexation de la table orders
create index if not exists idx_orders_merchant_id on public.orders(merchant_id);
create index if not exists idx_orders_seller_id on public.orders(seller_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- 2. Indexation de la table products
create index if not exists idx_products_merchant_id on public.products(merchant_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_category on public.products(category);

-- 3. Indexation de la table campaigns
create index if not exists idx_campaigns_merchant_id on public.campaigns(merchant_id);
create index if not exists idx_campaigns_product_id on public.campaigns(product_id);
create index if not exists idx_campaigns_status on public.campaigns(status);

-- 4. Indexation de la table campaign_sellers
create index if not exists idx_campaign_sellers_seller_id on public.campaign_sellers(seller_id);
create index if not exists idx_campaign_sellers_campaign_id on public.campaign_sellers(campaign_id);

-- 5. Indexation de la table commissions
create index if not exists idx_commissions_seller_id on public.commissions(seller_id);
create index if not exists idx_commissions_campaign_id on public.commissions(campaign_id);
create index if not exists idx_commissions_order_id on public.commissions(order_id);
create index if not exists idx_commissions_status on public.commissions(status);

-- 6. Indexation de la table payouts
create index if not exists idx_payouts_seller_id on public.payouts(seller_id);
create index if not exists idx_payouts_status on public.payouts(status);
create index if not exists idx_payouts_created_at on public.payouts(created_at desc);

-- 7. Indexation de la table tracking_links
create index if not exists idx_tracking_links_token on public.tracking_links(token);
create index if not exists idx_tracking_links_seller_code on public.tracking_links(seller_code);
create index if not exists idx_tracking_links_seller_id on public.tracking_links(seller_id);

-- 8. Indexation de la table sellers & merchants
create index if not exists idx_sellers_profile_id on public.sellers(profile_id);
create index if not exists idx_sellers_merchant_id on public.sellers(merchant_id);
create index if not exists idx_merchants_owner_id on public.merchants(owner_id);

-- 9. Indexation de la table notifications
create index if not exists idx_notifications_user_id on public.notifications(user_id);
