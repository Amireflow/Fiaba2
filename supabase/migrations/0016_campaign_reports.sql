-- ============================================================================
-- Fiaba — Migration 0016 : Signalement de Campagnes / Produits avec Attribut Vendeur
-- ============================================================================

create table if not exists public.campaign_reports (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid references public.campaigns(id) on delete cascade,
  merchant_id     uuid references public.merchants(id) on delete cascade,
  seller_id       uuid references public.sellers(id) on delete set null,
  seller_code     text,
  reason          text not null,
  details         text,
  reporter_name   text,
  reporter_phone  text,
  status          text not null default 'pending',
  created_at      timestamptz not null default now()
);

-- Ajouter colonnes si la table existait déjà
alter table public.campaign_reports add column if not exists seller_id uuid references public.sellers(id) on delete set null;
alter table public.campaign_reports add column if not exists seller_code text;

-- Index pour requêtes admin rapides
create index if not exists idx_campaign_reports_status on public.campaign_reports(status);
create index if not exists idx_campaign_reports_campaign on public.campaign_reports(campaign_id);
create index if not exists idx_campaign_reports_seller on public.campaign_reports(seller_id);

-- RLS
alter table public.campaign_reports enable row level security;

drop policy if exists "campaign_reports_insert" on public.campaign_reports;
drop policy if exists "campaign_reports_select" on public.campaign_reports;

-- Insertion autorisée pour tout utilisateur (public / client anonyme au checkout)
create policy "campaign_reports_insert" on public.campaign_reports
  for insert with check (true);

-- Lecture réservée aux administrateurs
create policy "campaign_reports_select" on public.campaign_reports
  for select using (public.is_admin());
