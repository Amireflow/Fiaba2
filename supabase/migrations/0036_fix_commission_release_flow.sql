-- ============================================================================
-- Fiaba — Migration 0036 : Correction du flux de libération des commissions
-- ============================================================================
--
-- FAILLE CORRIGÉE
-- ---------------
-- Le flux commande → commission → payout est brisé en trois points :
--
--   1. La fonction auto_release_commissions() (migration 0010) libère les
--      commissions 'pending' dont la période de sécurité de 14 jours est
--      écoulée. Mais cette fonction n'est JAMAIS appelée : aucun pg_cron, aucun
--      déclencheur. Les commissions physiques restent 'pending' éternellement
--      → le vendeur ne peut jamais retirer ses gains (seller_available_balance
--      ne compte que status = 'available').
--
--   2. available_at est calculé à l'INSERTION de la commande (now() + 14j),
--      pas à la livraison. Pour une commande physique créée le 1er et livrée
--      le 5, la commission devient disponible le 15 au lieu du 19. Le délai
--      de sécurité de 14 jours doit courir à partir de la livraison.
--
--   3. Aucune transition 'delivered' → 'commission_pending' sur status_v2 :
--      l'order reste 'delivered' et ne passe jamais par 'commission_pending'
--      puis 'commission_available'. Le reporting et les notifications sont
--      impactés.
--
-- Correction :
--   • pg_cron planifie auto_release_commissions() toutes les heures.
--   • Un trigger BEFORE UPDATE sur orders :
--       - détecte la transition vers 'delivered',
--       - réinitialise available_at = now() + 14 jours (produits physiques),
--       - fait la transition 'delivered' → 'commission_pending' sur status_v2.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Activer pg_cron (extension Supabase native)
-- ----------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

-- ----------------------------------------------------------------------------
-- 2. Planifier auto_release_commissions() toutes les heures
--    job_id est nommé pour permettre un re-run idempotent de la migration.
-- ----------------------------------------------------------------------------
do $do$
begin
  -- Supprimer l'ancien job s'il existe (re-run idempotent)
  if exists (select 1 from cron.job where jobname = 'fiaba_release_commissions') then
    perform cron.unschedule('fiaba_release_commissions');
  end if;
  -- Programmer toutes les heures, à la minute 5
  perform cron.schedule(
    'fiaba_release_commissions',
    '5 * * * *',
    $job$ select public.auto_release_commissions(); $job$
  );
end $do$;

-- ----------------------------------------------------------------------------
-- 3. Trigger BEFORE UPDATE : gérer la transition vers 'delivered'
--    Quand le marchand marque une commande comme livrée (status_v2 passe à
--    'delivered'), on effectue deux actions dans le même trigger :
--      a. Réinitialiser available_at des commissions 'pending' à now()+14j
--         pour que le délai de sécurité parte de la date de livraison.
--      b. Faire la transition status_v2 = 'commission_pending' pour refléter
--         que la commission est en période de sécurité.
--    Les commissions déjà 'available' (produits digitaux) ne sont pas touchées.
-- ----------------------------------------------------------------------------
create or replace function public.on_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Détecter la transition vers 'delivered' (et non un re-set à la même valeur)
  if new.status_v2 = 'delivered' and old.status_v2 is distinct from 'delivered' then
    -- a. Réinitialiser le délai de sécurité à partir de la livraison.
    --    Seules les commissions encore 'pending' sont concernées : les
    --    commissions 'available' (produits digitaux) restent intactes.
    update public.commissions
      set available_at = now() + interval '14 days'
      where order_id = new.id
        and status = 'pending';

    -- b. Transition immédiate : delivered → commission_pending.
    --    Le cycle de commission est maintenant en cours.
    new.status_v2 := 'commission_pending';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_on_order_delivered on public.orders;
create trigger trg_on_order_delivered
  before update of status_v2 on public.orders
  for each row execute function public.on_order_delivered();

-- ----------------------------------------------------------------------------
-- 4. Commentaire
-- ----------------------------------------------------------------------------
comment on function public.on_order_delivered() is
  'Gère la transition vers delivered : réinitialise available_at à now()+14j et fait passer status_v2 à commission_pending.';
