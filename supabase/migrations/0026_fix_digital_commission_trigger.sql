-- ============================================================================
-- Fiaba — Migration 0026 : Déblocage Immédiat des Commissions pour Produits Digitaux
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_at timestamptz;
  v_product_type text := 'physique';
  v_initial_status commission_status := 'pending';
BEGIN
  IF new.seller_id IS NOT NULL AND new.commission_amount > 0 THEN
    -- Vérifier le type du produit attaché à la campagne
    SELECT coalesce(p.type, 'physique') INTO v_product_type
    FROM public.campaigns c
    LEFT JOIN public.products p ON p.id = c.product_id
    WHERE c.id = new.campaign_id;

    -- Si produit digital, commission immédiatement disponible sans délai de 14 jours
    IF v_product_type = 'digital' THEN
      v_initial_status := 'available';
      v_available_at := now();
    ELSE
      v_initial_status := 'pending';
      v_available_at := now() + interval '14 days';
    END IF;

    -- Insertion idempotente de la commission
    IF NOT EXISTS (SELECT 1 FROM public.commissions WHERE order_id = new.id AND seller_id = new.seller_id) THEN
      INSERT INTO public.commissions (seller_id, order_id, campaign_id, amount, status, model, available_at)
      VALUES (
        new.seller_id,
        new.id,
        new.campaign_id,
        new.commission_amount,
        v_initial_status,
        coalesce(new.commission_model, 'commission'),
        v_available_at
      );
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_commission ON public.orders;
CREATE TRIGGER trg_auto_commission
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_commission();
