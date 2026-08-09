import { useState } from 'react';
import { Alert01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
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
import { seedAdminDisputes } from '@/config/admin-seeds';
import type { AdminDispute } from '@/types/entities';

const statusTone = (s: AdminDispute['status']) => (s === 'Résolu' ? 'mint' : s === 'Fermé' ? 'slate' : s === 'En revue' ? 'violet' : 'rose');

const filters = ['Tous', 'Ouvert', 'En revue', 'Résolu', 'Fermé'] as const;

export function AdminDisputes() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<AdminDispute[]>(() => read('admin-disputes', seedAdminDisputes));
  const [filter, setFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminDispute | null>(null);
  const [resolution, setResolution] = useState('');

  const filtered = disputes.filter((d) => filter === 'Tous' || d.status === filter);

  function resolve(status: 'Résolu' | 'Fermé') {
    if (!selected) return;
    const updated = disputes.map((d) => (d.id === selected.id ? { ...d, status } : d));
    setDisputes(updated);
    write('admin-disputes', updated);
    toast({ title: `Litige ${status.toLowerCase()}`, description: `${selected.id} · journal d'audit mis à jour.${resolution ? ' Décision tracée.' : ''}` });
    setSelected({ ...selected, status });
    setResolution('');
  }

  const selectedDispute = selected ? disputes.find((d) => d.id === selected.id) ?? selected : null;
  const open = disputes.filter((d) => d.status === 'Ouvert').length;
  const review = disputes.filter((d) => d.status === 'En revue').length;
  const resolved = disputes.filter((d) => d.status === 'Résolu').length;

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
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-dispute-${f}`}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
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
                    <td className="px-5 py-4"><span className="font-bold text-[#292541]">{d.id}</span><p className="mt-0.5 text-[11px] text-[#9290a2]">Ouvert le {d.openedDate}</p></td>
                    <td className="px-5 py-4 font-bold text-[#292541]">{d.orderId}</td>
                    <td className="px-5 py-4 text-[#77738a]">{d.party}</td>
                    <td className="px-5 py-4 text-[#77738a]">{d.reason}</td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(d.amount)}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusTone(d.status)}>{d.status}</AdminBadge></td>
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
        title={selectedDispute ? `Litige ${selectedDispute.id}` : ''}
        subtitle={selectedDispute ? `Commande ${selectedDispute.orderId}` : ''}
        testId="drawer-dispute-detail"
        footer={
          selectedDispute && (selectedDispute.status === 'Ouvert' || selectedDispute.status === 'En revue') ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => resolve('Fermé')} testId="button-close-dispute">Fermer sans résolution</Button>
              <Button variant="success" onClick={() => resolve('Résolu')} testId="button-resolve-dispute">Marquer résolu</Button>
            </div>
          ) : undefined
        }
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AdminBadge tone={statusTone(selectedDispute.status)}>{selectedDispute.status}</AdminBadge>
              <span className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(selectedDispute.amount)}</span>
            </div>
            <div className="rounded-xl bg-[#fff0f1] p-4">
              <div className="flex items-center gap-2 text-[#c45667]">
                <Icon glyph={Alert01Icon} size={16} />
                <p className="text-xs font-bold">{selectedDispute.party}</p>
              </div>
              <p className="mt-2 text-sm text-[#292541]">{selectedDispute.reason}</p>
              <p className="mt-2 text-[11px] text-[#9290a2]">Ouvert le {selectedDispute.openedDate} · Commande {selectedDispute.orderId}</p>
            </div>
            <AdminField label="Décision d'arbitrage (tracée dans le journal)">
              <textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} className={adminTextareaClass} placeholder="Décrivez la décision, les montants éventuels repris ou crédités…" data-testid="input-resolution" />
            </AdminField>
          </div>
        )}
      </AdminDrawer>
    </AdminPage>
  );
}
