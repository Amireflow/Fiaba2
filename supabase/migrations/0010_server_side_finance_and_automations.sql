-- 0010_server_side_finance_and_automations.sql
-- ============================================================================
-- P1: SÉCURITÉ FINANCIÈRE — RPC calcul server-side + triggers ledger/commission
-- P2: AUTOMATISATIONS — notifications, audit, fraude
-- ============================================================================

-- ============================================================================
-- 1. RPC: calculate_order_total
--    Calcul server-side du prix total, commission, frais de livraison, frais plateforme
--    Le navigateur ne JAMAIS déterminer le montant final (CDC §23)
-- ============================================================================
create or replace function public.calculate_order_total(
  p_campaign_id uuid,
  p_quantity integer,
  p_zone_id uuid default null,
  p_seller_id uuid default null,
  p_seller_price integer default null  -- pour modèle marge (prix de vente du vendeur)
)
returns table(
  product_price integer,
  subtotal integer,
  delivery_fee integer,
  commission_amount integer,
  platform_fee_amount integer,
  platform_fee_rate numeric,
  merchant_amount integer,
  total_amount integer,
  model commission_model,
  commission_type commission_type,
  commission_rate integer,
  seller_attributed boolean
)
language plpgsql
security definer
as $$
declare
  v_campaign record;
  v_product record;
  v_zone_fee integer := 0;
  v_commission integer := 0;
  v_platform_fee_rate numeric := 5.00;
  v_platform_fee integer := 0;
  v_merchant_amount integer := 0;
  v_total integer := 0;
  v_subtotal integer := 0;
  v_effective_price integer;
  v_seller_attributed boolean := false;
  v_sub record;
  v_plan record;
begin
  -- Fetch campaign + product
  select c.commission, c.commission_type, c.model, c.product_id, c.merchant_id,
         p.price, p.name
  into v_campaign
  from public.campaigns c
  left join public.products p on p.id = c.product_id
  where c.id = p_campaign_id and c.status = 'active';

  if not found then
    raise exception 'Campaign not found or inactive';
  end if;

  v_product.price := v_campaign.price;
  v_effective_price := coalesce(p_seller_price, v_campaign.price);

  -- Modèle marge: prix vendeur >= prix commerçant (CDC §11.2)
  if v_campaign.model = 'marge' and p_seller_price is not null then
    if p_seller_price < v_campaign.price then
      raise exception 'Seller price cannot be lower than merchant price (model marge)';
    end if
    v_effective_price := p_seller_price;
  end if;

  v_subtotal := v_effective_price * p_quantity;

  -- Fetch delivery zone fee
  if p_zone_id is not null then
    select dz.fee into v_zone_fee
    from public.delivery_zones dz
    where dz.id = p_zone_id and dz.merchant_id = v_campaign.merchant_id and dz.is_active = true;
    if not found then
      v_zone_fee := 0;
    end if
  end if;

  -- Determine platform fee rate from merchant's subscription plan
  select sp.platform_fee_rate into v_plan
  from public.merchant_subscriptions ms
  join public.subscription_plans sp on sp.id = ms.plan_id
  where ms.merchant_id = v_campaign.merchant_id and ms.status = 'active';
  if found then
    v_platform_fee_rate := v_plan.platform_fee_rate;
  else
    -- Default platform fee rule
    select pfr.rate_percent into v_platform_fee_rate
    from public.platform_fee_rules pfr
    where pfr.is_active = true and pfr.category is null
    order by pfr.effective_from desc limit 1;
    if not found then
      v_platform_fee_rate := 5.00;
    end if
  end if;

  v_platform_fee := round(v_subtotal * v_platform_fee_rate / 100);

  -- Calculate commission if seller attributed
  if p_seller_id is not null then
    v_seller_attributed := true;
    if v_campaign.model = 'marge' and p_seller_price is not null then
      -- Marge = prix vendeur - prix commerçant
      v_commission := (p_seller_price - v_campaign.price) * p_quantity;
      if v_commission < 0 then
        v_commission := 0;
      end if
    elsif v_campaign.commission_type = 'fixed' then
      v_commission := v_campaign.commission * p_quantity;
    else
      -- Percentage
      v_commission := round(v_subtotal * v_campaign.commission / 100);
    end if
  end if;

  v_total := v_subtotal + v_zone_fee;
  v_merchant_amount := v_subtotal - v_commission - v_platform_fee;
  if v_merchant_amount < 0 then
    v_merchant_amount := 0;
  end if

  return query select
    v_campaign.price,
    v_subtotal,
    v_zone_fee,
    v_commission,
    v_platform_fee,
    v_platform_fee_rate,
    v_merchant_amount,
    v_total,
    v_campaign.model,
    v_campaign.commission_type,
    v_campaign.commission,
    v_seller_attributed;
end;
$$;

-- Allow authenticated users to call the RPC
grant execute on function public.calculate_order_total to authenticated;

-- ============================================================================
-- 2. TRIGGER: auto_create_commission_on_order
--    Crée la commission automatiquement après insertion de commande
--    si un vendeur est attribué (CDC §14, §16)
-- ============================================================================
create or replace function public.auto_create_commission()
returns trigger
language plpgsql
security definer
as $$
declare
  v_available_at timestamptz;
begin
  if new.seller_id is not null and new.commission_amount > 0 then
    -- Check if commission already exists (idempotence)
    if not exists (select 1 from public.commissions where order_id = new.id and seller_id = new.seller_id) then
      v_available_at := now() + interval '14 days';
      insert into public.commissions (seller_id, order_id, campaign_id, amount, status, model, available_at)
      values (
        new.seller_id,
        new.id,
        new.campaign_id,
        new.commission_amount,
        'pending',
        coalesce(new.commission_model, 'commission'),
        v_available_at
      );
    end if
  end if
  return new;
end;
$$;

drop trigger if exists trg_auto_commission on public.orders;
create trigger trg_auto_commission
  after insert on public.orders
  for each row execute function public.auto_create_commission();

-- ============================================================================
-- 3. TRIGGER: auto_ledger_on_order_status
--    Écritures du Grand Livre sur changement de statut commande (CDC §16)
-- ============================================================================
create or replace function public.auto_ledger_on_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status_v2 is distinct from old.status_v2 then
    -- Commission disponible → écriture COMMISSION
    if new.status_v2 = 'commission_available' then
      insert into public.ledger_entries (seller_id, order_id, entry_type, amount, description)
      values (
        new.seller_id,
        new.id,
        'COMMISSION',
        new.commission_amount,
        'Commission vendeur validée — commande #' || new.id
      );
      insert into public.ledger_entries (merchant_id, order_id, entry_type, amount, description)
      values (
        new.merchant_id,
        new.id,
        'PLATFORM_FEE',
        coalesce(new.platform_fee, 0),
        'Commission plateforme — commande #' || new.id
      );
    end if

    -- Annulation → écriture compensatoire
    if new.status_v2 in ('cancelled', 'refused', 'returned') then
      insert into public.ledger_entries (seller_id, order_id, entry_type, amount, description)
      values (
        new.seller_id,
        new.id,
        'PLATFORM_FEE_REVERSAL',
        -abs(new.commission_amount),
        'Annulation commission — commande #' || new.id
      );
    end if
  end if
  return new;
end;
$$;

drop trigger if exists trg_ledger_status on public.orders;
create trigger trg_ledger_status
  after update of status_v2 on public.orders
  for each row execute function public.auto_ledger_on_status();

-- ============================================================================
-- 4. TRIGGER: auto_ledger_on_payout
--    Écriture PAYOUT_FEE sur retrait traité (CDC §16)
-- ============================================================================
create or replace function public.auto_ledger_on_payout()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status and new.status = 'paid' then
    -- Écriture frais de retrait
    if coalesce(new.fee_amount, 0) > 0 then
      insert into public.ledger_entries (seller_id, payout_id, entry_type, amount, description)
      values (
        new.seller_id,
        new.id,
        'PAYOUT_FEE',
        new.fee_amount,
        'Frais de retrait — payout #' || new.id
      );
    end if
    -- Écriture retrait
    insert into public.ledger_entries (seller_id, payout_id, entry_type, amount, description)
    values (
      new.seller_id,
      new.id,
      'PAYOUT',
      coalesce(new.net_amount, new.amount),
      'Retrait vendeur — payout #' || new.id
    );
  end if
  return new;
end;
$$;

drop trigger if exists trg_ledger_payout on public.payouts;
create trigger trg_ledger_payout
  after update of status on public.payouts
  for each row execute function public.auto_ledger_on_payout();

-- ============================================================================
-- 5. TRIGGER: auto_notification_on_order
--    Notifications automatiques sur changement de statut commande (CDC §18)
-- ============================================================================
create or replace function public.auto_notify_order()
returns trigger
language plpgsql
security definer
as $$
declare
  v_merchant_owner uuid;
  v_seller_profile uuid;
  v_notif_type notification_type;
  v_title text;
  v_body text;
begin
  if new.status_v2 is distinct from old.status_v2 then
    -- Get merchant owner
    select m.owner_id into v_merchant_owner from public.merchants m where m.id = new.merchant_id;
    -- Get seller profile
    select s.profile_id into v_seller_profile from public.sellers s where s.id = new.seller_id;

    case new.status_v2
      when 'created' then
        v_notif_type := 'commande'; v_title := 'Nouvelle commande'; v_body := 'Commande #' || new.id;
      when 'confirmed' then
        v_notif_type := 'commande'; v_title := 'Commande confirmée'; v_body := 'Le client a confirmé la commande #' || new.id;
      when 'shipped' then
        v_notif_type := 'commande'; v_title := 'Commande expédiée'; v_body := 'La commande #' || new.id || ' a été expédiée';
      when 'out_for_delivery' then
        v_notif_type := 'commande'; v_title := 'Commande en livraison'; v_body := 'La commande #' || new.id || ' est en cours de livraison';
      when 'delivered' then
        v_notif_type := 'commande'; v_title := 'Commande livrée'; v_body := 'La commande #' || new.id || ' a été livrée';
      when 'payment_confirmed' then
        v_notif_type := 'paiement'; v_title := 'Paiement confirmé'; v_body := 'Paiement confirmé pour la commande #' || new.id;
      when 'commission_pending' then
        v_notif_type := 'paiement'; v_title := 'Commission en attente'; v_body := 'Votre commission pour la commande #' || new.id || ' est en période de sécurité';
      when 'commission_available' then
        v_notif_type := 'paiement'; v_title := 'Commission disponible'; v_body := 'Votre commission pour la commande #' || new.id || ' est maintenant disponible';
      when 'cancelled' then
        v_notif_type := 'commande'; v_title := 'Commande annulée'; v_body := 'La commande #' || new.id || ' a été annulée';
      when 'refused' then
        v_notif_type := 'commande'; v_title := 'Commande refusée'; v_body := 'La commande #' || new.id || ' a été refusée à la livraison';
      when 'returned' then
        v_notif_type := 'commande'; v_title := 'Commande retournée'; v_body := 'La commande #' || new.id || ' a été retournée';
      when 'fraud' then
        v_notif_type := 'fraude'; v_title := 'Commande bloquée'; v_body := 'La commande #' || new.id || ' a été bloquée pour suspicion de fraude';
      when 'disputed' then
        v_notif_type := 'commande'; v_title := 'Litige ouvert'; v_body := 'Un litige a été ouvert sur la commande #' || new.id;
      else
        return new;
    end case;

    -- Notify merchant owner
    if v_merchant_owner is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_merchant_owner, v_notif_type, v_title, v_body, '/merchant/orders');
    end if

    -- Notify seller (if attributed and different from merchant)
    if v_seller_profile is not null and v_seller_profile is distinct from v_merchant_owner then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_seller_profile, v_notif_type, v_title, v_body, '/seller/sales');
    end if
  end if
  return new;
end;
$$;

drop trigger if exists trg_notify_order on public.orders;
create trigger trg_notify_order
  after update of status_v2 on public.orders
  for each row execute function public.auto_notify_order();

-- ============================================================================
-- 6. TRIGGER: auto_notification_on_order_insert
--    Notification à la création de commande (CDC §18)
-- ============================================================================
create or replace function public.auto_notify_order_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  v_merchant_owner uuid;
begin
  select m.owner_id into v_merchant_owner from public.merchants m where m.id = new.merchant_id;
  if v_merchant_owner is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_merchant_owner, 'commande', 'Nouvelle commande', 'Commande #' || new.id || ' — ' || new.customer_name, '/merchant/orders');
  end if
  return new;
end;
$$;

drop trigger if exists trg_notify_order_insert on public.orders;
create trigger trg_notify_order_insert
  after insert on public.orders
  for each row execute function public.auto_notify_order_insert();

-- ============================================================================
-- 7. TRIGGER: auto_notification_on_payout
--    Notifications sur retrait (CDC §18)
-- ============================================================================
create or replace function public.auto_notify_payout()
returns trigger
language plpgsql
security definer
as $$
declare
  v_seller_profile uuid;
  v_title text;
  v_body text;
begin
  if new.status is distinct from old.status then
    select s.profile_id into v_seller_profile from public.sellers s where s.id = new.seller_id;

    case new.status
      when 'requested' then
        v_title := 'Retrait demandé'; v_body := 'Votre demande de retrait est en cours de traitement';
      when 'processing' then
        v_title := 'Retrait en traitement'; v_body := 'Votre retrait est en cours de transfert';
      when 'paid' then
        v_title := 'Retrait effectué'; v_body := 'Votre retrait a été versé avec succès';
      when 'refused' then
        v_title := 'Retrait refusé'; v_body := 'Votre demande de retrait a été refusée';
      else return new;
    end case;

    if v_seller_profile is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_seller_profile, 'paiement', v_title, v_body, '/seller/earnings');
    end if
  end if
  return new;
end;
$$;

drop trigger if exists trg_notify_payout on public.payouts;
create trigger trg_notify_payout
  after update of status on public.payouts
  for each row execute function public.auto_notify_payout();

-- ============================================================================
-- 8. TRIGGER: auto_audit_order_status
--    Journal d'audit sur changement de statut commande (CDC §22)
-- ============================================================================
create or replace function public.auto_audit_order()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status_v2 is distinct from old.status_v2 then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      null, -- system trigger; actor tracked by app-level RLS context
      'order_status_changed',
      'order',
      new.id,
      jsonb_build_object('old_status', old.status_v2, 'new_status', new.status_v2, 'order_id', new.id)
    );
  end if
  return new;
end;
$$;

drop trigger if exists trg_audit_order on public.orders;
create trigger trg_audit_order
  after update of status_v2 on public.orders
  for each row execute function public.auto_audit_order();

-- ============================================================================
-- 9. TRIGGER: auto_audit_payout_status
--    Journal d'audit sur changement de statut retrait (CDC §22)
-- ============================================================================
create or replace function public.auto_audit_payout()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      null,
      'payout_status_changed',
      'payout',
      new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status, 'amount', new.amount)
    );
  end if
  return new;
end;
$$;

drop trigger if exists trg_audit_payout on public.payouts;
create trigger trg_audit_payout
  after update of status on public.payouts
  for each row execute function public.auto_audit_payout();

-- ============================================================================
-- 10. TRIGGER: auto_audit_profile_verification
--     Journal d'audit sur changement de vérification profil (CDC §22)
-- ============================================================================
create or replace function public.auto_audit_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      null,
      'profile_verification_changed',
      'profile',
      new.id,
      jsonb_build_object('old_status', old.verification_status, 'new_status', new.verification_status, 'user_id', new.id)
    );
  end if
  return new;
end;
$$;

drop trigger if exists trg_audit_profile on public.profiles;
create trigger trg_audit_profile
  after update of verification_status on public.profiles
  for each row execute function public.auto_audit_profile();

-- ============================================================================
-- 11. TRIGGER: auto_fraud_detection
--     Détection antifraude automatique (CDC §24)
--     - Auto-commande (même téléphone client que vendeur)
--     - Volume anormal (trop de commandes en peu de temps)
-- ============================================================================
create or replace function public.auto_fraud_on_order()
returns trigger
language plpgsql
security definer
as $$
declare
  v_seller_profile text;
  v_count_1h integer;
begin
  -- Check: auto-commande (client phone matches seller phone)
  if new.seller_id is not null and new.customer_phone is not null then
    select s.phone into v_seller_profile from public.sellers s where s.id = new.seller_id;
    if v_seller_profile = new.customer_phone then
      insert into public.fraud_signals (target_user, signal_type, severity, description, status)
      values (
        new.seller_id::text,
        'auto_order',
        'high',
        'Auto-commande détectée: le téléphone client correspond au téléphone du vendeur',
        'new'
      );
    end if
  end if

  -- Check: volume anormal (plus de 10 commandes en 1h pour même marchand)
  select count(*) into v_count_1h
  from public.orders
  where merchant_id = new.merchant_id
    and created_at > now() - interval '1 hour';

  if v_count_1h > 10 then
    insert into public.fraud_signals (target_user, signal_type, severity, description, status)
    values (
      new.merchant_id::text,
      'abnormal_volume',
      'medium',
      'Volume anormal: ' || v_count_1h || ' commandes en 1h pour le marchand',
      'new'
    );
  end if

  return new;
end;
$$;

drop trigger if exists trg_fraud_order on public.orders;
create trigger trg_fraud_order
  after insert on public.orders
  for each row execute function public.auto_fraud_on_order();

-- ============================================================================
-- 12. TRIGGER: auto_release_commission
--     Libère automatiquement les commissions après la période de sécurité
--     (status pending → available quand available_at est passé)
-- ============================================================================
create or replace function public.auto_release_commissions()
returns void
language plpgsql
security definer
as $$
begin
  -- Update commissions whose safety period has elapsed
  update public.commissions
  set status = 'available'
  where status = 'pending'
    and available_at is not null
    and available_at <= now();

  -- Update corresponding orders to commission_available
  update public.orders
  set status_v2 = 'commission_available'
  where status_v2 = 'commission_pending'
    and exists (
      select 1 from public.commissions c
      where c.order_id = orders.id and c.status = 'available'
    );
end;
$$;

-- Allow admins to call the release function
grant execute on function public.auto_release_commissions to authenticated;

-- ============================================================================
-- 13. RLS: Allow triggers (security definer) to insert into all tables
--     The triggers use SECURITY DEFINER so they bypass RLS.
--     No additional policies needed — triggers run as the function owner.
-- ============================================================================

-- ============================================================================
-- 14. RLS: Allow authenticated to insert analytics_events (CDC §25)
-- ============================================================================
create policy "analytics_insert_auth" on public.analytics_events
  for insert with check (auth.uid() is not null);

create policy "analytics_select_admin" on public.analytics_events
  for select using (public.is_admin());
