-- Migration 0020: Digital Products Integration
-- Add type, digital_file_url, digital_access_instructions to products
-- Add digital_download_token, digital_download_count, digital_download_expires_at to orders

-- 1. Update products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'physique' CHECK (type IN ('physique', 'digital')),
ADD COLUMN IF NOT EXISTS digital_file_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS digital_access_instructions text DEFAULT NULL;

-- 2. Update orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS digital_download_token text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS digital_download_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS digital_download_expires_at timestamp with time zone DEFAULT NULL;

-- 3. Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_orders_digital_download_token ON public.orders(digital_download_token);

-- 4. Create digital-files storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-files', 'digital-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for digital-files storage
CREATE POLICY "Public Read Digital Files" ON storage.objects
FOR SELECT USING (bucket_id = 'digital-files');

CREATE POLICY "Authenticated Insert Digital Files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'digital-files' AND auth.role() = 'authenticated');
