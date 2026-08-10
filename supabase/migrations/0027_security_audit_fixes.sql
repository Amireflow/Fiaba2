-- ============================================================================
-- Fiaba — Migration 0027 : Correctifs de Sécurité (Audit Complet)
-- ============================================================================
-- F1 CRITIQUE : commissions_insert_public (WITH CHECK true) → insertion de
--               commissions arbitraires par n'importe quel client anonyme.
-- F2 CRITIQUE : tracking_links_update_public (USING true) → modification de
--               n'importe quel lien de tracking (clics, statut, réattribution).
-- F3 CRITIQUE : montants de commande acceptés depuis le client → trigger
--               BEFORE INSERT qui recalcule et impose les montants serveur.
-- F4 CRITIQUE : handle_new_user accepte role='admin' depuis user_metadata.
-- F5 HAUTE    : calculate_order_total casse systématiquement (littéral enum
--               'actif' invalide) → le checkout basculait sur le calcul client.
-- F6 MOYENNE  : order_items insérables sur n'importe quelle commande existante.
-- ============================================================================

-- ============================================================================
-- F4 — Ne jamais accepter le rôle admin depuis les métadonnées d'inscription
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
  v_phone text;
  v_display_name text;
  v_merchant_name text;
  v_slug text;
begin
  -- SÉCURITÉ : le rôle 'admin' n'est jamais attribuable à l'inscription.
  -- Seuls 'marchand' et 'vendeur' sont acceptés ; tout le reste → 'vendeur'.
  v_role := case (new.raw_user_meta_data ->> 'role')
    when 'marchand' then 'marchand'::user_role
    else 'vendeur'::user_role
  end;
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_phone := new.raw_user_meta_data ->> 'phone';

  v_display_name := coalesce(nullif(trim(v_full_name), ''), split_part(coalesce(new.email, 'utilisateur'), '@', 1));
  v_merchant_name := coalesce(nullif(trim(v_full_name), ''), 'Ma boutique');
  v_slug := replace(lower(v_merchant_name), ' ', '-') || '-' || substr(new.id::text, 1, 8);

  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, new.email, v_full_name, v_phone, v_role)
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
    phone = coalesce(excluded.phone, profiles.phone);

  if v_role = 'vendeur' then
    insert into public.sellers (profile_id, display_name, phone, status, joined_at)
    values (new.id, v_display_name, v_phone, 'actif', now())
    on conflict do nothing;

    insert into public.seller_profiles (profile_id, display_name)
    values (new.id, v_display_name)
    on conflict (profile_id) do nothing;
  end if;

  if v_role = 'marchand' then
    insert into public.merchants (owner_id, name, slug, description)
    values (new.id, v_merchant_name, v_slug, '')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- F1 — Supprimer l'insertion publique de commissions
--      Les commissions ne sont créées QUE par le trigger auto_create_commission
--      (SECURITY DEFINER) ou par un admin / le service role.
-- ============================================================================
drop policy if exists "commissions_insert_public" on public.commissions;

-- ============================================================================
-- F2 — Supprimer la modification publique des tracking links
--      Le compteur de clics passe par un RPC SECURITY DEFINER dédié.
-- ============================================================================
drop policy if exists "tracking_links_update_public" on public.tracking_links;

create or replace function public.increment_tracking_click(p_link_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.tracking_links
  set clicks = coalesce(clicks, 0) + 1
  where id = p_link_id and is_active = true;
end;
$$;

grant execute on function public.increment_tracking_click to anon, authenticated;

-- ============================================================================
-- F5 — Réparer calculate_order_total (littéral enum 'actif' invalide qui
--      levait une erreur à chaque appel et forçait le fallback client)
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
begin
  select c.commission, c.commission_type, c.model, c.product_id, c.merchant_id,
         coalesce(p.price, 0) as price, coalesce(p.name, c.name) as name,
         coalesce(p.type, 'physique') as product_type
  into v_campaign
  from public.campaigns c
  left join public.products p on p.id = c.product_id
  where c.id = p_campaign_id and c.status = 'active';

  if not found then
    raise exception 'Campaign not found or inactive: %', p_campaign_id;
  end if;

  v_effective_price := v_campaign.price;

  -- Modèle marge : prix vendeur >= prix commerçant (CDC §11.2)
  if v_campaign.model = 'marge' and p_seller_price is not null then
    if p_seller_price < v_campaign.price then
      raise exception 'Seller price cannot be lower than merchant price';
    end if;
    v_effective_price := p_seller_price;
  end if;

  v_subtotal := v_effective_price * v_qty;

  -- Produit digital : aucun frais de livraison (Prompt Produits Digitaux §3)
  if v_campaign.product_type = 'digital' then
    v_zone_fee := 0;
  elsif p_zone_id is not null then
    select dz.fee into v_zone_fee
    from public.delivery_zones dz
    where dz.id = p_zone_id and dz.merchant_id = v_campaign.merchant_id and dz.is_active = true;
    if not found then
      v_zone_fee := 0;
    end if;
  end if;

  -- Taux de frais plateforme : abonnement actif du marchand, sinon 5 %
  select sp.platform_fee_rate into v_platform_fee_rate
  from public.merchant_subscriptions ms
  join public.subscription_plans sp on sp.id = ms.plan_id
  where ms.merchant_id = v_campaign.merchant_id and ms.status = 'active';
  if not found then
    v_platform_fee_rate := 5.00;
  end if;

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
-- F3 — Trigger BEFORE INSERT : le serveur impose les montants et le statut
--      initial, quelles que soient les valeurs envoyées par le client (§23).
-- ============================================================================

-- Colonne quantité (snapshot au moment de la commande — checkout mono-produit)
alter table public.orders
  add column if not exists quantity integer not null default 1 check (quantity > 0);

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
begin
  -- La commande doit référencer une campagne active (checkout public)
  if new.campaign_id is not null then
    select c.merchant_id, c.commission, c.commission_type, c.model, c.product_id,
           coalesce(p.price, 0) as product_price,
           coalesce(p.type, 'physique') as product_type
    into v_campaign
    from public.campaigns c
    left join public.products p on p.id = c.product_id
    where c.id = new.campaign_id and c.status = 'active';

    if not found then
      raise exception 'Commande rejetée : campagne introuvable ou inactive';
    end if;

    -- Le marchand de la commande est celui de la campagne (anti-usurpation)
    new.merchant_id := v_campaign.merchant_id;
    v_is_digital := v_campaign.product_type = 'digital';
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

  -- Prix effectif (modèle marge : prix vendeur jamais < prix commerçant, §11.2)
  v_effective_price := coalesce(v_campaign.product_price, 0);
  if v_campaign.model = 'marge' and new.seller_price is not null then
    if new.seller_price >= v_campaign.product_price then
      v_effective_price := new.seller_price;
    else
      new.seller_price := null; -- prix vendeur invalide → retour au prix commerçant
    end if;
  end if;

  v_subtotal := v_effective_price * v_qty;

  -- Zone de livraison : doit appartenir au marchand et être active
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

  -- Taux plateforme depuis l'abonnement actif du marchand
  select sp.platform_fee_rate into v_platform_fee_rate
  from public.merchant_subscriptions ms
  join public.subscription_plans sp on sp.id = ms.plan_id
  where ms.merchant_id = new.merchant_id and ms.status = 'active';
  if not found then
    v_platform_fee_rate := 5.00;
  end if;

  v_platform_fee := round(v_subtotal * v_platform_fee_rate / 100)::integer;

  -- Commission vendeur (recalculée, jamais reçue du client)
  if new.seller_id is not null then
    if v_campaign.model = 'marge' and new.seller_price is not null then
      v_commission := greatest(0, (new.seller_price - v_campaign.product_price) * v_qty);
    elsif v_campaign.commission_type = 'fixed'
       or (v_campaign.commission_type is null and v_campaign.commission >= 100) then
      v_commission := v_campaign.commission * v_qty;
    else
      v_commission := round((v_subtotal * v_campaign.commission) / 100)::integer;
    end if;
  end if;

  -- Montants et snapshots imposés par le serveur (§23)
  new.total_amount := v_subtotal + new.delivery_fee;
  new.commission_amount := v_commission;
  new.platform_fee := v_platform_fee;
  new.platform_fee_amount := v_platform_fee;
  new.platform_fee_rate := v_platform_fee_rate;
  new.merchant_amount := greatest(0, v_subtotal - v_commission - v_platform_fee);
  new.snapshot_product_price := v_effective_price;
  new.snapshot_commission_amount := v_commission;
  if v_campaign.model is not null then
    new.commission_model := v_campaign.model;
    new.commission_type := v_campaign.commission_type;
    new.commission_rate := v_campaign.commission;
  end if;

  -- Statut initial imposé : livraison immédiate uniquement pour un digital payé
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
-- F6 — order_items : insertion publique uniquement sur une commande fraîche
--      (créée depuis moins de 15 min, statut initial)
-- ============================================================================
drop policy if exists "order_items_insert_public" on public.order_items;
create policy "order_items_insert_public" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.status_v2 in ('created', 'delivered')
        and o.created_at > now() - interval '15 minutes'
    )
  );
