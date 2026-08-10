-- ============================================================================
-- Fiaba — Migration 0017 : Automation des Signalements Checkout & Vendeurs Concernés
-- ============================================================================

create or replace function public.on_campaign_report_inserted()
returns trigger
language plpgsql
security definer
as $$
declare
  v_campaign_name text;
  v_merchant_name text;
  v_seller_name   text;
begin
  -- Récupérer le nom de la campagne et du commerçant
  select c.name, m.name
  into v_campaign_name, v_merchant_name
  from public.campaigns c
  left join public.merchants m on m.id = c.merchant_id
  where c.id = NEW.campaign_id;

  -- Récupérer le nom du vendeur si présent
  if NEW.seller_id is not null then
    select display_name into v_seller_name
    from public.sellers
    where id = NEW.seller_id;
  end if;

  -- Insérer un signalement antifraude haute priorité pour l'admin
  insert into public.fraud_signals (
    signal_type,
    detail,
    severity,
    status
  ) values (
    'Signalement Checkout',
    'Boutique: ' || coalesce(v_merchant_name, 'Boutique') || ' | Campagne: ' || coalesce(v_campaign_name, 'Campagne') || ' | Vendeur: ' || coalesce(v_seller_name, NEW.seller_code, 'Direct (Sans Vendeur)') || ' | Motif: ' || NEW.reason || ' | Client: ' || coalesce(NEW.reporter_name, 'Anonyme') || ' (' || coalesce(NEW.reporter_phone, 'Non renseigné') || ') | Détails: ' || coalesce(NEW.details, 'Aucun'),
    'high',
    'new'
  );

  return NEW;
end;
$$;

drop trigger if exists trg_campaign_report_inserted on public.campaign_reports;
create trigger trg_campaign_report_inserted
  after insert on public.campaign_reports
  for each row execute function public.on_campaign_report_inserted();
