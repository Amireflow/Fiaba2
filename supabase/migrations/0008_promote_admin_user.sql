-- ============================================================================
-- Fiaba — Migration 0008 : Promotion de admin@fiaba.com au rôle Admin
-- ============================================================================

do $$
declare
  v_user_id uuid;
begin
  -- Recherche de l'utilisateur par email
  select id into v_user_id from auth.users where email = 'admin@fiaba.com';

  if v_user_id is not null then
    -- Mise à jour ou insertion dans public.profiles
    insert into public.profiles (id, email, full_name, role, city, verification_status, trust_score)
    values (
      v_user_id,
      'admin@fiaba.com',
      'Administrateur Fiaba',
      'admin'::user_role,
      'Dakar',
      'verified'::verification_status,
      100
    )
    on conflict (id) do update set
      role = 'admin'::user_role,
      verification_status = 'verified'::verification_status,
      trust_score = 100;

    -- Création d'une boutique d'administration si nécessaire
    insert into public.merchants (owner_id, name, slug, email, city)
    values (
      v_user_id,
      'Fiaba Admin HQ',
      'fiaba-admin-hq-' || substr(v_user_id::text, 1, 8),
      'admin@fiaba.com',
      'Dakar'
    )
    on conflict (owner_id) do update set
      name = coalesce(merchants.name, 'Fiaba Admin HQ');
  end if;
end $$;
