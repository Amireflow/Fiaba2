import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
} from '../components/merchant-ui';
import { seedProducts } from '@/config/seeds';
import type { Product } from '@/types/entities';

const categories = ['Beauté', 'Mode', 'Maison', 'Épicerie'] as const;
const emptyForm = { name: '', category: 'Beauté', price: '', stock: '' };
type FormState = typeof emptyForm;

export function ProductForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const [products, setProducts] = useState<Product[]>(() => read('products', seedProducts));
  const existing = isEdit ? products.find((p) => p.id === id) : undefined;
  const [form, setForm] = useState<FormState>(
    existing
      ? { name: existing.name, category: existing.category, price: String(existing.price), stock: String(existing.stock) }
      : emptyForm
  );

  function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
      toast({ title: 'Champs invalides', description: 'Vérifiez le nom, le prix et le stock.' });
      return;
    }
    const data = { name: form.name.trim(), category: form.category, price, stock };
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

  return (
    <Page
      eyebrow={isEdit ? 'Modifier' : 'Nouveau'}
      title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      description={isEdit ? 'Modifiez les informations du produit.' : 'Renseignez les informations du produit.'}
      action={
        <Link href="/merchant/products">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <Card className="mt-6">
        <form onSubmit={save} className="space-y-5">
          <Field label="Nom du produit">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Coffret Soin Karité" className={inputClass} data-testid="input-name" />
          </Field>
          <Field label="Catégorie">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selectClass} data-testid="input-category">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix (FCFA)">
              <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" className={inputClass} data-testid="input-price" />
            </Field>
            <Field label="Stock disponible">
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className={inputClass} data-testid="input-stock" />
            </Field>
          </div>
          {form.stock !== '' && Number(form.stock) === 0 && (
            <p className="rounded-xl bg-[#fff4de] px-4 py-3 text-xs font-bold text-[#ac741e]">Ce produit sera marqué comme « Épuisé ».</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/merchant/products"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" testId="button-save-product">{isEdit ? 'Enregistrer' : 'Ajouter le produit'}</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
