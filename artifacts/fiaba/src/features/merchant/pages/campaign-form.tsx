import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
  textareaClass,
} from '../components/merchant-ui';
import { seedCampaigns } from '@/config/seeds';
import type { Campaign } from '@/types/entities';

const emptyForm = { name: '', description: '', commission: '10', goal: '50', product: 'Coffret Soin Karité' };
type FormState = typeof emptyForm;

export function CampaignForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => read('campaigns', seedCampaigns));
  const existing = isEdit ? campaigns.find((c) => c.id === id) : undefined;
  const [form, setForm] = useState<FormState>(
    existing
      ? { name: existing.name, description: existing.description ?? '', commission: String(existing.commission), goal: String(existing.goal ?? 50), product: existing.product ?? 'Coffret Soin Karité' }
      : emptyForm
  );

  function save(e: React.FormEvent) {
    e.preventDefault();
    const commission = Number(form.commission);
    const goal = Number(form.goal);
    if (!form.name.trim() || isNaN(commission) || commission < 0 || commission > 50) {
      toast({ title: 'Champs invalides', description: 'Vérifiez le nom et la commission (0-50%).' });
      return;
    }
    const data = { name: form.name.trim(), description: form.description.trim(), commission, goal, product: form.product };
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
      description="Définissez les paramètres de votre campagne."
      action={
        <Link href="/merchant/campaigns">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <Card className="mt-6">
        <form onSubmit={save} className="space-y-5">
          <Field label="Nom de la campagne">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Rentrée douce — septembre" className={inputClass} data-testid="input-name" />
          </Field>
          <Field label="Description" hint="Visible par vos vendeurs dans l'espace campagne.">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez l'objectif et les produits mis en avant…" className={`${textareaClass} min-h-20`} data-testid="input-description" />
          </Field>
          <Field label="Produit mis en avant">
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={selectClass} data-testid="input-product">
              {['Coffret Soin Karité', 'Boubou Ndar — Indigo', 'Huile de Baobab 100ml', 'Panier petit-déjeuner'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Commission (%)" hint="Part reversée au vendeur.">
              <input type="number" min="0" max="50" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} className={inputClass} data-testid="input-commission" />
            </Field>
            <Field label="Objectif (ventes)">
              <input type="number" min="1" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className={inputClass} data-testid="input-goal" />
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
