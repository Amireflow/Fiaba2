-- Migration 0021: Add low_stock_threshold and weight to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS weight numeric(10,2) DEFAULT NULL;
