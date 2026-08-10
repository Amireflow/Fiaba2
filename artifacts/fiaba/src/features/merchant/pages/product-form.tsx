import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon, ImageUploadIcon, Delete01Icon, StarIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, supabaseInsert, supabaseUpdate, getOrCreateMerchantId } from '@/hooks/use-supabase-query';
import { uploadMultipleImagesToSupabase, parseImageUrls } from '@/lib/storage-upload';
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

type FormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  images: string[];
};

const emptyForm: FormState = {
  name: '',
  category: 'Beauté',
  price: '',
  stock: '',
  description: '',
  images: [],
};

export function ProductForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load existing product from Supabase
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    supabase
      .from('products')
      .select('name, category, price, stock, description, image_url')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as { name: string; category: string; price: number; stock: number; description: string | null; image_url: string | null };
          setForm({
            name: p.name,
            category: p.category,
            price: String(p.price),
            stock: String(p.stock),
            description: p.description ?? '',
            images: parseImageUrls(p.image_url),
          });
        }
        setLoading(false);
      });
  }, [id, isEdit]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    haptic('medium');

    const { urls, errors } = await uploadMultipleImagesToSupabase(files, 'products');
    setUploadingImage(false);

    if (urls.length > 0) {
      haptic('success');
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast({
        title: `${urls.length} photo${urls.length > 1 ? 's' : ''} ajoutée${urls.length > 1 ? 's' : ''} !`,
        description: 'Vos photos ont été importées avec succès.',
      });
    }
    if (errors.length > 0 && urls.length === 0) {
      haptic('error');
      toast({ title: 'Erreur d\'envoi', description: errors[0] || 'Impossible de télécharger les photos.' });
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const activeMerchantId = await getOrCreateMerchantId(merchantId);

    if (!activeMerchantId) {
      toast({ title: 'Erreur', description: 'Impossible de trouver votre boutique. Veuillez rafraîchir la page.' });
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
      haptic('error');
      toast({ title: 'Champs invalides', description: 'Vérifiez le nom, le prix et le stock.' });
      return;
    }

    // ── Enforce subscription quota (CDC §7.2) ──
    if (!isEdit) {
      // Get merchant's plan max_active_products
      const { data: sub } = await (supabase.from('merchant_subscriptions') as any)
        .select('plan_id')
        .eq('merchant_id', activeMerchantId)
        .maybeSingle();

      let maxProducts = 5; // Free plan default
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
          title: 'Quota atteint',
          description: `Vous avez atteint la limite de ${maxProducts} produits. Passez au plan Premium pour en ajouter plus.`,
        });
        return;
      }
    }

    setSaving(true);
    haptic('medium');

    // Encode images: single string if 1, JSON array if multiple, null if 0
    let imageUrlPayload: string | null = null;
    if (form.images.length === 1) {
      imageUrlPayload = form.images[0];
    } else if (form.images.length > 1) {
      imageUrlPayload = JSON.stringify(form.images);
    }

    const status = stock > 0 ? 'actif' : 'epuise';
    const payload = {
      merchant_id: activeMerchantId,
      name: form.name.trim(),
      category: form.category,
      price,
      stock,
      description: form.description.trim(),
      image_url: imageUrlPayload,
      status,
    };

    if (isEdit && id) {
      const { error } = await supabaseUpdate('products', id, payload);
      setSaving(false);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error });
      } else {
        haptic('success');
        toast({ title: 'Produit modifié', description: `${payload.name} a été mis à jour.` });
        navigate('/merchant/products');
      }
    } else {
      const { data: newProd, error } = await (supabase.from('products') as any)
        .insert(payload)
        .select('id')
        .single();
      setSaving(false);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error.message });
      } else {
        if (newProd?.id) {
          await (supabase.from('campaigns') as any).insert({
            merchant_id: activeMerchantId,
            product_id: newProd.id,
            name: `Offre ${payload.name}`,
            description: payload.description || `Recommandez ${payload.name}`,
            commission: 10,
            commission_type: 'percentage',
            model: 'commission',
            status: 'active',
          });
        }
        haptic('success');
        toast({ title: 'Produit & Campagne lancés', description: `${payload.name} est désormais disponible dans le réseau de vendeurs !` });
        navigate('/merchant/products');
      }
    }
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
      eyebrow={isEdit ? 'Modifier' : 'Nouveau'}
      title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      description={isEdit ? 'Modifiez les informations du produit.' : 'Renseignez les informations du produit pour vos vendeurs et clients.'}
      action={
        <Link href="/merchant/products">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        {/* Main form */}
        <Card>
          <form onSubmit={save} className="space-y-5">
            <Field label="Nom du produit">
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ex. Coffret Soin Karité" className={inputClass} data-testid="input-name" />
            </Field>
            <Field label="Description" hint="Visible par vos vendeurs et vos clients. Soyez clair et attractif.">
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Décrivez le produit, ses bénéfices, sa matière première, son origine…" className={`${textareaClass} min-h-28`} data-testid="input-description" />
            </Field>
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={selectClass} data-testid="input-category">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prix (FCFA)">
                <input type="number" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="0" className={inputClass} data-testid="input-price" />
              </Field>
              <Field label="Stock disponible">
                <input type="number" min="0" value={form.stock} onChange={(e) => setField('stock', e.target.value)} placeholder="0" className={inputClass} data-testid="input-stock" />
              </Field>
            </div>
            {form.stock !== '' && Number(form.stock) === 0 && (
              <p className="rounded-xl bg-[#fff4de] px-4 py-3 text-xs font-bold text-[#ac741e]">Ce produit sera marqué comme « Épuisé ».</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/merchant/products"><Button variant="ghost" type="button">Annuler</Button></Link>
              <Button type="submit" disabled={saving} testId="button-save-product">{saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter le produit'}</Button>
            </div>
          </form>
        </Card>

        {/* Multi-Image Gallery Manager */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Photos du produit ({form.images.length})</p>
              {form.images.length > 0 && (
                <label className="cursor-pointer text-xs font-bold text-[#5b49e8] hover:underline flex items-center gap-1">
                  <Icon glyph={Add01Icon} size={14} /> Ajouter des photos
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={uploadingImage} />
                </label>
              )}
            </div>

            <div className="mt-3.5 space-y-3">
              {uploadingImage && (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#f6f5ff] p-4 text-xs font-bold text-[#5b49e8]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
                  <span>Importation de vos photos en cours…</span>
                </div>
              )}

              {form.images.length > 0 ? (
                <div className="space-y-3">
                  {/* Primary Photo */}
                  <div className="relative overflow-hidden rounded-2xl border-2 border-[#5b49e8] bg-white">
                    <img src={form.images[0]} alt={form.name} className="h-44 w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-lg bg-[#5b49e8] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                      <Icon glyph={StarIcon} size={10} /> Photo principale
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImage(0)}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#c45667] shadow-sm hover:bg-white transition"
                      title="Supprimer la photo"
                    >
                      <Icon glyph={Delete01Icon} size={14} />
                    </button>
                  </div>

                  {/* Secondary Photos Grid */}
                  {form.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {form.images.slice(1).map((imgUrl, idx) => {
                        const actualIdx = idx + 1;
                        return (
                          <div key={imgUrl + actualIdx} className="group relative overflow-hidden rounded-xl border border-[#e9e6f1] bg-white">
                            <img src={imgUrl} alt={`${form.name} ${actualIdx}`} className="h-20 w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(actualIdx)}
                                className="grid h-6 w-6 place-items-center rounded-md bg-white text-[#5b49e8] shadow"
                                title="Définir comme principale"
                              >
                                <Icon glyph={StarIcon} size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(actualIdx)}
                                className="grid h-6 w-6 place-items-center rounded-md bg-white text-[#c45667] shadow"
                                title="Supprimer"
                              >
                                <Icon glyph={Delete01Icon} size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8d5e8] bg-[#f8f7fc] p-4 text-center transition hover:border-[#5b49e8] hover:bg-[#efedff]/40">
                  <div className="flex flex-col items-center gap-2 text-[#77738a]">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
                      <Icon glyph={ImageUploadIcon} size={24} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#292541]">Télécharger des photos</p>
                      <p className="text-[10px] text-[#9290a2] mt-0.5">Sélectionnez une ou plusieurs photos</p>
                    </div>
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={uploadingImage} data-testid="input-image-file" />
                </label>
              )}
            </div>
          </Card>

          {/* Preview Card */}
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Aperçu de la fiche produit</p>
            <div className="mt-3">
              {form.images.length > 0 && (
                <div className="relative">
                  <img src={form.images[0]} alt={form.name} className="h-36 w-full rounded-xl object-cover" />
                  {form.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-lg bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      +{form.images.length - 1} photo{form.images.length > 2 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
              <h3 className="mt-3 font-[Space_Grotesk] text-base font-bold text-[#292541]">{form.name || 'Nom du produit'}</h3>
              <p className="mt-1 text-xs leading-4 text-[#77738a] line-clamp-2">{form.description || 'La description apparaîtra ici.'}</p>
              <div className="mt-3 flex items-center justify-between">
                <strong className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">{form.price ? money(Number(form.price)) : '—'}</strong>
                <span className="text-[10px] text-[#9290a2]">{form.category}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
