-- ============================================================================
-- Fiaba — Migration 0015 : RLS & Politiques de Sécurité sur les Commandes Publiques
-- ============================================================================

-- 1. Autoriser l'insertion d'éléments de commande (order_items) pour les acheteurs publics
alter table public.order_items enable row level security;

drop policy if exists "order_items_insert" on public.order_items;
drop policy if exists "order_items_select" on public.order_items;

create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
    )
  );

create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and (
        public.is_admin()
        or public.is_merchant_owner(o.merchant_id)
        or exists (
          select 1 from public.sellers s
          where s.id = o.seller_id and s.profile_id = auth.uid()
        )
      )
    )
  );

-- 2. Permettre l'insertion directe de commandes sans exigence de rôle authentifié
drop policy if exists "orders_insert" on public.orders;

create policy "orders_insert" on public.orders
  for insert with check (
    exists (
      select 1 from public.merchants m
      where m.id = orders.merchant_id and m.is_active = true
    )
  );
