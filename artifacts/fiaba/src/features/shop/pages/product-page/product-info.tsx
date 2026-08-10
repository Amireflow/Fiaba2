import { Link } from 'wouter';
import { ArrowRight01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import type { ProductData } from './types';

type Props = {
  product: ProductData;
  ctaText: string;
  checkoutTarget: string;
};

export function ProductInfo({ product, ctaText, checkoutTarget }: Props) {
  const isDigital = product.type === 'digital';

  return (
    <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f3f8] px-2.5 py-1 text-[10px] font-bold text-[#807b98]">
          {product.category}
        </span>
        {isDigital && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#292541] px-2.5 py-1 text-[10px] font-bold text-white">
            <Icon glyph={SparklesIcon} size={11} /> Digital
          </span>
        )}
      </div>

      <h1 className="mt-3 font-[Space_Grotesk] text-xl font-bold tracking-[-.03em] text-[#292541] sm:text-2xl">
        {product.name}
      </h1>
      <p className="mt-1 text-xs text-[#9290a2]">
        Vendu par <strong className="text-[#292541]">{product.merchant_name}</strong>
      </p>

      <div className="mt-4 flex items-baseline justify-between border-t border-[#f0eff5] pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Prix</p>
          <strong className="mt-0.5 block font-[Space_Grotesk] text-2xl font-bold text-[#292541] sm:text-3xl">
            {money(product.price)}
          </strong>
        </div>
        {!isDigital && (
          <Link href={checkoutTarget} onClick={() => haptic('medium')}
            className="flex items-center gap-2 rounded-2xl bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4a3bc7]"
            data-testid="cta-checkout">
            {ctaText} <Icon glyph={ArrowRight01Icon} size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
