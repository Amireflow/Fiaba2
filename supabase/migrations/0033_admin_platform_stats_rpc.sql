-- ============================================================================
-- Fiaba — Migration 0033 : Agrégats plateforme calculés en SQL (espace admin)
-- ============================================================================
--
-- PROBLÈME CORRIGÉ (exactitude ET performance)
-- --------------------------------------------
-- Le tableau de bord admin affichait le « GMV total », les commissions et les
-- frais de plateforme en additionnant côté client les commandes rapatriées.
-- Or cette requête est limitée aux 10 commandes les plus récentes : les
-- montants présentés comme globaux ne portaient donc que sur ces 10 lignes.
-- Les indicateurs financiers de la plateforme étaient faux.
--
-- En parallèle, les compteurs (utilisateurs à vérifier, litiges ouverts,
-- marchands actifs, vendeurs actifs) obligeaient à télécharger l'intégralité
-- des tables profiles, merchants, sellers et disputes juste pour en compter les
-- lignes.
--
-- Cette fonction déplace les deux calculs dans PostgreSQL : les agrégats sont
-- exacts et une seule requête légère remplace quatre tables entières.
-- ============================================================================

create or replace function public.admin_platform_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    -- Agrégats financiers, hors commandes annulées/refusées/remboursées
    'gmv', coalesce((
      select sum(total_amount) from public.orders
      where status not in ('annulee')
    ), 0),
    'commission_total', coalesce((
      select sum(commission_amount) from public.orders
      where status not in ('annulee')
    ), 0),
    'platform_fee_total', coalesce((
      select sum(platform_fee_amount) from public.orders
      where status not in ('annulee')
    ), 0),
    'orders_count', (select count(*) from public.orders),

    -- Compteurs opérationnels
    'pending_verifications', (
      select count(*) from public.profiles where verification_status = 'pending'
    ),
    'open_disputes', (
      select count(*) from public.disputes where status in ('open', 'in_review')
    ),
    'new_fraud', (
      select count(*) from public.fraud_signals where status = 'new'
    ),
    'active_merchants', (
      select count(*) from public.merchants where is_active = true
    ),
    'active_sellers', (
      select count(*) from public.sellers where status = 'actif'
    ),
    'total_merchants', (select count(*) from public.merchants),
    'total_sellers', (select count(*) from public.sellers),
    'total_disputes', (select count(*) from public.disputes),
    'total_profiles', (select count(*) from public.profiles)
  )
  -- Réservé aux administrateurs : la fonction est SECURITY DEFINER et
  -- contourne donc RLS, ce garde-fou est indispensable.
  where public.is_admin();
$$;

revoke all on function public.admin_platform_stats() from public, anon;
grant execute on function public.admin_platform_stats() to authenticated;

comment on function public.admin_platform_stats() is
  'Agrégats financiers et opérationnels de la plateforme pour le tableau de bord admin. Renvoie NULL si l''appelant n''est pas administrateur.';
