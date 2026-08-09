-- ============================================================================
-- Fiaba — Migration 0007 : Auto-provisioning & Support Réel des Comptes Admin
-- ============================================================================

-- 1. Mise à jour de la fonction handle_new_user pour auto-détecter les comptes admin
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
  -- Détecter si l'email ou les métadonnées demandent le rôle admin
  if new.email ilike 'admin%' or (new.raw_user_meta_data ->> 'role') = 'admin' then
    v_role := 'admin';
  else
    v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'vendeur');
  end if;

  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', 'Administrateur Fiaba');
  v_phone := new.raw_user_meta_data ->> 'phone';

  v_display_name := coalesce(nullif(trim(v_full_name), ''), split_part(coalesce(new.email, 'utilisateur'), '@', 1));
  v_merchant_name := coalesce(nullif(trim(v_full_name), ''), 'Ma boutique');
  v_slug := replace(lower(v_merchant_name), ' ', '-') || '-' || substr(new.id::text, 1, 8);

  insert into public.profiles (id, email, full_name, phone, role, city, verification_status, trust_score)
  values (
    new.id,
    new.email,
    v_full_name,
    v_phone,
    v_role,
    'Dakar',
    case when v_role = 'admin' then 'verified' else 'pending' end,
    case when v_role = 'admin' then 100 else 50 end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
    phone = coalesce(excluded.phone, profiles.phone),
    role = excluded.role,
    verification_status = case when excluded.role = 'admin' then 'verified' else profiles.verification_status end;

  -- Enregistrement seller pour vendeur
  if v_role = 'vendeur' then
    insert into public.sellers (profile_id, display_name, phone, status, joined_at)
    values (new.id, v_display_name, v_phone, 'actif', now())
    on conflict do nothing;

    insert into public.seller_profiles (profile_id, display_name)
    values (new.id, v_display_name)
    on conflict (profile_id) do nothing;
  end if;

  -- Enregistrement merchant pour marchand
  if v_role = 'marchand' then
    insert into public.merchants (owner_id, name, slug, description)
    values (
      new.id,
      v_merchant_name,
      v_slug,
      ''
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Recréer le trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Provisionnement forcé du compte super admin dans auth.users et public.profiles
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'admin@fiaba.sn',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin Fiaba","role":"admin"}',
  now(), now(), 'authenticated', 'authenticated'
)
on conflict (id) do update set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data;

insert into public.profiles (id, role, full_name, phone, email, city, verification_status, trust_score)
values (
  '00000000-0000-0000-0000-000000000003',
  'admin',
  'Super Admin Fiaba',
  '+221 77 000 00 00',
  'admin@fiaba.sn',
  'Dakar',
  'verified',
  100
)
on conflict (id) do update set
  role = 'admin',
  verification_status = 'verified',
  trust_score = 100;
