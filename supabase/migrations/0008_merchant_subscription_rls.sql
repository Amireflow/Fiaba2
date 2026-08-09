-- 0008_merchant_subscription_rls.sql
-- Allow merchants to insert/update their own subscriptions and invoices
-- (needed for the merchant subscription upgrade flow)

-- merchant_subscriptions : marchand propriétaire peut insérer et modifier
create policy "ms_insert" on public.merchant_subscriptions
  for insert with check (
    exists (select 1 from public.merchants m where m.id = merchant_subscriptions.merchant_id and m.owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "ms_update" on public.merchant_subscriptions
  for update using (
    exists (select 1 from public.merchants m where m.id = merchant_subscriptions.merchant_id and m.owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "ms_delete" on public.merchant_subscriptions
  for delete using (
    exists (select 1 from public.merchants m where m.id = merchant_subscriptions.merchant_id and m.owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- subscription_invoices : marchand propriétaire peut insérer
create policy "si_insert" on public.subscription_invoices
  for insert with check (
    exists (select 1 from public.merchants m where m.id = subscription_invoices.merchant_id and m.owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
