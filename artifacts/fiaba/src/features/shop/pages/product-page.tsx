import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Store01Icon,
  ShoppingBag01Icon,
  ShieldKeyIcon,
  DeliveryTruck01Icon,
  Wallet01Icon,
  SparklesIcon,
  HelpCircleIcon,
  Cancel01Icon,
  StarIcon,
  Share02Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic, formatShopName } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { parseImageUrls } from '@/lib/storage-upload';
import { SafeImage } from '@/components/shared/safe-image';
import { extractTokenFromUrl } from '@/lib/link';

type ProductData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  type: 'physique' | 'digital' | null;
  merchant_id: string;
  merchant_name: string;
  ai_headline: string | null;
  ai_benefits: { icon: string; title: string; text: string }[] | null;
  ai_faq: { question: string; answer: string }[] | null;
  ai_cta_text: string | null;
  campaign_id: string | null;
};

type SellerAttribution = {
  sellerId: string;
  sellerCode: string;
  trackingLinkId: string;
} | null;

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [sellerInfo, setSellerInfo] = useState<SellerAttribution>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);

      let productId = id.startsWith('prod-camp-') ? id.replace('prod-camp-', '') : id;

      // Try campaign first
      const { data: campRaw } = await supabase
        .from('campaigns')
        .select(`
          id, product_id, merchant_id,
          products:product_id (id, name, description, price, image_url, category, type, ai_headline, ai_benefits, ai_faq, ai_cta_text),
          merchants:merchant_id (id, name)
        `)
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle();

      if (campRaw) {
        const c = campRaw as any;
        const p = c.products;
        if (p) {
          setProduct({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image_url: p.image_url,
            category: p.category,
            type: p.type ?? 'physique',
            merchant_id: c.merchant_id,
            merchant_name: formatShopName(c.merchants?.name),
            ai_headline: p.ai_headline ?? null,
            ai_benefits: p.ai_benefits ?? null,
            ai_faq: p.ai_faq ?? null,
            ai_cta_text: p.ai_cta_text ?? null,
            campaign_id: c.id,
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: try by product_id in campaigns
      const { data: campByProd } = await supabase
        .from('campaigns')
        .select(`
          id, product_id, merchant_id,
          products:product_id (id, name, description, price, image_url, category, type, ai_headline, ai_benefits, ai_faq, ai_cta_text),
          merchants:merchant_id (id, name)
        `)
        .eq('product_id', productId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (campByProd) {
        const c = campByProd as any;
        const p = c.products;
        if (p) {
          setProduct({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image_url: p.image_url,
            category: p.category,
            type: p.type ?? 'physique',
            merchant_id: c.merchant_id,
            merchant_name: formatShopName(c.merchants?.name),
            ai_headline: p.ai_headline ?? null,
            ai_benefits: p.ai_benefits ?? null,
            ai_faq: p.ai_faq ?? null,
            ai_cta_text: p.ai_cta_text ?? null,
            campaign_id: c.id,
          });
          setLoading(false);
          return;
        }
      }

      // Last fallback: direct product
      const { data: prodRaw } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, category, type, ai_headline, ai_benefits, ai_faq, ai_cta_text, merchant_id, merchants:merchant_id(id, name)')
        .eq('id', productId)
        .maybeSingle();

      if (prodRaw) {
        const p = prodRaw as any;
        setProduct({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url,
          category: p.category,
          type: p.type ?? 'physique',
          merchant_id: p.merchant_id,
          merchant_name: formatShopName(p.merchants?.name),
          ai_headline: p.ai_headline ?? null,
          ai_benefits: p.ai_benefits ?? null,
          ai_faq: p.ai_faq ?? null,
          ai_cta_text: p.ai_cta_text ?? null,
          campaign_id: null,
        });
      }
      setLoading(false);
    }

    loadProduct();
  }, [id]);

  // Seller attribution from URL token
  useEffect(() => {
    const token = extractTokenFromUrl(window.location.href);
    const params = new URLSearchParams(window.location.search);
    const sellerParam = params.get('seller') || params.get('ref');

    if (!token && !sellerParam) return;

    async function validateSeller() {
      if (token) {
        const { data: link } = await supabase
          .from('tracking_links')
          .select('id, seller_id, seller_code, is_active, expires_at')
          .eq('token', token)
          .maybeSingle();

        const tl = link as any;
        if (tl && tl.is_active && (!tl.expires_at || new Date(tl.expires_at) > new Date())) {
          setSellerInfo({
            sellerId: tl.seller_id,
            sellerCode: tl.seller_code,
            trackingLinkId: tl.id,
          });
        }
      } else if (sellerParam) {
        const { data: linkByCode } = await supabase
          .from('tracking_links')
          .select('seller_id, seller_code')
          .eq('seller_code', sellerParam.toUpperCase())
          .eq('is_active', true)
          .limit(1);

        const found = (linkByCode as any)?.[0];
        if (found) {
          setSellerInfo({
            sellerId: found.seller_id,
            sellerCode: found.seller_code,
            trackingLinkId: '',
          });
        }
      }
    }
    validateSeller();
  }, [location]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e4e1ff] border-t-[#5b49e8]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc] px-5">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0f1] text-[#c45667]">
            <Icon glyph={Cancel01Icon} size={32} />
          </span>
          <h1 className="mt-4 font-[Space_Grotesk] text-xl font-bold text-[#292541]">Produit introuvable</h1>
          <p className="mt-2 text-sm text-[#77738a]">Ce produit n'existe plus ou a été retiré.</p>
          <Link href="/" className="mt-4 inline-block rounded-xl bg-[#5b49e8] px-5 py-2.5 text-sm font-bold text-white">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const galleryImages = parseImageUrls(product.image_url);
  const currentImage = galleryImages[activeImageIndex] ?? galleryImages[0];
  const isDigital = product.type === 'digital';
  const ctaText = product.ai_cta_text || 'Commander maintenant';
  const checkoutTarget = product.campaign_id
    ? `/checkout/${product.campaign_id}${window.location.search}`
    : `/checkout/prod-camp-${product.id}${window.location.search}`;

  const benefits = product.ai_benefits ?? [];
  const faq = product.ai_faq ?? [];

  return (
    <div className="min-h-[100dvh] bg-[#f8f8fc] text-[#292541]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#eceaf5] bg-white/90 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#292541]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#5b49e8] text-white">
            <Icon glyph={Store01Icon} size={18} />
          </span>
          Fiaba
        </Link>
        <button
          onClick={() => {
            haptic('light');
            if (navigator.share) {
              navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f3f8] text-[#292541] transition hover:bg-[#efedff]"
          aria-label="Partager"
        >
          <Icon glyph={Share02Icon} size={16} />
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        {/* Seller attribution badge */}
        {sellerInfo && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#efedff] p-3.5" data-testid="seller-badge">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5b49e8] font-[Space_Grotesk] text-sm font-bold text-white">
              {(sellerInfo.sellerCode || 'V').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#292541]">
                Recommandé par <span className="text-[#5b49e8]">{sellerInfo.sellerCode}</span>
              </p>
              <p className="text-[10px] text-[#77738a]">Partenaire certifié Fiaba</p>
            </div>
            <Icon glyph={CheckmarkCircle02Icon} size={18} className="shrink-0 text-[#278e69]" />
          </div>
        )}

        {/* Hero Section */}
        <div className="overflow-hidden rounded-[22px] bg-white">
          {galleryImages.length > 0 ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f4f3f8]">
              <img src={currentImage} alt={product.name} className="h-full w-full object-cover" />
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => { haptic('light'); setActiveImageIndex((p) => (p === 0 ? galleryImages.length - 1 : p - 1)); }}
                    className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#292541] shadow-md backdrop-blur-md transition hover:bg-white"
                    aria-label="Image précédente"
                  >
                    <Icon glyph={ArrowLeft01Icon} size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { haptic('light'); setActiveImageIndex((p) => (p === galleryImages.length - 1 ? 0 : p + 1)); }}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#292541] shadow-md backdrop-blur-md transition hover:bg-white"
                    aria-label="Image suivante"
                  >
                    <Icon glyph={ArrowRight01Icon} size={18} />
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    {activeImageIndex + 1} / {galleryImages.length}
                  </span>
                </>
              )}
              {isDigital && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#292541]/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  <Icon glyph={SparklesIcon} size={12} /> Digital · Instantané
                </span>
              )}
            </div>
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center bg-[#f4f3f8]">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
                <Icon glyph={Store01Icon} size={30} />
              </span>
            </div>
          )}

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="scrollbar-none flex gap-2 overflow-x-auto p-3">
              {galleryImages.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => { haptic('light'); setActiveImageIndex(idx); }}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border p-0.5 transition ${
                    idx === activeImageIndex ? 'border-[#5b49e8] ring-2 ring-[#5b49e8]/20' : 'border-[#e9e6f1] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Vignette ${idx + 1}`} className="h-full w-full rounded-md object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
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
            <Link
              href={checkoutTarget}
              onClick={() => haptic('medium')}
              className="flex items-center gap-2 rounded-2xl bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4a3bc7]"
              data-testid="cta-checkout"
            >
              {ctaText} <Icon glyph={ArrowRight01Icon} size={16} />
            </Link>
          </div>
        </div>

        {/* AI Headline */}
        {product.ai_headline && (
          <div className="mt-5 rounded-[22px] bg-gradient-to-br from-[#5b49e8] to-[#7c6ef5] p-5 text-white sm:p-6">
            <div className="flex items-center gap-2">
              <Icon glyph={SparklesIcon} size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Pourquoi ce produit ?</span>
            </div>
            <p className="mt-2 font-[Space_Grotesk] text-lg font-bold leading-snug sm:text-xl">
              {product.ai_headline}
            </p>
          </div>
        )}

        {/* AI Benefits */}
        {benefits.length > 0 && (
          <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
            <h2 className="font-[Space_Grotesk] text-base font-bold text-[#292541] sm:text-lg">
              Ce que vous allez adorer
            </h2>
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

        {/* Description */}
        {product.description && (
          <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
            <h2 className="font-[Space_Grotesk] text-base font-bold text-[#292541] sm:text-lg">
              Description
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#686380]">
              {product.description}
            </p>
          </div>
        )}

        {/* AI FAQ */}
        {faq.length > 0 && (
          <div className="mt-5 rounded-[22px] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Icon glyph={HelpCircleIcon} size={18} className="text-[#5b49e8]" />
              <h2 className="font-[Space_Grotesk] text-base font-bold text-[#292541] sm:text-lg">
                Questions fréquentes
              </h2>
            </div>
            <div className="mt-4 space-y-2">
              {faq.map((f, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-[#f0eff5]">
                  <button
                    type="button"
                    onClick={() => { haptic('light'); setOpenFaqIndex(openFaqIndex === i ? null : i); }}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <span className="text-sm font-bold text-[#292541]">{f.question}</span>
                    <span className={`shrink-0 text-[#9290a2] transition ${openFaqIndex === i ? 'rotate-180' : ''}`}>
                      <Icon glyph={ArrowRight01Icon} size={14} className="-rotate-90" />
                    </span>
                  </button>
                  {openFaqIndex === i && (
                    <div className="px-4 pb-4 text-xs leading-relaxed text-[#686380]">
                      {f.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 text-center">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]">
              <Icon glyph={ShieldKeyIcon} size={16} />
            </span>
            <p className="text-[10px] font-bold text-[#292541]">Paiement sécurisé</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 text-center">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
              <Icon glyph={isDigital ? SparklesIcon : DeliveryTruck01Icon} size={16} />
            </span>
            <p className="text-[10px] font-bold text-[#292541]">{isDigital ? 'Instantané' : 'Livraison rapide'}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 text-center">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fff4de] text-[#ac741e]">
              <Icon glyph={Wallet01Icon} size={16} />
            </span>
            <p className="text-[10px] font-bold text-[#292541]">Wave & Orange</p>
          </div>
        </div>

        {/* CTA Bottom */}
        <div className="mt-6">
          <Link
            href={checkoutTarget}
            onClick={() => haptic('medium')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white transition hover:bg-[#4a3bc7]"
            data-testid="cta-checkout-bottom"
          >
            <Icon glyph={ShoppingBag01Icon} size={18} />
            {ctaText} — {money(product.price)}
          </Link>
          <p className="mt-3 text-center text-[10px] text-[#9290a2]">
            <Icon glyph={ShieldKeyIcon} size={11} className="inline" /> Transaction chiffrée · Paiement à la livraison disponible
          </p>
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#eceaf5] bg-white/95 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#292541]">{product.name}</p>
            <p className="font-[Space_Grotesk] text-base font-bold text-[#5b49e8]">{money(product.price)}</p>
          </div>
          <Link
            href={checkoutTarget}
            onClick={() => haptic('medium')}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white"
            data-testid="cta-sticky"
          >
            {ctaText}
          </Link>
        </div>
      </div>
      <div className="h-20 sm:hidden" />
    </div>
  );
}
