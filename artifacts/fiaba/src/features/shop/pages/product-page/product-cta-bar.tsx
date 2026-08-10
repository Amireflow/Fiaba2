import { Link } from 'wouter';
import { ShoppingBag01Icon, ShieldKeyIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import type { ProductData } from './types';

type Props = {
  product: ProductData;
  ctaText: string;
  checkoutTarget: string;
};

export function ProductCtaBar({ product, ctaText, checkoutTarget }: Props) {
  return (
    <>
      <div className="mt-6">
        <Link href={checkoutTarget} onClick={() => haptic('medium')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white transition hover:bg-[#4a3bc7]"
          data-testid="cta-checkout-bottom">
          <Icon glyph={ShoppingBag01Icon} size={18} />
          {ctaText} — {money(product.price)}
        </Link>
        <p className="mt-3 text-center text-[10px] text-[#9290a2]">
          <Icon glyph={ShieldKeyIcon} size={11} className="inline" /> Transaction chiffrée · Paiement à la livraison disponible
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#eceaf5] bg-white/95 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#292541]">{product.name}</p>
            <p className="font-[Space_Grotesk] text-base font-bold text-[#5b49e8]">{money(product.price)}</p>
          </div>
          <Link href={checkoutTarget} onClick={() => haptic('medium')}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white"
            data-testid="cta-sticky">
            {ctaText}
          </Link>
        </div>
      </div>
      <div className="h-20 sm:hidden" />
    </>
  );
}
