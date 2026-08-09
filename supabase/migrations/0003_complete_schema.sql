-- ============================================================================
-- Fiaba — Schéma complet V2 (aligné cahier des charges §8-§25)
-- Migration 0003 : enums, tables manquantes, altérations, RLS, seeds
-- ============================================================================

-- ============================================================================
-- 1. NOUVEAUX ENUMS
-- ============================================================================

-- Modèles commerciaux (§11)
create type commission_model as enum ('commission', 'marge');
create type commission_type as enum ('percentage', 'fixed');

-- Statuts de commande étendus (§13 — 15 statuts techniques)
create type order_status_v2 as enum (
  'created',
  'pending_confirmation',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'payment_confirmed',
  'commission_pending',
  'commission_available',
  'cancelled',
  'refused',
  'returned',
  'fraud',
  'disputed'
);

-- Statuts commission/marge (§17)
create type commission_status as enum ('pending', 'available', 'paid', 'reversed');

-- Statuts retrait (§17)
create type payout_status as enum ('requested', 'processing', 'paid', 'refused');

-- Statuts litige (§7.4)
create type dispute_status as enum ('open', 'in_review', 'resolved', 'closed');

-- Antifraude (§24)
create type fraud_severity as enum ('critical', 'high', 'medium');
create type fraud_status as enum ('new', 'in_review', 'blocked', 'ignored');

-- Zones (§9)
create type zone_level as enum ('region', 'department', 'commune');

-- Niches (§8)
create type niche_type as enum ('category', 'sub_niche');

-- Vérification (§7.4)
create type verification_status as enum ('verified', 'pending', 'refused', 'suspended');

-- Événements analytics (§25)
create type analytics_event as enum (
  'signup_started', 'signup_completed', 'niche_selected',
  'product_viewed', 'campaign_viewed', 'campaign_joined',
  'share_clicked', 'tracking_link_clicked', 'zone_coverage_checked',
  'checkout_started', 'order_created', 'order_confirmed',
  'order_shipped', 'order_delivered', 'payment_confirmed',
  'sale_validated', 'commission_created', 'margin_created',
  'payout_requested', 'payout_completed',
  'order_refused', 'order_returned'
);

-- Type de retrait / compte
create type payout_account_type as enum ('wave', 'orange_money', 'bank', 'cash');

-- ============================================================================
-- 2. ALTÉRATIONS TABLES EXISTANTES
-- ============================================================================

-- 2a. profiles : ajouter statut de vérification + trust score
alter table public.profiles
  add column if not exists verification_status verification_status not null default 'pending',
  add column if not exists trust_score integer not null default 50 check (trust_score >= 0 and trust_score <= 100);

-- 2b. campaigns : ajouter modèle, type, produit, objectif, niches
alter table public.campaigns
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists model commission_model not null default 'commission',
  add column if not exists commission_type commission_type not null default 'percentage',
  add column if not exists goal integer,
  add column if not exists niche_id uuid references public.niches(id) on delete set null;

-- 2c. orders : statuts étendus + zone figée + snapshot financier
alter table public.orders
  add column if not exists status_v2 order_status_v2 not null default 'created',
  add column if not exists zone_id uuid,
  add column if not exists zone_name text,
  add column if not exists delivery_fee integer not null default 0,
  add column if not exists payment_method payment_method not null default 'cash',
  add column if not exists seller_price integer,
  add column if not exists merchant_amount integer,
  add column if not exists platform_fee integer not null default 0,
  add column if not exists commission_model commission_model,
  add column if not exists commission_type commission_type,
  add column if not exists commission_rate integer,
  add column if not exists snapshot_product_price integer,
  add column if not exists snapshot_commission_amount integer;

-- 2d. sellers : rendre merchant_id nullable (vendeurs indépendants)
alter table public.sellers
  alter column merchant_id drop not null;

-- 2e. commissions : statut + modèle + période de sécurité
alter table public.commissions
  add column if not exists status commission_status not null default 'pending',
  add column if not exists model commission_model not null default 'commission',
  add column if not exists available_at timestamptz,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversal_reason text;

-- 2f. delivery_zones : lier au référentiel de zones admin
alter table public.delivery_zones
  add column if not exists zone_ref_id uuid references public.zones(id) on delete set null;

-- 2g. notifications : ajouter colonne data (JSON)
alter table public.notifications
  add column if not exists data jsonb;

-- ============================================================================
-- 3. NOUVELLES TABLES
-- ============================================================================

-- 3a. zones — référentiel géographique admin (§9)
create table public.zones (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  level       zone_level not null,
  parent_id   uuid references public.zones(id) on delete cascade,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_zones_parent on public.zones(parent_id);
create index idx_zones_level on public.zones(level);

-- 3b. merchant_zone_coverage — zones couvertes par commerçant (§9.3)
create table public.merchant_zone_coverage (
  id          uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  zone_id     uuid not null references public.zones(id) on delete cascade,
  fee         integer not null default 0 check (fee >= 0),
  free_above  integer,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (merchant_id, zone_id)
);
create index idx_mzc_merchant on public.merchant_zone_coverage(merchant_id);
create index idx_mzc_zone on public.merchant_zone_coverage(zone_id);

-- 3c. niches — catégories et sous-niches (§8)
create table public.niches (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  type        niche_type not null default 'category',
  parent_id   uuid references public.niches(id) on delete cascade,
  tags        text[] default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_niches_parent on public.niches(parent_id);
create index idx_niches_type on public.niches(type);

-- 3d. seller_niches — niches d'un vendeur (§8)
create table public.seller_niches (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  niche_id    uuid not null references public.niches(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (seller_id, niche_id)
);
create index idx_seller_niches_seller on public.seller_niches(seller_id);
create index idx_seller_niches_niche on public.seller_niches(niche_id);

-- 3e. product_niches — niches d'un produit (§8)
create table public.product_niches (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  niche_id    uuid not null references public.niches(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (product_id, niche_id)
);
create index idx_product_niches_product on public.product_niches(product_id);
create index idx_product_niches_niche on public.product_niches(niche_id);

-- 3f. seller_profiles — profil étendu vendeur (§7.3)
create table public.seller_profiles (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  bio         text,
  city        text,
  followers   integer default 0,
  reputation  integer default 50 check (reputation >= 0 and reputation <= 100),
  audience_type text,
  social_links jsonb default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id)
);
create index idx_seller_profiles_profile on public.seller_profiles(profile_id);

-- 3g. tracking_links — liens d'attribution signés (§14)
create table public.tracking_links (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  token       text not null unique,
  seller_code text not null,
  signature   text not null,
  expires_at  timestamptz,
  is_active   boolean not null default true,
  clicks      integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (campaign_id, seller_id)
);
create index idx_tracking_links_seller on public.tracking_links(seller_id);
create index idx_tracking_links_campaign on public.tracking_links(campaign_id);
create index idx_tracking_links_token on public.tracking_links(token);

-- 3h. clicks — tracking des clics (§14, §25)
create table public.clicks (
  id          uuid primary key default uuid_generate_v4(),
  tracking_link_id uuid not null references public.tracking_links(id) on delete cascade,
  ip_address  text,
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);
create index idx_clicks_link on public.clicks(tracking_link_id);
create index idx_clicks_created on public.clicks(created_at);

-- 3i. payouts — retraits vendeurs (§17)
create table public.payouts (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  amount      integer not null check (amount > 0),
  account_type payout_account_type not null default 'wave',
  account_number text,
  status      payout_status not null default 'requested',
  reference   text,
  processed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_payouts_seller on public.payouts(seller_id);
create index idx_payouts_status on public.payouts(status);

-- 3j. ledger_entries — écritures financières immuables (§16, §17)
create table public.ledger_entries (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid references public.sellers(id) on delete set null,
  merchant_id uuid references public.merchants(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,
  commission_id uuid references public.commissions(id) on delete set null,
  payout_id   uuid references public.payouts(id) on delete set null,
  entry_type  text not null,
  amount      integer not null,
  balance_after integer,
  description text,
  created_at  timestamptz not null default now()
);
create index idx_ledger_seller on public.ledger_entries(seller_id);
create index idx_ledger_merchant on public.ledger_entries(merchant_id);
create index idx_ledger_order on public.ledger_entries(order_id);

-- 3k. disputes — litiges (§7.4)
create table public.disputes (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  opened_by   uuid references public.profiles(id) on delete set null,
  party       text not null,
  reason      text not null,
  amount      integer not null default 0,
  status      dispute_status not null default 'open',
  resolution  text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_disputes_order on public.disputes(order_id);
create index idx_disputes_status on public.disputes(status);

-- 3l. fraud_signals — signaux antifraude (§24)
create table public.fraud_signals (
  id          uuid primary key default uuid_generate_v4(),
  signal_type text not null,
  target_user uuid references public.profiles(id) on delete cascade,
  target_order uuid references public.orders(id) on delete cascade,
  detail      text,
  severity    fraud_severity not null default 'medium',
  status      fraud_status not null default 'new',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_fraud_status on public.fraud_signals(status);
create index idx_fraud_target on public.fraud_signals(target_user);

-- 3m. audit_logs — journal d'audit (§22)
create table public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_entity on public.audit_logs(entity_type, entity_id);

-- 3n. country_settings — paramètres plateforme (§7.4)
create table public.country_settings (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  label       text not null,
  value       text not null,
  category    text not null default 'Pays',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3o. analytics_events — tracking produit (§25)
create table public.analytics_events (
  id          uuid primary key default uuid_generate_v4(),
  event_type  analytics_event not null,
  user_id     uuid references public.profiles(id) on delete set null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index idx_events_type on public.analytics_events(event_type);
create index idx_events_user on public.analytics_events(user_id);
create index idx_events_created on public.analytics_events(created_at);

-- ============================================================================
-- 4. TRIGGERS — updated_at sur nouvelles tables
-- ============================================================================
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'zones', 'merchant_zone_coverage', 'niches', 'seller_profiles',
      'tracking_links', 'payouts', 'disputes', 'country_settings'
    ])
  loop
    execute format(
      'create trigger trg_%s_updated before update on public.%s
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- ============================================================================
-- 5. RLS — nouvelles tables
-- ============================================================================
alter table public.zones                  enable row level security;
alter table public.merchant_zone_coverage enable row level security;
alter table public.niches                 enable row level security;
alter table public.seller_niches          enable row level security;
alter table public.product_niches         enable row level security;
alter table public.seller_profiles        enable row level security;
alter table public.tracking_links         enable row level security;
alter table public.clicks                 enable row level security;
alter table public.payouts                enable row level security;
alter table public.ledger_entries         enable row level security;
alter table public.disputes               enable row level security;
alter table public.fraud_signals          enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.country_settings       enable row level security;
alter table public.analytics_events       enable row level security;

-- Helper : vérifier si l'utilisateur est admin
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

-- Helper : vérifier si l'utilisateur est vendeur
create or replace function public.is_seller(seller_uuid uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.sellers
    where id = seller_uuid and profile_id = auth.uid()
  );
$$;

-- zones : tout le monde peut voir les actives ; admin gère
create policy "zones_select" on public.zones
  for select using (is_active or public.is_admin());
create policy "zones_insert" on public.zones
  for insert with check (public.is_admin());
create policy "zones_update" on public.zones
  for update using (public.is_admin());
create policy "zones_delete" on public.zones
  for delete using (public.is_admin());

-- merchant_zone_coverage : owner gère ; vendeurs/clients voient les actives
create policy "mzc_select" on public.merchant_zone_coverage
  for select using (is_active or public.is_merchant_owner(merchant_id));
create policy "mzc_insert" on public.merchant_zone_coverage
  for insert with check (public.is_merchant_owner(merchant_id));
create policy "mzc_update" on public.merchant_zone_coverage
  for update using (public.is_merchant_owner(merchant_id));
create policy "mzc_delete" on public.merchant_zone_coverage
  for delete using (public.is_merchant_owner(merchant_id));

-- niches : tout le monde voit les actives ; admin gère
create policy "niches_select" on public.niches
  for select using (is_active or public.is_admin());
create policy "niches_insert" on public.niches
  for insert with check (public.is_admin());
create policy "niches_update" on public.niches
  for update using (public.is_admin());
create policy "niches_delete" on public.niches
  for delete using (public.is_admin());

-- seller_niches : vendeur voit les siennes ; owner merchant voit celles de ses vendeurs
create policy "seller_niches_select" on public.seller_niches
  for select using (
    public.is_seller(seller_id)
    or exists (
      select 1 from public.sellers s
      where s.id = seller_niches.seller_id
      and public.is_merchant_owner(s.merchant_id)
    )
  );
create policy "seller_niches_insert" on public.seller_niches
  for insert with check (public.is_seller(seller_id));
create policy "seller_niches_delete" on public.seller_niches
  for delete with check (public.is_seller(seller_id));

-- product_niches : owner gère ; vendeurs voient
create policy "product_niches_select" on public.product_niches
  for select using (true);
create policy "product_niches_insert" on public.product_niches
  for insert with check (
    exists (
      select 1 from public.products p
      where p.id = product_niches.product_id
      and public.is_merchant_owner(p.merchant_id)
    )
  );
create policy "product_niches_delete" on public.product_niches
  for delete using (
    exists (
      select 1 from public.products p
      where p.id = product_niches.product_id
      and public.is_merchant_owner(p.merchant_id)
    )
  );

-- seller_profiles : vendeur voit/modifie le sien
create policy "seller_profiles_select" on public.seller_profiles
  for select using (profile_id = auth.uid() or public.is_admin());
create policy "seller_profiles_insert" on public.seller_profiles
  for insert with check (profile_id = auth.uid());
create policy "seller_profiles_update" on public.seller_profiles
  for update using (profile_id = auth.uid() or public.is_admin());

-- tracking_links : vendeur voit les siens ; owner merchant voit ceux de ses campagnes
create policy "tracking_links_select" on public.tracking_links
  for select using (
    public.is_seller(seller_id)
    or exists (
      select 1 from public.campaigns c
      where c.id = tracking_links.campaign_id
      and public.is_merchant_owner(c.merchant_id)
    )
  );
create policy "tracking_links_insert" on public.tracking_links
  for insert with check (
    public.is_seller(seller_id)
    or exists (
      select 1 from public.campaigns c
      where c.id = tracking_links.campaign_id
      and public.is_merchant_owner(c.merchant_id)
    )
  );
create policy "tracking_links_update" on public.tracking_links
  for update using (
    public.is_seller(seller_id)
    or exists (
      select 1 from public.campaigns c
      where c.id = tracking_links.campaign_id
      and public.is_merchant_owner(c.merchant_id)
    )
  );

-- clicks : insérable par tous (tracking), lisible par vendeur/merchant
create policy "clicks_insert" on public.clicks
  for insert with check (true);
create policy "clicks_select" on public.clicks
  for select using (
    exists (
      select 1 from public.tracking_links tl
      where tl.id = clicks.tracking_link_id
      and (
        public.is_seller(tl.seller_id)
        or exists (
          select 1 from public.campaigns c
          where c.id = tl.campaign_id
          and public.is_merchant_owner(c.merchant_id)
        )
      )
    )
  );

-- payouts : vendeur voit/demande les siens ; admin gère
create policy "payouts_select" on public.payouts
  for select using (
    public.is_seller(seller_id) or public.is_admin()
  );
create policy "payouts_insert" on public.payouts
  for insert with check (public.is_seller(seller_id));
create policy "payouts_update" on public.payouts
  for update using (public.is_admin());

-- ledger_entries : vendeur voit les siens ; merchant voit les siens ; admin voit tout
create policy "ledger_select" on public.ledger_entries
  for select using (
    public.is_admin()
    or (seller_id is not null and public.is_seller(seller_id))
    or (merchant_id is not null and public.is_merchant_owner(merchant_id))
  );
create policy "ledger_insert" on public.ledger_entries
  for insert with check (
    public.is_admin()
    or (seller_id is not null and public.is_seller(seller_id))
    or (merchant_id is not null and public.is_merchant_owner(merchant_id))
  );

-- disputes : admin gère ; parties voient
create policy "disputes_select" on public.disputes
  for select using (
    public.is_admin()
    or opened_by = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.id = disputes.order_id
      and (
        public.is_merchant_owner(o.merchant_id)
        or exists (
          select 1 from public.sellers s
          where s.id = o.seller_id and s.profile_id = auth.uid()
        )
      )
    )
  );
create policy "disputes_insert" on public.disputes
  for insert with check (auth.uid() is not null);
create policy "disputes_update" on public.disputes
  for update using (public.is_admin());

-- fraud_signals : admin uniquement
create policy "fraud_select" on public.fraud_signals
  for select using (public.is_admin());
create policy "fraud_insert" on public.fraud_signals
  for insert with check (public.is_admin());
create policy "fraud_update" on public.fraud_signals
  for update using (public.is_admin());

-- audit_logs : admin uniquement
create policy "audit_select" on public.audit_logs
  for select using (public.is_admin());
create policy "audit_insert" on public.audit_logs
  for insert with check (public.is_admin());

-- country_settings : tout le monde voit ; admin gère
create policy "settings_select" on public.country_settings
  for select using (true);
create policy "settings_insert" on public.country_settings
  for insert with check (public.is_admin());
create policy "settings_update" on public.country_settings
  for update using (public.is_admin());
create policy "settings_delete" on public.country_settings
  for delete using (public.is_admin());

-- analytics_events : insérable par utilisateur authentifié ; lisible par admin
create policy "events_insert" on public.analytics_events
  for insert with check (auth.uid() is not null or user_id is null);
create policy "events_select" on public.analytics_events
  for select using (public.is_admin() or user_id = auth.uid());

-- ============================================================================
-- 6. SEEDS — données initiales
-- ============================================================================

-- 6a. Zones du Sénégal — Régions
insert into public.zones (name, level) values
  ('Dakar', 'region'),
  ('Thiès', 'region'),
  ('Saint-Louis', 'region'),
  ('Diourbel', 'region'),
  ('Fatick', 'region'),
  ('Kaffrine', 'region'),
  ('Kaolack', 'region'),
  ('Kédougou', 'region'),
  ('Kolda', 'region'),
  ('Louga', 'region'),
  ('Matam', 'region'),
  ('Sédhiou', 'region'),
  ('Tambacounda', 'region'),
  ('Ziguinchor', 'region')
on conflict do nothing;

-- 6b. Départements de Dakar (couverture pilote prioritaire)
insert into public.zones (name, level, parent_id)
  select d.name, 'department', r.id
  from public.zones r
  cross join (values
    ('Dakar'), ('Pikine'), ('Guédiawaye'), ('Rufisque')
  ) as d(name)
  where r.name = 'Dakar' and r.level = 'region'
on conflict do nothing;

-- 6c. Communes de Dakar (granularité complète pour le pilote)
insert into public.zones (name, level, parent_id)
  select c.name, 'commune', d.id
  from public.zones d
  cross join (values
    ('Plateau'), ('Médina'), ('Fann'), ('Point E'), ('Mermoz'),
    ('Sacré-Cœur'), ('Ouakam'), ('Ngor'), ('Yoff'), ('Liberté 6'),
    ('Parcelles Assainies'), ('Grand Yoff'), ('Cambérène'), ('HLM'),
    ('Pikine Est'), ('Pikine Ouest'), ('Guinaw Rails'), ('Thiaroye'),
    ('Rufisque Est'), ('Rufisque Ouest'), ('Bargny'), ('Diamniadio'),
    ('Almadies'), ('Gorée'), ('Bel Air'), ('Hann Bel-Air')
  ) as c(name)
  where d.name = 'Dakar' and d.level = 'department'
on conflict do nothing;

-- 6d. Départements de Thiès
insert into public.zones (name, level, parent_id)
  select d.name, 'department', r.id
  from public.zones r
  cross join (values
    ('Thiès'), ('Mbour'), ('Tivaouane')
  ) as d(name)
  where r.name = 'Thiès' and r.level = 'region'
on conflict do nothing;

-- 6e. Niches initiales (§8)
insert into public.niches (name, type, tags) values
  ('Tech', 'category', '{"smartphones", "laptop", "accessoires", "gaming"}'),
  ('Mode', 'category', '{"vetements", "chaussures", "accessoires", "sacs"}'),
  ('Beauté', 'category', '{"cosmetiques", "soins", "parfums", "cheveux"}'),
  ('Maison', 'category', '{"decoration", "electromenager", "mobilier"}'),
  ('Food', 'category', '{"epicerie", "boissons", "snacks", "bio"}'),
  ('Sport', 'category', '{"fitness", "running", "mma", "football"}'),
  ('Gaming', 'category', '{"consoles", "jeux", "streaming", "esport"}'),
  ('Bébé', 'category', '{"couche", "vetements", "jouets", "soins"}'),
  ('Éducation', 'category', '{"livres", "formation", "cours", "e-learning"}'),
  ('Luxe', 'category', '{"montres", "bijoux", "maroquinerie"}')
on conflict do nothing;

-- 6f. Sous-niches Tech
insert into public.niches (name, type, parent_id, tags)
  select s.name, 'sub_niche', p.id, s.tags
  from public.niches p
  cross join (values
    ('Smartphones', '{"iphone", "samsung", "xiaomi", "oppo"}'),
    ('Accessoires', '{"coque", "chargeur", "ecouteur", "powerbank"}')
  ) as s(name, tags)
  where p.name = 'Tech' and p.type = 'category'
on conflict do nothing;

-- 6g. Sous-niches Mode
insert into public.niches (name, type, parent_id, tags)
  select s.name, 'sub_niche', p.id, s.tags
  from public.niches p
  cross join (values
    ('Vêtements', '{"homme", "femme", "enfant", "traditionnel"}'),
    ('Chaussures', '{"sneakers", "sandales", "talons", "mocassins"}')
  ) as s(name, tags)
  where p.name = 'Mode' and p.type = 'category'
on conflict do nothing;

-- 6h. Sous-niches Beauté
insert into public.niches (name, type, parent_id, tags)
  select s.name, 'sub_niche', p.id, s.tags
  from public.niches p
  cross join (values
    ('Cosmétiques', '{"maquillage", "teint", "levres", "yeux"}'),
    ('Soins cheveux', '{"tresses", "perruque", "soins", "extensions"}')
  ) as s(name, tags)
  where p.name = 'Beauté' and p.type = 'category'
on conflict do nothing;

-- 6i. Paramètres pays initiaux
insert into public.country_settings (key, label, value, category) values
  ('pays', 'Pays pilote', 'Sénégal', 'Pays'),
  ('devise', 'Devise', 'FCFA', 'Pays'),
  ('frais_plateforme', 'Frais de plateforme (%)', '5', 'Frais'),
  ('periode_securite_jours', 'Période de sécurité (jours)', '7', 'Frais'),
  ('limite_cod', 'Limite COD (FCFA)', '100000', 'Frais'),
  ('wave_api', 'API Wave', 'à configurer', 'Intégration'),
  ('orange_money_api', 'API Orange Money', 'à configurer', 'Intégration'),
  ('whatsapp_business', 'WhatsApp Business', 'à configurer', 'Intégration'),
  ('sms_provider', 'Fournisseur SMS', 'à configurer', 'Intégration')
on conflict (key) do nothing;
