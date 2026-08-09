import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  AdminField,
  AdminButton as Button,
  AdminCard as Card,
  AdminPage,
  adminInputClass,
  adminSelectClass,
} from '../components/admin-ui';
import { seedAdminNiches } from '@/config/admin-seeds';
import type { AdminNiche } from '@/types/entities';

const emptyForm = { name: '', type: 'Sous-niche' as 'Catégorie' | 'Sous-niche', parent: 'Beauté', tags: '' };
type FormState = typeof emptyForm;

export function AdminNicheNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [niches, setNiches] = useState<AdminNiche[]>(() => read('admin-niches', seedAdminNiches));
  const [form, setForm] = useState<FormState>(emptyForm);

  const parentOptions = niches.filter((n) => n.type === 'Catégorie').map((c) => c.name);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast({ title: 'Champs invalides', description: 'Saisissez un nom de niche.' });
      return;
    }
    const id = `n-${Date.now()}`;
    const newNiche: AdminNiche = {
      id,
      name: trimmedName,
      type: form.type,
      parent: form.type === 'Catégorie' ? '—' : form.parent,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      sellers: 0,
      products: 0,
      active: true,
    };
    const updated = [...niches, newNiche];
    setNiches(updated);
    write('admin-niches', updated);
    toast({ title: 'Niche ajoutée', description: `${newNiche.name} (${newNiche.type}) ajoutée à la taxonomie.` });
    navigate('/admin/niches');
  }

  return (
    <AdminPage
      eyebrow="Nouvelle niche"
      title="Ajouter une niche"
      description="Taxonomie de matching produit ↔ vendeur — catégorie, sous-niche et tags (§8)."
      action={
        <Link href="/admin/niches">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <Card className="mt-6">
        <form onSubmit={save} className="space-y-5">
          <AdminField label="Nom">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Soins capillaires" className={adminInputClass} data-testid="input-niche-name" />
          </AdminField>
          <AdminField label="Type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'Catégorie' | 'Sous-niche', parent: e.target.value === 'Catégorie' ? '—' : form.parent })}
              className={adminSelectClass}
              data-testid="select-niche-type"
            >
              <option value="Catégorie">Catégorie</option>
              <option value="Sous-niche">Sous-niche</option>
            </select>
          </AdminField>
          {form.type === 'Sous-niche' && (
            <AdminField label="Catégorie parente">
              <select value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} className={adminSelectClass} data-testid="select-niche-parent">
                {parentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </AdminField>
          )}
          <AdminField label="Tags" hint="Séparés par des virgules — utilisés par le moteur de matching (§10)">
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="karité, baobab, naturel" className={adminInputClass} data-testid="input-niche-tags" />
          </AdminField>
          <p className="rounded-xl bg-[#efedff] px-4 py-3 text-xs font-bold text-[#5b49e8]">
            Niches initiales candidates : Tech, Mode, Beauté, Maison, Food, Sport, Auto, Gaming, Éducation, Voyage, Luxe, Bébé (§8).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/admin/niches"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" testId="button-save-niche">Ajouter la niche</Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
