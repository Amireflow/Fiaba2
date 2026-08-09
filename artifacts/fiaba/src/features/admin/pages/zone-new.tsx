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
import { seedAdminZones } from '@/config/admin-seeds';
import type { AdminZone, ZoneLevel } from '@/types/entities';

const emptyForm = { name: '', level: 'Commune' as ZoneLevel, parent: 'Dakar' };
type FormState = typeof emptyForm;

export function AdminZoneNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [zones, setZones] = useState<AdminZone[]>(() => read('admin-zones', seedAdminZones));
  const [form, setForm] = useState<FormState>(emptyForm);

  const parentOptions =
    form.level === 'Région'
      ? ['—']
      : form.level === 'Département'
        ? zones.filter((z) => z.level === 'Région').map((r) => r.name)
        : zones.filter((z) => z.level === 'Département').map((d) => d.name);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast({ title: 'Champs invalides', description: 'Saisissez un nom de zone.' });
      return;
    }
    const id = `z-${Date.now()}`;
    const newZone: AdminZone = {
      id,
      name: trimmedName,
      level: form.level,
      parent: form.level === 'Région' ? '—' : form.parent,
      active: true,
      communes: 0,
    };
    const updated = [...zones, newZone];
    setZones(updated);
    write('admin-zones', updated);
    toast({ title: 'Zone ajoutée', description: `${newZone.name} (${newZone.level}) ajoutée au référentiel.` });
    navigate('/admin/zones');
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
              onChange={(e) => setForm({ ...form, level: e.target.value as ZoneLevel, parent: e.target.value === 'Région' ? '—' : form.parent })}
              className={adminSelectClass}
              data-testid="select-zone-level"
            >
              <option value="Région">Région</option>
              <option value="Département">Département</option>
              <option value="Commune">Commune</option>
            </select>
          </AdminField>
          {form.level !== 'Région' && (
            <AdminField label="Parent">
              <select value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })} className={adminSelectClass} data-testid="select-zone-parent">
                {parentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </AdminField>
          )}
          <p className="rounded-xl bg-[#efedff] px-4 py-3 text-xs font-bold text-[#5b49e8]">
            Couverture initiale recommandée : granularité complète jusqu'à la commune sur Dakar (§9.2).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/admin/zones"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" testId="button-save-zone">Ajouter la zone</Button>
          </div>
        </form>
      </Card>
    </AdminPage>
  );
}
