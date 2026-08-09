import { useState, useEffect } from 'react';
import { Shield01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
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

type FraudRow = {
  id: string;
  signal_type: string;
  target_user: string | null;
  detail: string | null;
  severity: string;
  status: string;
  created_at: string;
};

const statusToneMap: Record<string, 'rose' | 'violet' | 'slate' | 'amber'> = {
  new: 'amber',
  in_review: 'violet',
  blocked: 'rose',
  ignored: 'slate',
};

const statusLabelMap: Record<string, string> = {
  new: 'Nouveau',
  in_review: 'En revue',
  blocked: 'Bloqué',
  ignored: 'Ignoré',
};

const severityMap: Record<string, 'Critique' | 'Élevé' | 'Moyen'> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
};

const filters = ['Tous', 'new', 'in_review', 'blocked', 'ignored'] as const;

export function AdminFraud() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<FraudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Tous');
  const [selected, setSelected] = useState<FraudRow | null>(null);
  const [toBlock, setToBlock] = useState<FraudRow | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('fraud_signals')
        .select('id, signal_type, target_user, detail, severity, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setAlerts((data as FraudRow[] | null) ?? []);
      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = alerts.filter((a) => filter === 'Tous' || a.status === filter);

  async function setStatus(alert: FraudRow, status: string) {
    haptic('medium');
    setUpdating(true);
    const { error } = await (supabase.from('fraud_signals') as any)
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', alert.id);
    setUpdating(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, status } : a)));
      setSelected({ ...alert, status });
      toast({ title: `Signal ${statusLabelMap[status].toLowerCase()}`, description: `${alert.signal_type} · ${alert.detail ?? ''}. Journal d'audit mis à jour.` });
    }
  }

  async function confirmBlock() {
    if (!toBlock) return;
    haptic('error');
    setUpdating(true);
    const { error } = await (supabase.from('fraud_signals') as any)
      .update({ status: 'blocked', reviewed_at: new Date().toISOString() })
      .eq('id', toBlock.id);
    setUpdating(false);

    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      setAlerts((prev) => prev.map((a) => (a.id === toBlock.id ? { ...a, status: 'blocked' } : a)));
      setSelected({ ...toBlock, status: 'blocked' });
      toast({ title: 'Compte bloqué', description: `${toBlock.signal_type} bloqué. Le Trust Score est recalculé. Décision tracée.` });
    }
    setToBlock(null);
  }

  const selectedAlert = selected ? alerts.find((a) => a.id === selected.id) ?? selected : null;
  const fresh = alerts.filter((a) => a.status === 'new').length;
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const blocked = alerts.filter((a) => a.status === 'blocked').length;

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
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-fraud-${f}`}>{f === 'Tous' ? 'Tous' : statusLabelMap[f] ?? f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState glyph={Shield01Icon} title="Aucun signal" description="Aucun signal de fraude ne correspond à ce filtre." />
        ) : (
          <AdminScrollTable minWidth={720} testId="scroll-admin-fraud">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Signal</th>
                  <th className="px-5 py-3">Détail</th>
                  <th className="px-5 py-3">Sévérité</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((a) => (
                  <tr key={a.id} className="cursor-pointer transition hover:bg-[#faf9fd]" onClick={() => setSelected(a)} data-testid={`row-fraud-${a.id}`}>
                    <td className="px-5 py-4"><span className="font-bold text-[#292541]">{a.signal_type}</span></td>
                    <td className="px-5 py-4 text-[#77738a]">{a.detail ?? '—'}</td>
                    <td className="px-5 py-4"><SeverityBadge severity={severityMap[a.severity] ?? 'Moyen'} /></td>
                    <td className="px-5 py-4 text-[11px] text-[#9290a2]">{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusToneMap[a.status] ?? 'amber'}>{statusLabelMap[a.status] ?? a.status}</AdminBadge></td>
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
        title={selectedAlert?.signal_type ?? ''}
        subtitle={selectedAlert ? new Date(selectedAlert.created_at).toLocaleDateString('fr-FR') : ''}
        testId="drawer-fraud-detail"
        footer={
          selectedAlert && selectedAlert.status !== 'blocked' && selectedAlert.status !== 'ignored' ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setStatus(selectedAlert, 'ignored')} disabled={updating} testId="button-ignore-fraud">Ignorer</Button>
              <Button variant="danger" onClick={() => setToBlock(selectedAlert)} disabled={updating} testId="button-block-fraud">Bloquer le compte</Button>
            </div>
          ) : undefined
        }
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SeverityBadge severity={severityMap[selectedAlert.severity] ?? 'Moyen'} />
              <AdminBadge tone={statusToneMap[selectedAlert.status] ?? 'amber'}>{statusLabelMap[selectedAlert.status] ?? selectedAlert.status}</AdminBadge>
            </div>
            <div className="rounded-xl bg-[#fff0f1] p-4">
              <div className="flex items-center gap-2 text-[#c45667]">
                <Icon glyph={Shield01Icon} size={16} />
                <p className="text-xs font-bold">{selectedAlert.signal_type}</p>
              </div>
              <p className="mt-2 text-sm text-[#292541]">{selectedAlert.detail ?? '—'}</p>
              <p className="mt-2 text-[11px] text-[#9290a2]">Date : {new Date(selectedAlert.created_at).toLocaleDateString('fr-FR')}</p>
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
        message={toBlock ? `${toBlock.signal_type} sera suspendu. Le Trust Score sera recalculé et la décision tracée dans le journal d'audit.` : ''}
        confirmLabel="Bloquer"
      />
    </AdminPage>
  );
}
