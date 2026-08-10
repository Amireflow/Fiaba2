import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, useSupabaseQuery, supabaseInsert, supabaseUpdate, getOrCreateMerchantId } from '@/hooks/use-supabase-query';
import { emptyForm, type FormState, type ProductOption } from './types';

export function useCampaignForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const isEdit = !!id;

  const { data: products } = useSupabaseQuery<ProductOption>('products', {
    select: 'id, name, price',
    filter: { merchant_id: merchantId, status: 'actif' },
    order: { column: 'name', ascending: true },
    enabled: !!merchantId,
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    supabase.from('campaigns')
      .select('name, description, commission, commission_type, goal, product_id, ends_at')
      .eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          const c = data as any;
          setForm({
            name: c.name, description: c.description ?? '', commission: String(c.commission),
            commissionType: (c.commission_type as 'percentage' | 'fixed') ?? 'percentage',
            goal: String(c.goal ?? 50), productId: c.product_id ?? '',
            endDate: c.ends_at ? c.ends_at.slice(0, 10) : '',
          });
        }
        setLoading(false);
      });
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit && !form.productId && products.length > 0)
      setForm((prev) => ({ ...prev, productId: products[0].id }));
  }, [products, isEdit, form.productId]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectedProduct = products.find((p) => p.id === form.productId);
  const commissionPreview = selectedProduct
    ? form.commissionType === 'percentage'
      ? Math.round((selectedProduct.price * Number(form.commission || 0)) / 100)
      : Number(form.commission || 0)
    : 0;

  const save = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const activeMerchantId = await getOrCreateMerchantId(merchantId);
    if (!activeMerchantId) { toast({ title: 'Erreur', description: 'Boutique introuvable.' }); return; }

    const commission = Number(form.commission);
    if (!form.name.trim()) { haptic('error'); toast({ title: 'Nom requis', description: 'Donnez un nom à votre campagne.' }); return; }
    if (isNaN(commission) || commission < 0) { haptic('error'); toast({ title: 'Commission invalide' }); return; }
    if (form.commissionType === 'percentage' && commission > 50) { haptic('error'); toast({ title: 'Commission trop élevée', description: 'Maximum 50%.' }); return; }
    if (form.commissionType === 'fixed' && commission > (selectedProduct?.price ?? 0)) {
      haptic('error'); toast({ title: 'Commission trop élevée', description: `Max: ${money(selectedProduct?.price ?? 0)}.` }); return;
    }

    if (!isEdit) {
      const { data: sub } = await (supabase.from('merchant_subscriptions') as any).select('plan_id').eq('merchant_id', activeMerchantId).maybeSingle();
      let maxCampaigns = 2;
      if (sub?.plan_id) {
        const { data: plan } = await (supabase.from('subscription_plans') as any).select('max_active_campaigns').eq('id', sub.plan_id).maybeSingle();
        if (plan?.max_active_campaigns) maxCampaigns = plan.max_active_campaigns;
      }
      const { count } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('merchant_id', activeMerchantId).eq('status', 'active');
      if ((count ?? 0) >= maxCampaigns) { haptic('error'); toast({ title: 'Quota atteint', description: `Limite de ${maxCampaigns} campagnes actives.` }); return; }
    }

    setSaving(true);
    haptic('medium');
    const payload = {
      merchant_id: activeMerchantId, name: form.name.trim(), description: form.description.trim() || null,
      commission, commission_type: form.commissionType, model: 'commission',
      goal: Number(form.goal) || null, product_id: form.productId || null,
      ends_at: form.endDate ? new Date(form.endDate).toISOString() : null, status: 'active',
    };

    if (isEdit && id) {
      const { error } = await supabaseUpdate('campaigns', id, payload);
      setSaving(false);
      if (error) { haptic('error'); toast({ title: 'Erreur', description: error }); return; }
      haptic('success'); toast({ title: 'Campagne modifiée', description: `${payload.name} mise à jour.` });
      navigate('/merchant/campaigns');
    } else {
      const { error } = await supabaseInsert('campaigns', payload);
      if (error) { setSaving(false); haptic('error'); toast({ title: 'Erreur', description: error }); return; }

      if (form.productId) {
        setAiGenerating(true);
        try {
          const { error: aiError } = await supabase.functions.invoke('generate-product-ai', { body: { product_id: form.productId } });
          if (aiError) throw aiError;
          haptic('success');
          toast({ title: 'Campagne lancée + Page IA générée !', description: `${payload.name} est active. Page de vente IA générée.` });
        } catch {
          haptic('success');
          toast({ title: 'Campagne lancée', description: `${payload.name} est active. Générez la page IA depuis le formulaire produit.` });
        }
        setAiGenerating(false);
      } else {
        haptic('success');
        toast({ title: 'Campagne lancée', description: `${payload.name} est active.` });
      }
      setSaving(false);
      navigate('/merchant/campaigns');
    }
  }, [form, isEdit, id, merchantId, navigate, toast, selectedProduct]);

  return { id, isEdit, form, products, loading, saving, aiGenerating, selectedProduct, commissionPreview, setField, save };
}
