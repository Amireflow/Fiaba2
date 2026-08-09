import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
  textareaClass,
} from '../components/merchant-ui';
import { seedCampaigns, seedProducts } from '@/config/seeds';
import type { Campaign, CommissionType, CommissionModel, Product } from '@/types/entities';

type FormState = {
  name: string;
  description: string;
  commission: string;
  commissionType: CommissionType;
  model: CommissionModel;
  goal: string;
  product: string;
  startDate: string;
  endDate: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  commission: '10',
  commissionType: 'percentage',
  model: 'Commission',
  goal: '50',
  product: '',
  startDate: '',
  endDate: '',
};

export function CampaignForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => read('campaigns', seedCampaigns));
  const [products] = useState<Product[]>(() => read('products', seedProducts));
  const existing = isEdit ? campaigns.find((c) => c.id === id) : undefined;

  const [form, setForm] = useState<FormState>(
    existing
      ? {
          name: existing.name,
          description: existing.description ?? '',
          commission: String(existing.commission),
          commissionType: existing.commissionType ?? 'percentage',
          model: existing.model ?? 'Commission',
          goal: String(existing.goal ?? 50),
          product: existing.product ?? '',
          startDate: existing.startDate ?? '',
          endDate: existing.endDate ?? '',
        }
      : { ...emptyForm, product: products[0]?.name ?? '' }
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedProduct = products.find((p) => p.name === form.product);
  const commissionPreview = selectedProduct
    ? form.commissionType === 'percentage'
      ? Math.round((selectedProduct.price * Number(form.commission || 0)) / 100)
      : Number(form.commission || 0)
    : 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    const commission = Number(form.commission);
    if (!form.name.trim()) {
      toast({ title: 'Nom requis', description: 'Donnez un nom à votre campagne.' });
      return;
    }
    if (isNaN(commission) || commission < 0) {
      toast({ title: 'Commission invalide', description: 'Vérifiez le montant de la commission.' });
      return;
    }
    if (form.commissionType === 'percentage' && commission > 50) {
      toast({ title: 'Commission trop élevée', description: 'Le pourcentage maximum est 50%.' });
      return;
    }
    if (form.commissionType === 'fixed' && commission > (selectedProduct?.price ?? 0)) {
      toast({ title: 'Commission trop élevée', description: `Le montant ne peut pas dépasser le prix du produit (${money(selectedProduct?.price ?? 0)}).` });
      return;
    }

    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      commission,
      commissionType: form.commissionType,
      model: form.model,
      goal: Number(form.goal),
      product: form.product,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    if (isEdit && existing) {
      const updated = campaigns.map((c) => (c.id === existing.id ? { ...c, ...data } : c));
      setCampaigns(updated);
      write('campaigns', updated);
      toast({ title: 'Campagne modifiée', description: `${data.name} a été mise à jour.` });
    } else {
      const updated = [...campaigns, { id: crypto.randomUUID(), ...data, sellers: 0, sales: 0, status: 'Active' as const } as Campaign];
      setCampaigns(updated);
      write('campaigns', updated);
      toast({ title: 'Campagne lancée', description: `${data.name} est active dans votre réseau.` });
    }
    navigate('/merchant/campaigns');
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
            <select value={form.product} onChange={(e) => setField('product', e.target.value)} className={selectClass} data-testid="input-product">
              {products.map((p) => <option key={p.id} value={p.name}>{p.name} — {money(p.price)}</option>)}
            </select>
          </Field>

          {/* Commission type selector */}
          <Field label="Type de rémunération" hint="Choisissez comment vos vendeurs sont payés.">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setField('commissionType', 'percentage')}
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
                onClick={() => setField('commissionType', 'fixed')}
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
              <select value={form.model} onChange={(e) => setField('model', e.target.value as CommissionModel)} className={selectClass} data-testid="input-model">
                <option value="Commission">Commission (sur vente)</option>
                <option value="Marge">Marge (sur marge brute)</option>
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
              <input type="text" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} placeholder="Ex. 30 sept 2024" className={inputClass} data-testid="input-end-date" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/merchant/campaigns"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" testId="button-save-campaign">{isEdit ? 'Enregistrer' : 'Lancer la campagne'}</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
