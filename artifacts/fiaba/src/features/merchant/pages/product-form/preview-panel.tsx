import { useState } from 'react';
import { Store01Icon, HelpCircleIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { MerchantCard as Card } from '../../components/merchant-ui';
import type { FormState } from './types';

type Props = { form: FormState };

export function PreviewPanel({ form }: Props) {
  const [previewMode, setPreviewMode] = useState<'seller' | 'customer'>('seller');

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Aperçu</p>
          <div className="flex rounded-xl bg-[#f4f3f8] p-1">
            {(['seller', 'customer'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setPreviewMode(m)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${previewMode === m ? 'bg-white text-[#5b49e8]' : 'text-[#807b98]'}`}>
                {m === 'seller' ? 'Vendeur' : 'Client'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          {previewMode === 'seller' ? (
            <div className="rounded-2xl bg-[#faf9fe] p-3.5 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-[Space_Grotesk] font-bold text-[#292541]">{form.name || 'Nom du produit'}</p>
                  <p className="text-[11px] text-[#9290a2]">{form.category} · {form.type === 'digital' ? 'Digital' : 'Physique'}</p>
                </div>
                {form.images.length > 0 ? (
                  <img src={form.images[0]} alt="Aperçu" className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={18} /></span>
                )}
              </div>
              <div className="rounded-xl bg-white p-3 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#9290a2]">Prix public</span>
                  <span className="font-bold text-[#292541]">{form.price ? money(Number(form.price)) : '0 F'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-3.5 sm:p-4 space-y-3">
              {form.images.length > 0 && <img src={form.images[0]} alt="Aperçu" className="h-28 sm:h-32 w-full rounded-xl object-cover" />}
              <h4 className="font-[Space_Grotesk] font-bold text-[#292541] text-sm">{form.name || 'Nom du produit'}</h4>
              <p className="text-xs text-[#77738a] line-clamp-2">{form.description || 'Description du produit…'}</p>
              <div className="flex items-center justify-between pt-2">
                <strong className="font-[Space_Grotesk] text-base font-bold text-[#5b49e8]">{form.price ? money(Number(form.price)) : '—'}</strong>
                <span className="rounded-full bg-[#e7faf2] px-2 py-0.5 text-[10px] font-bold text-[#278e69]">Paiement Wave/OM</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 bg-[#efedff]/40">
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-xl bg-[#5b49e8] text-white"><Icon glyph={HelpCircleIcon} size={15} /></span>
          <div className="text-xs space-y-1">
            <p className="font-bold text-[#292541]">Conseil</p>
            <p className="text-[#686380] leading-relaxed">Ajoutez des photos de qualité et une description claire pour attirer plus de clients.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
