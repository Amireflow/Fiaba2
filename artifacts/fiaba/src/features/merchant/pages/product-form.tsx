import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ImageUploadIcon,
  Delete01Icon,
  StarIcon,
  Add01Icon,
  CheckmarkCircle02Icon,
  PackageIcon,
  SparklesIcon,
  Tag01Icon,
  File01Icon,
  Store01Icon,
  Wallet01Icon,
  ViewIcon,
  HelpCircleIcon,
  ShieldKeyIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, supabaseUpdate, getOrCreateMerchantId } from '@/hooks/use-supabase-query';
import { uploadMultipleImagesToSupabase, uploadImageToSupabase, parseImageUrls } from '@/lib/storage-upload';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
  textareaClass,
} from '../components/merchant-ui';

const categories = ['Beauté', 'Mode', 'Maison', 'Épicerie', 'Tech', 'Sport', 'Food', 'Gaming'] as const;

type WizardStep = 1 | 2 | 3;

type FormState = {
  name: string;
  category: string;
  sku: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
  description: string;
  images: string[];
  type: 'physique' | 'digital';
  digital_file_url: string;
  digital_access_instructions: string;
  // Affiliation Module
  enableAffiliation: boolean;
  commission: string;
  commissionType: 'percentage' | 'fixed';
};

const emptyForm: FormState = {
  name: '',
  category: 'Beauté',
  sku: '',
  price: '',
  stock: '10',
  lowStockThreshold: '3',
  description: '',
  images: [],
  type: 'physique',
  digital_file_url: '',
  digital_access_instructions: '',
  enableAffiliation: true,
  commission: '15',
  commissionType: 'percentage',
};

export function ProductForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const isEdit = !!id;

  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'seller' | 'customer'>('seller');

  // Upload Progress Tracking (%)
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [digitalUploadProgress, setDigitalUploadProgress] = useState<number | null>(null);

  // Field error validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing product & linked campaign from Supabase
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);

    async function loadProductData() {
      const { data: pData } = await supabase
        .from('products')
        .select('id, name, category, price, stock, description, image_url, type, digital_file_url, digital_access_instructions, weight, low_stock_threshold')
        .eq('id', id)
        .single();

      if (pData) {
        const p = pData as {
          name: string;
          category: string;
          price: number;
          stock: number;
          description: string | null;
          image_url: string | null;
          type: 'physique' | 'digital' | null;
          digital_file_url: string | null;
          digital_access_instructions: string | null;
          weight: number | null;
          low_stock_threshold: number | null;
        };

        // Check if there is a linked active campaign
        const { data: cData } = await supabase
          .from('campaigns')
          .select('id, commission, commission_type')
          .eq('product_id', id)
          .maybeSingle();

        const c = cData as { commission: number; commission_type: string | null } | null;

        setForm({
          name: p.name,
          category: p.category,
          sku: `SKU-${id.slice(0, 6).toUpperCase()}`,
          price: String(p.price),
          stock: p.type === 'digital' ? '999999' : String(p.stock),
          lowStockThreshold: String(p.low_stock_threshold ?? 3),
          description: p.description ?? '',
          images: parseImageUrls(p.image_url),
          type: p.type ?? 'physique',
          digital_file_url: p.digital_file_url ?? '',
          digital_access_instructions: p.digital_access_instructions ?? '',
          enableAffiliation: !!c,
          commission: c ? String(c.commission) : '15',
          commissionType: (c?.commission_type as 'percentage' | 'fixed') ?? 'percentage',
        });
      }
      setLoading(false);
    }

    loadProductData().catch(() => setLoading(false));
  }, [id, isEdit]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'type' && value === 'digital') {
        next.stock = '999999';
      }
      return next;
    });

    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  // Handle Multi-Image Upload with Progress %
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageUploadProgress(10);
    haptic('medium');

    const { urls, errors: uploadErrs } = await uploadMultipleImagesToSupabase(
      files,
      'products',
      (percent) => setImageUploadProgress(percent)
    );

    setImageUploadProgress(null);

    if (urls.length > 0) {
      haptic('success');
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast({
        title: `${urls.length} photo${urls.length > 1 ? 's' : ''} ajoutée${urls.length > 1 ? 's' : ''}`,
        description: 'Les photos ont été importées et enregistrées avec succès.',
      });
    }
    if (uploadErrs.length > 0 && urls.length === 0) {
      haptic('error');
      toast({ title: 'Erreur d\'envoi', description: uploadErrs[0] || 'Impossible de télécharger les photos.' });
    }
  }

  // Handle Digital File Upload with Progress %
  async function handleDigitalFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setDigitalUploadProgress(10);
    haptic('medium');

    const res = await uploadImageToSupabase(file, 'digital-files', (percent) => setDigitalUploadProgress(percent));
    setDigitalUploadProgress(null);

    if (res.url) {
      haptic('success');
      setField('digital_file_url', res.url);
      toast({
        title: 'Fichier digital téléchargé !',
        description: 'Votre ressource numérique est prête pour la livraison instantanée.',
      });
    } else {
      haptic('error');
      toast({ title: 'Erreur d\'envoi', description: res.error || 'Impossible d\'importer la ressource.' });
    }
  }

  function setPrimaryImage(index: number) {
    haptic('light');
    setForm((prev) => {
      const newImages = [...prev.images];
      const [selected] = newImages.splice(index, 1);
      return { ...prev, images: [selected, ...newImages] };
    });
  }

  function removeImage(index: number) {
    haptic('light');
    setForm((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: newImages };
    });
  }

  // Step Validation
  function validateStep(step: WizardStep): boolean {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!form.name.trim()) errs.name = 'Veuillez entrer le nom du produit';
    } else if (step === 2) {
      const price = Number(form.price);
      const stock = form.type === 'digital' ? 999999 : Number(form.stock);
      if (isNaN(price) || price <= 0) errs.price = 'Entrez un prix valide supérieur à 0 F';
      if (form.type === 'physique' && (isNaN(stock) || stock < 0)) errs.stock = 'Entrez une quantité en stock valide';

      if (form.enableAffiliation) {
        const comm = Number(form.commission);
        if (isNaN(comm) || comm <= 0) errs.commission = 'Entrez une commission valide';
        if (form.commissionType === 'percentage' && comm > 90) errs.commission = 'La commission ne peut pas dépasser 90%';
        if (form.commissionType === 'fixed' && comm >= price) errs.commission = 'La commission fixe doit être inférieure au prix';
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      haptic('error');
      return false;
    }
    return true;
  }

  function goToStep(target: WizardStep) {
    if (target > activeStep && !validateStep(activeStep)) return;
    haptic('light');
    setActiveStep(target);
  }

  // Live Revenue Calculation
  const revenueCalculations = useMemo(() => {
    const price = Math.max(0, Number(form.price) || 0);
    const commVal = Math.max(0, Number(form.commission) || 0);

    let sellerGain = 0;
    if (form.commissionType === 'fixed') {
      sellerGain = commVal;
    } else {
      sellerGain = Math.round((price * commVal) / 100);
    }

    const platformFee = Math.round(price * 0.05); // 5%
    const netMerchantRevenue = Math.max(0, price - sellerGain - platformFee);

    return {
      price,
      sellerGain,
      platformFee,
      netMerchantRevenue,
    };
  }, [form.price, form.commission, form.commissionType]);

  // Atomic Save to Supabase (products + campaigns)
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;

    const activeMerchantId = await getOrCreateMerchantId(merchantId);
    if (!activeMerchantId) {
      toast({ title: 'Erreur', description: 'Impossible de trouver votre boutique. Veuillez rafraîchir la page.' });
      return;
    }

    // Subscription Quota Enforcer
    if (!isEdit) {
      const { data: sub } = await (supabase.from('merchant_subscriptions') as any)
        .select('plan_id')
        .eq('merchant_id', activeMerchantId)
        .maybeSingle();

      let maxProducts = 5;
      if (sub?.plan_id) {
        const { data: plan } = await (supabase.from('subscription_plans') as any)
          .select('max_active_products')
          .eq('id', sub.plan_id)
          .maybeSingle();
        if (plan?.max_active_products) maxProducts = plan.max_active_products;
      }

      const { count: activeCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', activeMerchantId)
        .in('status', ['actif', 'active', 'brouillon']);

      if ((activeCount ?? 0) >= maxProducts) {
        haptic('error');
        toast({
          title: 'Quota d\'articles atteint',
          description: `Vous avez atteint la limite de ${maxProducts} produits de votre formule. Passez au plan Premium.`,
        });
        return;
      }
    }

    setSaving(true);
    haptic('medium');

    let imageUrlPayload: string | null = null;
    if (form.images.length === 1) {
      imageUrlPayload = form.images[0];
    } else if (form.images.length > 1) {
      imageUrlPayload = JSON.stringify(form.images);
    }

    const price = Number(form.price);
    const stock = form.type === 'digital' ? 999999 : Number(form.stock);
    const status = stock > 0 ? 'actif' : 'epuise';

    const productPayload = {
      merchant_id: activeMerchantId,
      name: form.name.trim(),
      category: form.category,
      price,
      stock,
      low_stock_threshold: Number(form.lowStockThreshold) || 3,
      description: form.description.trim(),
      image_url: imageUrlPayload,
      type: form.type,
      digital_file_url: form.digital_file_url.trim() || null,
      digital_access_instructions: form.digital_access_instructions.trim() || null,
      status,
    };

    let productId = id;

    if (isEdit && id) {
      const { error } = await supabaseUpdate('products', id, productPayload);
      if (error) {
        setSaving(false);
        haptic('error');
        toast({ title: 'Erreur de mise à jour', description: error });
        return;
      }
    } else {
      const { data: newProd, error } = await (supabase.from('products') as any)
        .insert(productPayload)
        .select('id')
        .single();

      if (error || !newProd) {
        setSaving(false);
        haptic('error');
        toast({ title: 'Erreur de création', description: error?.message || 'Impossible d\'ajouter le produit.' });
        return;
      }
      productId = newProd.id;
    }

    // Atomic Sync for Affiliation Campaign in `campaigns` table
    if (productId && form.enableAffiliation) {
      const commVal = Number(form.commission) || 15;
      const campaignPayload = {
        merchant_id: activeMerchantId,
        product_id: productId,
        name: `Campagne ${form.name.trim()}`,
        description: form.description.trim() || `Recommandez ${form.name.trim()} et gagnez vos commissions en direct.`,
        commission: commVal,
        commission_type: form.commissionType,
        model: form.commissionType === 'fixed' ? 'marge' : 'commission',
        status: 'active',
        goal: 100,
      };

      const { data: existingCamp } = await supabase
        .from('campaigns')
        .select('id')
        .eq('product_id', productId)
        .maybeSingle();

      if (existingCamp) {
        await supabaseUpdate('campaigns', existingCamp.id, campaignPayload);
      } else {
        await (supabase.from('campaigns') as any).insert(campaignPayload);
      }
    } else if (productId && !form.enableAffiliation) {
      // Deactivate linked campaign if merchant toggled off affiliation
      await (supabase.from('campaigns') as any)
        .update({ status: 'ended' })
        .eq('product_id', productId);
    }

    setSaving(false);
    haptic('success');
    toast({
      title: isEdit ? 'Produit mis à jour !' : 'Produit enregistré avec succès !',
      description: form.enableAffiliation
        ? `${form.name} est disponible et la campagne d'affiliation est active.`
        : `${form.name} a été enregistré dans votre catalogue.`,
    });
    navigate('/merchant/products');
  }

  if (loading) {
    return (
      <Page eyebrow="Chargement" title="…" description="">
        <div className="mt-6 flex items-center justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={isEdit ? 'Édition Catalogue' : 'Fiche Produit'}
      title={isEdit ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
      description="Configurez votre produit, vos visuels et définissez vos commissions d'affiliation vendeurs."
      action={
        <Link href="/merchant/products">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour au catalogue</Button>
        </Link>
      }
    >
      {/* Step Wizard Navigation Header */}
      <div className="mt-6 rounded-2xl bg-white p-2.5 shadow-xs border border-[#f0edf7]">
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: 1 as WizardStep, label: '1. Informations & Format', icon: PackageIcon },
            { step: 2 as WizardStep, label: '2. Prix & Affiliation', icon: Tag01Icon },
            { step: 3 as WizardStep, label: '3. Médias & Fichiers', icon: ImageUploadIcon },
          ].map((s) => {
            const isActive = activeStep === s.step;
            const isDone = activeStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => goToStep(s.step)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#5b49e8] text-white shadow-xs'
                    : isDone
                    ? 'bg-[#efedff] text-[#5b49e8]'
                    : 'bg-transparent text-[#807b98] hover:bg-[#f8f7fc]'
                }`}
                data-testid={`step-tab-${s.step}`}
              >
                <Icon glyph={isDone ? CheckmarkCircle02Icon : s.icon} size={16} />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">Étape {s.step}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        {/* Step Content */}
        <Card className="p-6">
          <form onSubmit={save} className="space-y-6">
            {/* ── STEP 1: INFORMATIONS GENERALES & FORMAT ── */}
            {activeStep === 1 && (
              <div className="space-y-5">
                <div className="border-b border-[#f0edf7] pb-4">
                  <h3 className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">Type & Format de Produit</h3>
                  <p className="text-xs text-[#807b98] mt-0.5">Choisissez la nature du produit pour adapter la livraison.</p>
                </div>

                <Field label="Format de vente">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setField('type', 'physique')}
                      className={`flex items-center gap-3 rounded-2xl p-4 text-left transition border-2 ${
                        form.type === 'physique'
                          ? 'border-[#5b49e8] bg-[#f6f5ff]'
                          : 'border-[#ede9f5] bg-white hover:border-[#d4ceff]'
                      }`}
                      data-testid="type-physique"
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${form.type === 'physique' ? 'bg-[#5b49e8] text-white' : 'bg-[#efedff] text-[#5b49e8]'}`}>
                        <Icon glyph={PackageIcon} size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#292541]">Produit Physique</p>
                        <p className="text-[10px] text-[#807b98]">Livraison physique, colis & zones</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setField('type', 'digital')}
                      className={`flex items-center gap-3 rounded-2xl p-4 text-left transition border-2 ${
                        form.type === 'digital'
                          ? 'border-[#5b49e8] bg-[#f6f5ff]'
                          : 'border-[#ede9f5] bg-white hover:border-[#d4ceff]'
                      }`}
                      data-testid="type-digital"
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${form.type === 'digital' ? 'bg-[#5b49e8] text-white' : 'bg-[#efedff] text-[#5b49e8]'}`}>
                        <Icon glyph={SparklesIcon} size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#292541]">Produit Digital</p>
                        <p className="text-[10px] text-[#807b98]">Ebook, Formation, PDF (Accès instantané)</p>
                      </div>
                    </button>
                  </div>
                </Field>

                <Field label="Nom du produit *" hint="Nom visible par vos affiliés et acheteurs final.">
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder={form.type === 'digital' ? 'Ex. Guide Complet E-Commerce Sénégal (PDF)' : 'Ex. Coffret Soin Karité & Miel'}
                    className={`${inputClass} ${errors.name ? 'ring-1 ring-[#ef6d78]' : ''}`}
                    data-testid="input-name"
                  />
                  {errors.name && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.name}</p>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Catégorie *">
                    <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={selectClass} data-testid="input-category">
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="Code SKU / Référence (Optionnel)">
                    <input
                      value={form.sku}
                      onChange={(e) => setField('sku', e.target.value)}
                      placeholder="Ex. PRD-001"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Description *" hint="Détaillez les caractéristiques, les avantages et le contenu.">
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Présentez clairement votre produit pour convaincre vos vendeurs et vos clients…"
                    className={`${textareaClass} min-h-32`}
                    data-testid="input-description"
                  />
                </Field>

                <div className="flex justify-end pt-3">
                  <Button type="button" onClick={() => goToStep(2)} testId="button-next-step-2">
                    Étape suivante : Prix & Affiliation <Icon glyph={ArrowRight01Icon} size={15} />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: PRIX, STOCK & AFFILIATION ── */}
            {activeStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-[#f0edf7] pb-4">
                  <h3 className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">Tarification & Stocks</h3>
                  <p className="text-xs text-[#807b98] mt-0.5">Définissez le prix public et réglez les commissions créateurs.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prix public de vente (FCFA) *">
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      placeholder="Ex. 15000"
                      className={`${inputClass} ${errors.price ? 'ring-1 ring-[#ef6d78]' : ''}`}
                      data-testid="input-price"
                    />
                    {errors.price && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.price}</p>}
                  </Field>

                  <Field label="Gestion du stock" hint={form.type === 'digital' ? 'Accès illimité automatique' : 'Quantité disponible en réserve'}>
                    <input
                      type="number"
                      min="0"
                      disabled={form.type === 'digital'}
                      value={form.type === 'digital' ? '999999' : form.stock}
                      onChange={(e) => setField('stock', e.target.value)}
                      placeholder="0"
                      className={`${inputClass} ${form.type === 'digital' ? 'bg-[#f4f3f9] text-[#807b98]' : ''}`}
                      data-testid="input-stock"
                    />
                    {errors.stock && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.stock}</p>}
                  </Field>
                </div>

                {form.type === 'physique' && (
                  <Field label="Seuil d'alerte stock bas" hint="Vous serez notifié lorsque le stock passe en-dessous de ce niveau.">
                    <input
                      type="number"
                      min="1"
                      value={form.lowStockThreshold}
                      onChange={(e) => setField('lowStockThreshold', e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                {/* Seller Affiliation Module & Live Calculator */}
                <div className="rounded-2xl bg-[#f6f5ff] p-5 border border-[#e4ddff] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#5b49e8] text-white">
                        <Icon glyph={SparklesIcon} size={18} />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#292541]">Programme d'Affiliation Vendeurs</h4>
                        <p className="text-[10px] text-[#77738a]">Permettre aux affiliés de promouvoir ce produit immédiatement.</p>
                      </div>
                    </div>

                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.enableAffiliation}
                        onChange={(e) => setField('enableAffiliation', e.target.checked)}
                        className="peer sr-only"
                        data-testid="toggle-enable-affiliation"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-[#d8d5e8] transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#5b49e8] peer-checked:after:translate-x-full" />
                    </label>
                  </div>

                  {form.enableAffiliation && (
                    <div className="space-y-4 pt-2 border-t border-[#e4ddff]">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Type de rémunération">
                          <select
                            value={form.commissionType}
                            onChange={(e) => setField('commissionType', e.target.value as 'percentage' | 'fixed')}
                            className={selectClass}
                            data-testid="select-commission-type"
                          >
                            <option value="percentage">Pourcentage sur vente (%)</option>
                            <option value="fixed">Marge fixe par vente (FCFA)</option>
                          </select>
                        </Field>

                        <Field label={form.commissionType === 'percentage' ? 'Taux commission (%)' : 'Marge fixée (FCFA)'}>
                          <input
                            type="number"
                            min="1"
                            value={form.commission}
                            onChange={(e) => setField('commission', e.target.value)}
                            placeholder={form.commissionType === 'percentage' ? '15' : '2000'}
                            className={`${inputClass} ${errors.commission ? 'ring-1 ring-[#ef6d78]' : ''}`}
                            data-testid="input-commission"
                          />
                          {errors.commission && <p className="mt-1 text-[10px] font-bold text-[#ef6d78]">{errors.commission}</p>}
                        </Field>
                      </div>

                      {/* Live Revenue Breakdown Card */}
                      <div className="rounded-xl bg-white p-4 space-y-2 text-xs border border-[#e4ddff]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Simulateur de revenus par vente</p>
                        <div className="flex justify-between text-[#77738a]">
                          <span>Prix de vente public</span>
                          <span className="font-bold text-[#292541]">{money(revenueCalculations.price)}</span>
                        </div>
                        <div className="flex justify-between text-[#c45667]">
                          <span>Commission accordée au vendeur</span>
                          <span className="font-bold">− {money(revenueCalculations.sellerGain)}</span>
                        </div>
                        <div className="flex justify-between text-[#77738a]">
                          <span>Frais plateforme Fiaba (5%)</span>
                          <span className="font-bold">− {money(revenueCalculations.platformFee)}</span>
                        </div>
                        <div className="flex justify-between border-t border-[#f0edf7] pt-2 text-sm font-bold text-[#278e69]">
                          <span>Votre revenu net garanti</span>
                          <span className="font-[Space_Grotesk] text-base">{money(revenueCalculations.netMerchantRevenue)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-3">
                  <Button type="button" variant="ghost" onClick={() => goToStep(1)}>
                    <Icon glyph={ArrowLeft01Icon} size={15} /> Précédent
                  </Button>
                  <Button type="button" onClick={() => goToStep(3)} testId="button-next-step-3">
                    Étape suivante : Médias & Fichiers <Icon glyph={ArrowRight01Icon} size={15} />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: MEDIAS & RESSOURCES DIGITALES ── */}
            {activeStep === 3 && (
              <div className="space-y-5">
                <div className="border-b border-[#f0edf7] pb-4">
                  <h3 className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">Galerie Photos & Fichiers</h3>
                  <p className="text-xs text-[#807b98] mt-0.5">Importez vos visuels et joignez vos documents digitaux téléchargeables.</p>
                </div>

                {/* Multi-photo uploader with percentage % bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#292541]">Photos du produit ({form.images.length})</p>
                    {form.images.length > 0 && (
                      <label className="cursor-pointer text-xs font-bold text-[#5b49e8] hover:underline flex items-center gap-1">
                        <Icon glyph={Add01Icon} size={14} /> Ajouter des photos
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={imageUploadProgress !== null} />
                      </label>
                    )}
                  </div>

                  {/* Percentage Progress Bar */}
                  {imageUploadProgress !== null && (
                    <div className="rounded-2xl bg-[#efedff] p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#5b49e8]">
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
                          Importation des visuels…
                        </span>
                        <span>{imageUploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#d8cdff]">
                        <div
                          className="h-full bg-[#5b49e8] transition-all duration-300 rounded-full"
                          style={{ width: `${imageUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {form.images.length > 0 ? (
                    <div className="space-y-3">
                      {/* Main Cover Image */}
                      <div className="relative overflow-hidden rounded-2xl border-2 border-[#5b49e8] bg-white">
                        <img src={form.images[0]} alt={form.name} className="h-48 w-full object-cover" />
                        <span className="absolute left-3 top-3 rounded-xl bg-[#5b49e8] px-2.5 py-1 text-[10px] font-bold text-white shadow-xs flex items-center gap-1">
                          <Icon glyph={StarIcon} size={12} /> Photo principale
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-white/95 text-[#c45667] hover:bg-white transition"
                          title="Supprimer"
                        >
                          <Icon glyph={Delete01Icon} size={15} />
                        </button>
                      </div>

                      {/* Grid Secondary Photos */}
                      {form.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {form.images.slice(1).map((imgUrl, idx) => {
                            const actualIdx = idx + 1;
                            return (
                              <div key={imgUrl + actualIdx} className="group relative overflow-hidden rounded-xl border border-[#ede9f5] bg-white">
                                <img src={imgUrl} alt={`Photo ${actualIdx}`} className="h-20 w-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryImage(actualIdx)}
                                    className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#5b49e8]"
                                    title="Mettre en principale"
                                  >
                                    <Icon glyph={StarIcon} size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeImage(actualIdx)}
                                    className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#c45667]"
                                    title="Supprimer"
                                  >
                                    <Icon glyph={Delete01Icon} size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8d5e8] bg-[#f8f7fc] p-4 text-center transition hover:border-[#5b49e8] hover:bg-[#f5f3ff]">
                      <div className="flex flex-col items-center gap-2 text-[#77738a]">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
                          <Icon glyph={ImageUploadIcon} size={24} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#292541]">Déposez ou sélectionnez vos photos</p>
                          <p className="text-[10px] text-[#9290a2] mt-0.5">Formats PNG, JPG, WebP jusqu'à 5 MB</p>
                        </div>
                      </div>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={imageUploadProgress !== null} data-testid="input-image-file" />
                    </label>
                  )}
                </div>

                {/* Digital Product Resource Uploader with % progress bar */}
                {form.type === 'digital' && (
                  <div className="space-y-4 rounded-2xl bg-[#f5f3ff] p-5 border border-[#e4ddff]">
                    <div className="flex items-center gap-2 text-[#5b49e8]">
                      <Icon glyph={SparklesIcon} size={20} />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Fichier & Ressource Numérique</h4>
                    </div>

                    {digitalUploadProgress !== null && (
                      <div className="rounded-xl bg-white p-3.5 space-y-2 border border-[#d8cdff]">
                        <div className="flex items-center justify-between text-xs font-bold text-[#5b49e8]">
                          <span>Téléversement du fichier numérique…</span>
                          <span>{digitalUploadProgress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#efedff]">
                          <div
                            className="h-full bg-[#5b49e8] transition-all duration-300 rounded-full"
                            style={{ width: `${digitalUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Field label="Document téléchargeable (PDF, ZIP, EPUB, MP3, MP4)" hint="Fichier automatiquement délivré au client dès paiement.">
                      <div className="space-y-2.5">
                        {form.digital_file_url ? (
                          <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-[#d8cdff]">
                            <span className="truncate text-xs font-bold text-[#292541] max-w-[280px]">{form.digital_file_url}</span>
                            <button
                              type="button"
                              onClick={() => setField('digital_file_url', '')}
                              className="text-xs font-bold text-[#c45667] hover:underline"
                            >
                              Retirer
                            </button>
                          </div>
                        ) : (
                          <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c5b8ff] bg-white p-3 text-center transition hover:border-[#5b49e8]">
                            <span className="flex items-center gap-2 text-xs font-bold text-[#5b49e8]">
                              <Icon glyph={File01Icon} size={18} /> Déposer un fichier (PDF, ZIP, Formation)
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.epub,.zip,.rar,.mp3,.mp4,.doc,.docx"
                              className="hidden"
                              onChange={handleDigitalFileSelect}
                              disabled={digitalUploadProgress !== null}
                            />
                          </label>
                        )}
                        <input
                          type="text"
                          value={form.digital_file_url}
                          onChange={(e) => setField('digital_file_url', e.target.value)}
                          placeholder="Ou entrez une URL directe (Drive, Notion, Telegram, Dropbox)…"
                          className={inputClass}
                        />
                      </div>
                    </Field>

                    <Field label="Instructions d'accès optionnelles" hint="Ex: Code d'accès VIP, lien vers le groupe Telegram ou Notion.">
                      <textarea
                        value={form.digital_access_instructions}
                        onChange={(e) => setField('digital_access_instructions', e.target.value)}
                        placeholder="Ces instructions seront présentées à l'acheteur après validation de son paiement…"
                        className={`${textareaClass} min-h-20`}
                      />
                    </Field>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-[#f0edf7]">
                  <Button type="button" variant="ghost" onClick={() => goToStep(2)}>
                    <Icon glyph={ArrowLeft01Icon} size={15} /> Précédent
                  </Button>
                  <Button type="submit" disabled={saving} testId="button-save-product">
                    {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Publier le produit'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>

        {/* Interactive Double Preview Card Panel */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-[#f0edf7] pb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Aperçu en direct</p>
              <div className="flex rounded-xl bg-[#f4f3f8] p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('seller')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${previewMode === 'seller' ? 'bg-white text-[#5b49e8] shadow-xs' : 'text-[#807b98]'}`}
                >
                  Vue Vendeur
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('customer')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${previewMode === 'customer' ? 'bg-white text-[#5b49e8] shadow-xs' : 'text-[#807b98]'}`}
                >
                  Vue Client
                </button>
              </div>
            </div>

            <div className="mt-4">
              {previewMode === 'seller' ? (
                /* Seller Discovery View Preview */
                <div className="rounded-2xl bg-[#faf9fe] p-4 space-y-3 border border-[#f0edf7]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-[Space_Grotesk] font-bold text-[#292541]">
                        {form.name || 'Nom du produit'}
                      </p>
                      <p className="text-[11px] text-[#9290a2]">{form.category} · {form.type === 'digital' ? 'Digital' : 'Physique'}</p>
                    </div>
                    {form.images.length > 0 ? (
                      <img src={form.images[0]} alt="Aperçu" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                        <Icon glyph={Store01Icon} size={20} />
                      </span>
                    )}
                  </div>

                  {form.enableAffiliation && (
                    <div className="rounded-xl bg-white p-3 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#9290a2]">Prix public</span>
                        <span className="font-bold text-[#292541]">{form.price ? money(Number(form.price)) : '0 F'}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[#278e69]">
                        <span>Gain créateur / vente</span>
                        <span className="font-bold">{money(revenueCalculations.sellerGain)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Customer Checkout View Preview */
                <div className="rounded-2xl bg-white p-4 space-y-3 border border-[#f0edf7]">
                  {form.images.length > 0 && (
                    <img src={form.images[0]} alt="Aperçu" className="h-32 w-full rounded-xl object-cover" />
                  )}
                  <h4 className="font-[Space_Grotesk] font-bold text-[#292541] text-sm">{form.name || 'Nom du produit'}</h4>
                  <p className="text-xs text-[#77738a] line-clamp-2">{form.description || 'Description du produit…'}</p>
                  <div className="flex items-center justify-between border-t border-[#f0edf7] pt-2">
                    <strong className="font-[Space_Grotesk] text-base font-bold text-[#5b49e8]">
                      {form.price ? money(Number(form.price)) : '—'}
                    </strong>
                    <span className="rounded-full bg-[#e7faf2] px-2 py-0.5 text-[10px] font-bold text-[#278e69]">Paiement Wave/OM</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Help Card */}
          <Card className="p-4 bg-[#efedff]/40">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#5b49e8] text-white">
                <Icon glyph={HelpCircleIcon} size={16} />
              </span>
              <div className="text-xs space-y-1">
                <p className="font-bold text-[#292541]">Conseil de publication Fiaba</p>
                <p className="text-[#686380] leading-relaxed">
                  Offrez au moins 10% à 15% de commission pour motiver les créateurs à ajouter votre produit dans leur sélection d'opportunités.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
