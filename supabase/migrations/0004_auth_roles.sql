-- ============================================================================
-- Fiaba — Migration 0004 : handle_new_user avec rôle + redirect par rôle
-- ============================================================================

-- Mettre à jour handle_new_user pour stocker le rôle depuis user_metadata
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
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'vendeur');
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_phone := new.raw_user_meta_data ->> 'phone';

  -- Calculer des noms d'affichage fiables (fallback si full_name est vide)
  v_display_name := coalesce(nullif(trim(v_full_name), ''), split_part(coalesce(new.email, 'utilisateur'), '@', 1));
  v_merchant_name := coalesce(nullif(trim(v_full_name), ''), 'Ma boutique');
  v_slug := replace(lower(v_merchant_name), ' ', '-') || '-' || substr(new.id::text, 1, 8);

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    v_full_name,
    v_phone,
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
    phone = coalesce(excluded.phone, profiles.phone),
    role = excluded.role;

  -- Créer un seller_profile si le rôle est vendeur
  if v_role = 'vendeur' then
    insert into public.sellers (profile_id, display_name, phone, status, joined_at)
    values (new.id, v_display_name, v_phone, 'actif', now())
    on conflict do nothing;

    insert into public.seller_profiles (profile_id, display_name)
    values (new.id, v_display_name)
    on conflict (profile_id) do nothing;
  end if;

  -- Créer un merchant si le rôle est marchand
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

-- Recréer le trigger (drop + create car la fonction a changé)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Helper : récupérer le rôle de l'utilisateur courant
-- ============================================================================
create or replace function public.get_current_role()
returns user_role
language sql
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================================
-- Helper : vérifier si l'utilisateur est marchand
-- ============================================================================
create or replace function public.is_merchant()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'marchand'
  );
$$;

-- ============================================================================
-- Helper : vérifier si l'utilisateur est vendeur
-- ============================================================================
create or replace function public.is_vendeur()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'vendeur'
  );
$$;
