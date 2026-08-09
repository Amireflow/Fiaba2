import { useState } from 'react';
import { Shield01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminConfirmDialog,
  AdminDrawer,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  SeverityBadge,
} from '../components/admin-ui';
import { seedAdminFraudAlerts } from '@/config/admin-seeds';
import type { AdminFraudAlert } from '@/types/entities';

const statusTone = (s: AdminFraudAlert['status']) => (s === 'Bloqué' ? 'rose' : s === 'En revue' ? 'violet' : s === 'Ignoré' ? 'slate' : 'amber');

const filters = ['Tous', 'Nouveau', 'En revue', 'Bloqué', 'Ignoré'] as const;

export function AdminFraud() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AdminFraudAlert[]>(() => read('admin-fraud', seedAdminFraudAlerts));
  const [filter, setFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminFraudAlert | null>(null);
  const [toBlock, setToBlock] = useState<AdminFraudAlert | null>(null);

  const filtered = alerts.filter((a) => filter === 'Tous' || a.status === filter);

  function setStatus(alert: AdminFraudAlert, status: AdminFraudAlert['status']) {
    const updated = alerts.map((a) => (a.id === alert.id ? { ...a, status } : a));
    setAlerts(updated);
    write('admin-fraud', updated);
    setSelected({ ...alert, status });
    toast({ title: `Signal ${status.toLowerCase()}`, description: `${alert.type} · ${alert.target}. Journal d'audit mis à jour.` });
  }

  function confirmBlock() {
    if (!toBlock) return;
    const updated = alerts.map((a) => (a.id === toBlock.id ? { ...a, status: 'Bloqué' as const } : a));
    setAlerts(updated);
    write('admin-fraud', updated);
    setSelected({ ...toBlock, status: 'Bloqué' });
    toast({ title: 'Compte bloqué', description: `${toBlock.target} bloqué. Le Trust Score est recalculé. Décision tracée.` });
  }

  const selectedAlert = selected ? alerts.find((a) => a.id === selected.id) ?? selected : null;
  const fresh = alerts.filter((a) => a.status === 'Nouveau').length;
  const critical = alerts.filter((a) => a.severity === 'Critique').length;
  const blocked = alerts.filter((a) => a.status === 'Bloqué').length;

  return (
    <AdminPage
      eyebrow="Fraude & règles de risque"
      title="Centre de risque"
      description="Revue administrative des signaux. Le Trust Score intègre ces signaux sans bloquer automatiquement sans revue."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Nouveaux signaux</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{fresh}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Critiques</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{critical}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Comptes bloqués</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{blocked}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-fraud-${f}`}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <AdminEmptyState glyph={Shield01Icon} title="Aucun signal" description="Aucun signal de fraude ne correspond à ce filtre." />
        ) : (
          <AdminScrollTable minWidth={720} testId="scroll-admin-fraud">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Signal</th>
                  <th className="px-5 py-3">Cible</th>
                  <th className="px-5 py-3">Détail</th>
                  <th className="px-5 py-3">Sévérité</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((a) => (
                  <tr key={a.id} className="cursor-pointer transition hover:bg-[#faf9fd]" onClick={() => setSelected(a)} data-testid={`row-fraud-${a.id}`}>
                    <td className="px-5 py-4"><span className="font-bold text-[#292541]">{a.type}</span></td>
                    <td className="px-5 py-4 text-[#77738a]">{a.target}</td>
                    <td className="px-5 py-4 text-[#77738a]">{a.detail}</td>
                    <td className="px-5 py-4"><SeverityBadge severity={a.severity} /></td>
                    <td className="px-5 py-4 text-[11px] text-[#9290a2]">{a.date}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusTone(a.status)}>{a.status}</AdminBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      {/* Detail drawer */}
      <AdminDrawer
        open={!!selectedAlert}
        onClose={() => setSelected(null)}
        title={selectedAlert?.type ?? ''}
        subtitle={selectedAlert ? `${selectedAlert.target} · ${selectedAlert.date}` : ''}
        testId="drawer-fraud-detail"
        footer={
          selectedAlert && selectedAlert.status !== 'Bloqué' && selectedAlert.status !== 'Ignoré' ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setStatus(selectedAlert, 'Ignoré')} testId="button-ignore-fraud">Ignorer</Button>
              <Button variant="danger" onClick={() => setToBlock(selectedAlert)} testId="button-block-fraud">Bloquer le compte</Button>
            </div>
          ) : undefined
        }
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SeverityBadge severity={selectedAlert.severity} />
              <AdminBadge tone={statusTone(selectedAlert.status)}>{selectedAlert.status}</AdminBadge>
            </div>
            <div className="rounded-xl bg-[#fff0f1] p-4">
              <div className="flex items-center gap-2 text-[#c45667]">
                <Icon glyph={Shield01Icon} size={16} />
                <p className="text-xs font-bold">{selectedAlert.type}</p>
              </div>
              <p className="mt-2 text-sm text-[#292541]">{selectedAlert.detail}</p>
              <p className="mt-2 text-[11px] text-[#9290a2]">Cible : {selectedAlert.target} · {selectedAlert.date}</p>
            </div>
            <div className="rounded-xl p-4 text-xs text-[#77738a]">
              <p className="font-bold text-[#292541]">Règle de risque appliquée</p>
              <p className="mt-2">Le signal est intégré au Trust Score. Aucun blocage automatique n'a lieu sans revue administrative (§24 du CDC).</p>
            </div>
          </div>
        )}
      </AdminDrawer>

      <AdminConfirmDialog
        open={!!toBlock}
        onClose={() => setToBlock(null)}
        onConfirm={confirmBlock}
        title="Bloquer ce compte ?"
        message={toBlock ? `${toBlock.target} sera suspendu. Le Trust Score sera recalculé et la décision tracée dans le journal d'audit.` : ''}
        confirmLabel="Bloquer"
      />
    </AdminPage>
  );
}
