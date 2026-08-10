import { ArrowRight01Icon, PackageIcon, SparklesIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { Field, MerchantButton as Button, inputClass, selectClass, textareaClass } from '../../components/merchant-ui';
import { physicalCategories, digitalCategories, type FormState } from './types';

type Props = {
  form: FormState;
  errors: Record<string, string>;
  isEdit: boolean;
  productId: string | undefined;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onNext: () => void;
};

export function StepInfo({ form, errors, setField, onNext }: Props) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div><h3 className="font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#292541]">Produit & Format</h3></div>

      <Field label="Format de vente">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button type="button" onClick={() => setField('type', 'physique')}
            className={`flex items-center gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-4 text-left transition ${form.type === 'physique' ? 'bg-[#f6f5ff] text-[#5b49e8]' : 'bg-[#f4f3f8] text-[#807b98] hover:bg-[#eae8f5]'}`}
            data-testid="type-physique">
            <span className={`grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl ${form.type === 'physique' ? 'bg-[#5b49e8] text-white' : 'bg-[#efedff] text-[#5b49e8]'}`}>
              <Icon glyph={PackageIcon} size={18} />
            </span>
            <div><p className="text-xs font-bold text-[#292541]">Physique</p><p className="text-[10px] text-[#807b98]">Colis & livraison</p></div>
          </button>
          <button type="button" onClick={() => setField('type', 'digital')}
            className={`flex items-center gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-4 text-left transition ${form.type === 'digital' ? 'bg-[#f6f5ff] text-[#5b49e8]' : 'bg-[#f4f3f8] text-[#807b98] hover:bg-[#eae8f5]'}`}
            data-testid="type-digital">
            <span className={`grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl ${form.type === 'digital' ? 'bg-[#5b49e8] text-white' : 'bg-[#efedff] text-[#5b49e8]'}`}>
              <Icon glyph={SparklesIcon} size={18} />
            </span>
            <div><p className="text-xs font-bold text-[#292541]">Digital</p><p className="text-[10px] text-[#807b98]">Accès instantané</p></div>
          </button>
        </div>
      </Field>

      <Field label="Nom du produit *">
        <input value={form.name} onChange={(e) => setField('name', e.target.value)}
          placeholder={form.type === 'digital' ? 'Ex. Guide E-Commerce (PDF)' : 'Ex. Coffret Soin Karité'}
          className={`${inputClass} ${errors.name ? 'ring-1 ring-[#ef6d78]' : ''}`} data-testid="input-name" />
        {errors.name && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.name}</p>}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Catégorie *">
          <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={selectClass} data-testid="input-category">
            {(form.type === 'digital' ? digitalCategories : physicalCategories).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Code SKU">
          <input value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="Ex. PRD-001" className={inputClass} />
        </Field>
      </div>

      <Field label="Description *">
        <textarea value={form.description} onChange={(e) => setField('description', e.target.value)}
          placeholder="Avantages et détails du produit…" className={`${textareaClass} min-h-24 sm:min-h-32`} data-testid="input-description" />
      </Field>

      <div className="flex justify-end pt-2 sm:pt-3">
        <Button type="button" onClick={onNext} testId="button-next-step-2">
          Suivant <Icon glyph={ArrowRight01Icon} size={15} />
        </Button>
      </div>
    </div>
  );
}
