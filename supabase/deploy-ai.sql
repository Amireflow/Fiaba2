-- ============================================================================
-- Fiaba — Script de déploiement IA complet
-- ============================================================================
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- Ce script crée :
-- 1. Les champs IA sur la table products (migration 0029)
-- 2. La table ai_settings pour la configuration (migration 0030)
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ PARTIE 1 : Champs IA sur products (migration 0029)                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ai_headline text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_benefits jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_faq jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_cta_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_generation_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.products.ai_headline IS 'Accroche marketing générée par IA';
COMMENT ON COLUMN public.products.ai_benefits IS 'Array JSON [{icon, title, text}] — bénéfices produit générés par IA';
COMMENT ON COLUMN public.products.ai_faq IS 'Array JSON [{question, answer}] — FAQ générée par IA';
COMMENT ON COLUMN public.products.ai_cta_text IS 'Texte du bouton d''appel à l''action généré par IA';
COMMENT ON COLUMN public.products.ai_generated_at IS 'Date de la dernière génération IA';
COMMENT ON COLUMN public.products.ai_generation_count IS 'Nombre de générations IA (limite configurable)';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ PARTIE 2 : Table ai_settings (migration 0030)                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id              integer PRIMARY KEY DEFAULT 1,
  gemini_api_key  text    NOT NULL DEFAULT '',
  model           text    NOT NULL DEFAULT 'gemini-1.5-flash',
  max_generations integer NOT NULL DEFAULT 3,
  is_enabled      boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.ai_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_settings_admin_read ON public.ai_settings;
CREATE POLICY ai_settings_admin_read ON public.ai_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS ai_settings_admin_write ON public.ai_settings;
CREATE POLICY ai_settings_admin_write ON public.ai_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.ai_settings IS 'Configuration IA (clé API Gemini, modèle, limites)';
COMMENT ON COLUMN public.ai_settings.gemini_api_key IS 'Clé API Google Gemini — configurée par l''admin';
COMMENT ON COLUMN public.ai_settings.model IS 'Modèle Gemini utilisé (gemini-1.5-flash par défaut)';
COMMENT ON COLUMN public.ai_settings.max_generations IS 'Nombre max de générations IA par produit';
COMMENT ON COLUMN public.ai_settings.is_enabled IS 'Active/désactive la génération IA sur la plateforme';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ PARTIE 3 : Vérification                                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Affiche l'état de la configuration IA après exécution
SELECT '✅ Champs IA sur products' as etape, count(*) as colonnes
FROM information_schema.columns WHERE table_name = 'products' AND column_name LIKE 'ai_%'
UNION ALL
SELECT '✅ Table ai_settings créée', count(*)::int
FROM information_schema.tables WHERE table_name = 'ai_settings';
