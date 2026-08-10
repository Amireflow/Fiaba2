import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Store01Icon,
  Wallet01Icon,
  DeliveryTruck01Icon,
  ShieldKeyIcon,
  LockKeyIcon,
  Cancel01Icon,
  ShoppingBag01Icon,
  MapPinIcon,
  SmartPhone01Icon,
  UserGroupIcon,
  Alert01Icon,
} from '@hugeicons/core-free-icons';
import { Icon, type IconType } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic, friendlyErrorMessage } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { extractTokenFromUrl } from '@/lib/link';
import { parseImageUrls } from '@/lib/storage-upload';
import { trackEvent } from '@/lib/analytics';

/* ── Types ── */

type Step = 'product' | 'delivery' | 'payment' | 'confirmation';

type CheckoutForm = {
  quantity: number;
  customerName: string;
  phone: string;
  zoneId: string;
  zoneName: string;
  address: string;
  paymentMethod: 'wave' | 'orange' | 'cod';
  paymentNumber: string;
  note: string;
  sellerCode: string;
};

type CampaignInfo = {
  campaign_id: string;
  campaign_name: string;
  commission: number;
  commission_type: string | null;
  model: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  product_image_url: string | null;
  product_description: string | null;
  merchant_id: string;
  merchant_name: string;
};

type ZoneInfo = { id: string; name: string; fee: number };

type ConfirmedOrder = {
  id: string;
  productName: string;
  merchantName: string;
  quantity: number;
  zone: string;
  deliveryFee: number;
  total: number;
  customerName: string;
  phone: string;
  paymentMethod: string;
  sellerCode: string | null;
  commissionAmount: number;
};

/* ── Helpers ── */

const steps: { id: Step; label: string; glyph: IconType }[] = [
  { id: 'product', label: 'Produit', glyph: ShoppingBag01Icon },
  { id: 'delivery', label: 'Livraison', glyph: DeliveryTruck01Icon },
  { id: 'payment', label: 'Paiement', glyph: Wallet01Icon },
  { id: 'confirmation', label: 'Confirmation', glyph: CheckmarkCircle02Icon },
];

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(7[0-8])\d{7}$/.test(cleaned) || /^\+2217[0-8]\d{7}$/.test(cleaned) || /^(77|78|76|70)\d{7}$/.test(cleaned);
}

const paymentMethodMap: Record<string, 'wave' | 'orange_money' | 'cash'> = {
  wave: 'wave',
  orange: 'orange_money',
  cod: 'cash',
};

/* ── Component ── */

export function Checkout() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('product');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Produit non conforme ou trompeur');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault();
    if (!campaign || reportSubmitting) return;
    setReportSubmitting(true);
    haptic('light');

    const { error } = await supabase.from('campaign_reports').insert({
      campaign_id: campaign.campaign_id,
      merchant_id: campaign.merchant_id,
      seller_id: sellerInfo?.sellerId || null,
      seller_code: sellerInfo?.sellerCode || form.sellerCode.trim() || null,
      reason: reportReason,
      details: reportDetails.trim() || null,
      reporter_name: form.customerName.trim() || null,
      reporter_phone: form.phone.trim() || null,
    } as never);

    setReportSubmitting(false);
    setShowReportModal(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le signalement. Veuillez réessayer.' });
    } else {
      haptic('success');
      toast({
        title: 'Signalement transmis',
        description: 'Merci de votre vigilance. Notre équipe va examiner ce contenu.',
      });
      setReportDetails('');
    }
  }

  // Seller attribution state
  const [sellerInfo, setSellerInfo] = useState<{ sellerId: string; sellerCode: string; campaignId: string; trackingLinkId: string } | null>(null);
  const [linkStatus, setLinkStatus] = useState<'validating' | 'valid' | 'invalid' | 'none'>('none');
  const [linkError, setLinkError] = useState<string | null>(null);

  const [form, setForm] = useState<CheckoutForm>({
    quantity: 1,
    customerName: '',
    phone: '',
    zoneId: '',
    zoneName: '',
    address: '',
    paymentMethod: 'wave',
    paymentNumber: '',
    note: '',
    sellerCode: '',
  });

  // Load campaign + product + merchant + zones
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      // Fetch campaign with product + merchant
      const { data: raw } = await supabase
        .from('campaigns')
        .select(`
          id, name, commission, commission_type, model,
          product_id, merchant_id,
          products:product_id (id, name, price, image_url, description),
          merchants:merchant_id (id, name)
        `)
        .eq('id', id)
        .single();

      if (!raw) {
        setLoading(false);
        return;
      }

      const c = raw as {
        id: string; name: string; commission: number; commission_type: string | null;
        model: string; product_id: string | null; merchant_id: string;
        products: { id: string; name: string; price: number; image_url: string | null; description: string | null } | null;
        merchants: { id: string; name: string } | null;
      };

      setCampaign({
        campaign_id: c.id,
        campaign_name: c.name,
        commission: c.commission,
        commission_type: c.commission_type,
        model: c.model,
        product_id: c.product_id,
        product_name: c.products?.name ?? c.name,
        product_price: c.products?.price ?? 0,
        product_image_url: c.products?.image_url ?? null,
        product_description: c.products?.description ?? null,
        merchant_id: c.merchant_id,
        merchant_name: c.merchants?.name ?? 'Boutique',
      });

      // Fetch delivery zones for this merchant
      const { data: zoneData } = await supabase
        .from('delivery_zones')
        .select('id, name, fee')
        .eq('merchant_id', c.merchant_id)
        .eq('is_active', true);
      setZones(((zoneData as ZoneInfo[] | null) ?? []));

      setLoading(false);
    }
    loadData();
  }, [id]);

  // Parse and validate the tracking link token from URL on mount
  useEffect(() => {
    const token = extractTokenFromUrl(window.location.href);
    const params = new URLSearchParams(window.location.search);
    const sellerParam = params.get('seller') || params.get('ref');

    if (!token && !sellerParam) {
      setLinkStatus('none');
      return;
    }
    setLinkStatus('validating');

    async function validateSellerAttribution() {
      if (token) {
        // Look up tracking link by token
        const { data: link } = await supabase
          .from('tracking_links')
          .select('id, seller_id, seller_code, campaign_id, is_active, expires_at, clicks')
          .eq('token', token || '')
          .single();

        const tl = link as { id: string; seller_id: string; seller_code: string; campaign_id: string; is_active: boolean; expires_at: string | null; clicks: number } | null;

        if (!tl || !tl.is_active) {
          setLinkStatus('invalid');
          setLinkError('Lien non trouvé ou désactivé');
          return;
        }

        // Check expiry
        if (tl.expires_at && new Date(tl.expires_at) < new Date()) {
          setLinkStatus('invalid');
          setLinkError('Lien expiré');
          return;
        }

        // Fetch seller display_name / username
        let sellerUsername = tl.seller_code;
        if (tl.seller_id) {
          const { data: sRow } = await (supabase.from('sellers') as any)
            .select('display_name')
            .eq('id', tl.seller_id)
            .maybeSingle();

          if (sRow?.display_name) {
            sellerUsername = sRow.display_name;
          }
        }

        setSellerInfo({
          sellerId: tl.seller_id,
          sellerCode: sellerUsername,
          campaignId: tl.campaign_id,
          trackingLinkId: tl.id,
        });
        setForm((prev) => ({ ...prev, sellerCode: sellerUsername }));
        setLinkStatus('valid');

        // Track click
        await supabase.from('clicks').insert({
          tracking_link_id: tl.id,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        } as never);

        // Analytics: tracking_link_clicked (CDC §25)
        trackEvent('tracking_link_clicked', {
          entityType: 'tracking_link',
          entityId: tl.id,
          metadata: { campaign_id: tl.campaign_id, seller_id: tl.seller_id },
        });

        await (supabase.from('tracking_links') as any)
          .update({ clicks: tl.clicks + 1 })
          .eq('id', tl.id);
      } else if (sellerParam) {
        // Look up seller directly by ID or display_name
        const { data: sRow } = await (supabase.from('sellers') as any)
          .select('id, display_name')
          .or(`id.eq.${sellerParam},display_name.ilike.${sellerParam}`)
          .maybeSingle();

        if (sRow) {
          const username = sRow.display_name || sellerParam;
          setSellerInfo({
            sellerId: sRow.id,
            sellerCode: username,
            campaignId: id || '',
            trackingLinkId: '',
          });
          setForm((prev) => ({ ...prev, sellerCode: username }));
          setLinkStatus('valid');
        } else {
          setLinkStatus('none');
        }
      }
    }

    validateSellerAttribution().catch(() => {
      setLinkStatus('invalid');
      setLinkError('Erreur de validation de l\'ambassadeur');
    });
  }, [location, id]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e4e1ff] border-t-[#5b49e8]" />
      </div>
    );
  }

  if (!campaign) {
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

  const selectedZone = zones.find((z) => z.id === form.zoneId);
  const deliveryFee = selectedZone?.fee ?? 0;
  const subtotal = campaign.product_price * form.quantity;
  const total = subtotal + deliveryFee;

  function setField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validateStep(s: Step): boolean {
    const e: Record<string, string> = {};
    if (s === 'delivery') {
      if (!form.customerName.trim()) e.customerName = 'Votre nom est requis';
      if (!form.phone.trim()) e.phone = 'Votre numéro est requis';
      else if (!validatePhone(form.phone)) e.phone = 'Numéro invalide (ex: 77 123 45 67)';
      if (!form.zoneId) e.zone = 'Choisissez une zone de livraison';
      if (!form.address.trim()) e.address = 'Votre adresse est requise';
    }
    if (s === 'payment') {
      if (form.paymentMethod !== 'cod' && !form.paymentNumber.trim()) e.paymentNumber = 'Numéro de paiement requis';
      if (form.paymentMethod !== 'cod' && form.paymentNumber.trim() && !validatePhone(form.paymentNumber)) e.paymentNumber = 'Numéro invalide';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (step === 'product') { setStep('delivery'); return; }
    if (step === 'delivery') {
      if (!validateStep('delivery')) { toast({ title: 'Champs manquants', description: 'Vérifiez vos informations de livraison.' }); return; }
      setStep('payment'); return;
    }
    if (step === 'payment') {
      if (!validateStep('payment')) { toast({ title: 'Paiement incomplet', description: 'Vérifiez vos informations de paiement.' }); return; }
      if (form.paymentMethod === 'wave' || form.paymentMethod === 'orange') {
        haptic('light');
        setShowPaymentModal(true);
      } else {
        processFinalizeOrder('success');
      }
    }
  }

  function prevStep() {
    if (step === 'delivery') setStep('product');
    if (step === 'payment') setStep('delivery');
  }

  async function handleSimulatedPayment(outcome: 'success' | 'failure') {
    if (outcome === 'failure') {
      setShowPaymentModal(false);
      haptic('error');
      toast({
        title: 'Paiement échoué',
        description: 'Le paiement en ligne a été refusé ou annulé. Veuillez réessayer ou choisir un autre mode de paiement.',
      });
      return;
    }
    setShowPaymentModal(false);
    await processFinalizeOrder('success');
  }

  async function processFinalizeOrder(outcome: 'success' = 'success') {
    if (!campaign || submitting) return;
    setSubmitting(true);
    haptic('success');

    // Analytics: checkout_started + order_created (CDC §25)
    trackEvent('checkout_started', {
      entityType: 'campaign',
      entityId: campaign.campaign_id,
      metadata: { quantity: form.quantity, product: campaign.product_name },
    });

    // Try to find seller by code if not already attributed from link
    let resolvedSellerId = sellerInfo?.sellerId;
    let resolvedSellerCode = sellerInfo?.sellerCode;

    if (!resolvedSellerCode && form.sellerCode.trim()) {
      const { data: linkByCode } = await supabase
        .from('tracking_links')
        .select('seller_id, seller_code')
        .eq('seller_code', form.sellerCode.trim().toUpperCase())
        .eq('is_active', true)
        .limit(1);

      const found = (linkByCode as { seller_id: string; seller_code: string }[] | null)?.[0];
      if (found) {
        resolvedSellerId = found.seller_id;
        resolvedSellerCode = found.seller_code;
      }
    }

    // ── Server-side calculation via RPC (CDC §23) ──
    const { data: calc, error: calcErr } = await (supabase.rpc as any)('calculate_order_total', {
      p_campaign_id: campaign.campaign_id,
      p_quantity: form.quantity,
      p_zone_id: form.zoneId || null,
      p_seller_id: resolvedSellerId ?? null,
    });

    if (calcErr || !calc) {
      setSubmitting(false);
      haptic('error');
      toast({ title: 'Erreur de calcul', description: friendlyErrorMessage(calcErr) || 'Impossible de calculer le total.' });
      return;
    }

    const serverCalc = calc[0] as {
      product_price: number;
      subtotal: number;
      delivery_fee: number;
      commission_amount: number;
      platform_fee_amount: number;
      platform_fee_rate: number;
      merchant_amount: number;
      total_amount: number;
      model: string;
      commission_type: string;
      commission_rate: number;
      seller_attributed: boolean;
    };

    const serverTotal = serverCalc.total_amount;
    const serverCommission = serverCalc.commission_amount;
    const serverDeliveryFee = serverCalc.delivery_fee;
    const serverMerchantAmount = serverCalc.merchant_amount;
    const serverPlatformFee = serverCalc.platform_fee_amount;

    // Generate client-side UUID to prevent RLS SELECT error for anonymous customers
    const orderId = crypto.randomUUID();

    // Insert order with server-calculated amounts
    const { error: orderErr } = await (supabase
      .from('orders') as any)
      .insert({
        id: orderId,
        merchant_id: campaign.merchant_id,
        seller_id: resolvedSellerId ?? null,
        campaign_id: campaign.campaign_id,
        customer_name: form.customerName.trim(),
        customer_phone: form.phone.trim(),
        customer_address: form.address.trim(),
        total_amount: serverTotal,
        commission_amount: serverCommission,
        status: 'a_preparer',
        status_v2: 'created',
        zone_name: form.zoneName || selectedZone?.name || null,
        delivery_fee: serverDeliveryFee,
        payment_method: paymentMethodMap[form.paymentMethod],
        commission_model: serverCalc.model as 'commission' | 'marge',
        commission_type: serverCalc.commission_type as 'percentage' | 'fixed',
        commission_rate: serverCalc.commission_rate,
        snapshot_product_price: serverCalc.product_price,
        snapshot_commission_amount: serverCommission,
        merchant_amount: serverMerchantAmount,
        platform_fee: serverPlatformFee,
        platform_fee_amount: serverPlatformFee,
        platform_fee_rate: serverCalc.platform_fee_rate,
      });

    if (orderErr) {
      setSubmitting(false);
      haptic('error');
      toast({ title: 'Erreur de commande', description: friendlyErrorMessage(orderErr) });
      return;
    }

    // Analytics: order_created (CDC §25)
    trackEvent('order_created', {
      entityType: 'order',
      entityId: orderId,
      metadata: { total: serverTotal, commission: serverCommission, seller_attributed: !!resolvedSellerId },
    });

    // Insert order item
    if (campaign.product_id) {
      await supabase.from('order_items').insert({
        order_id: orderId,
        product_id: campaign.product_id,
        product_name: campaign.product_name,
        unit_price: serverCalc.product_price,
        quantity: form.quantity,
      } as never);
    }

    setSubmitting(false);

    const orderShortId = `CMD-${orderId.slice(-6).toUpperCase()}`;
    setConfirmedOrder({
      id: orderShortId,
      productName: campaign.product_name,
      merchantName: campaign.merchant_name,
      quantity: form.quantity,
      zone: form.zoneName || selectedZone?.name || '—',
      deliveryFee: serverDeliveryFee,
      total: serverTotal,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      paymentMethod: form.paymentMethod,
      sellerCode: resolvedSellerCode ?? null,
      commissionAmount: serverCommission,
    });
    setStep('confirmation');
    toast({
      title: 'Commande confirmée !',
      description: `${orderShortId} · ${money(serverTotal)} · Votre commande a bien été enregistrée.`,
    });
  }

  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-[100dvh] bg-[#f8f8fc]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white/90 px-5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#292541]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#5b49e8] text-white"><Icon glyph={Store01Icon} size={18} /></span>
          Fiaba
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#278e69]">
          <Icon glyph={LockKeyIcon} size={14} /> Paiement sécurisé
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6">
        {/* Stepper */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <span className={`grid h-9 w-9 place-items-center rounded-full transition ${i <= stepIndex ? 'bg-[#5b49e8] text-white' : 'bg-[#e4e1ff] text-[#9290a2]'}`}>
                  <Icon glyph={s.glyph} size={16} />
                </span>
                <span className={`text-[10px] font-bold ${i <= stepIndex ? 'text-[#5b49e8]' : 'text-[#9290a2]'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded-full ${i < stepIndex ? 'bg-[#5b49e8]' : 'bg-[#e4e1ff]'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="mt-8">
          {/* STEP 1: PRODUCT */}
          {step === 'product' && (
            <div className="space-y-4">
              <h1 className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.03em] text-[#292541]">{campaign.product_name}</h1>
              <p className="text-sm text-[#77738a]">par <strong className="text-[#292541]">{campaign.merchant_name}</strong></p>

              {/* Product image gallery */}
              {(() => {
                const images = parseImageUrls(campaign.product_image_url);
                const currentImg = images[activeImageIndex] || images[0];

                const handlePrevImage = () => {
                  haptic('light');
                  setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                };

                const handleNextImage = () => {
                  haptic('light');
                  setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                };

                return (
                  <div className="overflow-hidden rounded-3xl bg-white p-3 border border-[#f1effa] shadow-sm">
                    {images.length > 0 ? (
                      <div className="space-y-3">
                        {/* Main Square Aspect-Ratio Image Container */}
                        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#f8f7fc] group">
                          <img
                            src={currentImg}
                            alt={campaign.product_name}
                            className="h-full w-full object-cover transition-all duration-300"
                          />

                          {/* Navigation Arrows */}
                          {images.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={handlePrevImage}
                                className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#292541] shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95"
                                aria-label="Image précédente"
                                data-testid="button-gallery-prev"
                              >
                                <Icon glyph={ArrowLeft01Icon} size={20} />
                              </button>
                              <button
                                type="button"
                                onClick={handleNextImage}
                                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#292541] shadow-md backdrop-blur-md transition hover:bg-white hover:scale-105 active:scale-95"
                                aria-label="Image suivante"
                                data-testid="button-gallery-next"
                              >
                                <Icon glyph={ArrowRight01Icon} size={20} />
                              </button>

                              {/* Index badge */}
                              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                                {activeImageIndex + 1} / {images.length}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Thumbnails list with clean border-radius */}
                        {images.length > 1 && (
                          <div className="flex gap-2.5 overflow-x-auto px-1 py-1 scrollbar-none">
                            {images.map((img, idx) => (
                              <button
                                key={img + idx}
                                type="button"
                                onClick={() => { haptic('light'); setActiveImageIndex(idx); }}
                                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 p-0.5 transition-all ${
                                  idx === activeImageIndex
                                    ? 'border-[#5b49e8] ring-2 ring-[#5b49e8]/20 scale-105'
                                    : 'border-[#e9e6f1] opacity-70 hover:opacity-100 hover:border-[#b8b4c8]'
                                }`}
                                data-testid={`thumbnail-${idx}`}
                              >
                                <img src={img} alt={`Vignette ${idx + 1}`} className="h-full w-full rounded-lg object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid aspect-square w-full place-items-center bg-[#f8f7fc] rounded-2xl">
                        <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
                          <Icon glyph={Store01Icon} size={36} />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Product description */}
              {campaign.product_description && (
                <div className="rounded-2xl bg-white p-5 space-y-1.5" data-testid="product-description-card">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Description du produit</p>
                  <p className="text-sm leading-relaxed text-[#514b71] whitespace-pre-line">{campaign.product_description}</p>
                </div>
              )}

              {/* Price + quantity */}
              <div className="rounded-2xl bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Prix unitaire</p>
                    <strong className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(campaign.product_price)}</strong>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Quantité</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { haptic('light'); setField('quantity', Math.max(1, form.quantity - 1)); }} className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0eff5] text-[#292541]" data-testid="button-qty-minus">−</button>
                      <span className="w-8 text-center font-[Space_Grotesk] text-lg font-bold text-[#292541]">{form.quantity}</span>
                      <button onClick={() => { haptic('light'); setField('quantity', form.quantity + 1); }} className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0eff5] text-[#292541]" data-testid="button-qty-plus">+</button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#f0eff5] pt-4">
                  <span className="text-sm text-[#77738a]">Sous-total</span>
                  <strong className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">{money(subtotal)}</strong>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {[
                  [ShieldKeyIcon, 'Paiement sécurisé'],
                  [DeliveryTruck01Icon, 'Livraison nationale'],
                  [CheckmarkCircle02Icon, 'Produit vérifié'],
                ].map(([g, l]) => (
                  <div key={l as string} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 sm:p-3 text-center min-w-0">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={g as IconType} size={16} /></span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#77738a] leading-tight break-words">{l as string}</span>
                  </div>
                ))}
              </div>

              {/* Seller attribution badge */}
              {linkStatus === 'valid' && sellerInfo && (
                <div className="rounded-2xl bg-[#efedff] p-4 border border-[#dfdbff]" data-testid="seller-attribution-badge">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5b49e8] text-white font-[Space_Grotesk] font-bold text-sm">
                      {campaign.merchant_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p className="text-xs font-bold text-[#292541]">
                          Par <span className="text-[#5b49e8]">{campaign.merchant_name}</span>
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#278e69] shrink-0 bg-[#e7faf2] px-2 py-0.5 rounded-md border border-[#c5f4e0]">
                          <Icon glyph={LockKeyIcon} size={11} /> Partenaire certifié
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#77738a]">Offre certifiée disponible auprès de {campaign.merchant_name}.</p>
                    </div>
                  </div>
                </div>
              )}
              {linkStatus === 'invalid' && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#fff0f1] p-4" data-testid="seller-attribution-error">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#c45667] text-white"><Icon glyph={Alert01Icon} size={20} /></span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#c45667]">Lien non vérifié</p>
                    <p className="text-[10px] text-[#77738a]">{linkError ?? 'Le lien pourrait être expiré ou modifié.'}</p>
                  </div>
                </div>
              )}
              {linkStatus === 'none' && (
                <div className="rounded-2xl bg-white p-4">
                  <label className="text-xs font-bold text-[#292541]">Code vendeur (optionnel)</label>
                  <p className="mt-0.5 text-[10px] text-[#77738a]">Si un vendeur vous a recommandé ce produit, entrez son code pour le créditer.</p>
                  <input
                    value={form.sellerCode}
                    onChange={(e) => setField('sellerCode', e.target.value.toUpperCase())}
                    placeholder="Ex. MARIFALL"
                    className="mt-2 w-full rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-4 py-2.5 text-sm font-bold tracking-wider outline-none focus:border-[#5b49e8]"
                    data-testid="input-seller-code"
                  />
                </div>
              )}

              <button onClick={() => { haptic('medium'); nextStep(); }} className="w-full rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white transition hover:bg-[#4a3bc7]" data-testid="button-next-delivery">
                Continuer vers la livraison
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { haptic('light'); setShowReportModal(true); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9290a2] hover:text-[#c45667] transition"
                  data-testid="button-open-report"
                >
                  <Icon glyph={Alert01Icon} size={14} /> Signaler ce produit ou cette offre
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DELIVERY */}
          {step === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { haptic('light'); prevStep(); }} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#292541]" data-testid="button-back-product"><Icon glyph={ArrowLeft01Icon} size={16} /></button>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.03em] text-[#292541]">Livraison</h1>
              </div>

              <div className="space-y-4 rounded-2xl bg-white p-5">
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Nom complet *</label>
                  <input value={form.customerName} onChange={(e) => setField('customerName', e.target.value)} placeholder="Ex. Aminata Ndiaye" className={`mt-1.5 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none transition focus:bg-white focus:ring-1 ${errors.customerName ? 'ring-1 ring-[#ef6d78]' : 'focus:ring-[#5b49e8]'} placeholder:text-[#b8b4c8]`} data-testid="input-customer-name" />
                  {errors.customerName && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.customerName}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Téléphone *</label>
                  <div className={`mt-1.5 flex items-center gap-2 rounded-xl bg-[#f4f3f8] px-4 transition focus-within:bg-white focus-within:ring-1 ${errors.phone ? 'ring-1 ring-[#ef6d78]' : 'focus-within:ring-[#5b49e8]'}`}>
                    <Icon glyph={SmartPhone01Icon} size={16} />
                    <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="77 123 45 67" className="w-full bg-transparent py-3 text-sm text-[#292541] outline-none placeholder:text-[#b8b4c8]" data-testid="input-phone" />
                  </div>
                  {errors.phone && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.phone}</p>}
                </div>

                {/* Zone */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Zone de livraison *</label>
                  <div className="mt-1.5 space-y-2">
                    {zones.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => { haptic('light'); setField('zoneId', z.id); setField('zoneName', z.name); }}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${form.zoneId === z.id ? 'border-[#5b49e8] bg-[#f6f5ff]' : 'border-[#e9e6f1] bg-white hover:border-[#d4ceff]'}`}
                        data-testid={`zone-${z.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon glyph={MapPinIcon} size={16} />
                          <span className="text-sm font-bold text-[#292541]">{z.name}</span>
                        </span>
                        <span className="text-xs font-bold text-[#278e69]">{money(z.fee)}</span>
                      </button>
                    ))}
                  </div>
                  {errors.zone && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.zone}</p>}
                </div>

                {/* Address */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Adresse précise *</label>
                  <textarea value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Quartier, rue, repère, point de rencontre…" className={`mt-1.5 w-full min-h-24 resize-none rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none transition focus:bg-white focus:ring-1 ${errors.address ? 'ring-1 ring-[#ef6d78]' : 'focus:ring-[#5b49e8]'} placeholder:text-[#b8b4c8]`} data-testid="input-address" />
                  {errors.address && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.address}</p>}
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Note (optionnel)</label>
                  <input value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="Ex. Appeler avant livraison" className="mt-1.5 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8] placeholder:text-[#b8b4c8]" data-testid="input-note" />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-[#f6f5ff] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Récapitulatif</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#77738a]">{campaign.product_name} × {form.quantity}</span><span className="font-bold text-[#292541]">{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Livraison {form.zoneName || '—'}</span><span className="font-bold text-[#292541]">{money(deliveryFee)}</span></div>
                  <div className="flex justify-between border-t border-[#e4e1ff] pt-2"><span className="font-bold text-[#292541]">Total</span><strong className="font-[Space_Grotesk] text-lg font-bold text-[#5b49e8]">{money(total)}</strong></div>
                </div>
              </div>

              <button onClick={() => { haptic('medium'); nextStep(); }} className="w-full rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white transition hover:bg-[#4a3bc7]" data-testid="button-next-payment">
                Continuer vers le paiement
              </button>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { haptic('light'); prevStep(); }} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#292541]" data-testid="button-back-delivery"><Icon glyph={ArrowLeft01Icon} size={16} /></button>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.03em] text-[#292541]">Paiement</h1>
              </div>

              {/* Payment method selector */}
              <div className="space-y-3 rounded-2xl bg-white p-5">
                <p className="text-xs font-bold text-[#292541]">Méthode de paiement</p>
                {([
                  { id: 'wave' as const, label: 'Wave', desc: 'Paiement instantané via Wave' },
                  { id: 'orange' as const, label: 'Orange Money', desc: 'Transfert via Orange Money' },
                  { id: 'cod' as const, label: 'Paiement à la livraison', desc: 'Payez en espèces à réception' },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { haptic('light'); setField('paymentMethod', m.id); }}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${form.paymentMethod === m.id ? 'border-[#5b49e8] bg-[#f6f5ff]' : 'border-[#e9e6f1] bg-white hover:border-[#d4ceff]'}`}
                    data-testid={`payment-${m.id}`}
                  >
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${form.paymentMethod === m.id ? 'border-[#5b49e8] bg-[#5b49e8]' : 'border-[#c4c0d6]'}`}>
                      {form.paymentMethod === m.id && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#292541]">{m.label}</p>
                      <p className="text-[10px] text-[#77738a]">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Payment number (if not COD) */}
              {form.paymentMethod !== 'cod' && (
                <div className="rounded-2xl bg-white p-5">
                  <label className="text-xs font-bold text-[#292541]">Numéro {form.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'} *</label>
                  <div className={`mt-1.5 flex items-center gap-2 rounded-xl bg-[#f4f3f8] px-4 transition focus-within:bg-white focus-within:ring-1 ${errors.paymentNumber ? 'ring-1 ring-[#ef6d78]' : 'focus-within:ring-[#5b49e8]'}`}>
                    <Icon glyph={SmartPhone01Icon} size={16} />
                    <input value={form.paymentNumber} onChange={(e) => setField('paymentNumber', e.target.value)} placeholder="77 123 45 67" className="w-full bg-transparent py-3 text-sm text-[#292541] outline-none placeholder:text-[#b8b4c8]" data-testid="input-payment-number" />
                  </div>
                  {errors.paymentNumber && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.paymentNumber}</p>}
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-[#9290a2]"><Icon glyph={LockKeyIcon} size={12} /> Vos informations sont chiffrées et sécurisées.</p>
                </div>
              )}

              {/* Order summary */}
              <div className="rounded-2xl bg-[#f6f5ff] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Récapitulatif</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#77738a]">{campaign.product_name} × {form.quantity}</span><span className="font-bold text-[#292541]">{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Livraison</span><span className="font-bold text-[#292541]">{money(deliveryFee)}</span></div>
                  <div className="flex justify-between border-t border-[#e4e1ff] pt-2"><span className="font-bold text-[#292541]">Total à payer</span><strong className="font-[Space_Grotesk] text-xl font-bold text-[#5b49e8]">{money(total)}</strong></div>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-center gap-2 rounded-2xl bg-[#e7faf2] px-4 py-3 text-xs font-bold text-[#278e69]">
                <Icon glyph={ShieldKeyIcon} size={16} /> Transaction protégée par chiffrement de bout en bout
              </div>

              <button onClick={() => { haptic('success'); nextStep(); }} disabled={submitting} className="w-full rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white transition hover:bg-[#4a3bc7] disabled:opacity-60" data-testid="button-confirm-order">
                {submitting ? 'Traitement…' : form.paymentMethod === 'cod' ? 'Confirmer la commande' : `Payer ${money(total)}`}
              </button>
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 'confirmation' && confirmedOrder && (
            <div className="space-y-5 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#e7faf2] text-[#278e69]">
                <Icon glyph={CheckmarkCircle02Icon} size={40} />
              </div>
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.03em] text-[#292541]">Commande confirmée !</h1>
                <p className="mt-2 text-sm text-[#77738a]">Merci {confirmedOrder.customerName}. Votre commande <strong className="text-[#292541]">{confirmedOrder.id}</strong> est en préparation.</p>
              </div>

              <div className="rounded-2xl bg-white p-5 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Détails de la commande</p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[#77738a]">Produit</span><span className="font-bold text-[#292541]">{confirmedOrder.productName} × {confirmedOrder.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Livraison</span><span className="font-bold text-[#292541]">{confirmedOrder.zone} · {money(confirmedOrder.deliveryFee)}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Paiement</span><span className="font-bold text-[#292541]">{confirmedOrder.paymentMethod === 'wave' ? 'Wave' : confirmedOrder.paymentMethod === 'orange' ? 'Orange Money' : 'À la livraison'}</span></div>
                  <div className="flex justify-between border-t border-[#f0eff5] pt-3"><span className="font-bold text-[#292541]">Total</span><strong className="font-[Space_Grotesk] text-lg font-bold text-[#5b49e8]">{money(confirmedOrder.total)}</strong></div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#fff4de] p-4 text-left">
                <p className="text-xs font-bold text-[#ac741e]">Prochaines étapes</p>
                <ul className="mt-2 space-y-1.5 text-xs text-[#77738a]">
                  <li className="flex items-center gap-2"><Icon glyph={Store01Icon} size={14} /> {confirmedOrder.merchantName} prépare votre commande</li>
                  <li className="flex items-center gap-2"><Icon glyph={DeliveryTruck01Icon} size={14} /> Livraison vers {confirmedOrder.zone}</li>
                  <li className="flex items-center gap-2"><Icon glyph={SmartPhone01Icon} size={14} /> Vous recevrez un SMS au {confirmedOrder.phone}</li>
                </ul>
              </div>

              <Link href="/" className="inline-block w-full rounded-2xl bg-[#5b49e8] py-4 text-center text-sm font-bold text-white transition hover:bg-[#4a3bc7]" data-testid="link-back-home">
                Retour à l'accueil
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Modal for Online Payment */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl border border-[#eceaf5]">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efedff] text-[#5b49e8] mb-4">
                <Icon glyph={Wallet01Icon} size={28} />
              </div>
              <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">
                Simulation de Paiement {form.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
              </h3>
              <p className="mt-1 text-xs text-[#77738a]">
                Mode Test : Veuillez choisir le résultat du paiement en ligne.
              </p>

              <div className="mt-5 rounded-2xl bg-[#f8f7fc] p-4 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9290a2]">Client</span>
                  <span className="font-bold text-[#292541]">{form.customerName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9290a2]">Téléphone</span>
                  <span className="font-bold text-[#292541]">{form.phone}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9290a2]">Mode de paiement</span>
                  <span className="font-bold text-[#5b49e8]">
                    {form.paymentMethod === 'wave' ? 'Wave Mobile Money' : 'Orange Money'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-[#e9e6f1] pt-2 mt-2 font-bold">
                  <span>Montant total</span>
                  <span className="text-[#278e69]">{money(total)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSimulatedPayment('success')}
                  className="w-full rounded-2xl bg-[#278e69] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#207556] transition flex items-center justify-center gap-2"
                  data-testid="button-simulate-payment-success"
                >
                  {submitting ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Icon glyph={CheckmarkCircle02Icon} size={18} />
                      Simuler Succès (Paiement Réussi)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSimulatedPayment('failure')}
                  className="w-full rounded-2xl bg-[#fff0f1] border border-[#fbd4d8] py-3.5 text-sm font-bold text-[#c45667] hover:bg-[#ffe3e6] transition flex items-center justify-center gap-2"
                  data-testid="button-simulate-payment-failure"
                >
                  <Icon glyph={Cancel01Icon} size={18} />
                  Simuler Échec (Paiement Échoué)
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full rounded-2xl py-2.5 text-xs font-bold text-[#9290a2] hover:text-[#292541] transition"
                  data-testid="button-cancel-payment-modal"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Signalement */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl border border-[#eceaf5] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#f0eff5] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667]">
                  <Icon glyph={Alert01Icon} size={20} />
                </span>
                <div>
                  <h3 className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">Signaler un problème</h3>
                  <p className="text-[10px] text-[#77738a]">Fiaba · Espace de confiance certifié</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f3f8] text-[#77738a] hover:text-[#292541]"
                data-testid="button-close-report-modal"
              >
                <Icon glyph={Cancel01Icon} size={16} />
              </button>
            </div>

            <form onSubmit={handleSendReport} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#292541]">Motif du signalement *</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] font-bold outline-none focus:bg-white focus:ring-1 focus:ring-[#5b49e8]"
                  data-testid="select-report-reason"
                >
                  <option value="Produit non conforme ou trompeur">Produit non conforme ou trompeur</option>
                  <option value="Prix abusif ou escroquerie suspectée">Prix abusif ou escroquerie suspectée</option>
                  <option value="Photos ou description volées">Photos ou description volées</option>
                  <option value="Marchand ou boutique suspecte">Marchand ou boutique suspecte</option>
                  <option value="Autre raison">Autre motif de signalement</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#292541]">Détails complémentaires (optionnel)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Décrivez brièvement le problème constaté pour aider notre équipe d'audit..."
                  className="mt-1.5 w-full min-h-24 resize-none rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none placeholder:text-[#b8b4c8] focus:bg-white focus:ring-1 focus:ring-[#5b49e8]"
                  data-testid="textarea-report-details"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="w-1/3 rounded-2xl bg-[#f4f3f8] py-3 text-xs font-bold text-[#77738a] hover:text-[#292541] transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="w-2/3 rounded-2xl bg-[#c45667] py-3 text-xs font-bold text-white shadow-md hover:bg-[#b04858] transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                  data-testid="button-submit-report"
                >
                  {reportSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Icon glyph={Alert01Icon} size={15} />
                      Transmettre le signalement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
