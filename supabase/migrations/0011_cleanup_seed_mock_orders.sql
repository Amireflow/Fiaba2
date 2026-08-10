-- ============================================================================
-- Fiaba — Migration 0011 : Nettoyage des Commandes Fictives de Démonstration (Seed)
-- ============================================================================

-- Suppression des éléments de commandes fictives créées par le seed
delete from public.order_items
where order_id in (
  select id from public.orders
  where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye')
);

-- Suppression des commissions associées aux commandes fictives
delete from public.commissions
where order_id in (
  select id from public.orders
  where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye')
);

-- Suppression des livraisons associées aux commandes fictives
delete from public.deliveries
where order_id in (
  select id from public.orders
  where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye')
);

-- Suppression des commandes fictives de démonstration
delete from public.orders
where customer_name in ('Fatou Sarr', 'Moussa Diop', 'Awa Ndiaye');
