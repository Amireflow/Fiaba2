import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { Field, MerchantButton as Button, inputClass } from '../../components/merchant-ui';
import type { FormState } from './types';

type Props = {
  form: FormState;
  errors: Record<string, string>;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onPrev: () => void;
  onNext: () => void;
};

export function StepPricing({ form, errors, setField, onPrev, onNext }: Props) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div><h3 className="font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#292541]">Prix</h3></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Prix public (FCFA) *">
          <input type="number" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)}
            placeholder="Ex. 15000" className={`${inputClass} ${errors.price ? 'ring-1 ring-[#ef6d78]' : ''}`} data-testid="input-price" />
          {errors.price && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.price}</p>}
        </Field>

        <Field label="Stock" hint={form.type === 'digital' ? 'Illimité' : undefined}>
          <input type="number" min="0" disabled={form.type === 'digital'}
            value={form.type === 'digital' ? '999999' : form.stock}
            onChange={(e) => setField('stock', e.target.value)} placeholder="0"
            className={`${inputClass} ${form.type === 'digital' ? 'bg-[#f4f3f9] text-[#807b98]' : ''}`} data-testid="input-stock" />
          {errors.stock && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.stock}</p>}
        </Field>
      </div>

      {form.type === 'physique' && (
        <Field label="Alerte stock bas">
          <input type="number" min="1" value={form.lowStockThreshold}
            onChange={(e) => setField('lowStockThreshold', e.target.value)} className={inputClass} />
        </Field>
      )}

      <div className="flex justify-between pt-2 sm:pt-3">
        <Button type="button" variant="ghost" onClick={onPrev}>
          <Icon glyph={ArrowLeft01Icon} size={15} /> Précédent
        </Button>
        <Button type="button" onClick={onNext} testId="button-next-step-3">
          Suivant <Icon glyph={ArrowRight01Icon} size={15} />
        </Button>
      </div>
    </div>
  );
}
