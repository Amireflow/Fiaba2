import { useState } from 'react';
import { Link } from 'wouter';
import { Add01Icon, MapPinIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { useSupabaseQuery, supabaseUpdate } from '@/hooks/use-supabase-query';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  AdminToggle,
} from '../components/admin-ui';

type ZoneRow = {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  is_active: boolean;
};

type ZoneLevelFilter = 'Tous' | 'Région' | 'Département' | 'Commune';

const levelMap: Record<string, ZoneLevelFilter> = {
  region: 'Région',
  department: 'Département',
  commune: 'Commune',
};

const levelTone = (l: string) => (l === 'region' ? 'violet' : l === 'department' ? 'mint' : 'amber');

export function AdminZones() {
  const { toast } = useToast();
  const { data: zones, loading, refetch } = useSupabaseQuery<ZoneRow>('zones', {
    select: 'id, name, level, parent_id, is_active',
    order: { column: 'name', ascending: true },
  });
  const [levelFilter, setLevelFilter] = useState<ZoneLevelFilter>('Tous');

  const filtered = zones.filter((z) => levelFilter === 'Tous' || levelMap[z.level] === levelFilter);

  // Build parent name lookup
  const zoneNameMap = new Map(zones.map((z) => [z.id, z.name]));

  async function toggleActive(zone: ZoneRow) {
    haptic('light');
    const { error } = await supabaseUpdate('zones', zone.id, { is_active: !zone.is_active });
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: `${zone.name} · ${!zone.is_active ? 'activée' : 'désactivée'}`, description: 'Référentiel de zones mis à jour.' });
      refetch();
    }
  }

  const regions = zones.filter((z) => z.level === 'region');
  const departments = zones.filter((z) => z.level === 'department');
  const communes = zones.filter((z) => z.level === 'commune');

  return (
    <AdminPage
      eyebrow="Référentiel de zones"
      title="Zones de livraison"
      description="Référentiel unique partagé (région / département / commune). Couverture et frais définis par chaque commerçant."
      action={
        <Link href="/admin/zones/new">
          <Button testId="button-add-zone">
            <Icon glyph={Add01Icon} size={15} /> Ajouter une zone
          </Button>
        </Link>
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
          <button key={l} onClick={() => { haptic('light'); setLevelFilter(l); }} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${levelFilter === l ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-zone-${l}`}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            glyph={MapPinIcon}
            title="Aucune zone"
            description="Ajoutez une zone au référentiel."
            action={<Link href="/admin/zones/new"><Button><Icon glyph={Add01Icon} size={15} /> Ajouter une zone</Button></Link>}
          />
        ) : (
          <AdminScrollTable minWidth={620} testId="scroll-admin-zones">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-5 py-3">Niveau</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((z) => (
                  <tr key={z.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-zone-${z.id}`}>
                    <td className="px-5 py-4 font-bold text-[#292541]">{z.name}</td>
                    <td className="px-5 py-4"><AdminBadge tone={levelTone(z.level)}>{levelMap[z.level] ?? z.level}</AdminBadge></td>
                    <td className="px-5 py-4 text-[#77738a]">{z.parent_id ? (zoneNameMap.get(z.parent_id) ?? '—') : '—'}</td>
                    <td className="px-5 py-4"><AdminToggle checked={z.is_active} onChange={() => toggleActive(z)} testId={`toggle-zone-${z.id}`} /></td>
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
    </AdminPage>
  );
}
