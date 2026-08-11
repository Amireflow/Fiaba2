-- ============================================================================
-- Fiaba — Migration 0037 : Assets de branding (logos) pilotés par l'admin
-- ============================================================================
-- Table platform_assets : stocke les URLs des logos uploadés depuis l'admin.
-- Bucket storage 'logos' : public en lecture, admin-only en écriture.
-- ============================================================================

-- 1. Table des assets de branding
CREATE TABLE IF NOT EXISTS public.platform_assets (
  key            text PRIMARY KEY,
  label          text NOT NULL,
  url            text NOT NULL DEFAULT '',
  file_name      text NOT NULL DEFAULT '',
  mime_type      text NOT NULL DEFAULT 'image/png',
  width          integer NOT NULL DEFAULT 0,
  height         integer NOT NULL DEFAULT 0,
  display_height integer NOT NULL DEFAULT 48,
  format         text NOT NULL DEFAULT 'png',
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Lignes par défaut pour les trois logos
INSERT INTO public.platform_assets (key, label, display_height) VALUES
  ('logo_clair',  'Logo clair (fond clair)',  48),
  ('logo_sombre', 'Logo sombre (fond sombre)', 48),
  ('logo_icone',  'Icône / favicon',           64)
ON CONFLICT (key) DO NOTHING;

-- 2. RLS : lecture publique (logos affichés partout), écriture admin uniquement
ALTER TABLE public.platform_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_assets_public_read ON public.platform_assets;
CREATE POLICY platform_assets_public_read ON public.platform_assets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS platform_assets_admin_write ON public.platform_assets;
CREATE POLICY platform_assets_admin_write ON public.platform_assets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. Bucket storage 'logos' — public en lecture
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,  -- 5 Mo max
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];

-- 4. RLS sur storage.objects pour le bucket 'logos'
DROP POLICY IF EXISTS "Public Read Logos" ON storage.objects;
CREATE POLICY "Public Read Logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Admin Write Logos" ON storage.objects;
CREATE POLICY "Admin Write Logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin Update Logos" ON storage.objects;
CREATE POLICY "Admin Update Logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin Delete Logos" ON storage.objects;
CREATE POLICY "Admin Delete Logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. Commentaires
COMMENT ON TABLE public.platform_assets IS 'Assets de branding (logos) pilotés depuis l''admin';
COMMENT ON COLUMN public.platform_assets.display_height IS 'Hauteur d''affichage recommandée en px (utilisé par le frontend)';
