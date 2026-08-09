import { useState, useEffect } from 'react';
import { Alert01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminScrollTable,
  adminTextareaClass,
} from '../components/admin-ui';

type DisputeRow = {
  id: string;
  order_id: string;
  party: string;
  reason: string;
  amount: number;
  status: string;
  resolution: string | null;
  created_at: string;
};

const statusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'violet' | 'slate'> = {
  open: 'rose',
  in_review: 'violet',
  resolved: 'mint',
  closed: 'slate',
};

const statusLabelMap: Record<string, string> = {
  open: 'Ouvert',
  in_review: 'En revue',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const filters = ['Tous', 'open', 'in_review', 'resolved', 'closed'] as const;

export function AdminDisputes() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Tous');
  const [selected, setSelected] = useState<DisputeRow | null>(null);
  const [resolution, setResolution] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('disputes')
        .select('id, order_id, party, reason, amount, status, resolution, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setDisputes((data as DisputeRow[] | null) ?? []);
      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = disputes.filter((d) => filter === 'Tous' || d.status === filter);

  async function resolve(status: 'resolved' | 'closed') {
    if (!selected) return;
    haptic('medium');
    setUpdating(true);

    const { error } = await (supabase.from('disputes') as any)
      .update({
        status,
        resolution: resolution || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', selected.id);

    setUpdating(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      setDisputes((prev) => prev.map((d) => (d.id === selected.id ? { ...d, status, resolution: resolution || null } : d)));
      toast({ title: `Litige ${statusLabelMap[status].toLowerCase()}`, description: `CMD-${selected.order_id.slice(-6).toUpperCase()} · journal d'audit mis à jour.${resolution ? ' Décision tracée.' : ''}` });
      setSelected({ ...selected, status, resolution: resolution || null });
      setResolution('');
    }
  }

  const selectedDispute = selected ? disputes.find((d) => d.id === selected.id) ?? selected : null;
  const open = disputes.filter((d) => d.status === 'open').length;
  const review = disputes.filter((d) => d.status === 'in_review').length;
  const resolved = disputes.filter((d) => d.status === 'resolved').length;

  return (
    <AdminPage
      eyebrow="Litiges"
      title="Arbitrage"
      description="Corrigez les litiges avec un journal d'audit. Chaque décision est tracée et motive le Trust Score."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ouverts</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{open}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En revue</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#5b49e8]">{review}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Résolus</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{resolved}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-dispute-${f}`}>{f === 'Tous' ? 'Tous' : statusLabelMap[f] ?? f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState glyph={Alert01Icon} title="Aucun litige" description="Aucun litige ne correspond à ce filtre." />
        ) : (
          <AdminScrollTable minWidth={720} testId="scroll-admin-disputes">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Litige</th>
                  <th className="px-5 py-3">Commande</th>
                  <th className="px-5 py-3">Partie</th>
                  <th className="px-5 py-3">Motif</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((d) => (
                  <tr key={d.id} className="cursor-pointer transition hover:bg-[#faf9fd]" onClick={() => setSelected(d)} data-testid={`row-dispute-${d.id}`}>
                    <td className="px-5 py-4"><span className="font-bold text-[#292541]">{d.id.slice(-8)}</span><p className="mt-0.5 text-[11px] text-[#9290a2]">Ouvert le {new Date(d.created_at).toLocaleDateString('fr-FR')}</p></td>
                    <td className="px-5 py-4 font-bold text-[#292541]">CMD-{d.order_id.slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-4 text-[#77738a]">{d.party}</td>
                    <td className="px-5 py-4 text-[#77738a]">{d.reason}</td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(d.amount)}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusToneMap[d.status] ?? 'rose'}>{statusLabelMap[d.status] ?? d.status}</AdminBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      {/* Detail drawer */}
      <AdminDrawer
        open={!!selectedDispute}
        onClose={() => setSelected(null)}
        title={selectedDispute ? `Litige ${selectedDispute.id.slice(-8)}` : ''}
        subtitle={selectedDispute ? `Commande CMD-${selectedDispute.order_id.slice(-6).toUpperCase()}` : ''}
        testId="drawer-dispute-detail"
        footer={
          selectedDispute && (selectedDispute.status === 'open' || selectedDispute.status === 'in_review') ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => resolve('closed')} disabled={updating} testId="button-close-dispute">Fermer sans résolution</Button>
              <Button variant="success" onClick={() => resolve('resolved')} disabled={updating} testId="button-resolve-dispute">Marquer résolu</Button>
            </div>
          ) : undefined
        }
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AdminBadge tone={statusToneMap[selectedDispute.status] ?? 'rose'}>{statusLabelMap[selectedDispute.status] ?? selectedDispute.status}</AdminBadge>
              <span className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(selectedDispute.amount)}</span>
            </div>
            <div className="rounded-xl bg-[#fff0f1] p-4">
              <div className="flex items-center gap-2 text-[#c45667]">
                <Icon glyph={Alert01Icon} size={16} />
                <p className="text-xs font-bold">{selectedDispute.party}</p>
              </div>
              <p className="mt-2 text-sm text-[#292541]">{selectedDispute.reason}</p>
              <p className="mt-2 text-[11px] text-[#9290a2]">Ouvert le {new Date(selectedDispute.created_at).toLocaleDateString('fr-FR')} · Commande CMD-{selectedDispute.order_id.slice(-6).toUpperCase()}</p>
            </div>
            {selectedDispute.resolution && (
              <div className="rounded-xl bg-[#e7faf2] p-4">
                <p className="text-xs font-bold text-[#278e69]">Résolution tracée</p>
                <p className="mt-1 text-sm text-[#292541]">{selectedDispute.resolution}</p>
              </div>
            )}
            {(selectedDispute.status === 'open' || selectedDispute.status === 'in_review') && (
              <AdminField label="Décision d'arbitrage (tracée dans le journal)">
                <textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} className={adminTextareaClass} placeholder="Décrivez la décision, les montants éventuels repris ou crédités…" data-testid="input-resolution" />
              </AdminField>
            )}
          </div>
        )}
      </AdminDrawer>
    </AdminPage>
  );
}
