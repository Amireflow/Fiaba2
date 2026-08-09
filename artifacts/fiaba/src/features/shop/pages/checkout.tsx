import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import {
  ArrowLeft01Icon,
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
import { read, write } from '@/lib/storage';
import { money, haptic } from '@/lib/utils';
import { validateSecureLink, extractTokenFromUrl, type SecureLinkPayload } from '@/lib/link';
import { attributeOrder, trackClick, findSellerByCode, type CheckoutOrderData } from '@/lib/attribution';
import { seedOpportunities } from '@/config/seller-seeds';
import { seedZones } from '@/config/seeds';
import type { Opportunity, DeliveryZone } from '@/types/entities';

/* ── Types ── */

type Step = 'product' | 'delivery' | 'payment' | 'confirmation';

type CheckoutForm = {
  quantity: number;
  customerName: string;
  phone: string;
  zone: string;
  address: string;
  paymentMethod: 'wave' | 'orange' | 'cod';
  paymentNumber: string;
  note: string;
  sellerCode: string;
};

type CustomerOrder = {
  id: string;
  productId: string;
  productName: string;
  merchantName: string;
  sellerId?: string;
  sellerCode?: string;
  quantity: number;
  unitPrice: number;
  zone: string;
  deliveryFee: number;
  total: number;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  paymentNumber: string;
  note: string;
  date: string;
  status: 'À préparer' | 'En livraison' | 'Livrée' | 'Annulée';
};

/* ── Helpers ── */

const steps: { id: Step; label: string; glyph: IconType }[] = [
  { id: 'product', label: 'Produit', glyph: ShoppingBag01Icon },
  { id: 'delivery', label: 'Livraison', glyph: DeliveryTruck01Icon },
  { id: 'payment', label: 'Paiement', glyph: Wallet01Icon },
  { id: 'confirmation', label: 'Confirmation', glyph: CheckmarkCircle02Icon },
];

function validatePhone(phone: string): boolean {
  // Senegalese phone: starts with 7, 10 digits, or +221 + 9 digits
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(7[0-8])\d{7}$/.test(cleaned) || /^\+2217[0-8]\d{7}$/.test(cleaned) || /^(77|78|76|70)\d{7}$/.test(cleaned);
}

/* ── Component ── */

export function Checkout() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  const [opportunities] = useState<Opportunity[]>(() => read('opportunities', seedOpportunities));
  const [zones] = useState<DeliveryZone[]>(() => read('delivery-zones', seedZones));

  const op = opportunities.find((o) => o.id === id);
  const [step, setStep] = useState<Step>('product');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmedOrder, setConfirmedOrder] = useState<CustomerOrder | null>(null);

  // Seller attribution state
  const [sellerInfo, setSellerInfo] = useState<{ sellerId: string; sellerCode: string; campaignId: string } | null>(null);
  const [linkStatus, setLinkStatus] = useState<'validating' | 'valid' | 'invalid' | 'none'>('none');
  const [linkError, setLinkError] = useState<string | null>(null);

  const [form, setForm] = useState<CheckoutForm>({
    quantity: 1,
    customerName: '',
    phone: '',
    zone: '',
    address: '',
    paymentMethod: 'wave',
    paymentNumber: '',
    note: '',
    sellerCode: '',
  });

  // Parse and validate the secure link token from URL on mount
  useEffect(() => {
    const token = extractTokenFromUrl(window.location.href);
    if (!token) {
      setLinkStatus('none');
      return;
    }
    setLinkStatus('validating');
    validateSecureLink(token)
      .then((result) => {
        if (result.valid && result.payload) {
          const p: SecureLinkPayload = result.payload;
          setSellerInfo({ sellerId: p.sellerId, sellerCode: p.sellerCode, campaignId: p.campaignId });
          setForm((prev) => ({ ...prev, sellerCode: p.sellerCode }));
          setLinkStatus('valid');
          // Track the click
          trackClick(p.campaignId, p.sellerCode);
        } else {
          setLinkStatus('invalid');
          setLinkError(result.error);
        }
      })
      .catch(() => {
        setLinkStatus('invalid');
        setLinkError('Erreur de validation du lien');
      });
  }, [location]);

  if (!op) {
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

  const activeZones = zones.filter((z) => z[1]);
  const selectedZone = activeZones.find((z) => z[0] === form.zone);
  const deliveryFee = selectedZone ? selectedZone[2] : 0;
  const subtotal = op.price * form.quantity;
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
      if (!form.zone) e.zone = 'Choisissez une zone de livraison';
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
      submitOrder();
    }
  }

  function prevStep() {
    if (step === 'delivery') setStep('product');
    if (step === 'payment') setStep('delivery');
  }

  function submitOrder() {
    // Try to find seller by code if not already attributed from link
    let resolvedSellerId = sellerInfo?.sellerId;
    let resolvedSellerCode = sellerInfo?.sellerCode;

    if (!resolvedSellerCode && form.sellerCode.trim()) {
      const found = findSellerByCode(form.sellerCode.trim());
      if (found) {
        resolvedSellerCode = found.code;
        resolvedSellerId = found.id;
      }
    }

    const order: CustomerOrder = {
      id: `CMD-${Date.now().toString().slice(-6)}`,
      productId: op!.id,
      productName: op!.productName,
      merchantName: op!.merchantName,
      sellerId: resolvedSellerId,
      sellerCode: resolvedSellerCode,
      quantity: form.quantity,
      unitPrice: op!.price,
      zone: form.zone,
      deliveryFee,
      total,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      paymentMethod: form.paymentMethod,
      paymentNumber: form.paymentNumber.trim(),
      note: form.note.trim(),
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      status: 'À préparer',
    };

    // Save customer order
    const existing = read<CustomerOrder[]>('customer-orders', []);
    write('customer-orders', [order, ...existing]);

    // Attribute to seller + merchant via the attribution service
    const orderData: CheckoutOrderData = {
      id: order.id,
      productId: order.productId,
      productName: order.productName,
      merchantName: order.merchantName,
      sellerId: resolvedSellerId,
      sellerCode: resolvedSellerCode,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      zone: order.zone,
      deliveryFee: order.deliveryFee,
      total: order.total,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      paymentMethod: order.paymentMethod,
      paymentNumber: order.paymentNumber,
      note: order.note,
      date: order.date,
      status: order.status,
    };
    const { commissionAmount, sellerAttributed } = attributeOrder(orderData);

    setConfirmedOrder(order);
    setStep('confirmation');
    toast({
      title: 'Commande confirmée !',
      description: sellerAttributed
        ? `${order.id} · ${money(order.total)} · Vendeur ${resolvedSellerCode} crédité de ${money(commissionAmount)}`
        : `${order.id} · ${money(order.total)}`,
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
              <h1 className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.03em] text-[#292541]">{op.productName}</h1>
              <p className="text-sm text-[#77738a]">par <strong className="text-[#292541]">{op.merchantName}</strong></p>

              {/* Product image */}
              <div className="overflow-hidden rounded-3xl bg-white">
                {op.image ? (
                  <img src={op.image} alt={op.productName} className="h-64 w-full object-cover" />
                ) : (
                  <div className="grid h-64 w-full place-items-center bg-[#f8f7fc]">
                    <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={36} /></span>
                  </div>
                )}
              </div>

              {/* Price + quantity */}
              <div className="rounded-2xl bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Prix unitaire</p>
                    <strong className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(op.price)}</strong>
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
              <div className="grid grid-cols-3 gap-2">
                {[
                  [ShieldKeyIcon, 'Paiement sécurisé'],
                  [DeliveryTruck01Icon, 'Livraison nationale'],
                  [CheckmarkCircle02Icon, 'Produit vérifié'],
                ].map(([g, l]) => (
                  <div key={l as string} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={g as IconType} size={16} /></span>
                    <span className="text-[9px] font-bold text-[#77738a]">{l as string}</span>
                  </div>
                ))}
              </div>

              {/* Seller attribution badge */}
              {linkStatus === 'valid' && sellerInfo && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#efedff] p-4" data-testid="seller-attribution-badge">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b49e8] text-white"><Icon glyph={UserGroupIcon} size={20} /></span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#292541]">Recommandé par {sellerInfo.sellerCode}</p>
                    <p className="text-[10px] text-[#77738a]">Ce vendeur sera crédité de sa commission sur votre commande.</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#278e69]"><Icon glyph={LockKeyIcon} size={12} /> Lien vérifié</span>
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
                  <input value={form.customerName} onChange={(e) => setField('customerName', e.target.value)} placeholder="Ex. Aminata Ndiaye" className={`mt-1.5 w-full rounded-xl border bg-[#fbfaff] px-4 py-3 text-sm outline-none ${errors.customerName ? 'border-[#ef6d78]' : 'border-[#e9e6f1] focus:border-[#5b49e8]'}`} data-testid="input-customer-name" />
                  {errors.customerName && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.customerName}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Téléphone *</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-4">
                    <Icon glyph={SmartPhone01Icon} size={16} />
                    <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="77 123 45 67" className="w-full bg-transparent py-3 text-sm outline-none" data-testid="input-phone" />
                  </div>
                  {errors.phone && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.phone}</p>}
                </div>

                {/* Zone */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Zone de livraison *</label>
                  <div className="mt-1.5 space-y-2">
                    {activeZones.map(([name, , fee]) => (
                      <button
                        key={name}
                        onClick={() => { haptic('light'); setField('zone', name); }}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${form.zone === name ? 'border-[#5b49e8] bg-[#f6f5ff]' : 'border-[#e9e6f1] bg-white hover:border-[#d4ceff]'}`}
                        data-testid={`zone-${name}`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon glyph={MapPinIcon} size={16} />
                          <span className="text-sm font-bold text-[#292541]">{name}</span>
                        </span>
                        <span className="text-xs font-bold text-[#278e69]">{money(fee)}</span>
                      </button>
                    ))}
                  </div>
                  {errors.zone && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.zone}</p>}
                </div>

                {/* Address */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Adresse précise *</label>
                  <textarea value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Quartier, rue, repère, point de rencontre…" className={`mt-1.5 w-full rounded-xl border bg-[#fbfaff] px-4 py-3 text-sm outline-none ${errors.address ? 'border-[#ef6d78]' : 'border-[#e9e6f1] focus:border-[#5b49e8]'}`} data-testid="input-address" />
                  {errors.address && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.address}</p>}
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-[#292541]">Note (optionnel)</label>
                  <input value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="Ex. Appeler avant livraison" className="mt-1.5 w-full rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-4 py-3 text-sm outline-none focus:border-[#5b49e8]" data-testid="input-note" />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-[#f6f5ff] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Récapitulatif</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#77738a]">{op.productName} × {form.quantity}</span><span className="font-bold text-[#292541]">{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Livraison {form.zone || '—'}</span><span className="font-bold text-[#292541]">{money(deliveryFee)}</span></div>
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
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-4">
                    <Icon glyph={SmartPhone01Icon} size={16} />
                    <input value={form.paymentNumber} onChange={(e) => setField('paymentNumber', e.target.value)} placeholder="77 123 45 67" className="w-full bg-transparent py-3 text-sm outline-none" data-testid="input-payment-number" />
                  </div>
                  {errors.paymentNumber && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.paymentNumber}</p>}
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-[#9290a2]"><Icon glyph={LockKeyIcon} size={12} /> Vos informations sont chiffrées et sécurisées.</p>
                </div>
              )}

              {/* Order summary */}
              <div className="rounded-2xl bg-[#f6f5ff] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Récapitulatif</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#77738a]">{op.productName} × {form.quantity}</span><span className="font-bold text-[#292541]">{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#77738a]">Livraison</span><span className="font-bold text-[#292541]">{money(deliveryFee)}</span></div>
                  <div className="flex justify-between border-t border-[#e4e1ff] pt-2"><span className="font-bold text-[#292541]">Total à payer</span><strong className="font-[Space_Grotesk] text-xl font-bold text-[#5b49e8]">{money(total)}</strong></div>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-center gap-2 rounded-2xl bg-[#e7faf2] px-4 py-3 text-xs font-bold text-[#278e69]">
                <Icon glyph={ShieldKeyIcon} size={16} /> Transaction protégée par chiffrement de bout en bout
              </div>

              <button onClick={() => { haptic('success'); nextStep(); }} className="w-full rounded-2xl bg-[#5b49e8] py-4 text-sm font-bold text-white transition hover:bg-[#4a3bc7]" data-testid="button-confirm-order">
                {form.paymentMethod === 'cod' ? 'Confirmer la commande' : `Payer ${money(total)}`}
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
    </div>
  );
}
