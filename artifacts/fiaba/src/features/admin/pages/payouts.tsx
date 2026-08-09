import { useState } from 'react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminConfirmDialog,
  AdminDrawer,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
} from '../components/admin-ui';
import { seedAdminPayouts } from '@/config/admin-seeds';
import type { AdminPayout } from '@/types/entities';

const statusTone = (s: AdminPayout['status']) => (s === 'Versée' ? 'mint' : s === 'En traitement' ? 'violet' : s === 'Demandée' ? 'amber' : 'rose');

const filters = ['Tous', 'Demandée', 'En traitement', 'Versée', 'Refusée'] as const;

export function AdminPayouts() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<AdminPayout[]>(() => read('admin-payouts', seedAdminPayouts));
  const [filter, setFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminPayout | null>(null);
  const [toProcess, setToProcess] = useState<{ payout: AdminPayout; action: 'Versée' | 'Refusée' } | null>(null);

  const filtered = payouts.filter((p) => filter === 'Tous' || p.status === filter);

  function confirmProcess() {
    if (!toProcess) return;
    const { payout, action } = toProcess;
    const updated = payouts.map((p) => (p.id === payout.id ? { ...p, status: action } : p));
    setPayouts(updated);
    write('admin-payouts', updated);
    setSelected({ ...payout, status: action });
    toast({ title: `Retrait ${action.toLowerCase()}`, description: `${payout.seller} · ${money(payout.amount)}. Journal d'audit mis à jour.` });
  }

  const selectedPayout = selected ? payouts.find((p) => p.id === selected.id) ?? selected : null;
  const requested = payouts.filter((p) => p.status === 'Demandée').reduce((sum, p) => sum + p.amount, 0);
  const processing = payouts.filter((p) => p.status === 'En traitement').reduce((sum, p) => sum + p.amount, 0);
  const paid = payouts.filter((p) => p.status === 'Versée').reduce((sum, p) => sum + p.amount, 0);

  return (
    <AdminPage
      eyebrow="Retraits"
      title="Demandes de paiement"
      description="Traitez les retraits vendeurs. Chaque retrait a un statut et un historique tracé."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Demandées</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{money(requested)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En traitement</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#5b49e8]">{money(processing)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Versés</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{money(paid)}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-payout-${f}`}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <AdminEmptyState glyph={Wallet01Icon} title="Aucun retrait" description="Aucune demande ne correspond à ce filtre." />
        ) : (
          <AdminScrollTable minWidth={680} testId="scroll-admin-payouts">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Réf</th>
                  <th className="px-5 py-3">Vendeur</th>
                  <th className="px-5 py-3">Compte</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((p) => (
                  <tr key={p.id} className="cursor-pointer transition hover:bg-[#faf9fd]" onClick={() => setSelected(p)} data-testid={`row-payout-${p.id}`}>
                    <td className="px-5 py-4 text-[11px] text-[#9290a2]">{p.id}</td>
                    <td className="px-5 py-4 font-bold text-[#292541]">{p.seller}</td>
                    <td className="px-5 py-4 text-[#77738a]">{p.account}</td>
                    <td className="px-5 py-4 text-[#77738a]">{p.date}</td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(p.amount)}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusTone(p.status)}>{p.status}</AdminBadge></td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {(p.status === 'Demandée' || p.status === 'En traitement') && (
                        <Button variant="soft" onClick={() => setToProcess({ payout: p, action: 'Versée' })} testId={`button-process-${p.id}`}>Traiter</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      {/* Detail drawer */}
      <AdminDrawer
        open={!!selectedPayout}
        onClose={() => setSelected(null)}
        title={selectedPayout ? `Retrait · ${selectedPayout.seller}` : ''}
        subtitle={selectedPayout?.date}
        testId="drawer-payout-detail"
        footer={
          selectedPayout && (selectedPayout.status === 'Demandée' || selectedPayout.status === 'En traitement') ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" onClick={() => setToProcess({ payout: selectedPayout, action: 'Refusée' })} testId="button-drawer-refuse">Refuser</Button>
              <Button variant="success" onClick={() => setToProcess({ payout: selectedPayout, action: 'Versée' })} testId="button-drawer-approve">Marquer versé</Button>
            </div>
          ) : undefined
        }
      >
        {selectedPayout && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AdminBadge tone={statusTone(selectedPayout.status)}>{selectedPayout.status}</AdminBadge>
              <span className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(selectedPayout.amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeur</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedPayout.seller}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Compte destinataire</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedPayout.account}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Date demande</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedPayout.date}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Référence</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedPayout.id}</p></div>
            </div>
          </div>
        )}
      </AdminDrawer>

      <AdminConfirmDialog
        open={!!toProcess}
        onClose={() => setToProcess(null)}
        onConfirm={confirmProcess}
        title={toProcess?.action === 'Versée' ? 'Marquer ce retrait comme versé ?' : 'Refuser ce retrait ?'}
        message={toProcess ? `${toProcess.payout.seller} · ${money(toProcess.payout.amount)} sur ${toProcess.payout.account}.` : ''}
        confirmLabel={toProcess?.action === 'Versée' ? 'Confirmer le versement' : 'Refuser'}
        tone={toProcess?.action === 'Versée' ? 'primary' : 'danger'}
      />
    </AdminPage>
  );
}
