import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Tag01Icon, Target01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
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
  goal: string;
  productId: string;
  endDate: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  commission: '10',
  commissionType: 'percentage',
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
      .select('name, description, commission, commission_type, goal, product_id, ends_at')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const c = data as {
            name: string; description: string | null; commission: number;
            commission_type: string | null; goal: number | null;
            product_id: string | null; ends_at: string | null;
          };
          setForm({
            name: c.name,
            description: c.description ?? '',
            commission: String(c.commission),
            commissionType: (c.commission_type as 'percentage' | 'fixed') ?? 'percentage',
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
      model: 'commission',
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
      description="Définissez les paramètres de votre campagne et la rémunération de vos vendeurs."
      action={
        <Link href="/merchant/campaigns">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        {/* Left column: Main form */}
        <Card>
          <form onSubmit={save} className="space-y-4">
            <Field label="Nom de la campagne">
              <input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Ex. Offre Spéciale Rentrée"
                className={inputClass}
                data-testid="input-name"
              />
            </Field>

            <Field label="Produit mis en avant">
              <select
                value={form.productId}
                onChange={(e) => setField('productId', e.target.value)}
                className={selectClass}
                data-testid="input-product"
              >
                <option value="">— Sélectionnez un produit —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)}
                  </option>
                ))}
              </select>
            </Field>

            {/* Type de Rémunération épuré */}
            <Field label="Type de commission">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => { haptic('light'); setField('commissionType', 'percentage'); }}
                  className={`rounded-2xl border px-3.5 py-3 text-left transition flex items-center justify-between ${
                    form.commissionType === 'percentage'
                      ? 'border-[#5b49e8] bg-[#f7f6ff] text-[#292541]'
                      : 'border-[#e7e5ef] bg-white text-[#757185] hover:border-[#d0cbdc] hover:bg-[#fafafc]'
                  }`}
                  data-testid="button-commission-percentage"
                >
                  <div>
                    <strong className="block text-xs font-bold">Pourcentage (%)</strong>
                    <span className="text-[10px] text-[#77738a] block mt-0.5">% par vente livrée</span>
                  </div>
                  {form.commissionType === 'percentage' && (
                    <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[#5b49e8] text-white">
                      <Icon glyph={CheckmarkCircle02Icon} size={12} />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { haptic('light'); setField('commissionType', 'fixed'); }}
                  className={`rounded-2xl border px-3.5 py-3 text-left transition flex items-center justify-between ${
                    form.commissionType === 'fixed'
                      ? 'border-[#5b49e8] bg-[#f7f6ff] text-[#292541]'
                      : 'border-[#e7e5ef] bg-white text-[#757185] hover:border-[#d0cbdc] hover:bg-[#fafafc]'
                  }`}
                  data-testid="button-commission-fixed"
                >
                  <div>
                    <strong className="block text-xs font-bold">Montant fixe (FCFA)</strong>
                    <span className="text-[10px] text-[#77738a] block mt-0.5">Montant fixe par vente</span>
                  </div>
                  {form.commissionType === 'fixed' && (
                    <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[#5b49e8] text-white">
                      <Icon glyph={CheckmarkCircle02Icon} size={12} />
                    </span>
                  )}
                </button>
              </div>
            </Field>

            {/* Montant commission & Objectif */}
            <div className="grid grid-cols-2 gap-3.5">
              <Field label={form.commissionType === 'percentage' ? 'Valeur (%)' : 'Montant (FCFA)'}>
                <input
                  type="number"
                  min="0"
                  max={form.commissionType === 'percentage' ? 50 : selectedProduct?.price ?? 999999}
                  value={form.commission}
                  onChange={(e) => setField('commission', e.target.value)}
                  placeholder="0"
                  className={inputClass}
                  data-testid="input-commission"
                />
              </Field>

              <Field label="Objectif (ventes)">
                <input
                  type="number"
                  min="1"
                  value={form.goal}
                  onChange={(e) => setField('goal', e.target.value)}
                  placeholder="50"
                  className={inputClass}
                  data-testid="input-goal"
                />
              </Field>
            </div>

            {/* Description & Date de fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Date de fin (Optionnel)">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setField('endDate', e.target.value)}
                  className={inputClass}
                  data-testid="input-end-date"
                />
              </Field>

              <Field label="Note vendeurs (Optionnel)">
                <input
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Ex. 15% pour les 20 premiers"
                  className={inputClass}
                  data-testid="input-description"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#f1effa]">
              <Link href="/merchant/campaigns">
                <Button variant="ghost" type="button">Annuler</Button>
              </Link>
              <Button type="submit" disabled={saving} testId="button-save-campaign">
                {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Lancer la campagne'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right column: Live Calculator & Preview */}
        <div className="space-y-4">
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Simulation Commission Vendeur</p>
            <div className="mt-3.5 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#f1effa]">
                <span className="text-[#8b88a0]">Produit sélectionné</span>
                <strong className="text-[#292541] truncate max-w-[160px]">{selectedProduct?.name || 'Aucun'}</strong>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-[#f1effa]">
                <span className="text-[#8b88a0]">Prix de vente</span>
                <strong className="text-[#292541]">{selectedProduct ? money(selectedProduct.price) : '—'}</strong>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-[#f1effa]">
                <span className="text-[#8b88a0]">Rémunération choisie</span>
                <strong className="text-[#5b49e8]">
                  {form.commissionType === 'percentage' ? `${form.commission || 0}% par vente` : `${money(Number(form.commission || 0))} / vente`}
                </strong>
              </div>

              <div className="mt-4 rounded-2xl bg-[#e7faf2] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">Gain net vendeur par vente</p>
                <strong className="mt-1 block font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">
                  {money(commissionPreview)}
                </strong>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
