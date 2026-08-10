-- Migration 0023: Make merchant_id optional in sellers table for global affiliate network
ALTER TABLE public.sellers
  ALTER COLUMN merchant_id DROP NOT NULL;
