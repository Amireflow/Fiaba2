-- ============================================================================
-- Fiaba — Triggers & RLS
-- Migration 0002 : updated_at automatique, profil auto sur signup, RLS policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonction générique updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Appliquer set_updated_at à toutes les tables qui ont updated_at
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles', 'merchants', 'sellers', 'products',
      'campaigns', 'orders', 'deliveries', 'delivery_zones',
      'payments', 'notifications'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%s_updated on public.%s;
       create trigger trg_%s_updated before update on public.%s
       for each row execute function public.set_updated_at();',
      t, t, t, t
    );
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Création automatique d'un profil à l'inscription
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS : activer sur toutes les tables
-- ----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.merchants         enable row level security;
alter table public.sellers           enable row level security;
alter table public.products          enable row level security;
alter table public.campaigns         enable row level security;
alter table public.campaign_sellers  enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.deliveries        enable row level security;
alter table public.delivery_zones    enable row level security;
alter table public.payments          enable row level security;
alter table public.commissions       enable row level security;
alter table public.reviews           enable row level security;
alter table public.notifications     enable row level security;

-- ----------------------------------------------------------------------------
-- Helper : vérifier si l'utilisateur est propriétaire d'un marchand
-- ----------------------------------------------------------------------------
create or replace function public.is_merchant_owner(merchant_uuid uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.merchants
    where id = merchant_uuid and owner_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles : chacun voit et modifie son propre profil
-- ----------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- merchants : owner peut tout ; les vendeurs voient les marchands actifs
-- ----------------------------------------------------------------------------
create policy "merchants_select" on public.merchants
  for select using (is_active or owner_id = auth.uid());

create policy "merchants_insert" on public.merchants
  for insert with check (owner_id = auth.uid());

create policy "merchants_update" on public.merchants
  for update using (owner_id = auth.uid());

create policy "merchants_delete" on public.merchants
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- products : owner du marchand gère ; vendeurs voient les actifs
-- ----------------------------------------------------------------------------
create policy "products_select" on public.products
  for select using (
    status = 'actif'
    or public.is_merchant_owner(merchant_id)
  );

create policy "products_insert" on public.products
  for insert with check (public.is_merchant_owner(merchant_id));

create policy "products_update" on public.products
  for update using (public.is_merchant_owner(merchant_id));

create policy "products_delete" on public.products
  for delete using (public.is_merchant_owner(merchant_id));

-- ----------------------------------------------------------------------------
-- campaigns : owner gère ; vendeurs voient les actives
-- ----------------------------------------------------------------------------
create policy "campaigns_select" on public.campaigns
  for select using (
    status = 'active'
    or public.is_merchant_owner(merchant_id)
  );

create policy "campaigns_insert" on public.campaigns
  for insert with check (public.is_merchant_owner(merchant_id));

create policy "campaigns_update" on public.campaigns
  for update using (public.is_merchant_owner(merchant_id));

create policy "campaigns_delete" on public.campaigns
  for delete using (public.is_merchant_owner(merchant_id));

-- ----------------------------------------------------------------------------
-- sellers : owner gère ; vendeur voit son propre profil
-- ----------------------------------------------------------------------------
create policy "sellers_select" on public.sellers
  for select using (
    profile_id = auth.uid()
    or public.is_merchant_owner(merchant_id)
  );

create policy "sellers_insert" on public.sellers
  for insert with check (public.is_merchant_owner(merchant_id));

create policy "sellers_update" on public.sellers
  for update using (
    profile_id = auth.uid()
    or public.is_merchant_owner(merchant_id)
  );

create policy "sellers_delete" on public.sellers
  for delete using (public.is_merchant_owner(merchant_id));

-- ----------------------------------------------------------------------------
-- campaign_sellers : owner gère ; vendeur voit ses participations
-- ----------------------------------------------------------------------------
create policy "campaign_sellers_select" on public.campaign_sellers
  for select using (
    exists (
      select 1 from public.sellers s
      where s.id = campaign_sellers.seller_id
      and (s.profile_id = auth.uid() or public.is_merchant_owner(s.merchant_id))
    )
  );

create policy "campaign_sellers_insert" on public.campaign_sellers
  for insert with check (
    exists (
      select 1 from public.sellers s
      where s.id = campaign_sellers.seller_id
      and (s.profile_id = auth.uid() or public.is_merchant_owner(s.merchant_id))
    )
  );

create policy "campaign_sellers_delete" on public.campaign_sellers
  for delete using (
    exists (
      select 1 from public.sellers s
      where s.id = campaign_sellers.seller_id
      and public.is_merchant_owner(s.merchant_id)
    )
  );

-- ----------------------------------------------------------------------------
-- orders : owner voit toutes ses commandes ; vendeur voit les siennes
-- ----------------------------------------------------------------------------
create policy "orders_select" on public.orders
  for select using (
    public.is_merchant_owner(merchant_id)
    or exists (
      select 1 from public.sellers s
      where s.id = orders.seller_id and s.profile_id = auth.uid()
    )
  );

create policy "orders_insert" on public.orders
  for insert with check (
    public.is_merchant_owner(merchant_id)
    or exists (
      select 1 from public.sellers s
      where s.id = orders.seller_id and s.profile_id = auth.uid()
    )
  );

create policy "orders_update" on public.orders
  for update using (public.is_merchant_owner(merchant_id));

-- ----------------------------------------------------------------------------
-- order_items : accessible si la commande parente l'est
-- ----------------------------------------------------------------------------
create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and (
        public.is_merchant_owner(o.merchant_id)
        or exists (
          select 1 from public.sellers s
          where s.id = o.seller_id and s.profile_id = auth.uid()
        )
      )
    )
  );

create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and public.is_merchant_owner(o.merchant_id)
    )
  );

-- ----------------------------------------------------------------------------
-- deliveries : liées aux commandes
-- ----------------------------------------------------------------------------
create policy "deliveries_select" on public.deliveries
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = deliveries.order_id
      and (
        public.is_merchant_owner(o.merchant_id)
        or exists (
          select 1 from public.sellers s
          where s.id = o.seller_id and s.profile_id = auth.uid()
        )
      )
    )
  );

create policy "deliveries_update" on public.deliveries
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = deliveries.order_id
      and public.is_merchant_owner(o.merchant_id)
    )
  );

-- ----------------------------------------------------------------------------
-- delivery_zones : owner gère ; vendeurs/clients voient les actives
-- ----------------------------------------------------------------------------
create policy "delivery_zones_select" on public.delivery_zones
  for select using (
    is_active or public.is_merchant_owner(merchant_id)
  );

create policy "delivery_zones_insert" on public.delivery_zones
  for insert with check (public.is_merchant_owner(merchant_id));

create policy "delivery_zones_update" on public.delivery_zones
  for update using (public.is_merchant_owner(merchant_id));

create policy "delivery_zones_delete" on public.delivery_zones
  for delete using (public.is_merchant_owner(merchant_id));

-- ----------------------------------------------------------------------------
-- payments : owner voit ses versements
-- ----------------------------------------------------------------------------
create policy "payments_select" on public.payments
  for select using (public.is_merchant_owner(merchant_id));

create policy "payments_insert" on public.payments
  for insert with check (public.is_merchant_owner(merchant_id));

-- ----------------------------------------------------------------------------
-- commissions : vendeur voit les siennes ; owner voit celles de ses vendeurs
-- ----------------------------------------------------------------------------
create policy "commissions_select" on public.commissions
  for select using (
    exists (
      select 1 from public.sellers s
      where s.id = commissions.seller_id
      and (s.profile_id = auth.uid() or public.is_merchant_owner(s.merchant_id))
    )
  );

-- ----------------------------------------------------------------------------
-- reviews : tout le monde peut voir ; client authentifié peut créer
-- ----------------------------------------------------------------------------
create policy "reviews_select" on public.reviews
  for select using (true);

create policy "reviews_insert" on public.reviews
  for insert with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- notifications : chacun voit les siennes
-- ----------------------------------------------------------------------------
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_delete" on public.notifications
  for delete using (user_id = auth.uid());
