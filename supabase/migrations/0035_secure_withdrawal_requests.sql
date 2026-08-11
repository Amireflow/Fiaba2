-- ============================================================================
-- Fiaba — Migration 0035 : Sécurisation serveur des demandes de retrait
-- ============================================================================
--
-- FAILLE CORRIGÉE
-- ---------------
-- Les demandes de retrait sont insérées directement depuis le navigateur :
--   • vendeur  : insert into payouts  (features/seller/pages/earning-withdraw)
--   • marchand : insert into payments (features/merchant/pages/payment-withdraw)
--
-- Les seules protections étaient :
--   1. une vérification `montant > solde` en JavaScript, contournable en
--      appelant directement l'API REST PostgREST ;
--   2. des politiques RLS qui ne valident que la PROPRIÉTÉ de la ligne :
--        payouts_insert  : with check (public.is_seller(seller_id))
--        payments_insert : with check (public.is_merchant_owner(merchant_id))
--      Elles n'imposent aucune contrainte sur `amount`, `fee_amount`,
--      `net_amount` ni `status`.
--
-- Conséquences exploitables sans aucun outil particulier :
--   • demander un retrait très supérieur au solde réellement gagné ;
--   • fixer soi-même `fee_amount`/`net_amount` pour annuler les frais ;
--   • insérer une ligne directement avec `status = 'paid'` / `'verse'`, la
--     faisant apparaître comme réglée dans les écrans admin et le reporting
--     financier (les politiques UPDATE réservées à l'admin ne protègent pas
--     l'INSERT).
--
-- Correction : des triggers BEFORE INSERT recalculent tout côté serveur. La
-- validation ne dépend plus du client, quel que soit le chemin d'accès utilisé.
-- Le contrôle applicatif en JavaScript est conservé : il reste utile pour
-- afficher un message clair avant l'envoi.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Solde réellement disponible d'un vendeur
--    Commissions libérées, moins les retraits déjà engagés (demandés, en cours
--    ou versés) : un retrait en attente immobilise le solde.
-- ----------------------------------------------------------------------------
create or replace function public.seller_available_balance(p_seller_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0,
    coalesce((
      select sum(amount) from public.commissions
      where seller_id = p_seller_id and status = 'available'
    ), 0)
    - coalesce((
      select sum(amount) from public.payouts
      where seller_id = p_seller_id
        and status in ('requested', 'processing', 'paid')
    ), 0)
  )::integer;
$$;

-- ----------------------------------------------------------------------------
-- 2. Solde réellement disponible d'un marchand
--    Part marchand des commandes livrées, moins les versements déjà engagés.
-- ----------------------------------------------------------------------------
create or replace function public.merchant_available_balance(p_merchant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0,
    coalesce((
      select sum(coalesce(merchant_amount, total_amount))
      from public.orders
      where merchant_id = p_merchant_id and status = 'livree'
    ), 0)
    - coalesce((
      select sum(amount) from public.payments
      where merchant_id = p_merchant_id
        and status in ('en_attente', 'disponible', 'verse')
    ), 0)
  )::integer;
$$;

-- ----------------------------------------------------------------------------
-- 3. Trigger de validation des retraits vendeur
-- ----------------------------------------------------------------------------
create or replace function public.validate_payout_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available   integer;
  v_rule        record;
  v_fee         integer := 0;
  v_percent_fee integer := 0;
begin
  -- Un vendeur ne peut jamais créer une ligne déjà réglée : seul un admin peut
  -- enregistrer un état d'avancement à l'insertion.
  if not public.is_admin() then
    new.status := 'requested';
    new.processed_at := null;
    new.reference := null;
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Le montant du retrait doit être strictement positif.';
  end if;

  -- Contrôle de solde côté serveur (l'admin peut régulariser manuellement).
  if not public.is_admin() then
    v_available := public.seller_available_balance(new.seller_id);
    if new.amount > v_available then
      raise exception
        'Solde insuffisant : montant demandé %, solde disponible %.',
        new.amount, v_available;
    end if;
  end if;

  -- Les frais sont TOUJOURS recalculés depuis la règle active en base : la
  -- valeur envoyée par le client n'est jamais prise en compte.
  select fee_percent, fixed_fee, free_threshold
    into v_rule
  from public.payout_fee_rules
  where is_active = true
  order by created_at desc
  limit 1;

  -- Aucune règle active, ou montant au-dessus du seuil de gratuité : sans frais.
  if not found or new.amount >= v_rule.free_threshold then
    v_fee := 0;
  else
    v_percent_fee := round((new.amount * v_rule.fee_percent) / 100.0);
    v_fee := v_rule.fixed_fee + v_percent_fee;
  end if;

  new.fee_amount := least(v_fee, new.amount);
  new.net_amount := greatest(0, new.amount - new.fee_amount);

  return new;
end;
$$;

drop trigger if exists trg_validate_payout_request on public.payouts;
create trigger trg_validate_payout_request
  before insert on public.payouts
  for each row execute function public.validate_payout_request();

-- ----------------------------------------------------------------------------
-- 4. Trigger de validation des versements marchand
-- ----------------------------------------------------------------------------
create or replace function public.validate_payment_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
begin
  if not public.is_admin() then
    new.status := 'en_attente';
    new.paid_at := null;
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Le montant du versement doit être strictement positif.';
  end if;

  if not public.is_admin() then
    v_available := public.merchant_available_balance(new.merchant_id);
    if new.amount > v_available then
      raise exception
        'Solde insuffisant : montant demandé %, solde disponible %.',
        new.amount, v_available;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_payment_request on public.payments;
create trigger trg_validate_payment_request
  before insert on public.payments
  for each row execute function public.validate_payment_request();

-- ----------------------------------------------------------------------------
-- 5. Droits d'exécution
-- ----------------------------------------------------------------------------
grant execute on function public.seller_available_balance(uuid)   to authenticated;
grant execute on function public.merchant_available_balance(uuid) to authenticated;

comment on function public.validate_payout_request() is
  'Impose côté serveur le statut initial, le contrôle de solde et le recalcul des frais sur toute demande de retrait vendeur.';
comment on function public.validate_payment_request() is
  'Impose côté serveur le statut initial et le contrôle de solde sur toute demande de versement marchand.';
