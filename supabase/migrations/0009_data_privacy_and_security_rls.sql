-- ============================================================================
-- Fiaba — Migration 0009 : Sécurisation & Cloisonnement Intégral des Données Utilisateurs (RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper : Vérification du rôle Administrateur
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 1b. Politiques RLS sur public.profiles (Autoriser lecture Admin)
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 2. Refonte des Politiques RLS sur public.orders
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;

-- Permet aux commerçants propriétaires, aux vendeurs concernés et aux admins de lire leurs commandes
create policy "orders_select" on public.orders
  for select using (
    public.is_admin()
    or public.is_merchant_owner(merchant_id)
    or exists (
      select 1 from public.sellers s
      where s.id = orders.seller_id and s.profile_id = auth.uid()
    )
  );

-- Permet l'insertion de commande lors du checkout public (clients anonymes ou connectés)
-- vérifiant que la boutique destinataire est bien active
create policy "orders_insert" on public.orders
  for insert with check (
    exists (
      select 1 from public.merchants m
      where m.id = orders.merchant_id and m.is_active = true
    )
    or public.is_merchant_owner(merchant_id)
  );

-- Seuls le commerçant propriétaire de la boutique et les admins peuvent mettre à jour le statut d'une commande
create policy "orders_update" on public.orders
  for update using (
    public.is_admin()
    or public.is_merchant_owner(merchant_id)
  );

-- ----------------------------------------------------------------------------
-- 3. Refonte des Politiques RLS sur public.sellers
-- ----------------------------------------------------------------------------
alter table public.sellers enable row level security;

drop policy if exists "sellers_select" on public.sellers;
drop policy if exists "sellers_update" on public.sellers;

-- Lecture des vendeurs : le vendeur voit son profil, le commerçant voit son réseau, l'admin voit tout, et le public voit les pseudos des vendeurs actifs
create policy "sellers_select" on public.sellers
  for select using (
    public.is_admin()
    or profile_id = auth.uid()
    or public.is_merchant_owner(merchant_id)
    or status = 'actif'
  );

create policy "sellers_update" on public.sellers
  for update using (
    public.is_admin()
    or profile_id = auth.uid()
    or public.is_merchant_owner(merchant_id)
  );

-- ----------------------------------------------------------------------------
-- 4. Refonte des Politiques RLS sur public.commissions
-- ----------------------------------------------------------------------------
alter table public.commissions enable row level security;

drop policy if exists "commissions_select" on public.commissions;

create policy "commissions_select" on public.commissions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.sellers s
      where s.id = commissions.seller_id
      and (s.profile_id = auth.uid() or public.is_merchant_owner(s.merchant_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Refonte des Politiques RLS sur public.delivery_zones
-- ----------------------------------------------------------------------------
alter table public.delivery_zones enable row level security;

drop policy if exists "delivery_zones_select" on public.delivery_zones;

create policy "delivery_zones_select" on public.delivery_zones
  for select using (
    public.is_admin()
    or is_active = true
    or public.is_merchant_owner(merchant_id)
  );

-- ----------------------------------------------------------------------------
-- 6. Refonte des Politiques RLS sur public.notifications
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;

create policy "notifications_select" on public.notifications
  for select using (
    public.is_admin()
    or user_id = auth.uid()
  );
