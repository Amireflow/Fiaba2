-- ============================================================================
-- Fiaba — Migration 0028 : Fix Checkout Sans Campagne + Sécurité RLS
-- ============================================================================
-- 1. CRITIQUE : calculate_order_total et enforce_order_integrity rejettent
--    les commandes quand l'ID passé est un product_id (checkout sans campagne).
--    → Les fonctions tentent maintenant une recherche par product_id.
-- 2. SÉCURITÉ : orders_insert_public (check true) toujours active depuis 0005.
--    → Suppression de la policy permissive.
-- 3. COHÉRENCE : calculate_order_total accepte aussi un product_id direct.
-- ============================================================================

-- ============================================================================
-- 1. calculate_order_total : fallback par product_id si campagne introuvable
-- ============================================================================
create or replace function public.calculate_order_total(
  p_campaign_id uuid,
  p_quantity integer,
  p_zone_id uuid default null,
  p_seller_id uuid default null,
  p_seller_price integer default null
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
security definer set search_path = public
as $$
declare
  v_campaign record;
  v_zone_fee integer := 0;
  v_commission integer := 0;
  v_platform_fee_rate numeric := 5.00;
  v_platform_fee integer := 0;
  v_merchant_amount integer := 0;
  v_total integer := 0;
  v_subtotal integer := 0;
  v_effective_price integer;
  v_seller_attributed boolean := false;
  v_qty integer := greatest(1, coalesce(p_quantity, 1));
  v_resolved_campaign_id uuid;
begin
  -- 1. Chercher par campaign_id
  select c.id, c.commission, c.commission_type, c.model, c.product_id, c.merchant_id,
         coalesce(p.price, 0) as price, coalesce(p.name, c.name) as name,
         coalesce(p.type, 'physique') as product_type
  into v_campaign
  from public.campaigns c
  left join public.products p on p.id = c.product_id
  where c.id = p_campaign_id and c.status = 'active';

  -- 2. Fallback : chercher une campagne active pour ce product_id
  if not found then
    select c.id, c.commission, c.commission_type, c.model, c.product_id, c.merchant_id,
           coalesce(p.price, 0) as price, coalesce(p.name, c.name) as name,
           coalesce(p.type, 'physique') as product_type
    into v_campaign
    from public.campaigns c
    left join public.products p on p.id = c.product_id
    where c.product_id = p_campaign_id and c.status = 'active'
    limit 1;
  end if;

  -- 3. Dernier recours : produit direct sans campagne (commission = 0)
  if not found then
    select p.id, p.price, p.type, p.merchant_id, p.name
    into v_campaign
    from public.products p
    where p.id = p_campaign_id;

    if not found then
      raise exception 'Product or campaign not found: %', p_campaign_id;
    end if;

    -- Produit sans campagne : commission à 0, modèle par défaut
    v_effective_price := v_campaign.price;
    v_subtotal := v_effective_price * v_qty;

    -- Zone de livraison
    if v_campaign.product_type = 'digital' then
      v_zone_fee := 0;
    elsif p_zone_id is not null then
      select dz.fee into v_zone_fee
      from public.delivery_zones dz
      where dz.id = p_zone_id and dz.merchant_id = v_campaign.merchant_id and dz.is_active = true;
      if not found then v_zone_fee := 0; end if;
    end if;

    -- Frais plateforme
    select sp.platform_fee_rate into v_platform_fee_rate
    from public.merchant_subscriptions ms
    join public.subscription_plans sp on sp.id = ms.plan_id
    where ms.merchant_id = v_campaign.merchant_id and ms.status = 'active';
    if not found then v_platform_fee_rate := 5.00; end if;

    v_platform_fee := round(v_subtotal * v_platform_fee_rate / 100)::integer;
    v_total := v_subtotal + v_zone_fee;
    v_merchant_amount := greatest(0, v_subtotal - v_platform_fee);

    return query select
      v_campaign.price,
      v_subtotal,
      v_zone_fee,
      0::integer,           -- commission_amount = 0 (pas de campagne)
      v_platform_fee,
      v_platform_fee_rate,
      v_merchant_amount,
      v_total,
      'commission'::commission_model,
      'percentage'::commission_type,
      0::integer,            -- commission_rate = 0
      false;                 -- seller_attributed
    return;
  end if;

  -- Cas normal : campagne trouvée
  v_resolved_campaign_id := v_campaign.id;
  v_effective_price := v_campaign.price;

  -- Modèle marge : prix vendeur >= prix commerçant (CDC §11.2)
  if v_campaign.model = 'marge' and p_seller_price is not null then
    if p_seller_price < v_campaign.price then
      raise exception 'Seller price cannot be lower than merchant price';
    end if;
    v_effective_price := p_seller_price;
  end if;

  v_subtotal := v_effective_price * v_qty;

  -- Produit digital : aucun frais de livraison
  if v_campaign.product_type = 'digital' then
    v_zone_fee := 0;
  elsif p_zone_id is not null then
    select dz.fee into v_zone_fee
    from public.delivery_zones dz
    where dz.id = p_zone_id and dz.merchant_id = v_campaign.merchant_id and dz.is_active = true;
    if not found then v_zone_fee := 0; end if;
  end if;

  -- Taux de frais plateforme
  select sp.platform_fee_rate into v_platform_fee_rate
  from public.merchant_subscriptions ms
  join public.subscription_plans sp on sp.id = ms.plan_id
  where ms.merchant_id = v_campaign.merchant_id and ms.status = 'active';
  if not found then v_platform_fee_rate := 5.00; end if;

  v_platform_fee := round(v_subtotal * v_platform_fee_rate / 100)::integer;

  if p_seller_id is not null then
    v_seller_attributed := true;
    if v_campaign.model = 'marge' and p_seller_price is not null then
      v_commission := greatest(0, (p_seller_price - v_campaign.price) * v_qty);
    elsif v_campaign.commission_type = 'fixed'
       or (v_campaign.commission_type is null and v_campaign.commission >= 100) then
      v_commission := v_campaign.commission * v_qty;
    else
      v_commission := round((v_subtotal * v_campaign.commission) / 100)::integer;
    end if;
  end if;

  v_total := v_subtotal + v_zone_fee;
  v_merchant_amount := greatest(0, v_subtotal - v_commission - v_platform_fee);

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

grant execute on function public.calculate_order_total to authenticated, anon;

-- ============================================================================
-- 2. enforce_order_integrity : fallback par product_id + campaign_id résolu
-- ============================================================================
create or replace function public.enforce_order_integrity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_campaign record;
  v_zone record;
  v_qty integer;
  v_effective_price integer;
  v_subtotal integer;
  v_platform_fee_rate numeric := 5.00;
  v_platform_fee integer;
  v_commission integer := 0;
  v_is_digital boolean := false;
  v_resolved_campaign_id uuid;
  v_has_campaign boolean := false;
begin
  -- 1. Chercher la campagne par campaign_id
  if new.campaign_id is not null then
    select c.id, c.merchant_id, c.commission, c.commission_type, c.model, c.product_id,
           coalesce(p.price, 0) as product_price,
           coalesce(p.type, 'physique') as product_type
    into v_campaign
    from public.campaigns c
    left join public.products p on p.id = c.product_id
    where c.id = new.campaign_id and c.status = 'active';

    -- 2. Fallback : chercher par product_id
    if not found then
      select c.id, c.merchant_id, c.commission, c.commission_type, c.model, c.product_id,
             coalesce(p.price, 0) as product_price,
             coalesce(p.type, 'physique') as product_type
      into v_campaign
      from public.campaigns c
      left join public.products p on p.id = c.product_id
      where c.product_id = new.campaign_id and c.status = 'active'
      limit 1;
    end if;

    -- 3. Dernier recours : produit direct sans campagne
    if not found then
      select p.id, p.merchant_id, p.price as product_price,
             coalesce(p.type, 'physique') as product_type
      into v_campaign
      from public.products p
      where p.id = new.campaign_id;

      if not found then
        raise exception 'Commande rejetée : produit ou campagne introuvable';
      end if;

      -- Produit sans campagne : commission = 0
      v_has_campaign := false;
      new.merchant_id := v_campaign.merchant_id;
      v_is_digital := v_campaign.product_type = 'digital';
      v_resolved_campaign_id := null;
    else
      v_has_campaign := true;
      new.merchant_id := v_campaign.merchant_id;
      v_is_digital := v_campaign.product_type = 'digital';
      v_resolved_campaign_id := v_campaign.id;
      -- Corriger le campaign_id avec la vraie campagne trouvée
      new.campaign_id := v_resolved_campaign_id;
    end if;
  elsif not public.is_merchant_owner(new.merchant_id) and not public.is_admin() then
    raise exception 'Commande rejetée : campaign_id requis pour le checkout public';
  end if;

  v_qty := greatest(1, coalesce(new.quantity, 1));
  new.quantity := v_qty;

  -- Vendeur : doit exister et être actif, sinon attribution ignorée
  if new.seller_id is not null then
    if not exists (
      select 1 from public.sellers s where s.id = new.seller_id and s.status = 'actif'
    ) then
      new.seller_id := null;
    end if;
  end if;

  -- Prix effectif
  v_effective_price := coalesce(v_campaign.product_price, 0);
  if v_has_campaign and v_campaign.model = 'marge' and new.seller_price is not null then
    if new.seller_price >= v_campaign.product_price then
      v_effective_price := new.seller_price;
    else
      new.seller_price := null;
    end if;
  end if;

  v_subtotal := v_effective_price * v_qty;

  -- Zone de livraison
  if v_is_digital then
    new.zone_id := null;
    new.zone_name := coalesce(new.zone_name, 'Digital (Instant)');
    new.delivery_fee := 0;
  elsif new.zone_id is not null then
    select dz.name, dz.fee into v_zone
    from public.delivery_zones dz
    where dz.id = new.zone_id and dz.merchant_id = new.merchant_id and dz.is_active = true;
    if found then
      new.zone_name := v_zone.name;
      new.delivery_fee := v_zone.fee;
    else
      new.zone_id := null;
      new.delivery_fee := 0;
    end if;
  else
    new.delivery_fee := 0;
  end if;

  -- Taux plateforme
  select sp.platform_fee_rate into v_platform_fee_rate
  from public.merchant_subscriptions ms
  join public.subscription_plans sp on sp.id = ms.plan_id
  where ms.merchant_id = new.merchant_id and ms.status = 'active';
  if not found then v_platform_fee_rate := 5.00; end if;

  v_platform_fee := round(v_subtotal * v_platform_fee_rate / 100)::integer;

  -- Commission vendeur (recalculée, jamais reçue du client)
  if v_has_campaign and new.seller_id is not null then
    if v_campaign.model = 'marge' and new.seller_price is not null then
      v_commission := greatest(0, (new.seller_price - v_campaign.product_price) * v_qty);
    elsif v_campaign.commission_type = 'fixed'
       or (v_campaign.commission_type is null and v_campaign.commission >= 100) then
      v_commission := v_campaign.commission * v_qty;
    else
      v_commission := round((v_subtotal * v_campaign.commission) / 100)::integer;
    end if;
  end if;

  -- Montants et snapshots imposés par le serveur
  new.total_amount := v_subtotal + new.delivery_fee;
  new.commission_amount := v_commission;
  new.platform_fee := v_platform_fee;
  new.platform_fee_amount := v_platform_fee;
  new.platform_fee_rate := v_platform_fee_rate;
  new.merchant_amount := greatest(0, v_subtotal - v_commission - v_platform_fee);
  new.snapshot_product_price := v_effective_price;
  new.snapshot_commission_amount := v_commission;
  if v_has_campaign and v_campaign.model is not null then
    new.commission_model := v_campaign.model;
    new.commission_type := v_campaign.commission_type;
    new.commission_rate := v_campaign.commission;
  else
    new.commission_model := 'commission';
    new.commission_type := 'percentage';
    new.commission_rate := 0;
  end if;

  -- Statut initial : livraison immédiate uniquement pour un digital payé
  if v_is_digital and new.payment_method in ('wave', 'orange_money', 'card') then
    new.status := 'livree';
    new.status_v2 := 'delivered';
  else
    new.status := 'a_preparer';
    new.status_v2 := 'created';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_order_integrity on public.orders;
create trigger trg_enforce_order_integrity
  before insert on public.orders
  for each row execute function public.enforce_order_integrity();

-- ============================================================================
-- 3. Supprimer la policy permissive orders_insert_public (check true)
-- ============================================================================
drop policy if exists "orders_insert_public" on public.orders;
