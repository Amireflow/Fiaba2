-- ============================================================================
-- Fiaba — Données de démonstration (local & SQL editor)
-- ============================================================================

-- 1. Utilisateur de test dans auth.users (ID fixe pour satisfaire la FK profiles.id -> auth.users.id)
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Aminata Ndiaye","role":"marchand"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

-- 2. Garantir le profil marchand dans public.profiles
insert into public.profiles (id, role, full_name, phone, email, city)
select
  u.id,
  'marchand',
  'Aminata Ndiaye',
  '+221 77 482 19 06',
  u.email,
  'Saint-Louis'
from auth.users u
where u.id = '00000000-0000-0000-0000-000000000001' or u.email = 'test@example.com'
limit 1
on conflict (id) do update set
  role = 'marchand',
  full_name = 'Aminata Ndiaye';

-- 3. Boutique "Maison Ndar" (UUID fixe)
insert into public.merchants (id, owner_id, name, slug, description, phone, email, city)
select
  'a0000000-0000-0000-0000-000000000001',
  p.id,
  'Maison Ndar',
  'maison-ndar',
  'Boutique de produits artisanaux du Sénégal.',
  '+221 77 482 19 06',
  'bonjour@maisonndar.sn',
  'Saint-Louis'
from public.profiles p
where p.id = '00000000-0000-0000-0000-000000000001' or p.email = 'test@example.com'
limit 1
on conflict (id) do update set
  name = 'Maison Ndar',
  slug = 'maison-ndar';

-- 4. Produits
insert into public.products (merchant_id, name, category, price, stock, status) values
  ('a0000000-0000-0000-0000-000000000001', 'Coffret Soin Karité', 'Beauté', 12500, 38, 'actif'),
  ('a0000000-0000-0000-0000-000000000001', 'Boubou Ndar — Indigo', 'Mode', 28500, 12, 'actif'),
  ('a0000000-0000-0000-0000-000000000001', 'Panier petit-déjeuner', 'Maison', 9500, 0, 'epuise'),
  ('a0000000-0000-0000-0000-000000000001', 'Huile de Baobab 100ml', 'Beauté', 7200, 64, 'brouillon')
on conflict do nothing;

-- 5. Campagnes
insert into public.campaigns (merchant_id, name, commission, status) values
  ('a0000000-0000-0000-0000-000000000001', 'Rentrée douce — septembre', 12.00, 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'Le goût de chez nous', 10.00, 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'Week-end famille', 8.00, 'en_pause')
on conflict do nothing;

-- 6. Vendeurs
insert into public.sellers (merchant_id, display_name, phone, followers, status) values
  ('a0000000-0000-0000-0000-000000000001', 'Marième Fall', '+221 77 123 45 67', 12400, 'actif'),
  ('a0000000-0000-0000-0000-000000000001', 'Ndeye Kébé', '+221 76 234 56 78', 8200, 'actif'),
  ('a0000000-0000-0000-0000-000000000001', 'Saliou Kane', '+221 78 345 67 89', 5800, 'invite')
on conflict do nothing;

-- 7. Commandes
insert into public.orders (merchant_id, seller_id, customer_name, customer_phone, total_amount, commission_amount, status) values
  ('a0000000-0000-0000-0000-000000000001',
   (select id from public.sellers where display_name = 'Marième Fall' limit 1),
   'Fatou Sarr', '+221 77 987 65 43', 28500, 3420, 'a_preparer'),
  ('a0000000-0000-0000-0000-000000000001',
   (select id from public.sellers where display_name = 'Ndeye Kébé' limit 1),
   'Moussa Diop', '+221 76 876 54 32', 19700, 1970, 'en_livraison'),
  ('a0000000-0000-0000-0000-000000000001',
   (select id from public.sellers where display_name = 'Marième Fall' limit 1),
   'Awa Ndiaye', '+221 78 765 43 21', 12500, 1500, 'livree')
on conflict do nothing;

-- 8. Zones de livraison
insert into public.delivery_zones (merchant_id, name, fee, is_active) values
  ('a0000000-0000-0000-0000-000000000001', 'Dakar centre', 1500, true),
  ('a0000000-0000-0000-0000-000000000001', 'Almadies & Ngor', 2000, true),
  ('a0000000-0000-0000-0000-000000000001', 'Pikine & Guédiawaye', 2000, true),
  ('a0000000-0000-0000-0000-000000000001', 'Rufisque & Diamniadio', 3000, false),
  ('a0000000-0000-0000-0000-000000000001', 'Thiès', 4500, false)
on conflict do nothing;

-- 9. Paiements
insert into public.payments (merchant_id, amount, method, status, reference, paid_at) values
  ('a0000000-0000-0000-0000-000000000001', 62300, 'wave', 'verse', 'WV-24061401', '2024-06-14T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 48800, 'wave', 'verse', 'WV-24053101', '2024-05-31T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 36500, 'orange_money', 'verse', 'OM-24051501', '2024-05-15T10:00:00Z')
on conflict do nothing;
