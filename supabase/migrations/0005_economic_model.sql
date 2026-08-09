-- ============================================================================
-- Fiaba — Migration 0005 : Modèle Économique & Monétisation (Cahier des charges §16, §17)
-- Modèle à 4 sources de revenus : Commission Vente, Abonnements Freemium, Sponsoring, Frais de Retrait
-- ============================================================================

-- ============================================================================
-- 1. NOUVEAUX ENUMS & COMPLÉMENTS
-- ============================================================================

-- Statuts d'abonnement commerçant
create type subscription_status as enum (
  'active',
  'expired',
  'cancelling',
  'past_due'
);

-- Statuts de campagne sponsorisée
create type sponsored_status as enum (
  'active',
  'paused',
  'depleted',
  'suspended'
);

-- ============================================================================
-- 2. MODULE 1 : RÈGLES DE COMMISSION PLATEFORME
-- ============================================================================

create table if not exists public.platform_fee_rules (
  id            uuid primary key default uuid_generate_v4(),
  category      text, -- null = règle par défaut
  rate_percent  numeric(5, 2) not null check (rate_percent >= 0 and rate_percent <= 100),
  fixed_amount  integer not null default 0 check (fixed_amount >= 0),
  is_active     boolean not null default true,
  effective_from timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_pfr_category on public.platform_fee_rules(category);
create index if not exists idx_pfr_active on public.platform_fee_rules(is_active);

-- Altérations sur les commandes pour le snapshot financier immuable
alter table public.orders
  add column if not exists platform_fee_amount integer not null default 0 check (platform_fee_amount >= 0),
  add column if not exists platform_fee_rate numeric(5, 2) default 5.00,
  add column if not exists subscription_plan_id uuid;

-- ============================================================================
-- 3. MODULE 2 : ABONNEMENTS COMMERÇANTS FREEMIUM
-- ============================================================================

create table if not exists public.subscription_plans (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null unique, -- 'Free', 'Premium', etc.
  price_monthly       integer not null default 0 check (price_monthly >= 0),
  max_active_products integer not null default 5,
  max_active_campaigns integer not null default 2,
  platform_fee_rate   numeric(5, 2) not null default 5.00,
  features            jsonb default '[]'::jsonb,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.merchant_subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  plan_id               uuid not null references public.subscription_plans(id) on delete restrict,
  status                subscription_status not null default 'active',
  current_period_start  timestamptz not null default now(),
  current_period_end    timestamptz,
  auto_renew            boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (merchant_id)
);

create index if not exists idx_ms_merchant on public.merchant_subscriptions(merchant_id);
create index if not exists idx_ms_status on public.merchant_subscriptions(status);

create table if not exists public.subscription_invoices (
  id                      uuid primary key default uuid_generate_v4(),
  merchant_subscription_id uuid not null references public.merchant_subscriptions(id) on delete cascade,
  merchant_id             uuid not null references public.merchants(id) on delete cascade,
  amount                  integer not null check (amount >= 0),
  payment_method          text not null default 'wave',
  status                  text not null default 'paid', -- 'paid', 'failed', 'pending'
  paid_at                 timestamptz default now(),
  invoice_url             text,
  created_at              timestamptz not null default now()
);

create index if not exists idx_si_merchant on public.subscription_invoices(merchant_id);

-- ============================================================================
-- 4. MODULE 3 : CAMPAGNES SPONSORISÉES
-- ============================================================================

create table if not exists public.sponsored_campaigns (
  id                    uuid primary key default uuid_generate_v4(),
  campaign_id           uuid not null references public.campaigns(id) on delete cascade,
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  total_budget          integer not null check (total_budget > 0),
  spent_budget          integer not null default 0 check (spent_budget >= 0),
  matching_boost_weight numeric(3, 2) not null default 1.50, -- Boost d'affichage dans Découvrir/Matching
  status                sponsored_status not null default 'active',
  start_date            timestamptz not null default now(),
  end_date              timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (campaign_id)
);

create index if not exists idx_sc_merchant on public.sponsored_campaigns(merchant_id);
create index if not exists idx_sc_status on public.sponsored_campaigns(status);

create table if not exists public.sponsored_impressions (
  id                    uuid primary key default uuid_generate_v4(),
  sponsored_campaign_id uuid not null references public.sponsored_campaigns(id) on delete cascade,
  seller_id             uuid references public.sellers(id) on delete set null,
  impression_context    text default 'matching_feed',
  cost                  integer not null default 0,
  created_at            timestamptz not null default now()
);

create index if not exists idx_si_sponsored_campaign on public.sponsored_impressions(sponsored_campaign_id);

-- ============================================================================
-- 5. MODULE 4 : FRAIS DE RETRAIT VENDEUR
-- ============================================================================

create table if not exists public.payout_fee_rules (
  id              uuid primary key default uuid_generate_v4(),
  fee_percent     numeric(5, 2) not null default 0.00,
  fixed_fee       integer not null default 500 check (fixed_fee >= 0),
  free_threshold  integer not null default 25000 check (free_threshold >= 0), -- Gratuit si montant >= 25 000 FCFA
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Altérations de la table payouts pour enregistrer le snapshot de frais
alter table public.payouts
  add column if not exists fee_amount integer not null default 0 check (fee_amount >= 0),
  add column if not exists net_amount integer;

-- Initialisation de net_amount pour les enregistrements existants
update public.payouts
set net_amount = amount - fee_amount
where net_amount is null;

-- ============================================================================
-- 6. SÉCURITÉ & RLS POLICIES
-- ============================================================================

alter table public.platform_fee_rules enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.merchant_subscriptions enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.sponsored_campaigns enable row level security;
alter table public.sponsored_impressions enable row level security;
alter table public.payout_fee_rules enable row level security;

-- Platform fee rules : lecture publique/authentifiée, écriture admin
create policy "pfr_select" on public.platform_fee_rules for select using (true);
create policy "pfr_all_admin" on public.platform_fee_rules for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Subscription plans : lecture publique, écriture admin
create policy "sp_select" on public.subscription_plans for select using (true);
create policy "sp_all_admin" on public.subscription_plans for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Merchant subscriptions : lecture marchand propriétaire ou admin
create policy "ms_select" on public.merchant_subscriptions for select using (
  exists (select 1 from public.merchants m where m.id = merchant_subscriptions.merchant_id and m.owner_id = auth.uid())
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Subscription invoices : lecture marchand propriétaire ou admin
create policy "si_select" on public.subscription_invoices for select using (
  exists (select 1 from public.merchants m where m.id = subscription_invoices.merchant_id and m.owner_id = auth.uid())
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Sponsored campaigns : lecture authentifiée, modification par le marchand propriétaire ou admin
create policy "sc_select" on public.sponsored_campaigns for select using (true);
create policy "sc_insert_update" on public.sponsored_campaigns for all using (
  exists (select 1 from public.merchants m where m.id = sponsored_campaigns.merchant_id and m.owner_id = auth.uid())
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Payout fee rules : lecture publique, modification admin
create policy "pfrules_select" on public.payout_fee_rules for select using (true);
create policy "pfrules_admin" on public.payout_fee_rules for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
