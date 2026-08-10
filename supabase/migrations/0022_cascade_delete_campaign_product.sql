-- Migration 0022: Cascade Delete Campaigns on Product Deletion
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_product_id_fkey,
ADD CONSTRAINT campaigns_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;
