import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, useSupabaseQuery, supabaseInsert, supabaseUpdate } from '@/hooks/use-supabase-query';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
  textareaClass,
} from '../components/merchant-ui';

type ProductOption = { id: string; name: string; price: number };

type FormState = {
  name: string;
  description: string;
  commission: string;
  commissionType: 'percentage' | 'fixed';
  model: 'commission' | 'marge';
  goal: string;
  productId: string;
  endDate: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  commission: '10',
  commissionType: 'percentage',
  model: 'commission',
  goal: '50',
  productId: '',
  endDate: '',
};

export function CampaignForm() {
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

  // Load existing campaign
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    supabase
      .from('campaigns')
      .select('name, description, commission, commission_type, model, goal, product_id, ends_at')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const c = data as {
            name: string; description: string | null; commission: number;
            commission_type: string | null; model: string; goal: number | null;
            product_id: string | null; ends_at: string | null;
          };
          setForm({
            name: c.name,
            description: c.description ?? '',
            commission: String(c.commission),
            commissionType: (c.commission_type as 'percentage' | 'fixed') ?? 'percentage',
            model: (c.model as 'commission' | 'marge') ?? 'commission',
            goal: String(c.goal ?? 50),
            productId: c.product_id ?? '',
            endDate: c.ends_at ? c.ends_at.slice(0, 10) : '',
          });
        }
        setLoading(false);
      });
  }, [id, isEdit]);

  // Auto-select first product if creating
  useEffect(() => {
    if (!isEdit && !form.productId && products.length > 0) {
      setForm((prev) => ({ ...prev, productId: products[0].id }));
    }
  }, [products, isEdit, form.productId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedProduct = products.find((p) => p.id === form.productId);
  const commissionPreview = selectedProduct
    ? form.commissionType === 'percentage'
      ? Math.round((selectedProduct.price * Number(form.commission || 0)) / 100)
      : Number(form.commission || 0)
    : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let activeMerchantId = merchantId;

    if (!activeMerchantId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (userId) {
        const { data: merch } = await (supabase.from('merchants') as any)
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();

        if (merch?.id) {
          activeMerchantId = merch.id;
        } else {
          const { data: newMerch } = await (supabase.from('merchants') as any)
            .insert({
              owner_id: userId,
              name: 'Ma Boutique Fiaba',
              slug: `boutique-${userId.slice(0, 6)}`,
            })
            .select('id')
            .single();
          if (newMerch?.id) {
            activeMerchantId = newMerch.id;
          }
        }
      }
    }

    if (!activeMerchantId) {
      toast({ title: 'Erreur', description: 'Impossible de trouver votre boutique.' });
      return;
    }
    const commission = Number(form.commission);
    if (!form.name.trim()) {
      haptic('error');
      toast({ title: 'Nom requis', description: 'Donnez un nom à votre campagne.' });
      return;
    }
    if (isNaN(commission) || commission < 0) {
      haptic('error');
      toast({ title: 'Commission invalide', description: 'Vérifiez le montant de la commission.' });
      return;
    }
    if (form.commissionType === 'percentage' && commission > 50) {
      haptic('error');
      toast({ title: 'Commission trop élevée', description: 'Le pourcentage maximum est 50%.' });
      return;
    }
    if (form.commissionType === 'fixed' && commission > (selectedProduct?.price ?? 0)) {
      haptic('error');
      toast({ title: 'Commission trop élevée', description: `Le montant ne peut pas dépasser le prix du produit (${money(selectedProduct?.price ?? 0)}).` });
      return;
    }

    setSaving(true);
    haptic('medium');

    const payload = {
      merchant_id: activeMerchantId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      commission,
      commission_type: form.commissionType,
      model: form.model,
      goal: Number(form.goal) || null,
      product_id: form.productId || null,
      ends_at: form.endDate ? new Date(form.endDate).toISOString() : null,
      status: 'active',
    };

    if (isEdit && id) {
      const { error } = await supabaseUpdate('campaigns', id, payload);
      setSaving(false);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error });
      } else {
        haptic('success');
        toast({ title: 'Campagne modifiée', description: `${payload.name} a été mise à jour.` });
        navigate('/merchant/campaigns');
      }
    } else {
      const { error } = await supabaseInsert('campaigns', payload);
      setSaving(false);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error });
      } else {
        haptic('success');
        toast({ title: 'Campagne lancée', description: `${payload.name} est active dans votre réseau.` });
        navigate('/merchant/campaigns');
      }
    }
  }

  if (loading) {
    return (
      <Page eyebrow="Chargement" title="…" description="">
        <div className="mt-6 flex items-center justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={isEdit ? 'Modifier' : 'Nouvelle'}
      title={isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
      description="Définissez les paramètres de votre campagne et le type de rémunération."
      action={
        <Link href="/merchant/campaigns">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <Card className="mt-6">
        <form onSubmit={save} className="space-y-5">
          <Field label="Nom de la campagne">
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ex. Rentrée douce — septembre" className={inputClass} data-testid="input-name" />
          </Field>
          <Field label="Description" hint="Visible par vos vendeurs dans l'espace campagne.">
            <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Décrivez l'objectif et les produits mis en avant…" className={`${textareaClass} min-h-20`} data-testid="input-description" />
          </Field>
          <Field label="Produit mis en avant">
            <select value={form.productId} onChange={(e) => setField('productId', e.target.value)} className={selectClass} data-testid="input-product">
              <option value="">— Sélectionnez —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
            </select>
          </Field>

          {/* Commission type selector */}
          <Field label="Type de rémunération" hint="Choisissez comment vos vendeurs sont payés.">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { haptic('light'); setField('commissionType', 'percentage'); }}
                className={`rounded-2xl border-2 p-4 text-left transition ${form.commissionType === 'percentage' ? 'border-[#5b49e8] bg-[#f6f5ff]' : 'border-[#eeeaf6] bg-white hover:border-[#d4ceff]'}`}
                data-testid="button-commission-percentage"
              >
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${form.commissionType === 'percentage' ? 'border-[#5b49e8] bg-[#5b49e8]' : 'border-[#c4c0d6]'}`}>
                    {form.commissionType === 'percentage' && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="text-sm font-bold text-[#292541]">Pourcentage</span>
                </div>
                <p className="mt-2 text-xs leading-4 text-[#77738a]">Le vendeur touche un % du prix de vente. Ex: 12% sur un produit à 12 500 F = 1 500 F.</p>
              </button>
              <button
                type="button"
                onClick={() => { haptic('light'); setField('commissionType', 'fixed'); }}
                className={`rounded-2xl border-2 p-4 text-left transition ${form.commissionType === 'fixed' ? 'border-[#5b49e8] bg-[#f6f5ff]' : 'border-[#eeeaf6] bg-white hover:border-[#d4ceff]'}`}
                data-testid="button-commission-fixed"
              >
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${form.commissionType === 'fixed' ? 'border-[#5b49e8] bg-[#5b49e8]' : 'border-[#c4c0d6]'}`}>
                    {form.commissionType === 'fixed' && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="text-sm font-bold text-[#292541]">Montant fixe</span>
                </div>
                <p className="mt-2 text-xs leading-4 text-[#77738a]">Le vendeur touche un montant fixe par vente. Ex: 1 500 F par commande, quel que soit le prix.</p>
              </button>
            </div>
          </Field>

          {/* Commission value + model */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={form.commissionType === 'percentage' ? 'Commission (%)' : 'Commission (FCFA)'} hint={form.commissionType === 'percentage' ? 'Part reversée au vendeur (0-50%)' : 'Montant fixe par vente'}>
              <input
                type="number"
                min="0"
                max={form.commissionType === 'percentage' ? 50 : selectedProduct?.price ?? 999999}
                value={form.commission}
                onChange={(e) => setField('commission', e.target.value)}
                className={inputClass}
                data-testid="input-commission"
              />
            </Field>
            <Field label="Modèle" hint="Commission = sur vente, Marge = sur marge brute">
              <select value={form.model} onChange={(e) => setField('model', e.target.value as 'commission' | 'marge')} className={selectClass} data-testid="input-model">
                <option value="commission">Commission (sur vente)</option>
                <option value="marge">Marge (sur marge brute)</option>
              </select>
            </Field>
          </div>

          {/* Commission preview */}
          {selectedProduct && (
            <div className="rounded-2xl bg-[#f8f7fc] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Aperçu de la commission vendeur</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#77738a]">Produit : {selectedProduct.name}</p>
                  <p className="text-xs text-[#77738a]">Prix : {money(selectedProduct.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#9290a2]">Le vendeur reçoit</p>
                  <strong className="font-[Space_Grotesk] text-xl font-bold text-[#278e69]">{money(commissionPreview)}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Objectif (ventes)">
              <input type="number" min="1" value={form.goal} onChange={(e) => setField('goal', e.target.value)} className={inputClass} data-testid="input-goal" />
            </Field>
            <Field label="Date de fin" hint="Optionnel">
              <input type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} className={inputClass} data-testid="input-end-date" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/merchant/campaigns"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" disabled={saving} testId="button-save-campaign">{saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Lancer la campagne'}</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
