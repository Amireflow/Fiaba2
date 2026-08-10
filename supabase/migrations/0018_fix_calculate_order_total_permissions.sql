-- ============================================================================
-- Fiaba — Migration 0018 : Fix calculate_order_total Permissions & Support Status
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
         coalesce(p.price, 0) as price, coalesce(p.name, c.name) as name
  into v_campaign
  from public.campaigns c
  left join public.products p on p.id = c.product_id
  where c.id = p_campaign_id and c.status in ('active', 'actif');

  if not found then
    -- Fallback: lookup campaign without status check
    select c.commission, c.commission_type, c.model, c.product_id, c.merchant_id,
           coalesce(p.price, 0) as price, coalesce(p.name, c.name) as name
    into v_campaign
    from public.campaigns c
    left join public.products p on p.id = c.product_id
    where c.id = p_campaign_id;
  end if;

  if not found then
    raise exception 'Campaign not found: %', p_campaign_id;
  end if;

  v_effective_price := coalesce(p_seller_price, v_campaign.price);

  -- Modèle marge: prix vendeur >= prix commerçant (CDC §11.2)
  if v_campaign.model = 'marge' and p_seller_price is not null then
    if p_seller_price < v_campaign.price then
      raise exception 'Seller price cannot be lower than merchant price';
    end if;
    v_effective_price := p_seller_price;
  end if;

  v_subtotal := v_effective_price * coalesce(p_quantity, 1);

  -- Fetch delivery zone fee
  if p_zone_id is not null then
    select dz.fee into v_zone_fee
    from public.delivery_zones dz
    where dz.id = p_zone_id and dz.merchant_id = v_campaign.merchant_id and dz.is_active = true;
    if not found then
      v_zone_fee := 0;
    end if;
  end if;

  -- Determine platform fee rate from merchant's subscription plan
  select sp.platform_fee_rate into v_plan
  from public.merchant_subscriptions ms
  join public.subscription_plans sp on sp.id = ms.plan_id
  where ms.merchant_id = v_campaign.merchant_id and ms.status = 'active';

  if found then
    v_platform_fee_rate := v_plan.platform_fee_rate;
  else
    v_platform_fee_rate := 5.00;
  end if;

  v_platform_fee := round(v_subtotal * v_platform_fee_rate / 100);

  -- Calculate commission if seller attributed
  if p_seller_id is not null then
    v_seller_attributed := true;
    if v_campaign.model = 'marge' and p_seller_price is not null then
      v_commission := (p_seller_price - v_campaign.price) * p_quantity;
      if v_commission < 0 then
        v_commission := 0;
      end if;
    elsif v_campaign.commission_type = 'fixed' then
      v_commission := v_campaign.commission * p_quantity;
    else
      -- Percentage
      v_commission := round(v_subtotal * v_campaign.commission / 100);
    end if;
  end if;

  v_total := v_subtotal + v_zone_fee;
  v_merchant_amount := v_subtotal - v_commission - v_platform_fee;
  if v_merchant_amount < 0 then
    v_merchant_amount := 0;
  end if;

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

-- Grant execution to ALL roles (anon, authenticated, public) for guest checkout
grant execute on function public.calculate_order_total to authenticated, anon, public;
