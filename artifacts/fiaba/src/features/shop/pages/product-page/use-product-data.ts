import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatShopName } from '@/lib/utils';
import type { ProductData } from './types';

export function useProductData(id: string | undefined) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadProduct(id).then((p) => { setProduct(p); setLoading(false); });
  }, [id]);

  return { product, loading };
}

async function loadProduct(id: string): Promise<ProductData | null> {
  const productId = id.startsWith('prod-camp-') ? id.replace('prod-camp-', '') : id;

  // 1. Try campaign by id
  const camp = await tryCampaign('id', id);
  if (camp) return camp;

  // 2. Try campaign by product_id
  const campByProd = await tryCampaign('product_id', productId);
  if (campByProd) return campByProd;

  // 3. Direct product
  const { data: prodRaw } = await supabase
    .from('products')
    .select('id, name, description, price, image_url, category, type, ai_headline, ai_benefits, ai_faq, ai_cta_text, merchant_id, merchants:merchant_id(id, name)')
    .eq('id', productId)
    .maybeSingle();

  if (!prodRaw) return null;
  const p = prodRaw as any;
  return {
    id: p.id, name: p.name, description: p.description, price: p.price,
    image_url: p.image_url, category: p.category, type: p.type ?? 'physique',
    merchant_id: p.merchant_id, merchant_name: formatShopName(p.merchants?.name),
    ai_headline: p.ai_headline ?? null, ai_benefits: p.ai_benefits ?? null,
    ai_faq: p.ai_faq ?? null, ai_cta_text: p.ai_cta_text ?? null, campaign_id: null,
  };
}

async function tryCampaign(field: string, value: string): Promise<ProductData | null> {
  const { data } = await supabase
    .from('campaigns')
    .select(`
      id, product_id, merchant_id,
      products:product_id (id, name, description, price, image_url, category, type, ai_headline, ai_benefits, ai_faq, ai_cta_text),
      merchants:merchant_id (id, name)
    `)
    .eq(field, value)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const c = data as any;
  const p = c.products;
  if (!p) return null;
  return {
    id: p.id, name: p.name, description: p.description, price: p.price,
    image_url: p.image_url, category: p.category, type: p.type ?? 'physique',
    merchant_id: c.merchant_id, merchant_name: formatShopName(c.merchants?.name),
    ai_headline: p.ai_headline ?? null, ai_benefits: p.ai_benefits ?? null,
    ai_faq: p.ai_faq ?? null, ai_cta_text: p.ai_cta_text ?? null, campaign_id: c.id,
  };
}
