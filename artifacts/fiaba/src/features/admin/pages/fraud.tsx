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

type CampaignReportRow = {
  id: string;
  campaign_id: string | null;
  merchant_id: string | null;
  seller_id: string | null;
  seller_code: string | null;
  reason: string;
  details: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  status: string;
  created_at: string;
  campaigns: { name: string } | null;
  merchants: { name: string } | null;
  sellers: { display_name: string } | null;
};

const statusToneMap: Record<string, 'rose' | 'violet' | 'slate' | 'amber'> = {
  new: 'amber',
  in_review: 'violet',
  blocked: 'rose',
  ignored: 'slate',
  pending: 'amber',
  resolved: 'violet',
};

const statusLabelMap: Record<string, string> = {
  new: 'Nouveau',
  in_review: 'En revue',
  blocked: 'Bloqué',
  ignored: 'Ignoré',
  pending: 'En attente',
  resolved: 'Résolu',
};

const severityMap: Record<string, 'Critique' | 'Élevé' | 'Moyen'> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
};

const filters = ['Tous', 'Checkout Reports', 'new', 'in_review', 'blocked', 'ignored'] as const;

export function AdminFraud() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<FraudRow[]>([]);
  const [reports, setReports] = useState<CampaignReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Tous');
  const [selectedAlert, setSelectedAlert] = useState<FraudRow | null>(null);
  const [selectedReport, setSelectedReport] = useState<CampaignReportRow | null>(null);
  const [toBlock, setToBlock] = useState<FraudRow | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: fraudData } = await supabase
        .from('fraud_signals')
        .select('id, signal_type, target_user, detail, severity, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setAlerts((fraudData as FraudRow[] | null) ?? []);

      const { data: reportData } = await supabase
        .from('campaign_reports')
        .select('id, campaign_id, merchant_id, seller_id, seller_code, reason, details, reporter_name, reporter_phone, status, created_at, campaigns:campaign_id (name), merchants:merchant_id (name), sellers:seller_id (display_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      setReports((reportData as CampaignReportRow[] | null) ?? []);

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
      setSelectedAlert({ ...alert, status });
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
      setSelectedAlert({ ...toBlock, status: 'blocked' });
      toast({ title: 'Compte bloqué', description: `${toBlock.signal_type} bloqué. Le Trust Score est recalculé. Décision tracée.` });
    }
    setToBlock(null);
  }

  const fresh = alerts.filter((a) => a.status === 'new').length;
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const reportsCount = reports.length;

  async function resolveReport(report: CampaignReportRow) {
    haptic('medium');
    setUpdating(true);
    const { error } = await (supabase.from('campaign_reports') as any)
      .update({ status: 'resolved' })
      .eq('id', report.id);
    setUpdating(false);

    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'resolved' } : r)));
      setSelectedReport(null);
      toast({ title: 'Signalement classé', description: `Signalement #${report.id.slice(-6)} classé comme vérifié.` });
    }
  }

  return (
    <AdminPage
      eyebrow="Fraude & règles de risque"
      title="Centre de risque & Signalements"
      description="Revue administrative des signaux de fraude et des signalements déposés par les clients au checkout."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Signalements Checkout</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{reportsCount}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Nouveaux signaux</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{fresh}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Signaux critiques</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{critical}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Comptes bloqués</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{alerts.filter((a) => a.status === 'blocked').length}</p></Card>
      </div>

      {/* Section Dedicated Checkout Reports */}
      {reports.length > 0 && (
        <div className="mt-6">
          <h2 className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">Derniers signalements reçus du Checkout</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <div key={r.id} onClick={() => setSelectedReport(r)} className="cursor-pointer transition hover:scale-[1.01]">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <AdminBadge tone={r.status === 'resolved' ? 'mint' : 'rose'}>{r.status === 'resolved' ? 'Résolu' : 'En attente'}</AdminBadge>
                    <span className="text-[10px] text-[#9290a2]">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <h3 className="mt-2 font-[Space_Grotesk] text-sm font-bold text-[#292541] line-clamp-1">{r.reason}</h3>
                  <p className="mt-1 text-xs text-[#77738a] truncate">Boutique: <strong className="text-[#292541]">{r.merchants?.name ?? '—'}</strong></p>
                  <p className="text-xs text-[#77738a] truncate">Campagne: <strong className="text-[#292541]">{r.campaigns?.name ?? '—'}</strong></p>
                  <div className="mt-3 border-t border-[#f1eef7] pt-2 flex items-center justify-between text-[11px] text-[#5b49e8] font-bold">
                    <span>Client : {r.reporter_name ?? 'Anonyme'}</span>
                    <span>Voir détails →</span>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-fraud-${f}`}>{f === 'Tous' ? 'Tous les signaux' : statusLabelMap[f] ?? f}</button>
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
                  <tr key={a.id} className="cursor-pointer transition hover:bg-[#faf9fd]" onClick={() => setSelectedAlert(a)} data-testid={`row-fraud-${a.id}`}>
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

      {/* Detail drawer for Fraud Alerts */}
      <AdminDrawer
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
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
          </div>
        )}
      </AdminDrawer>

      {/* Detail drawer for Checkout Reports */}
      <AdminDrawer
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Détail du Signalement Checkout"
        subtitle={selectedReport ? new Date(selectedReport.created_at).toLocaleString('fr-FR') : ''}
        testId="drawer-report-detail"
        footer={
          selectedReport && selectedReport.status !== 'resolved' ? (
            <div className="flex justify-end gap-2">
              <Button variant="primary" onClick={() => resolveReport(selectedReport)} disabled={updating}>Classer comme traité</Button>
            </div>
          ) : undefined
        }
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#fff0f1] p-4 border border-[#fcd4d8]">
              <div className="flex items-center gap-2 text-[#c45667]">
                <Icon glyph={Shield01Icon} size={18} />
                <p className="text-sm font-bold">{selectedReport.reason}</p>
              </div>
              {selectedReport.details && <p className="mt-2 text-xs leading-relaxed text-[#292541] bg-white p-3 rounded-xl border border-[#fce3e6]">{selectedReport.details}</p>}
            </div>

            <div className="rounded-2xl bg-[#f8f7fc] p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Parties concernées</p>
              
              <div className="flex justify-between text-xs border-b border-[#e9e6f1] pb-2">
                <span className="text-[#77738a]">Boutique</span>
                <span className="font-bold text-[#292541]">{selectedReport.merchants?.name ?? '—'} <span className="text-[10px] text-[#9290a2]">({selectedReport.merchant_id?.slice(0, 8)})</span></span>
              </div>

              <div className="flex justify-between text-xs border-b border-[#e9e6f1] pb-2">
                <span className="text-[#77738a]">Campagne</span>
                <span className="font-bold text-[#292541]">{selectedReport.campaigns?.name ?? '—'} <span className="text-[10px] text-[#9290a2]">({selectedReport.campaign_id?.slice(0, 8)})</span></span>
              </div>

              <div className="flex justify-between text-xs border-b border-[#e9e6f1] pb-2">
                <span className="text-[#77738a]">Vendeur / Ambassadeur</span>
                <span className="font-bold text-[#5b49e8]">
                  {selectedReport.sellers?.display_name ?? (selectedReport.seller_code ? `@${selectedReport.seller_code.replace(/^@/, '')}` : 'Vente directe (sans vendeur)')}
                </span>
              </div>

              <div className="flex justify-between text-xs border-b border-[#e9e6f1] pb-2">
                <span className="text-[#77738a]">Client Signalant</span>
                <span className="font-bold text-[#292541]">{selectedReport.reporter_name ?? 'Client Anonyme'}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-[#77738a]">Téléphone Client</span>
                <span className="font-bold text-[#5b49e8]">{selectedReport.reporter_phone ?? 'Non renseigné'}</span>
              </div>
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
