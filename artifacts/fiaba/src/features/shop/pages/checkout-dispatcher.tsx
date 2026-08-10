import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Checkout } from './checkout';
import { DigitalCheckout } from './digital-checkout';

export function CheckoutDispatcher() {
  const { id } = useParams<{ id: string }>();
  const [productType, setProductType] = useState<'physique' | 'digital' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkType() {
      if (!id) {
        setLoading(false);
        return;
      }

      const { data: raw } = await supabase
        .from('campaigns')
        .select(`
          product_id,
          products:product_id (type)
        `)
        .eq('id', id)
        .maybeSingle();

      const c = raw as { products: { type?: 'physique' | 'digital' | null } | null } | null;
      if (c?.products?.type === 'digital') {
        setProductType('digital');
      } else {
        setProductType('physique');
      }
      setLoading(false);
    }

    checkType().catch(() => {
      setProductType('physique');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
        <div className="text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent inline-block" />
          <p className="mt-3 text-xs font-bold text-[#77738a]">Préparation de la page de paiement…</p>
        </div>
      </div>
    );
  }

  if (productType === 'digital') {
    return <DigitalCheckout />;
  }

  return <Checkout />;
}
