import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, supabaseUpdate, getOrCreateMerchantId } from '@/hooks/use-supabase-query';
import { uploadMultipleImagesToSupabase, uploadImageToSupabase, parseImageUrls } from '@/lib/storage-upload';
import { physicalCategories, digitalCategories, emptyForm, type FormState, type WizardStep } from './types';

export function useProductForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const isEdit = !!id;

  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [digitalUploadProgress, setDigitalUploadProgress] = useState<number | null>(null);
  const [digitalFileName, setDigitalFileName] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    async function load() {
      const { data: pData } = await supabase
        .from('products')
        .select('id, name, category, price, stock, low_stock_threshold, description, image_url, type, digital_file_url, digital_access_instructions')
        .eq('id', id as string)
        .single();
      if (pData) {
        const p = pData as any;
        setForm({
          name: p.name, category: p.category, sku: `SKU-${(id as string).slice(0, 6).toUpperCase()}`,
          price: String(p.price), stock: p.type === 'digital' ? '999999' : String(p.stock),
          lowStockThreshold: String(p.low_stock_threshold ?? 3), description: p.description ?? '',
          images: parseImageUrls(p.image_url), type: p.type ?? 'physique',
          digital_file_url: p.digital_file_url ?? '', digital_access_instructions: p.digital_access_instructions ?? '',
        });
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [id, isEdit]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'type') {
        if (value === 'digital') {
          next.stock = '999999';
          if (!digitalCategories.includes(next.category as any)) next.category = digitalCategories[0];
        } else {
          if (!physicalCategories.includes(next.category as any)) next.category = physicalCategories[0];
        }
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => { const c = { ...prev }; delete c[key]; return c; });
  }, [errors]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageUploadProgress(10);
    haptic('medium');
    const { urls, errors: uploadErrs } = await uploadMultipleImagesToSupabase(files, 'products', (p) => setImageUploadProgress(p));
    setImageUploadProgress(null);
    if (urls.length > 0) {
      haptic('success');
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast({ title: `${urls.length} photo${urls.length > 1 ? 's' : ''} ajoutée${urls.length > 1 ? 's' : ''}`, description: 'Importées avec succès.' });
    }
    if (uploadErrs.length > 0 && urls.length === 0) {
      haptic('error');
      toast({ title: 'Erreur d\'envoi', description: uploadErrs[0] || 'Impossible de télécharger les photos.' });
    }
  }, [toast]);

  const handleDigitalFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setDigitalFileName(file.name);
    setDigitalUploadProgress(10);
    haptic('medium');
    const res = await uploadImageToSupabase(file, 'digital-files', (p) => setDigitalUploadProgress(p));
    setDigitalUploadProgress(null);
    if (res.url) {
      haptic('success');
      setField('digital_file_url', res.url);
      toast({ title: 'Fichier digital téléchargé !', description: 'Prêt pour la livraison instantanée.' });
    } else {
      haptic('error');
      toast({ title: 'Erreur d\'envoi', description: res.error || 'Impossible d\'importer la ressource.' });
    }
  }, [toast, setField]);

  const setPrimaryImage = useCallback((index: number) => {
    haptic('light');
    setForm((prev) => { const imgs = [...prev.images]; const [sel] = imgs.splice(index, 1); return { ...prev, images: [sel, ...imgs] }; });
  }, []);

  const removeImage = useCallback((index: number) => {
    haptic('light');
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }, []);

  const getCleanFileName = useCallback((url: string) => {
    if (digitalFileName) return digitalFileName;
    if (!url) return 'Fichier.pdf';
    try {
      const raw = url.split('?')[0].split('#')[0];
      const parts = raw.split('/');
      let fn = parts[parts.length - 1] || 'Fichier.pdf';
      fn = fn.replace(/^item-\d+-[a-z0-9]+-?/i, '');
      return decodeURIComponent(fn);
    } catch { return 'Fichier_numérique.pdf'; }
  }, [digitalFileName]);

  const validateStep = useCallback((step: WizardStep): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && !form.name.trim()) errs.name = 'Veuillez entrer le nom du produit';
    if (step === 2) {
      const price = Number(form.price);
      const stock = form.type === 'digital' ? 999999 : Number(form.stock);
      if (isNaN(price) || price <= 0) errs.price = 'Entrez un prix valide supérieur à 0 F';
      if (form.type === 'physique' && (isNaN(stock) || stock < 0)) errs.stock = 'Entrez une quantité en stock valide';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); haptic('error'); return false; }
    return true;
  }, [form]);

  const goToStep = useCallback((target: WizardStep) => {
    if (target > activeStep && !validateStep(activeStep)) return;
    haptic('light');
    setActiveStep(target);
  }, [activeStep, validateStep]);

  const save = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;
    const activeMerchantId = await getOrCreateMerchantId(merchantId);
    if (!activeMerchantId) { toast({ title: 'Erreur', description: 'Boutique introuvable. Rafraîchissez la page.' }); return; }

    if (!isEdit) {
      const { data: sub } = await (supabase.from('merchant_subscriptions') as any).select('plan_id').eq('merchant_id', activeMerchantId).maybeSingle();
      let maxProducts = 5;
      if (sub?.plan_id) {
        const { data: plan } = await (supabase.from('subscription_plans') as any).select('max_active_products').eq('id', sub.plan_id).maybeSingle();
        if (plan?.max_active_products) maxProducts = plan.max_active_products;
      }
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('merchant_id', activeMerchantId).in('status', ['actif', 'active', 'brouillon']);
      if ((count ?? 0) >= maxProducts) {
        haptic('error');
        toast({ title: 'Quota d\'articles atteint', description: `Limite de ${maxProducts} produits. Passez au plan Premium.` });
        return;
      }
    }

    setSaving(true);
    haptic('medium');
    const imageUrlPayload = form.images.length === 1 ? form.images[0] : form.images.length > 1 ? JSON.stringify(form.images) : null;
    const price = Number(form.price);
    const stock = form.type === 'digital' ? 999999 : Number(form.stock);
    const payload = {
      merchant_id: activeMerchantId, name: form.name.trim(), category: form.category, price, stock,
      description: form.description.trim(), image_url: imageUrlPayload, type: form.type,
      digital_file_url: form.digital_file_url.trim() || null,
      digital_access_instructions: form.digital_access_instructions.trim() || null,
      status: stock > 0 ? 'actif' : 'epuise',
    };

    if (isEdit && id) {
      const { error } = await supabaseUpdate('products', id, payload);
      setSaving(false);
      if (error) { haptic('error'); toast({ title: 'Erreur de mise à jour', description: error }); return; }
    } else {
      const { data: newProd, error } = await (supabase.from('products') as any).insert(payload).select('id').single();
      setSaving(false);
      if (error || !newProd) { haptic('error'); toast({ title: 'Erreur de création', description: error?.message || 'Impossible d\'ajouter le produit.' }); return; }
    }

    haptic('success');
    toast({ title: isEdit ? 'Produit mis à jour !' : 'Produit enregistré avec succès !', description: `${form.name} a été enregistré dans votre catalogue.` });
    navigate('/merchant/products');
  }, [form, isEdit, id, merchantId, navigate, toast, validateStep]);

  return {
    id, isEdit, activeStep, form, loading, saving, errors,
    imageUploadProgress, digitalUploadProgress, digitalFileName,
    setField, handleFileSelect, handleDigitalFileSelect, setPrimaryImage, removeImage,
    getCleanFileName, setDigitalFileName, validateStep, goToStep, save,
  };
}
