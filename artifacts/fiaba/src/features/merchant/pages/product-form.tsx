import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon, ImageUploadIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
  textareaClass,
} from '../components/merchant-ui';
import { seedProducts } from '@/config/seeds';
import type { Product } from '@/types/entities';

const categories = ['Beauté', 'Mode', 'Maison', 'Épicerie'] as const;

type FormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  image: string;
  weight: string;
  lowStockThreshold: string;
};

const emptyForm: FormState = {
  name: '',
  category: 'Beauté',
  price: '',
  stock: '',
  description: '',
  image: '',
  weight: '',
  lowStockThreshold: '5',
};

export function ProductForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const [products, setProducts] = useState<Product[]>(() => read('products', seedProducts));
  const existing = isEdit ? products.find((p) => p.id === id) : undefined;
  const [form, setForm] = useState<FormState>(
    existing
      ? {
          name: existing.name,
          category: existing.category,
          price: String(existing.price),
          stock: String(existing.stock),
          description: existing.description ?? '',
          image: existing.image ?? '',
          weight: existing.weight ? String(existing.weight) : '',
          lowStockThreshold: existing.lowStockThreshold ? String(existing.lowStockThreshold) : '5',
        }
      : emptyForm
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
      toast({ title: 'Champs invalides', description: 'Vérifiez le nom, le prix et le stock.' });
      return;
    }
    const data = {
      name: form.name.trim(),
      category: form.category,
      price,
      stock,
      description: form.description.trim(),
      image: form.image.trim(),
      weight: form.weight ? Number(form.weight) : undefined,
      lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined,
    };
    if (isEdit && existing) {
      const status: Product['status'] = stock > 0 ? 'Actif' : 'Épuisé';
      const updated = products.map((p) => (p.id === existing.id ? { ...p, ...data, status } : p));
      setProducts(updated);
      write('products', updated);
      toast({ title: 'Produit modifié', description: `${data.name} a été mis à jour.` });
    } else {
      const updated = [...products, { id: crypto.randomUUID(), ...data, status: stock > 0 ? 'Actif' : 'Épuisé' } as Product];
      setProducts(updated);
      write('products', updated);
      toast({ title: 'Produit ajouté', description: `${data.name} est dans votre catalogue.` });
    }
    navigate('/merchant/products');
  }

  const isLowStock = form.stock !== '' && form.lowStockThreshold !== '' && Number(form.stock) > 0 && Number(form.stock) <= Number(form.lowStockThreshold);

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
            <div className="grid grid-cols-2 gap-4">
              <Field label="Poids (g)" hint="Pour le calcul des frais de livraison">
                <input type="number" min="0" value={form.weight} onChange={(e) => setField('weight', e.target.value)} placeholder="Ex. 350" className={inputClass} data-testid="input-weight" />
              </Field>
              <Field label="Seuil d'alerte stock" hint="Notification quand le stock descend sous ce seuil">
                <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setField('lowStockThreshold', e.target.value)} placeholder="5" className={inputClass} data-testid="input-low-stock" />
              </Field>
            </div>
            {form.stock !== '' && Number(form.stock) === 0 && (
              <p className="rounded-xl bg-[#fff4de] px-4 py-3 text-xs font-bold text-[#ac741e]">Ce produit sera marqué comme « Épuisé ».</p>
            )}
            {isLowStock && (
              <p className="rounded-xl bg-[#fff4de] px-4 py-3 text-xs font-bold text-[#ac741e]">Stock faible : il reste {form.stock} unités (seuil d'alerte : {form.lowStockThreshold}).</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/merchant/products"><Button variant="ghost" type="button">Annuler</Button></Link>
              <Button type="submit" testId="button-save-product">{isEdit ? 'Enregistrer' : 'Ajouter le produit'}</Button>
            </div>
          </form>
        </Card>

        {/* Preview & image */}
        <div className="space-y-5">
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Image du produit</p>
            <div className="mt-3">
              {form.image ? (
                <div className="relative overflow-hidden rounded-2xl">
                  <img src={form.image} alt={form.name} className="h-48 w-full object-cover" />
                  <button type="button" onClick={() => setField('image', '')} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-[#c45667]" data-testid="button-remove-image">Retirer</button>
                </div>
              ) : (
                <div className="grid h-48 place-items-center rounded-2xl bg-[#f8f7fc] text-[#9290a2]">
                  <div className="text-center">
                    <Icon glyph={ImageUploadIcon} size={32} />
                    <p className="mt-2 text-xs">Aperçu image</p>
                  </div>
                </div>
              )}
              <input value={form.image} onChange={(e) => setField('image', e.target.value)} placeholder="URL de l'image…" className={`${inputClass} mt-3`} data-testid="input-image" />
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Aperçu client</p>
            <div className="mt-3">
              {form.image && <img src={form.image} alt={form.name} className="h-32 w-full rounded-xl object-cover" />}
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
