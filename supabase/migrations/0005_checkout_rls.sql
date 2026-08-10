-- ============================================================================
-- 0005_checkout_rls.sql
-- RLS policies for public checkout flow (anon users can create orders)
-- ============================================================================

-- orders : anon (checkout customers) can insert orders
-- The existing orders_insert requires merchant_owner or seller profile.
-- We add a permissive insert policy for the public checkout flow.
drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public" on public.orders
  for insert with check (true);

-- order_items : anon can insert items for orders they just created
drop policy if exists "order_items_insert_public" on public.order_items;
create policy "order_items_insert_public" on public.order_items
  for insert with check (true);

-- commissions : anon can insert commissions (attribution at checkout)
drop policy if exists "commissions_insert_public" on public.commissions;
create policy "commissions_insert_public" on public.commissions
  for insert with check (true);

-- tracking_links : anon can look up links by token (for validation at checkout)
drop policy if exists "tracking_links_select_public" on public.tracking_links;
create policy "tracking_links_select_public" on public.tracking_links
  for select using (true);

-- tracking_links : anon can update clicks counter (increment on visit)
drop policy if exists "tracking_links_update_public" on public.tracking_links;
create policy "tracking_links_update_public" on public.tracking_links
  for update using (true);
