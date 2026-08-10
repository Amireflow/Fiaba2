-- ============================================================================
-- Fiaba — Migration 0030 : Paramètres IA (clé API Gemini)
-- ============================================================================
-- Table singleton pour stocker la configuration IA côté admin.
-- Une seule ligne (id=1) — la clé API est chiffrée côté application.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id           integer PRIMARY KEY DEFAULT 1,
  gemini_api_key text    NOT NULL DEFAULT '',
  model        text    NOT NULL DEFAULT 'gemini-1.5-flash',
  max_generations integer NOT NULL DEFAULT 3,
  is_enabled   boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insérer la ligne par défaut
INSERT INTO public.ai_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- RLS : seul l'admin peut lire/écrire
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_settings_admin_read ON public.ai_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY ai_settings_admin_write ON public.ai_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Commentaires
COMMENT ON TABLE public.ai_settings IS 'Configuration IA (clé API Gemini, modèle, limites)';
COMMENT ON COLUMN public.ai_settings.gemini_api_key IS 'Clé API Google Gemini — configurée par l''admin';
COMMENT ON COLUMN public.ai_settings.model IS 'Modèle Gemini utilisé (gemini-1.5-flash par défaut)';
COMMENT ON COLUMN public.ai_settings.max_generations IS 'Nombre max de générations IA par produit';
COMMENT ON COLUMN public.ai_settings.is_enabled IS 'Active/désactive la génération IA sur la plateforme';
