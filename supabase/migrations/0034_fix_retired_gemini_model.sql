-- ============================================================================
-- Fiaba — Migration 0034 : Remplacement du modèle Gemini retiré
-- ============================================================================
--
-- La configuration IA utilisait `gemini-1.5-flash` comme modèle par défaut.
-- Google a retiré cette génération de modèles : l'API Generative Language
-- répond désormais 404 « model not found » pour `gemini-1.5-flash`,
-- `gemini-1.5-flash-latest` et `gemini-1.5-pro`. L'Edge Function
-- generate-product-ai traduisait ce 404 en réponse 502, ce qui se manifestait
-- côté marchand par « Edge Function returned a non-2xx status code ».
--
-- On bascule sur l'alias `gemini-flash-latest`, qui suit automatiquement la
-- version stable courante du modèle rapide et évite de refaire cette migration
-- à chaque génération de modèles.
-- ============================================================================

alter table public.ai_settings
  alter column model set default 'gemini-flash-latest';

-- Migrer les configurations existantes qui pointent encore vers un modèle
-- retiré. Les choix explicites d'un autre modèle sont préservés.
update public.ai_settings
set model = 'gemini-flash-latest'
where model is null
   or model = ''
   or model like 'gemini-1.0%'
   or model like 'gemini-1.5%'
   or model = 'gemini-pro';

comment on column public.ai_settings.model is
  'Modèle Gemini utilisé (gemini-flash-latest par défaut). Les modèles Gemini 1.0 et 1.5 sont retirés par Google.';
