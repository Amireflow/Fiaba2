-- ============================================================================
-- Fiaba — Migration 0032 : Persistance des réglages marchand
-- ============================================================================
--
-- La page « Réglages » de l'espace marchand exposait deux blocs qui n'étaient
-- reliés à aucune colonne : les préférences de notification et le compte de
-- versement (opérateur + numéro). L'utilisateur pouvait les modifier, voir un
-- retour visuel de succès, puis tout perdre au rechargement de la page.
--
-- On ajoute les colonnes correspondantes pour que ces réglages soient
-- réellement persistés.
-- ============================================================================

alter table public.merchants
  add column if not exists notification_preferences jsonb not null
    default '{"orders": true, "sellers": true, "tips": false}'::jsonb;

alter table public.merchants
  add column if not exists payout_provider text;

alter table public.merchants
  add column if not exists payout_number text;

comment on column public.merchants.notification_preferences is
  'Préférences de notification du marchand : {orders, sellers, tips}.';
comment on column public.merchants.payout_provider is
  'Opérateur de versement choisi par le marchand (wave, orange_money, ...).';
comment on column public.merchants.payout_number is
  'Numéro du compte de versement du marchand.';
