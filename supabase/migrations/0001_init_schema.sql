-- ============================================================================
-- Fiaba — Schéma SQL complet
-- Migration 0001 : enums, tables, contraintes, index
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('marchand', 'vendeur', 'admin');
create type product_status as enum ('actif', 'brouillon', 'epuise');
create type campaign_status as enum ('active', 'en_pause', 'terminee');
create type order_status as enum ('a_preparer', 'en_livraison', 'livree', 'annulee');
create type payment_status as enum ('en_attente', 'disponible', 'verse', 'echoue');
create type payment_method as enum ('wave', 'orange_money', 'cash', 'card');
create type delivery_status as enum ('en_preparation', 'en_cours', 'livree', 'echoue');
create type notification_type as enum ('commande', 'vendeur', 'paiement', 'campagne', 'systeme');
create type seller_status as enum ('invite', 'actif', 'suspendu');

-- ----------------------------------------------------------------------------
-- 1. profiles  (lié à auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role      not null default 'vendeur',
  full_name   text           not null default '',
  phone       text           unique,
  email       text,
  avatar_url  text,
  city        text,
  bio         text,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. merchants  (boutiques)
-- ----------------------------------------------------------------------------
create table public.merchants (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  slug          text not null unique,
  description   text default '',
  logo_url      text,
  phone         text,
  email         text,
  city          text default 'Dakar',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. sellers  (vendeurs affiliés à un marchand)
-- ----------------------------------------------------------------------------
create table public.sellers (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  profile_id    uuid references public.profiles(id) on delete set null,
  display_name  text not null,
  phone         text,
  followers     integer default 0,
  status        seller_status not null default 'invite',
  invited_at    timestamptz not null default now(),
  joined_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (merchant_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- 4. products  (catalogue du marchand)
-- ----------------------------------------------------------------------------
create table public.products (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  name          text not null,
  category      text not null default 'Divers',
  description   text default '',
  price         integer not null check (price >= 0),
  stock         integer not null default 0 check (stock >= 0),
  image_url     text,
  status        product_status not null default 'brouillon',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. campaigns  (campagnes marketing)
-- ----------------------------------------------------------------------------
create table public.campaigns (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  name          text not null,
  description   text default '',
  commission    numeric(5,2) not null default 10 check (commission >= 0 and commission <= 100),
  starts_at     timestamptz,
  ends_at       timestamptz,
  status        campaign_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. campaign_sellers  (vendeurs participants à une campagne)
-- ----------------------------------------------------------------------------
create table public.campaign_sellers (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  seller_id     uuid not null references public.sellers(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  unique (campaign_id, seller_id)
);

-- ----------------------------------------------------------------------------
-- 7. orders  (commandes)
-- ----------------------------------------------------------------------------
create table public.orders (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  seller_id     uuid references public.sellers(id) on delete set null,
  campaign_id   uuid references public.campaigns(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  total_amount  integer not null check (total_amount >= 0),
  commission_amount integer not null default 0 check (commission_amount >= 0),
  status        order_status not null default 'a_preparer',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. order_items  (lignes de commande)
-- ----------------------------------------------------------------------------
create table public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,
  unit_price    integer not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    integer generated always as (unit_price * quantity) stored
);

-- ----------------------------------------------------------------------------
-- 9. delivery_zones  (zones de livraison)
-- ----------------------------------------------------------------------------
create table public.delivery_zones (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  name          text not null,
  fee           integer not null default 0 check (fee >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. deliveries  (livraisons)
-- ----------------------------------------------------------------------------
create table public.deliveries (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  zone_id       uuid references public.delivery_zones(id) on delete set null,
  carrier       text,
  tracking_code text,
  status        delivery_status not null default 'en_preparation',
  fee           integer not null default 0 check (fee >= 0),
  shipped_at    timestamptz,
  delivered_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 11. payments  (versements au marchand)
-- ----------------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default uuid_generate_v4(),
  merchant_id   uuid not null references public.merchants(id) on delete cascade,
  amount        integer not null check (amount >= 0),
  method        payment_method not null default 'wave',
  status        payment_status not null default 'en_attente',
  reference     text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 12. commissions  (rémunération des vendeurs)
-- ----------------------------------------------------------------------------
create table public.commissions (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid not null references public.sellers(id) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete cascade,
  campaign_id   uuid references public.campaigns(id) on delete set null,
  amount        integer not null check (amount >= 0),
  is_paid       boolean not null default false,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (seller_id, order_id)
);

-- ----------------------------------------------------------------------------
-- 13. reviews  (avis clients)
-- ----------------------------------------------------------------------------
create table public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete cascade,
  rating        integer not null check (rating >= 1 and rating <= 5),
  comment       text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 14. notifications  (notifications in-app)
-- ----------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          notification_type not null default 'systeme',
  title         text not null,
  body          text,
  link          text,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Index
-- ----------------------------------------------------------------------------
create index idx_merchants_owner       on public.merchants(owner_id);
create index idx_sellers_merchant      on public.sellers(merchant_id);
create index idx_sellers_profile       on public.sellers(profile_id);
create index idx_products_merchant     on public.products(merchant_id);
create index idx_products_status       on public.products(status);
create index idx_campaigns_merchant    on public.campaigns(merchant_id);
create index idx_campaigns_status      on public.campaigns(status);
create index idx_campaign_sellers_cam  on public.campaign_sellers(campaign_id);
create index idx_campaign_sellers_sel  on public.campaign_sellers(seller_id);
create index idx_orders_merchant       on public.orders(merchant_id);
create index idx_orders_seller         on public.orders(seller_id);
create index idx_orders_status         on public.orders(status);
create index idx_order_items_order     on public.order_items(order_id);
create index idx_deliveries_order      on public.deliveries(order_id);
create index idx_delivery_zones_merch  on public.delivery_zones(merchant_id);
create index idx_payments_merchant     on public.payments(merchant_id);
create index idx_commissions_seller    on public.commissions(seller_id);
create index idx_commissions_order     on public.commissions(order_id);
create index idx_reviews_product       on public.reviews(product_id);
create index idx_notifications_user     on public.notifications(user_id);
create index idx_notifications_unread   on public.notifications(user_id) where is_read = false;
