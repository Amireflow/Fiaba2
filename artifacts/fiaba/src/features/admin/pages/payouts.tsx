import { useState, useEffect } from 'react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
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
} from '../components/admin-ui';

type PayoutRow = {
  id: string;
  seller_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number | null;
  account_type: string;
  status: string;
  created_at: string;
};

type SellerName = { id: string; display_name: string };

const statusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'violet'> = {
  requested: 'amber',
  processing: 'violet',
  paid: 'mint',
  refused: 'rose',
};

const statusLabelMap: Record<string, string> = {
  requested: 'Demandée',
  processing: 'En traitement',
  paid: 'Versée',
  refused: 'Refusée',
};

const filters = ['Tous', 'requested', 'processing', 'paid', 'refused'] as const;

const accountLabel: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  bank: 'Banque',
  cash: 'Espèces',
};

export function AdminPayouts() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [sellerNames, setSellerNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Tous');
  const [selected, setSelected] = useState<PayoutRow | null>(null);
  const [toProcess, setToProcess] = useState<{ payout: PayoutRow; action: 'paid' | 'refused' } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: payData } = await supabase
        .from('payouts')
        .select('id, seller_id, amount, fee_amount, net_amount, account_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      const rows = (payData as PayoutRow[] | null) ?? [];
      setPayouts(rows);

      const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
      if (sellerIds.length > 0) {
        const { data: sNames } = await supabase.from('sellers').select('id, display_name').in('id', sellerIds);
        setSellerNames(new Map<string, string>(((sNames as SellerName[] | null) ?? []).map((s) => [s.id, s.display_name])));
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = payouts.filter((p) => filter === 'Tous' || p.status === filter);

  async function confirmProcess() {
    if (!toProcess) return;
    const { payout, action } = toProcess;
    haptic('medium');
    setProcessing(true);

    const updateData: Record<string, unknown> = { status: action };
    if (action === 'paid') updateData.processed_at = new Date().toISOString();

    const { error } = await (supabase.from('payouts') as any).update(updateData).eq('id', payout.id);

    setProcessing(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      setPayouts((prev) => prev.map((p) => (p.id === payout.id ? { ...p, status: action } : p)));
      setSelected({ ...payout, status: action });
      toast({ title: `Retrait ${statusLabelMap[action].toLowerCase()}`, description: `${sellerNames.get(payout.seller_id) ?? 'Vendeur'} · ${money(payout.amount)}. Journal d'audit mis à jour.` });
    }
    setToProcess(null);
  }

  const selectedPayout = selected ? payouts.find((p) => p.id === selected.id) ?? selected : null;
  const requested = payouts.filter((p) => p.status === 'requested').reduce((sum, p) => sum + p.amount, 0);
  const processingTotal = payouts.filter((p) => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0);
  const paid = payouts.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <AdminPage
      eyebrow="Retraits"
      title="Demandes de paiement"
      description="Traitez les retraits vendeurs. Chaque retrait a un statut et un historique tracé."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Demandées</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{money(requested)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En traitement</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#5b49e8]">{money(processingTotal)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Versés</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{money(paid)}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-payout-${f}`}>{f === 'Tous' ? 'Tous' : statusLabelMap[f] ?? f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
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
                    <td className="px-5 py-4 text-[11px] text-[#9290a2]">{p.id.slice(-8)}</td>
                    <td className="px-5 py-4 font-bold text-[#292541]">{sellerNames.get(p.seller_id) ?? '—'}</td>
                    <td className="px-5 py-4 text-[#77738a]">{accountLabel[p.account_type] ?? p.account_type}</td>
                    <td className="px-5 py-4 text-[#77738a]">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(p.amount)}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusToneMap[p.status] ?? 'amber'}>{statusLabelMap[p.status] ?? p.status}</AdminBadge></td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {(p.status === 'requested' || p.status === 'processing') && (
                        <Button variant="soft" onClick={() => setToProcess({ payout: p, action: 'paid' })} testId={`button-process-${p.id}`}>Traiter</Button>
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
        title={selectedPayout ? `Retrait · ${sellerNames.get(selectedPayout.seller_id) ?? 'Vendeur'}` : ''}
        subtitle={selectedPayout ? new Date(selectedPayout.created_at).toLocaleDateString('fr-FR') : ''}
        testId="drawer-payout-detail"
        footer={
          selectedPayout && (selectedPayout.status === 'requested' || selectedPayout.status === 'processing') ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" onClick={() => setToProcess({ payout: selectedPayout, action: 'refused' })} testId="button-drawer-refuse">Refuser</Button>
              <Button variant="success" onClick={() => setToProcess({ payout: selectedPayout, action: 'paid' })} testId="button-drawer-approve">Marquer versé</Button>
            </div>
          ) : undefined
        }
      >
        {selectedPayout && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AdminBadge tone={statusToneMap[selectedPayout.status] ?? 'amber'}>{statusLabelMap[selectedPayout.status] ?? selectedPayout.status}</AdminBadge>
              <span className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(selectedPayout.amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeur</p><p className="mt-1 text-sm font-bold text-[#292541]">{sellerNames.get(selectedPayout.seller_id) ?? '—'}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Compte destinataire</p><p className="mt-1 text-sm font-bold text-[#292541]">{accountLabel[selectedPayout.account_type] ?? selectedPayout.account_type}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Date demande</p><p className="mt-1 text-sm font-bold text-[#292541]">{new Date(selectedPayout.created_at).toLocaleDateString('fr-FR')}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Référence</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedPayout.id.slice(-8)}</p></div>
            </div>
            <div className="rounded-xl bg-[#f4f3f8] p-4 text-xs">
              <div className="flex justify-between"><span className="text-[#77738a]">Montant demandé</span><span className="font-bold text-[#292541]">{money(selectedPayout.amount)}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-[#77738a]">Frais</span><span className="font-bold text-[#292541]">{money(selectedPayout.fee_amount)}</span></div>
              <div className="mt-2 flex justify-between border-t border-[#e9e6f1] pt-2"><span className="font-bold text-[#292541]">Net versé</span><span className="font-[Space_Grotesk] font-bold text-[#5b49e8]">{money(selectedPayout.net_amount ?? selectedPayout.amount - selectedPayout.fee_amount)}</span></div>
            </div>
          </div>
        )}
      </AdminDrawer>

      <AdminConfirmDialog
        open={!!toProcess}
        onClose={() => setToProcess(null)}
        onConfirm={confirmProcess}
        title={toProcess?.action === 'paid' ? 'Marquer ce retrait comme versé ?' : 'Refuser ce retrait ?'}
        message={toProcess ? `${sellerNames.get(toProcess.payout.seller_id) ?? 'Vendeur'} · ${money(toProcess.payout.amount)} sur ${accountLabel[toProcess.payout.account_type] ?? toProcess.payout.account_type}.` : ''}
        confirmLabel={toProcess?.action === 'paid' ? 'Confirmer le versement' : 'Refuser'}
        tone={toProcess?.action === 'paid' ? 'primary' : 'danger'}
      />
    </AdminPage>
  );
}
