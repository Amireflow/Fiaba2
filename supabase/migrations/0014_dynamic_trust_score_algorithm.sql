-- ============================================================================
-- Fiaba — Migration 0014 : Algorithme Dynamique de Trust Score (Départ à 0)
-- ============================================================================

-- 1. Valeur par défaut initiale à 0/100
alter table public.profiles alter column trust_score set default 0;

-- 2. Fonction SQL de calcul dynamique du Trust Score
create or replace function public.calculate_user_trust_score(p_user_id uuid)
returns integer as $$
declare
  v_score integer := 0;
  v_prof record;
  v_delivered_count integer := 0;
  v_disputes_count integer := 0;
  v_age_days integer := 0;
begin
  select full_name, phone, verification_status, created_at
  into v_prof
  from public.profiles
  where id = p_user_id;

  if not found then
    return 0;
  end if;

  if v_prof.verification_status in ('suspended', 'refused') then
    return 0;
  end if;

  -- 1. Complétude Identité & Vérification (max 30 pts)
  if v_prof.full_name is not null and length(trim(v_prof.full_name)) > 3 then
    v_score := v_score + 10;
  end if;

  if v_prof.phone is not null and length(trim(v_prof.phone)) > 5 then
    v_score := v_score + 10;
  end if;

  if v_prof.verification_status = 'verified' then
    v_score := v_score + 10;
  end if;

  -- 2. Ventes livrées (max 40 pts)
  select count(*) into v_delivered_count
  from public.orders o
  join public.sellers s on o.seller_id = s.id
  where s.profile_id = p_user_id and o.status = 'livree';

  if v_delivered_count >= 1 then v_score := v_score + 10; end if;
  if v_delivered_count >= 5 then v_score := v_score + 15; end if;
  if v_delivered_count >= 20 then v_score := v_score + 15; end if;

  -- 3. Ancienneté du compte (max 10 pts)
  if v_prof.created_at is not null then
    v_age_days := extract(day from (now() - v_prof.created_at))::integer;
    if v_age_days >= 30 then
      v_score := v_score + 10;
    else
      v_score := v_score + (v_age_days / 3);
    end if;
  end if;

  -- 4. Pénalités de litiges (-25 pts par litige)
  select count(*) into v_disputes_count
  from public.disputes d
  where d.opened_by = p_user_id;

  v_score := v_score - (v_disputes_count * 25);

  -- Bornage [0, 100]
  if v_score < 0 then v_score := 0; end if;
  if v_score > 100 then v_score := 100; end if;

  return v_score;
end;
$$ language plpgsql security definer;

-- 3. Mise à jour dynamique de tous les profils
update public.profiles
set trust_score = public.calculate_user_trust_score(id);
