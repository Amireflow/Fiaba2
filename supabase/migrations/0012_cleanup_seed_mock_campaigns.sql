-- ============================================================================
-- Fiaba — Migration 0012 : Nettoyage des Campagnes Fictives de Démonstration (Seed)
-- ============================================================================

-- Suppression des liens de suivi rattachés aux campagnes fictives de démonstration
delete from public.tracking_links
where campaign_id in (
  select id from public.campaigns
  where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille')
);

-- Suppression des adhésions vendeurs rattachées aux campagnes fictives
delete from public.campaign_sellers
where campaign_id in (
  select id from public.campaigns
  where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille')
);

-- Suppression des commissions rattachées aux campagnes fictives
delete from public.commissions
where campaign_id in (
  select id from public.campaigns
  where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille')
);

-- Suppression des campagnes fictives de démonstration
delete from public.campaigns
where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille');
