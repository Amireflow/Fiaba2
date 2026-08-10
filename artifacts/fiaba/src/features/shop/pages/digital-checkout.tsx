import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Store01Icon,
  Wallet01Icon,
  ShieldKeyIcon,
  LockKeyIcon,
  Cancel01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  Alert01Icon,
  Download01Icon,
  Share02Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic, friendlyErrorMessage } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { extractTokenFromUrl } from '@/lib/link';
import { parseImageUrls } from '@/lib/storage-upload';
import { trackEvent } from '@/lib/analytics';

type Step = 'checkout' | 'access';

type DigitalForm = {
  customerName: string;
  phone: string;
  paymentMethod: 'wave' | 'orange';
  paymentNumber: string;
  sellerCode: string;
};

type DigitalCampaignInfo = {
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
  digital_file_url: string | null;
  digital_access_instructions: string | null;
  merchant_id: string;
  merchant_name: string;
};

type ConfirmedDigitalOrder = {
  id: string;
  productName: string;
  merchantName: string;
  total: number;
  customerName: string;
  phone: string;
  paymentMethod: string;
  digitalFileUrl: string | null;
  digitalAccessInstructions: string | null;
};

const paymentMethodMap: Record<string, 'wave' | 'orange_money'> = {
  wave: 'wave',
  orange: 'orange_money',
};

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(7[0-8])\d{7}$/.test(cleaned) || /^\+2217[0-8]\d{7}$/.test(cleaned) || /^(77|78|76|70)\d{7}$/.test(cleaned);
}

export function DigitalCheckout() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<DigitalCampaignInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('checkout');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedDigitalOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Link attribution
  const [resolvedSellerId, setResolvedSellerId] = useState<string | null>(null);
  const [resolvedSellerCode, setResolvedSellerCode] = useState<string | null>(null);
  const [sellerInfo, setSellerInfo] = useState<{ displayName: string | null; sellerCode: string } | null>(null);

  const [form, setForm] = useState<DigitalForm>({
    customerName: '',
    phone: '',
    paymentMethod: 'wave',
    paymentNumber: '',
    sellerCode: '',
  });

  function setField<K extends keyof DigitalForm>(key: K, value: DigitalForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  // Load campaign & product details
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      const { data: raw, error: campErr } = await supabase
        .from('campaigns')
        .select(`
          id, name, commission, commission_type, model,
          product_id, merchant_id,
          products:product_id (id, name, price, image_url, description, type, digital_file_url, digital_access_instructions),
          merchants:merchant_id (id, name)
        `)
        .eq('id', id)
        .single();

      if (campErr || !raw) {
        setLoading(false);
        return;
      }

      const c = raw as {
        id: string; name: string; commission: number; commission_type: string | null;
        model: string; product_id: string | null; merchant_id: string;
        products: { id: string; name: string; price: number; image_url: string | null; description: string | null; digital_file_url?: string | null; digital_access_instructions?: string | null } | null;
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
        digital_file_url: c.products?.digital_file_url ?? null,
        digital_access_instructions: c.products?.digital_access_instructions ?? null,
        merchant_id: c.merchant_id,
        merchant_name: c.merchants?.name ?? 'Boutique Digital',
      });

      setLoading(false);
    }
    loadData();
  }, [id]);

  // Handle tracking link attribution
  useEffect(() => {
    const token = extractTokenFromUrl(window.location.href);
    const params = new URLSearchParams(window.location.search);
    const sellerParam = params.get('seller') || params.get('ref');

    async function validateSellerAttribution() {
      if (token) {
        const { data: link } = await supabase
          .from('tracking_links')
          .select('seller_id, seller_code, is_active')
          .eq('token', token)
          .maybeSingle();

        const tl = link as { seller_id: string; seller_code: string; is_active: boolean } | null;
        if (tl && tl.is_active) {
          setResolvedSellerId(tl.seller_id);
          setResolvedSellerCode(tl.seller_code);
          setSellerInfo({ displayName: null, sellerCode: tl.seller_code });
        }
      } else if (sellerParam) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('id, seller_code')
          .eq('seller_code', sellerParam.toUpperCase())
          .maybeSingle();

        const s = seller as { id: string; seller_code: string } | null;
        if (s) {
          setResolvedSellerId(s.id);
          setResolvedSellerCode(s.seller_code);
          setSellerInfo({ displayName: null, sellerCode: s.seller_code });
        }
      }
    }
    validateSellerAttribution();
  }, []);

  function handleStartPayment(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!form.customerName.trim()) {
      errs.customerName = 'Veuillez entrer votre nom complet';
    }
    if (!form.phone.trim() || !validatePhone(form.phone)) {
      errs.phone = 'Numéro de téléphone sénégalais invalide (ex: 77 123 45 67)';
    }
    if (!form.paymentNumber.trim() || !validatePhone(form.paymentNumber)) {
      errs.paymentNumber = `Numéro ${form.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'} invalide`;
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      haptic('error');
      return;
    }

    haptic('medium');
    setShowPaymentModal(true);
  }

  async function handleSimulatedPayment(result: 'success' | 'failure') {
    setShowPaymentModal(false);

    if (result === 'failure') {
      haptic('error');
      toast({
        title: 'Paiement échoué',
        description: 'La transaction a été annulée ou refusée par le service de paiement.',
      });
      return;
    }

    await submitDigitalOrder();
  }

  async function submitDigitalOrder() {
    if (!campaign) return;
    setSubmitting(true);

    const price = campaign.product_price;
    const isFixedComm = campaign.commission_type === 'fixed' || (!campaign.commission_type && campaign.commission >= 100);
    const comm = resolvedSellerId
      ? (isFixedComm ? campaign.commission : Math.round((price * campaign.commission) / 100))
      : 0;
    const platformFee = Math.round(price * 0.05);

    const digitalDownloadToken = crypto.randomUUID().replace(/-/g, '');
    const digitalDownloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const orderId = crypto.randomUUID();

    const { error: orderErr } = await (supabase.from('orders') as any).insert({
      id: orderId,
      merchant_id: campaign.merchant_id,
      seller_id: resolvedSellerId ?? null,
      campaign_id: campaign.campaign_id,
      customer_name: form.customerName.trim(),
      customer_phone: form.phone.trim(),
      customer_address: 'Produit Digital (Téléchargement Instantané)',
      total_amount: price,
      commission_amount: comm,
      status: 'livree',
      status_v2: 'delivered',
      zone_name: 'Digital (Instant)',
      delivery_fee: 0,
      payment_method: paymentMethodMap[form.paymentMethod],
      commission_model: campaign.model || 'commission',
      commission_type: campaign.commission_type || 'percentage',
      commission_rate: campaign.commission || 0,
      snapshot_product_price: price,
      snapshot_commission_amount: comm,
      merchant_amount: Math.max(0, price - comm - platformFee),
      platform_fee: platformFee,
      platform_fee_amount: platformFee,
      platform_fee_rate: 5.00,
      digital_download_token: digitalDownloadToken,
      digital_download_expires_at: digitalDownloadExpiresAt,
    });

    if (orderErr) {
      setSubmitting(false);
      haptic('error');
      toast({ title: 'Erreur de commande', description: friendlyErrorMessage(orderErr) });
      return;
    }

    trackEvent('order_created', {
      entityType: 'order',
      entityId: orderId,
      metadata: { total: price, commission: comm, seller_attributed: !!resolvedSellerId, is_digital: true },
    });

    if (campaign.product_id) {
      await supabase.from('order_items').insert({
        order_id: orderId,
        product_id: campaign.product_id,
        product_name: campaign.product_name,
        unit_price: price,
        quantity: 1,
      } as never);
    }

    if (resolvedSellerId && comm > 0) {
      await (supabase.from('commissions') as any)
        .insert({
          seller_id: resolvedSellerId,
          order_id: orderId,
          campaign_id: campaign.campaign_id,
          amount: comm,
          status: 'available',
          model: campaign.model || 'commission',
          available_at: new Date().toISOString(),
        })
        .catch(() => {});
    }

    setSubmitting(false);
    const orderShortId = `CMD-${orderId.slice(-6).toUpperCase()}`;

    setConfirmedOrder({
      id: orderShortId,
      productName: campaign.product_name,
      merchantName: campaign.merchant_name,
      total: price,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      paymentMethod: form.paymentMethod,
      digitalFileUrl: campaign.digital_file_url ?? null,
      digitalAccessInstructions: campaign.digital_access_instructions ?? null,
    });

    setStep('access');
    haptic('success');
    toast({
      title: 'Paiement confirmé !',
      description: 'Accès instantané débloqué. Vous pouvez télécharger votre fichier dès maintenant.',
    });
  }

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
        <div className="text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent inline-block" />
          <p className="mt-3 text-xs font-bold text-[#77738a]">Chargement de la page de téléchargement…</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc] px-5">
        <div className="text-center">
          <p className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">Offre non trouvée</p>
          <p className="mt-2 text-sm text-[#77738a]">Le produit digital demandé n'est pas disponible.</p>
          <Link href="/" className="mt-4 inline-block rounded-xl bg-[#5b49e8] px-5 py-2.5 text-sm font-bold text-white">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const imageUrls = parseImageUrls(campaign.product_image_url);
  const primaryImage = imageUrls[0] ?? null;

  return (
    <div className="min-h-[100dvh] bg-[#f8f7fc] text-[#292541]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white/90 px-5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#292541]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#5b49e8] text-white">
            <Icon glyph={Store01Icon} size={18} />
          </span>
          Fiaba Digital
        </Link>
        <div className="flex items-center gap-1.5 rounded-full bg-[#efedff] px-3 py-1 text-xs font-bold text-[#5b49e8]">
          <Icon glyph={SparklesIcon} size={14} /> Accès Instantané
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {step === 'checkout' ? (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* Left Column: Product Showcase */}
            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl bg-white">
                {primaryImage ? (
                  <img src={primaryImage} alt={campaign.product_name} className="h-64 w-full object-cover" />
                ) : (
                  <div className="grid h-52 place-items-center bg-[#f5f3ff] text-[#5b49e8]">
                    <Icon glyph={SparklesIcon} size={48} />
                  </div>
                )}

                <div className="p-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7faf2] px-3 py-1 text-[11px] font-bold text-[#278e69]">
                    <Icon glyph={CheckmarkCircle02Icon} size={13} /> Produit Numérique Certifié
                  </span>

                  <h1 className="mt-3 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">
                    {campaign.product_name}
                  </h1>

                  <p className="mt-1 text-xs font-bold text-[#5b49e8]">
                    Vendu par {campaign.merchant_name}
                  </p>

                  {campaign.product_description && (
                    <p className="mt-4 text-xs leading-relaxed text-[#686380] whitespace-pre-line">
                      {campaign.product_description}
                    </p>
                  )}

                  <div className="mt-6 flex items-center justify-between pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Prix de la ressource</span>
                    <strong className="font-[Space_Grotesk] text-2xl font-bold text-[#5b49e8]">
                      {money(campaign.product_price)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Attribution info */}
              {sellerInfo && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#efedff] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#5b49e8] text-white font-[Space_Grotesk] font-bold text-xs">
                    {(sellerInfo.sellerCode || 'V').slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#292541]">
                      Recommandé par <span className="text-[#5b49e8]">{sellerInfo.sellerCode}</span>
                    </p>
                    <p className="text-[10px] text-[#77738a]">Recommandation partenaire vérifiée.</p>
                  </div>
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]">
                    <Icon glyph={ShieldKeyIcon} size={16} />
                  </span>
                  <div className="text-[11px]">
                    <p className="font-bold text-[#292541]">Paiement Sécurisé</p>
                    <p className="text-[#9290a2]">Wave & OM</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                    <Icon glyph={SparklesIcon} size={16} />
                  </span>
                  <div className="text-[11px]">
                    <p className="font-bold text-[#292541]">Accès Immédiat</p>
                    <p className="text-[#9290a2]">Après paiement</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Instant Checkout Form */}
            <div>
              <div className="rounded-3xl bg-white p-6">
                <h2 className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">
                  Obtenir votre accès en 1 clic
                </h2>
                <p className="mt-1 text-xs text-[#77738a]">
                  Renseignez vos coordonnées pour recevoir votre lien de téléchargement.
                </p>

                <form onSubmit={handleStartPayment} className="mt-5 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-bold text-[#292541]">Nom complet *</label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setField('customerName', e.target.value)}
                      placeholder="Ex. Aminata Ndiaye"
                      className={`mt-1.5 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none transition focus:bg-white focus:ring-1 ${
                        errors.customerName ? 'ring-1 ring-[#ef6d78]' : 'focus:ring-[#5b49e8]'
                      } placeholder:text-[#b8b4c8]`}
                      data-testid="input-digital-customer-name"
                    />
                    {errors.customerName && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.customerName}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-bold text-[#292541]">Numéro WhatsApp *</label>
                    <div className={`mt-1.5 flex items-center gap-2 rounded-xl bg-[#f4f3f8] px-4 transition focus-within:bg-white focus-within:ring-1 ${
                      errors.phone ? 'ring-1 ring-[#ef6d78]' : 'focus-within:ring-[#5b49e8]'
                    }`}>
                      <Icon glyph={SmartPhone01Icon} size={16} />
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        placeholder="77 123 45 67"
                        className="w-full bg-transparent py-3 text-sm text-[#292541] outline-none placeholder:text-[#b8b4c8]"
                        data-testid="input-digital-phone"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.phone}</p>}
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-xs font-bold text-[#292541]">Méthode de paiement mobile</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { haptic('light'); setField('paymentMethod', 'wave'); }}
                        className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition ${
                          form.paymentMethod === 'wave' ? 'bg-[#f6f5ff]' : 'bg-[#f4f3f8] hover:bg-[#eae8f5]'
                        }`}
                        data-testid="button-select-wave"
                      >
                        <span className={`grid h-4 w-4 place-items-center rounded-full ${form.paymentMethod === 'wave' ? 'bg-[#5b49e8]' : 'bg-[#c4c0d6]'}`}>
                          {form.paymentMethod === 'wave' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs font-bold text-[#292541]">Wave</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { haptic('light'); setField('paymentMethod', 'orange'); }}
                        className={`flex items-center gap-2.5 rounded-xl p-3 text-left transition ${
                          form.paymentMethod === 'orange' ? 'bg-[#f6f5ff]' : 'bg-[#f4f3f8] hover:bg-[#eae8f5]'
                        }`}
                        data-testid="button-select-orange"
                      >
                        <span className={`grid h-4 w-4 place-items-center rounded-full ${form.paymentMethod === 'orange' ? 'bg-[#5b49e8]' : 'bg-[#c4c0d6]'}`}>
                          {form.paymentMethod === 'orange' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs font-bold text-[#292541]">Orange Money</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Number */}
                  <div>
                    <label className="text-xs font-bold text-[#292541]">Numéro {form.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'} *</label>
                    <div className={`mt-1.5 flex items-center gap-2 rounded-xl bg-[#f4f3f8] px-4 transition focus-within:bg-white focus-within:ring-1 ${
                      errors.paymentNumber ? 'ring-1 ring-[#ef6d78]' : 'focus-within:ring-[#5b49e8]'
                    }`}>
                      <Icon glyph={SmartPhone01Icon} size={16} />
                      <input
                        type="text"
                        value={form.paymentNumber}
                        onChange={(e) => setField('paymentNumber', e.target.value)}
                        placeholder="77 123 45 67"
                        className="w-full bg-transparent py-3 text-sm text-[#292541] outline-none placeholder:text-[#b8b4c8]"
                        data-testid="input-digital-payment-number"
                      />
                    </div>
                    {errors.paymentNumber && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.paymentNumber}</p>}
                  </div>

                  {/* Pricing Summary */}
                  <div className="rounded-2xl bg-[#f8f7fc] p-4 text-xs space-y-1.5">
                    <div className="flex justify-between"><span className="text-[#77738a]">Montant du fichier</span><span className="font-bold">{money(campaign.product_price)}</span></div>
                    <div className="flex justify-between"><span className="text-[#77738a]">Frais de livraison</span><span className="font-bold text-[#278e69]">0 FCFA (Offerts)</span></div>
                    <div className="flex justify-between pt-2 font-bold text-sm">
                      <span>Total à régler</span>
                      <span className="text-[#5b49e8] font-[Space_Grotesk]">{money(campaign.product_price)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white hover:bg-[#4a3bc7] transition disabled:opacity-60 flex items-center justify-center gap-2"
                    data-testid="button-submit-digital-payment"
                  >
                    ⚡ Payer {money(campaign.product_price)} & Télécharger
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: INSTANT DOWNLOAD & ACCESS */
          confirmedOrder && (
            <div className="mx-auto max-w-xl text-center space-y-6">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#e7faf2] text-[#278e69]">
                <Icon glyph={CheckmarkCircle02Icon} size={40} />
              </div>

              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e7faf2] px-3 py-1 text-xs font-bold text-[#278e69]">
                  Paiement Réussi · Commande {confirmedOrder.id}
                </span>
                <h1 className="mt-3 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">
                  Félicitations {confirmedOrder.customerName} !
                </h1>
                <p className="mt-1 text-sm text-[#77738a]">
                  Votre accès au produit <strong className="text-[#292541]">{confirmedOrder.productName}</strong> est débloqué.
                </p>
              </div>

              {/* Prominent Digital Access Box */}
              <div className="rounded-3xl bg-white p-6 text-left space-y-4">
                <div className="flex items-center gap-2.5 text-[#5b49e8]">
                  <Icon glyph={SparklesIcon} size={22} />
                  <h2 className="font-[Space_Grotesk] text-lg font-bold">Votre Téléchargement</h2>
                </div>

                {confirmedOrder.digitalFileUrl ? (
                  <a
                    href={confirmedOrder.digitalFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#5b49e8] py-4 px-5 text-sm font-bold text-white hover:bg-[#4a3bc7] transition"
                    data-testid="button-download-now"
                  >
                    <Icon glyph={Download01Icon} size={20} />
                    ⚡ Télécharger le fichier maintenant
                  </a>
                ) : (
                  <p className="rounded-xl bg-[#fff4de] p-3 text-xs font-bold text-[#ac741e]">
                    Le lien direct de fichier est en cours de génération par le vendeur.
                  </p>
                )}

                {confirmedOrder.digitalAccessInstructions && (
                  <div className="rounded-2xl bg-[#f8f7fc] p-4 text-xs text-[#292541] space-y-1">
                    <p className="font-bold text-[#5b49e8]">Instructions complémentaires :</p>
                    <p className="whitespace-pre-line text-[#514b71]">{confirmedOrder.digitalAccessInstructions}</p>
                  </div>
                )}

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Bonjour ! Voici l'accès direct à mon achat ${confirmedOrder.productName} : ${confirmedOrder.digitalFileUrl ?? ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25d366] py-3 px-4 text-xs font-bold text-white transition hover:bg-[#20ba5a]"
                  data-testid="button-share-whatsapp"
                >
                  <Icon glyph={Share02Icon} size={16} />
                  Sauvegarder et recevoir le lien sur mon WhatsApp
                </a>
              </div>

              {/* Order Details Card */}
              <div className="rounded-2xl bg-white p-5 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Reçu de paiement</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#77738a]">Ressource</span><span className="font-bold text-[#292541]">{confirmedOrder.productName}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Boutique</span><span className="font-bold text-[#292541]">{confirmedOrder.merchantName}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Mode de paiement</span><span className="font-bold text-[#292541]">{confirmedOrder.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-sm"><span>Total Payé</span><strong className="text-[#5b49e8]">{money(confirmedOrder.total)}</strong></div>
                </div>
              </div>

              <Link href="/" className="inline-block w-full rounded-2xl bg-[#f0edf9] py-3.5 text-center text-xs font-bold text-[#5b49e8] hover:bg-[#e4ddff] transition">
                Retour à l'accueil
              </Link>
            </div>
          )
        )}
      </div>

      {/* Mobile Money Simulation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efedff] text-[#5b49e8] mb-4">
                <Icon glyph={Wallet01Icon} size={28} />
              </div>
              <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">
                Simulation Paiement Digital {form.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
              </h3>
              <p className="mt-1 text-xs text-[#77738a]">
                Veuillez valider le paiement mobile pour débloquer le fichier.
              </p>

              <div className="mt-5 rounded-2xl bg-[#f8f7fc] p-4 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9290a2]">Client</span>
                  <span className="font-bold text-[#292541]">{form.customerName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9290a2]">Produit</span>
                  <span className="font-bold text-[#292541]">{campaign.product_name}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 mt-2 font-bold">
                  <span>Montant total</span>
                  <span className="text-[#278e69]">{money(campaign.product_price)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSimulatedPayment('success')}
                  className="w-full rounded-2xl bg-[#278e69] py-3.5 text-sm font-bold text-white hover:bg-[#207556] transition flex items-center justify-center gap-2"
                  data-testid="button-simulate-digital-success"
                >
                  {submitting ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Icon glyph={CheckmarkCircle02Icon} size={18} />
                      Simuler Succès (Paiement Réussi & Déblocage)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSimulatedPayment('failure')}
                  className="w-full rounded-2xl bg-[#fff0f1] py-3.5 text-sm font-bold text-[#c45667] hover:bg-[#ffe3e6] transition flex items-center justify-center gap-2"
                  data-testid="button-simulate-digital-failure"
                >
                  <Icon glyph={Cancel01Icon} size={18} />
                  Simuler Échec (Paiement Échoué)
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full rounded-2xl py-2.5 text-xs font-bold text-[#9290a2] hover:text-[#292541] transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
