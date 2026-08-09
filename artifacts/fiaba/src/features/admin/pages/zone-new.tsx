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

type ZoneRef = { id: string; name: string; level: string };

type FormState = {
  name: string;
  level: 'region' | 'department' | 'commune';
  parentId: string;
};

const emptyForm: FormState = { name: '', level: 'commune', parentId: '' };

const levelLabel: Record<string, string> = {
  region: 'Région',
  department: 'Département',
  commune: 'Commune',
};

export function AdminZoneNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: zones } = useSupabaseQuery<ZoneRef>('zones', {
    select: 'id, name, level',
    order: { column: 'name', ascending: true },
  });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const parentOptions = form.level === 'region'
    ? []
    : zones.filter((z) => z.level === (form.level === 'department' ? 'region' : 'department'));

  // Auto-select first parent when level changes
  useEffect(() => {
    if (form.level !== 'region' && !form.parentId && parentOptions.length > 0) {
      setForm((prev) => ({ ...prev, parentId: parentOptions[0].id }));
    }
    if (form.level === 'region') {
      setForm((prev) => ({ ...prev, parentId: '' }));
    }
  }, [form.level]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      haptic('error');
      toast({ title: 'Champs invalides', description: 'Saisissez un nom de zone.' });
      return;
    }

    setSaving(true);
    haptic('medium');
    const { error } = await supabaseInsert('zones', {
      name: trimmedName,
      level: form.level,
      parent_id: form.parentId || null,
      is_active: true,
    });
    setSaving(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error });
    } else {
      haptic('success');
      toast({ title: 'Zone ajoutée', description: `${trimmedName} (${levelLabel[form.level]}) ajoutée au référentiel.` });
      navigate('/admin/zones');
    }
  }

  return (
    <AdminPage
      eyebrow="Nouvelle zone"
      title="Ajouter une zone"
      description="Référentiel partagé par tous les commerçants — région, département ou commune."
      action={
        <Link href="/admin/zones">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <Card className="mt-6">
        <form onSubmit={save} className="space-y-5">
          <AdminField label="Nom de la zone">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Médina" className={adminInputClass} data-testid="input-zone-name" />
          </AdminField>
          <AdminField label="Niveau" hint="Hiérarchie : Région → Département → Commune (§9)">
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as FormState['level'] })}
              className={adminSelectClass}
              data-testid="select-zone-level"
            >
              <option value="region">Région</option>
              <option value="department">Département</option>
              <option value="commune">Commune</option>
            </select>
          </AdminField>
          {form.level !== 'region' && (
            <AdminField label="Parent">
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={adminSelectClass} data-testid="select-zone-parent">
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </AdminField>
          )}
          <p className="rounded-xl bg-[#efedff] px-4 py-3 text-xs font-bold text-[#5b49e8]">
            Couverture initiale recommandée : granularité complète jusqu'à la commune sur Dakar (§9.2).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/admin/zones"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" disabled={saving} testId="button-save-zone">{saving ? 'Ajout…' : 'Ajouter la zone'}</Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
