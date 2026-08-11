-- ============================================================================
-- Fiaba — Migration 0031 : Correction des performances RLS & index composites
-- ============================================================================
--
-- CAUSE RACINE DE LA LENTEUR
-- --------------------------
-- Les trois fonctions helper utilisées par ~163 clauses RLS (is_admin,
-- is_merchant_owner, is_seller) étaient déclarées `language sql security
-- definer` SANS marqueur de volatilité. PostgreSQL considère alors ces
-- fonctions comme VOLATILE, ce qui a deux conséquences majeures :
--
--   1. Le planificateur ne peut ni les inliner ni mettre leur résultat en
--      cache : elles sont ré-exécutées UNE FOIS PAR LIGNE examinée. Sur une
--      table de 10 000 commandes, `is_merchant_owner(merchant_id)` déclenche
--      10 000 sous-requêtes sur `merchants`.
--   2. Une fonction VOLATILE ne peut pas être poussée dans un index scan, ce
--      qui force un sequential scan complet même quand un index existe.
--
-- Les marquer STABLE autorise PostgreSQL à n'évaluer qu'une seule fois par
-- requête. La sémantique de sécurité est strictement identique : ces fonctions
-- ne font que lire des données, sans effet de bord.
--
-- De la même façon, `auth.uid()` est enveloppé dans `(select auth.uid())`
-- afin que PostgreSQL le calcule en InitPlan une seule fois par requête plutôt
-- qu'à chaque ligne (antipattern de performance documenté par Supabase).
--
-- Cette migration ne modifie AUCUNE règle d'accès : les conditions logiques
-- sont rigoureusement les mêmes. Seul le plan d'exécution change.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fonctions helper RLS : STABLE + auth.uid() en InitPlan
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_merchant_owner(merchant_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.merchants
    where id = merchant_uuid and owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_seller(seller_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sellers
    where id = seller_uuid and profile_id = (select auth.uid())
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Helpers additionnels : résoudre l'identité de l'appelant en une fois
--    Évite les EXISTS corrélés répétés dans les policies les plus chaudes.
-- ----------------------------------------------------------------------------

-- Identifiants des boutiques possédées par l'utilisateur courant.
create or replace function public.current_merchant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.merchants where owner_id = (select auth.uid());
$$;

-- Identifiants des profils vendeur rattachés à l'utilisateur courant.
create or replace function public.current_seller_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.sellers where profile_id = (select auth.uid());
$$;

grant execute on function public.is_admin()                to authenticated, anon;
grant execute on function public.is_merchant_owner(uuid)   to authenticated, anon;
grant execute on function public.is_seller(uuid)           to authenticated, anon;
grant execute on function public.current_merchant_ids()    to authenticated;
grant execute on function public.current_seller_ids()      to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Réécriture des policies les plus chaudes
--    `orders` et `commissions` contenaient un EXISTS corrélé sur `sellers`
--    réévalué à chaque ligne. On le remplace par un test d'appartenance à un
--    ensemble calculé une seule fois (InitPlan / hashed SubPlan).
-- ----------------------------------------------------------------------------

drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (
    public.is_admin()
    or public.is_merchant_owner(merchant_id)
    or seller_id in (select public.current_seller_ids())
  );

drop policy if exists "commissions_select" on public.commissions;
create policy "commissions_select" on public.commissions
  for select using (
    public.is_admin()
    or seller_id in (select public.current_seller_ids())
    or exists (
      select 1 from public.sellers s
      where s.id = commissions.seller_id
        and s.merchant_id in (select public.current_merchant_ids())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Index composites alignés sur les requêtes réelles de l'application
--    Les pages filtrent systématiquement par propriétaire PUIS trient par
--    created_at desc. Un index composite permet de servir filtre + tri + LIMIT
--    en un seul parcours d'index, sans étape de tri.
-- ----------------------------------------------------------------------------

-- orders : listes marchand/vendeur triées par date, filtres par statut
create index if not exists idx_orders_merchant_created
  on public.orders(merchant_id, created_at desc);
create index if not exists idx_orders_seller_created
  on public.orders(seller_id, created_at desc);
create index if not exists idx_orders_merchant_status
  on public.orders(merchant_id, status);

-- products : catalogue marchand trié par date, filtre par statut
create index if not exists idx_products_merchant_created
  on public.products(merchant_id, created_at desc);
create index if not exists idx_products_merchant_status
  on public.products(merchant_id, status);

-- campaigns : listes marchand et découverte vendeur
create index if not exists idx_campaigns_merchant_created
  on public.campaigns(merchant_id, created_at desc);
create index if not exists idx_campaigns_status_created
  on public.campaigns(status, created_at desc);

-- commissions : espace gains vendeur (filtre seller + statut + tri date)
create index if not exists idx_commissions_seller_created
  on public.commissions(seller_id, created_at desc);
create index if not exists idx_commissions_seller_status
  on public.commissions(seller_id, status);

-- sellers : réseau du marchand
create index if not exists idx_sellers_merchant_status
  on public.sellers(merchant_id, status);

-- notifications : cloche + liste, toujours filtrées par destinataire et datées
create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

-- payouts : suivi des retraits vendeur
create index if not exists idx_payouts_seller_created
  on public.payouts(seller_id, created_at desc);

-- ledger_entries : reporting financier admin
create index if not exists idx_ledger_created_at
  on public.ledger_entries(created_at desc);
create index if not exists idx_ledger_entry_type
  on public.ledger_entries(entry_type);

-- order_items : jointure systématique depuis les commandes
create index if not exists idx_order_items_order_id
  on public.order_items(order_id);

-- profiles : filtres de l'espace admin (rôle, vérification)
create index if not exists idx_profiles_role
  on public.profiles(role);
create index if not exists idx_profiles_verification_status
  on public.profiles(verification_status);

-- merchants : résolution du slug de boutique côté vitrine publique
create index if not exists idx_merchants_slug
  on public.merchants(slug);

-- campaign_sellers : jointure centrale de l'espace vendeur
create index if not exists idx_campaign_sellers_seller_campaign
  on public.campaign_sellers(seller_id, campaign_id);

-- disputes / fraud : files d'attente de modération admin
create index if not exists idx_disputes_status_created
  on public.disputes(status, created_at desc);
create index if not exists idx_fraud_status_created
  on public.fraud_signals(status, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. Rafraîchir les statistiques du planificateur
-- ----------------------------------------------------------------------------
analyze public.orders;
analyze public.products;
analyze public.campaigns;
analyze public.commissions;
analyze public.sellers;
analyze public.merchants;
analyze public.profiles;
analyze public.notifications;
