-- ============================================================================
-- Fiaba — Migration 0006 : Script Helper pour l'Élévation / Création de comptes Admin
-- ============================================================================

-- Fonction pour promouvoir ou créer un compte Administrateur par email
create or replace function public.promote_user_to_admin(p_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is not null then
    update public.profiles
    set role = 'admin', verification_status = 'verified', trust_score = 100
    where id = v_user_id;

    update auth.users
    set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
    where id = v_user_id;
  end if;
end;
$$;
