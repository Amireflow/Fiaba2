-- ============================================================================
-- Fiaba — Migration 0029 : Champs IA pour Landing Page Produit
-- ============================================================================
-- Ajoute les champs générés par l'IA (Gemini) sur la table products
-- pour créer des pages de vente optimisées pour la conversion.
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ai_headline text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_benefits jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_faq jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_cta_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_generation_count integer NOT NULL DEFAULT 0;

-- Commentaire pour documentation
COMMENT ON COLUMN public.products.ai_headline IS 'Accroche marketing générée par IA';
COMMENT ON COLUMN public.products.ai_benefits IS 'Array JSON [{icon, title, text}] — bénéfices produit générés par IA';
COMMENT ON COLUMN public.products.ai_faq IS 'Array JSON [{question, answer}] — FAQ générée par IA';
COMMENT ON COLUMN public.products.ai_cta_text IS 'Texte du bouton d''appel à l''action généré par IA';
COMMENT ON COLUMN public.products.ai_generated_at IS 'Date de la dernière génération IA';
COMMENT ON COLUMN public.products.ai_generation_count IS 'Nombre de générations IA (limite: 3 par produit)';
