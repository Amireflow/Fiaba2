-- 0011_analytics_triggers.sql
-- Analytics events automatically tracked on order status changes (CDC §25)
-- This covers: order_confirmed, order_shipped, order_delivered, payment_confirmed,
-- sale_validated, commission_created, margin_created, order_refused, order_returned

create or replace function public.auto_analytics_on_order()
returns trigger
language plpgsql
security definer
as $$
declare
  v_event text;
begin
  if new.status_v2 is distinct from old.status_v2 then
    case new.status_v2
      when 'confirmed' then v_event := 'order_confirmed';
      when 'shipped' then v_event := 'order_shipped';
      when 'out_for_delivery' then v_event := 'order_shipped';
      when 'delivered' then v_event := 'order_delivered';
      when 'payment_confirmed' then v_event := 'payment_confirmed';
      when 'commission_pending' then
        v_event := case when new.commission_model = 'marge' then 'margin_created' else 'commission_created' end;
      when 'commission_available' then v_event := 'sale_validated';
      when 'refused' then v_event := 'order_refused';
      when 'returned' then v_event := 'order_returned';
      else return new;
    end case;

    insert into public.analytics_events (event_type, entity_type, entity_id, metadata)
    values (
      v_event::analytics_event,
      'order',
      new.id,
      jsonb_build_object('order_id', new.id, 'status', new.status_v2, 'total', new.total_amount)
    );
  end if
  return new;
end;
$$;

drop trigger if exists trg_analytics_order on public.orders;
create trigger trg_analytics_order
  after update of status_v2 on public.orders
  for each row execute function public.auto_analytics_on_order();

-- Analytics: payout_completed on payout status = paid
create or replace function public.auto_analytics_on_payout()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status and new.status = 'paid' then
    insert into public.analytics_events (event_type, entity_type, entity_id, metadata)
    values (
      'payout_completed'::analytics_event,
      'payout',
      new.id,
      jsonb_build_object('amount', new.amount, 'seller_id', new.seller_id)
    );
  end if
  return new;
end;
$$;

drop trigger if exists trg_analytics_payout on public.payouts;
create trigger trg_analytics_payout
  after update of status on public.payouts
  for each row execute function public.auto_analytics_on_payout();
