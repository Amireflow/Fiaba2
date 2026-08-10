import { Link } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic, money } from '@/lib/utils';
import { Field, MerchantButton as Button, MerchantCard as Card, Page, inputClass, selectClass } from '../../components/merchant-ui';
import { useCampaignForm } from './use-campaign-form';
import { CampaignPreview } from './campaign-preview';

export function CampaignForm() {
  const ctx = useCampaignForm();

  if (ctx.loading) {
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
      eyebrow={ctx.isEdit ? 'Modifier' : 'Nouvelle'}
      title={ctx.isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
      description="Définissez les paramètres de votre campagne et la rémunération de vos vendeurs."
      action={<Link href="/merchant/campaigns"><Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button></Link>}
    >
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Card>
          <form onSubmit={ctx.save} className="space-y-4">
            <Field label="Nom de la campagne">
              <input value={ctx.form.name} onChange={(e) => ctx.setField('name', e.target.value)}
                placeholder="Ex. Offre Spéciale Rentrée" className={inputClass} data-testid="input-name" />
            </Field>

            <Field label="Produit mis en avant">
              <select value={ctx.form.productId} onChange={(e) => ctx.setField('productId', e.target.value)}
                className={selectClass} data-testid="input-product">
                <option value="">— Sélectionnez un produit —</option>
                {ctx.products.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
              </select>
            </Field>

            <Field label="Type de commission">
              <div className="grid grid-cols-2 gap-2.5">
                <CommissionTypeBtn active={ctx.form.commissionType === 'percentage'} onClick={() => { haptic('light'); ctx.setField('commissionType', 'percentage'); }}
                  title="Pourcentage (%)" subtitle="% par vente livrée" testId="button-commission-percentage" />
                <CommissionTypeBtn active={ctx.form.commissionType === 'fixed'} onClick={() => { haptic('light'); ctx.setField('commissionType', 'fixed'); }}
                  title="Montant fixe (FCFA)" subtitle="Montant fixe par vente" testId="button-commission-fixed" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3.5">
              <Field label={ctx.form.commissionType === 'percentage' ? 'Valeur (%)' : 'Montant (FCFA)'}>
                <input type="number" min="0"
                  max={ctx.form.commissionType === 'percentage' ? 50 : ctx.selectedProduct?.price ?? 999999}
                  value={ctx.form.commission} onChange={(e) => ctx.setField('commission', e.target.value)}
                  placeholder="0" className={inputClass} data-testid="input-commission" />
              </Field>
              <Field label="Objectif (ventes)">
                <input type="number" min="1" value={ctx.form.goal}
                  onChange={(e) => ctx.setField('goal', e.target.value)} placeholder="50"
                  className={inputClass} data-testid="input-goal" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Date de fin (Optionnel)">
                <input type="date" value={ctx.form.endDate} onChange={(e) => ctx.setField('endDate', e.target.value)}
                  className={inputClass} data-testid="input-end-date" />
              </Field>
              <Field label="Note vendeurs (Optionnel)">
                <input value={ctx.form.description} onChange={(e) => ctx.setField('description', e.target.value)}
                  placeholder="Ex. 15% pour les 20 premiers" className={inputClass} data-testid="input-description" />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#f1effa]">
              <Link href="/merchant/campaigns"><Button variant="ghost" type="button">Annuler</Button></Link>
              <Button type="submit" disabled={ctx.saving || ctx.aiGenerating} testId="button-save-campaign">
                {ctx.saving ? 'Enregistrement…' : ctx.aiGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Génération page IA…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {!ctx.isEdit && <Icon glyph={SparklesIcon} size={15} />}
                    {ctx.isEdit ? 'Enregistrer' : 'Lancer la campagne'}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Card>

        <CampaignPreview form={ctx.form} selectedProduct={ctx.selectedProduct} commissionPreview={ctx.commissionPreview} />
      </div>
    </Page>
  );
}

function CommissionTypeBtn({ active, onClick, title, subtitle, testId }: { active: boolean; onClick: () => void; title: string; subtitle: string; testId: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-2xl border px-3.5 py-3 text-left transition flex items-center justify-between ${
        active ? 'border-[#5b49e8] bg-[#f7f6ff] text-[#292541]' : 'border-[#e7e5ef] bg-white text-[#757185] hover:border-[#d0cbdc] hover:bg-[#fafafc]'
      }`} data-testid={testId}>
      <div>
        <strong className="block text-xs font-bold">{title}</strong>
        <span className="text-[10px] text-[#77738a] block mt-0.5">{subtitle}</span>
      </div>
      {active && <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[#5b49e8] text-white"><Icon glyph={CheckmarkCircle02Icon} size={12} /></span>}
    </button>
  );
}
