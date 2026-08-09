import { useState } from 'react';
import { Add01Icon, MapPinIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminScrollTable,
  AdminToggle,
  adminInputClass,
  adminSelectClass,
} from '../components/admin-ui';
import { seedAdminZones } from '@/config/admin-seeds';
import type { AdminZone, ZoneLevel } from '@/types/entities';

const levelTone = (l: ZoneLevel) => (l === 'Région' ? 'violet' : l === 'Département' ? 'mint' : 'amber');

export function AdminZones() {
  const { toast } = useToast();
  const [zones, setZones] = useState<AdminZone[]>(() => read('admin-zones', seedAdminZones));
  const [levelFilter, setLevelFilter] = useState<'Tous' | ZoneLevel>('Tous');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; level: ZoneLevel; parent: string }>({ name: '', level: 'Commune', parent: 'Dakar' });

  const filtered = zones.filter((z) => levelFilter === 'Tous' || z.level === levelFilter);

  function toggleActive(zone: AdminZone) {
    const updated = zones.map((z) => (z.id === zone.id ? { ...z, active: !z.active } : z));
    setZones(updated);
    write('admin-zones', updated);
    toast({ title: `${zone.name} · ${!zone.active ? 'activée' : 'désactivée'}`, description: 'Référentiel de zones mis à jour.' });
  }

  function createZone() {
    if (!form.name.trim()) return;
    const id = `z-${Date.now()}`;
    const newZone: AdminZone = { id, name: form.name.trim(), level: form.level, parent: form.parent, active: true, communes: 0 };
    const updated = [...zones, newZone];
    setZones(updated);
    write('admin-zones', updated);
    toast({ title: 'Zone créée', description: `${newZone.name} (${newZone.level}) ajoutée au référentiel.` });
    setCreating(false);
    setForm({ name: '', level: 'Commune', parent: 'Dakar' });
  }

  const regions = zones.filter((z) => z.level === 'Région');
  const departments = zones.filter((z) => z.level === 'Département');
  const communes = zones.filter((z) => z.level === 'Commune');
  const parentOptions = form.level === 'Région' ? ['—'] : form.level === 'Département' ? regions.map((r) => r.name) : departments.map((d) => d.name);

  return (
    <AdminPage
      eyebrow="Référentiel de zones"
      title="Zones de livraison"
      description="Référentiel unique partagé (région / département / commune). Couverture et frais définis par chaque commerçant."
      action={
        <Button onClick={() => setCreating(true)} testId="button-add-zone">
          <Icon glyph={Add01Icon} size={15} /> Ajouter une zone
        </Button>
      }
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Régions</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{regions.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Départements</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{departments.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Communes</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{communes.length}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(['Tous', 'Région', 'Département', 'Commune'] as const).map((l) => (
          <button key={l} onClick={() => setLevelFilter(l)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${levelFilter === l ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-zone-${l}`}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <AdminEmptyState glyph={MapPinIcon} title="Aucune zone" description="Ajoutez une zone au référentiel." />
        ) : (
          <AdminScrollTable minWidth={620} testId="scroll-admin-zones">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-5 py-3">Niveau</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3 text-right">Sous-zones</th>
                  <th className="px-5 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((z) => (
                  <tr key={z.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-zone-${z.id}`}>
                    <td className="px-5 py-4 font-bold text-[#292541]">{z.name}</td>
                    <td className="px-5 py-4"><AdminBadge tone={levelTone(z.level)}>{z.level}</AdminBadge></td>
                    <td className="px-5 py-4 text-[#77738a]">{z.parent}</td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{z.communes}</td>
                    <td className="px-5 py-4"><AdminToggle checked={z.active} onChange={() => toggleActive(z)} testId={`toggle-zone-${z.id}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      <p className="mt-4 text-[11px] text-[#9290a2]">
        Couverture initiale recommandée : granularité complète jusqu'à la commune sur Dakar. Les autres régions restent au niveau département tant que le volume ne justifie pas plus de détail (§9.2).
      </p>

      {/* Create drawer */}
      <AdminDrawer
        open={creating}
        onClose={() => setCreating(false)}
        title="Ajouter une zone"
        subtitle="Référentiel partagé par tous les commerçants"
        testId="drawer-zone-create"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            <Button variant="primary" onClick={createZone} testId="button-confirm-zone">Ajouter</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminField label="Nom de la zone">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={adminInputClass} placeholder="ex : Médina" data-testid="input-zone-name" />
          </AdminField>
          <AdminField label="Niveau">
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as ZoneLevel, parent: e.target.value === 'Région' ? '—' : form.parent })} className={adminSelectClass} data-testid="select-zone-level">
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
        </div>
      </AdminDrawer>
    </AdminPage>
  );
}
