import { useState } from 'react';
import { Link } from 'wouter';
import { Add01Icon, Tag01Icon } from '@hugeicons/core-free-icons';
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

type NicheRow = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  tags: string[];
  is_active: boolean;
};

type TypeFilter = 'Tous' | 'Catégorie' | 'Sous-niche';

const typeMap: Record<string, TypeFilter> = {
  category: 'Catégorie',
  sub_niche: 'Sous-niche',
};

export function AdminNiches() {
  const { toast } = useToast();
  const { data: niches, loading, refetch } = useSupabaseQuery<NicheRow>('niches', {
    select: 'id, name, type, parent_id, tags, is_active',
    order: { column: 'name', ascending: true },
  });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('Tous');

  const filtered = niches.filter((n) => typeFilter === 'Tous' || typeMap[n.type] === typeFilter);
  const nicheNameMap = new Map(niches.map((n) => [n.id, n.name]));

  async function toggleActive(niche: NicheRow) {
    haptic('light');
    const { error } = await supabaseUpdate('niches', niche.id, { is_active: !niche.is_active });
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: `${niche.name} · ${!niche.is_active ? 'activée' : 'désactivée'}`, description: 'La niche sera (dés)affichée dans le matching.' });
      refetch();
    }
  }

  const categories = niches.filter((n) => n.type === 'category');
  const subNiches = niches.filter((n) => n.type === 'sub_niche');
  const active = niches.filter((n) => n.is_active).length;

  return (
    <AdminPage
      eyebrow="Niches & catégories"
      title="Taxonomie"
      description="Structure hiérarchique : catégorie → sous-niche → tags. Le matching produit ↔ vendeur s'appuie sur cette taxonomie."
      action={
        <Link href="/admin/niches/new">
          <Button testId="button-add-niche">
            <Icon glyph={Add01Icon} size={15} /> Ajouter
          </Button>
        </Link>
      }
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Catégories</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{categories.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Sous-niches</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{subNiches.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Actives</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{active}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(['Tous', 'Catégorie', 'Sous-niche'] as const).map((t) => (
          <button key={t} onClick={() => { haptic('light'); setTypeFilter(t); }} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${typeFilter === t ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-niche-${t}`}>{t}</button>
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
            glyph={Tag01Icon}
            title="Aucune niche"
            description="Ajoutez une catégorie ou sous-niche."
            action={<Link href="/admin/niches/new"><Button><Icon glyph={Add01Icon} size={15} /> Ajouter</Button></Link>}
          />
        ) : (
          <AdminScrollTable minWidth={720} testId="scroll-admin-niches">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Nom</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3">Tags</th>
                  <th className="px-5 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((n) => (
                  <tr key={n.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-niche-${n.id}`}>
                    <td className="px-5 py-4 font-bold text-[#292541]">{n.name}</td>
                    <td className="px-5 py-4"><AdminBadge tone={n.type === 'category' ? 'violet' : 'mint'}>{typeMap[n.type] ?? n.type}</AdminBadge></td>
                    <td className="px-5 py-4 text-[#77738a]">{n.parent_id ? (nicheNameMap.get(n.parent_id) ?? '—') : '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(n.tags ?? []).slice(0, 3).map((t) => <AdminBadge key={t} tone="slate">{t}</AdminBadge>)}
                        {(n.tags ?? []).length > 3 && <AdminBadge tone="slate">+{n.tags.length - 3}</AdminBadge>}
                      </div>
                    </td>
                    <td className="px-5 py-4"><AdminToggle checked={n.is_active} onChange={() => toggleActive(n)} testId={`toggle-niche-${n.id}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      <p className="mt-4 text-[11px] text-[#9290a2]">
        Niches initiales candidates : Tech, Mode, Beauté, Maison, Food, Sport, Auto, Gaming, Éducation, Voyage, Luxe, Bébé (§8).
      </p>
    </AdminPage>
  );
}
