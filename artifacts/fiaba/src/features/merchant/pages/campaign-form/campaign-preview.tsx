import { money } from '@/lib/utils';
import { MerchantCard as Card } from '../../components/merchant-ui';
import type { FormState, ProductOption } from './types';

type Props = {
  form: FormState;
  selectedProduct: ProductOption | undefined;
  commissionPreview: number;
};

export function CampaignPreview({ form, selectedProduct, commissionPreview }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Simulation Commission Vendeur</p>
        <div className="mt-3.5 space-y-3 text-xs">
          <Row label="Produit sélectionné" value={selectedProduct?.name || 'Aucun'} />
          <Row label="Prix de vente" value={selectedProduct ? money(selectedProduct.price) : '—'} />
          <Row label="Rémunération choisie" value={
            form.commissionType === 'percentage'
              ? `${form.commission || 0}% par vente`
              : `${money(Number(form.commission || 0))} / vente`
          } valueClass="text-[#5b49e8]" />

          <div className="mt-4 rounded-2xl bg-[#e7faf2] p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">Gain net vendeur par vente</p>
            <strong className="mt-1 block font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{money(commissionPreview)}</strong>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-[#292541]' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#f1effa]">
      <span className="text-[#8b88a0]">{label}</span>
      <strong className={`${valueClass} truncate max-w-[160px]`}>{value}</strong>
    </div>
  );
}
