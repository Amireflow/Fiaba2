-- 0018_audit_fixes_rls.sql
-- Fix RLS policies manquantes identifiées lors de l'audit

-- 1. sponsored_impressions: ajouter policies select + insert (table sans policy)
create policy "sponsored_impressions_select" on public.sponsored_impressions
  for select using (true);

create policy "sponsored_impressions_insert" on public.sponsored_impressions
  for insert with check (true);

-- 2. seller_niches: ajouter policy update manquante
create policy "seller_niches_update" on public.seller_niches
  for update using (
    exists (
      select 1 from public.sellers s
      where s.id = seller_niches.seller_id
      and s.profile_id = auth.uid()
    )
  );

-- 3. product_niches: ajouter policy update manquante
create policy "product_niches_update" on public.product_niches
  for update using (
    exists (
      select 1 from public.products p
      where p.id = product_niches.product_id
      and public.is_merchant_owner(p.merchant_id)
    )
  );
