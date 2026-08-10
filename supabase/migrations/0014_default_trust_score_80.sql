-- ============================================================================
-- Fiaba — Migration 0014 : Ajustement du Trust Score Initial (Score par Défaut à 80)
-- ============================================================================

-- Définir le score de confiance initial par défaut des nouveaux utilisateurs à 80/100
alter table public.profiles alter column trust_score set default 80;

-- Mettre à jour les utilisateurs existants qui avaient un score neutre par défaut de 50 à 80
update public.profiles
set trust_score = 80
where trust_score = 50 or trust_score is null;
