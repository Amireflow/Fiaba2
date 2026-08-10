import { useState } from 'react';
import { CheckmarkCircle02Icon, SparklesIcon, HelpCircleIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';
import type { ProductData } from './types';

type Props = { product: ProductData };

export function ProductAiContent({ product }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const benefits = product.ai_benefits ?? [];
  const faq = product.ai_faq ?? [];

  return (
    <>
      {product.ai_headline && (
        <div className="mt-5 rounded-[22px] bg-gradient-to-br from-[#5b49e8] to-[#7c6ef5] p-5 text-white sm:p-6">
          <div className="flex items-center gap-2">
            <Icon glyph={SparklesIcon} size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Pourquoi ce produit ?</span>
          </div>
          <p className="mt-2 font-[Space_Grotesk] text-lg font-bold leading-snug sm:text-xl">{product.ai_headline}</p>
        </div>
      )}

      {benefits.length > 0 && (
        <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
          <h2 className="font-[Space_Grotesk] text-base font-bold text-[#292541] sm:text-lg">Ce que vous allez adorer</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {benefits.map((b, i) => (
              <div key={i} className="rounded-2xl bg-[#f8f7fc] p-4">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]">
                  <Icon glyph={CheckmarkCircle02Icon} size={16} />
                </span>
                <p className="mt-2.5 text-sm font-bold text-[#292541]">{b.title}</p>
                <p className="mt-1 text-xs text-[#686380]">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {product.description && (
        <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
          <h2 className="font-[Space_Grotesk] text-base font-bold text-[#292541] sm:text-lg">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#686380]">{product.description}</p>
        </div>
      )}

      {faq.length > 0 && (
        <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Icon glyph={HelpCircleIcon} size={18} className="text-[#5b49e8]" />
            <h2 className="font-[Space_Grotesk] text-base font-bold text-[#292541] sm:text-lg">Questions fréquentes</h2>
          </div>
          <div className="mt-4 space-y-2">
            {faq.map((f, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-[#f0eff5]">
                <button type="button" onClick={() => { haptic('light'); setOpenFaq(openFaq === i ? null : i); }}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <span className="text-sm font-bold text-[#292541]">{f.question}</span>
                  <span className={`shrink-0 text-[#9290a2] transition ${openFaq === i ? 'rotate-180' : ''}`}>
                    <Icon glyph={ArrowRight01Icon} size={14} className="-rotate-90" />
                  </span>
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-xs leading-relaxed text-[#686380]">{f.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
