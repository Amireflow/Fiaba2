import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { Store01Icon, Share02Icon, CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';
import { parseImageUrls } from '@/lib/storage-upload';
import { useProductData } from './use-product-data';
import { useSellerAttribution } from './use-seller-attribution';
import { ProductHero } from './product-hero';
import { ProductInfo } from './product-info';
import { ProductAiContent } from './product-ai-content';
import { ProductTrustBadges } from './product-trust-badges';
import { ProductCtaBar } from './product-cta-bar';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { product, loading } = useProductData(id);
  const sellerInfo = useSellerAttribution(location);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (loading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e4e1ff] border-t-[#5b49e8]" /></div>;
  }

  if (!product) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc] px-5">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0f1] text-[#c45667]"><Icon glyph={Cancel01Icon} size={32} /></span>
          <h1 className="mt-4 font-[Space_Grotesk] text-xl font-bold text-[#292541]">Produit introuvable</h1>
          <p className="mt-2 text-sm text-[#77738a]">Ce produit n'existe plus ou a été retiré.</p>
          <Link href="/" className="mt-4 inline-block rounded-xl bg-[#5b49e8] px-5 py-2.5 text-sm font-bold text-white">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const images = parseImageUrls(product.image_url);
  const isDigital = product.type === 'digital';
  const ctaText = product.ai_cta_text || 'Commander maintenant';
  const checkoutTarget = product.campaign_id
    ? `/checkout/${product.campaign_id}${window.location.search}`
    : `/checkout/prod-camp-${product.id}${window.location.search}`;

  return (
    <div className="min-h-[100dvh] bg-[#f8f8fc] text-[#292541]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#eceaf5] bg-white/90 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#292541]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#5b49e8] text-white"><Icon glyph={Store01Icon} size={18} /></span>
          Fiaba
        </Link>
        <button onClick={() => { haptic('light'); navigator.share ? navigator.share({ title: product.name, url: window.location.href }).catch(() => {}) : navigator.clipboard?.writeText(window.location.href); }}
          className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f3f8] text-[#292541] transition hover:bg-[#efedff]" aria-label="Partager">
          <Icon glyph={Share02Icon} size={16} />
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        {sellerInfo && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#efedff] p-3.5" data-testid="seller-badge">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5b49e8] font-[Space_Grotesk] text-sm font-bold text-white">
              {(sellerInfo.sellerCode || 'V').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#292541]">Recommandé par <span className="text-[#5b49e8]">{sellerInfo.sellerCode}</span></p>
              <p className="text-[10px] text-[#77738a]">Partenaire certifié Fiaba</p>
            </div>
            <Icon glyph={CheckmarkCircle02Icon} size={18} className="shrink-0 text-[#278e69]" />
          </div>
        )}

        <ProductHero
          images={images} activeIndex={activeImageIndex} productName={product.name}
          isDigital={isDigital} onSelect={setActiveImageIndex}
          onPrev={() => { haptic('light'); setActiveImageIndex((p) => (p === 0 ? images.length - 1 : p - 1)); }}
          onNext={() => { haptic('light'); setActiveImageIndex((p) => (p === images.length - 1 ? 0 : p + 1)); }}
        />

        <ProductInfo product={product} ctaText={ctaText} checkoutTarget={checkoutTarget} />
        <ProductAiContent product={product} />
        <ProductTrustBadges isDigital={isDigital} />
        <ProductCtaBar product={product} ctaText={ctaText} checkoutTarget={checkoutTarget} />
      </div>
    </div>
  );
}
