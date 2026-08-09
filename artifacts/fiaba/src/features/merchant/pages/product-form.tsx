import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon, ImageUploadIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId } from '@/hooks/use-supabase-query';
import { supabaseInsert, supabaseUpdate } from '@/hooks/use-supabase-query';
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
  image_url: string;
};

const emptyForm: FormState = {
  name: '',
  category: 'Beauté',
  price: '',
  stock: '',
  description: '',
  image_url: '',
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
            image_url: p.image_url ?? '',
          });
        }
        setLoading(false);
      });
  }, [id, isEdit]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let activeMerchantId = merchantId;

    if (!activeMerchantId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (userId) {
        const { data: merch } = await (supabase.from('merchants') as any)
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();

        if (merch?.id) {
          activeMerchantId = merch.id;
        } else {
          const { data: newMerch } = await (supabase.from('merchants') as any)
            .insert({
              owner_id: userId,
              name: 'Ma Boutique Fiaba',
              slug: `boutique-${userId.slice(0, 6)}`,
            })
            .select('id')
            .single();
          if (newMerch?.id) {
            activeMerchantId = newMerch.id;
          }
        }
      }
    }

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

    setSaving(true);
    haptic('medium');

    const status = stock > 0 ? 'actif' : 'epuise';
    const payload = {
      merchant_id: activeMerchantId,
      name: form.name.trim(),
      category: form.category,
      price,
      stock,
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
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
      const { error } = await supabaseInsert('products', payload);
      setSaving(false);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error });
      } else {
        haptic('success');
        toast({ title: 'Produit ajouté', description: `${payload.name} est dans votre catalogue.` });
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

        {/* Preview & image */}
        <div className="space-y-5">
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Image du produit</p>
            <div className="mt-3">
              {form.image_url ? (
                <div className="relative overflow-hidden rounded-2xl">
                  <img src={form.image_url} alt={form.name} className="h-48 w-full object-cover" />
                  <button type="button" onClick={() => setField('image_url', '')} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-[#c45667]" data-testid="button-remove-image">Retirer</button>
                </div>
              ) : (
                <div className="grid h-48 place-items-center rounded-2xl bg-[#f8f7fc] text-[#9290a2]">
                  <div className="text-center">
                    <Icon glyph={ImageUploadIcon} size={32} />
                    <p className="mt-2 text-xs">Aperçu image</p>
                  </div>
                </div>
              )}
              <input value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} placeholder="URL de l'image…" className={`${inputClass} mt-3`} data-testid="input-image" />
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Aperçu client</p>
            <div className="mt-3">
              {form.image_url && <img src={form.image_url} alt={form.name} className="h-32 w-full rounded-xl object-cover" />}
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
