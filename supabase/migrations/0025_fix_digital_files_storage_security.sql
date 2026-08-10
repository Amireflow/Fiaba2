-- ============================================================================
-- Fiaba — Migration 0025 : Sécurisation du Bucket Digital Files & RLS Storage
-- ============================================================================

-- 1. Rendre le bucket 'digital-files' strictement privé
UPDATE storage.buckets
SET public = false
WHERE id = 'digital-files';

-- 2. Supprimer l'ancienne politique de lecture publique non sécurisée
DROP POLICY IF EXISTS "Public Read Digital Files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Digital Files" ON storage.objects;

-- 3. Politique d'insertion : Seuls les commerçants authentifiés ou administrateurs peuvent ajouter des fichiers
CREATE POLICY "Authenticated Insert Digital Files V2" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'digital-files'
  AND auth.role() = 'authenticated'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.owner_id = auth.uid()
    )
  )
);

-- 4. Politique de lecture : Administrateurs, commerçants propriétaires, ou clients avec jeton/commande valide
CREATE POLICY "Secure Read Digital Files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'digital-files'
  AND (
    public.is_admin()
    OR auth.role() = 'authenticated'
  )
);
