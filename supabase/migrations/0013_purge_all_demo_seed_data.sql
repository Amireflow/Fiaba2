-- ============================================================================
-- Fiaba — Migration 0013 : Purge Intégrale des Données Fictives de Démonstration (Seed)
-- ============================================================================

-- 1. Nettoyage des litiges fictifs
delete from public.disputes
where opened_by in (
  select id from public.profiles where email in ('marchand@fiaba.sn', 'vendeur@fiaba.sn')
);

-- 2. Nettoyage des versements / retraits fictifs
delete from public.payouts
where seller_id in (
  select id from public.sellers where display_name in ('Marième Fall', 'Ndeye Kébé', 'Saliou Kane')
);

-- 3. Nettoyage des commissions fictives
delete from public.commissions
where seller_id in (
  select id from public.sellers where display_name in ('Marième Fall', 'Ndeye Kébé', 'Saliou Kane')
)
or campaign_id in (
  select id from public.campaigns where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille')
);

-- 4. Nettoyage des livraisons fictives
delete from public.deliveries
where order_id in (
  select id from public.orders where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye')
);

-- 5. Nettoyage des éléments de commandes fictives
delete from public.order_items
where order_id in (
  select id from public.orders where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye')
);

-- 6. Nettoyage des commandes fictives
delete from public.orders
where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye')
or merchant_id = 'a0000000-0000-0000-0000-000000000001';

-- 7. Nettoyage des liens de suivi fictifs
delete from public.tracking_links
where seller_id in (
  select id from public.sellers where display_name in ('Marième Fall', 'Ndeye Kébé', 'Saliou Kane')
);

-- 8. Nettoyage des adhésions vendeurs aux campagnes fictives
delete from public.campaign_sellers
where campaign_id in (
  select id from public.campaigns where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille')
)
or seller_id in (
  select id from public.sellers where display_name in ('Marième Fall', 'Ndeye Kébé', 'Saliou Kane')
);

-- 9. Nettoyage des campagnes fictives
delete from public.campaigns
where name in ('Rentrée douce — septembre', 'Le goût de chez nous', 'Week-end famille')
or merchant_id = 'a0000000-0000-0000-0000-000000000001';

-- 10. Nettoyage des produits fictifs
delete from public.products
where name in ('Coffret Soin Karité', 'Boubou Ndar — Indigo', 'Panier petit-déjeuner', 'Huile de Baobab 100ml')
or merchant_id = 'a0000000-0000-0000-0000-000000000001';

-- 11. Nettoyage des vendeurs fictifs
delete from public.sellers
where display_name in ('Marième Fall', 'Ndeye Kébé', 'Saliou Kane')
or merchant_id = 'a0000000-0000-0000-0000-000000000001';

-- 12. Nettoyage des boutiques fictives
delete from public.merchants
where id = 'a0000000-0000-0000-0000-000000000001'
or name = 'Maison Ndar';

-- 13. Nettoyage des profils fictifs (sauf l'administrateur réél)
delete from public.profiles
where email in ('marchand@fiaba.sn', 'vendeur@fiaba.sn');
