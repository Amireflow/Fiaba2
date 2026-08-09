import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { useSupabaseQuery, supabaseInsert } from '@/hooks/use-supabase-query';
import {
  AdminField,
  AdminButton as Button,
  AdminCard as Card,
  AdminPage,
  adminInputClass,
  adminSelectClass,
} from '../components/admin-ui';

type NicheRef = { id: string; name: string; type: string };

type FormState = {
  name: string;
  type: 'category' | 'sub_niche';
  parentId: string;
  tags: string;
};

const emptyForm: FormState = { name: '', type: 'sub_niche', parentId: '', tags: '' };

export function AdminNicheNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: niches } = useSupabaseQuery<NicheRef>('niches', {
    select: 'id, name, type',
    order: { column: 'name', ascending: true },
  });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const parentOptions = niches.filter((n) => n.type === 'category');

  // Auto-select first parent
  useEffect(() => {
    if (form.type === 'sub_niche' && !form.parentId && parentOptions.length > 0) {
      setForm((prev) => ({ ...prev, parentId: parentOptions[0].id }));
    }
    if (form.type === 'category') {
      setForm((prev) => ({ ...prev, parentId: '' }));
    }
  }, [form.type]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      haptic('error');
      toast({ title: 'Champs invalides', description: 'Saisissez un nom de niche.' });
      return;
    }

    setSaving(true);
    haptic('medium');
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const { error } = await supabaseInsert('niches', {
      name: trimmedName,
      type: form.type,
      parent_id: form.parentId || null,
      tags,
      is_active: true,
    });
    setSaving(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error });
    } else {
      haptic('success');
      toast({ title: 'Niche ajoutée', description: `${trimmedName} ajoutée à la taxonomie.` });
      navigate('/admin/niches');
    }
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
              onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'] })}
              className={adminSelectClass}
              data-testid="select-niche-type"
            >
              <option value="category">Catégorie</option>
              <option value="sub_niche">Sous-niche</option>
            </select>
          </AdminField>
          {form.type === 'sub_niche' && (
            <AdminField label="Catégorie parente">
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={adminSelectClass} data-testid="select-niche-parent">
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            <Button type="submit" disabled={saving} testId="button-save-niche">{saving ? 'Ajout…' : 'Ajouter la niche'}</Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
