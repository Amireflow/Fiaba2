import { useState, useEffect } from 'react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge,
  AdminCard as Card,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
} from '../components/admin-ui';

type CommissionRow = {
  id: string;
  order_id: string;
  seller_id: string;
  campaign_id: string | null;
  amount: number;
  status: string;
  model: string | null;
  created_at: string;
};

type SellerName = { id: string; display_name: string };
type MerchantName = { id: string; name: string };
type OrderMerchant = { id: string; merchant_id: string };

const statusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'violet'> = {
  pending: 'amber',
  available: 'mint',
  paid: 'violet',
  reversed: 'rose',
};

const statusLabelMap: Record<string, string> = {
  pending: 'En attente',
  available: 'Disponible',
  paid: 'Versée',
  reversed: 'Reprise',
};

const filters = ['Tous', 'pending', 'available', 'paid', 'reversed'] as const;

export function AdminCommissions() {
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [sellerNames, setSellerNames] = useState<Map<string, string>>(new Map());
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [ordMerchantMap, setOrdMerchantMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Tous');

  useEffect(() => {
    async function loadData() {
      const { data: commData } = await supabase
        .from('commissions')
        .select('id, order_id, seller_id, campaign_id, amount, status, model, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      const rows = (commData as CommissionRow[] | null) ?? [];
      setCommissions(rows);

      // Fetch seller names
      const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
      if (sellerIds.length > 0) {
        const { data: sNames } = await supabase.from('sellers').select('id, display_name').in('id', sellerIds);
        setSellerNames(new Map<string, string>(((sNames as SellerName[] | null) ?? []).map((s) => [s.id, s.display_name])));
      }

      // Fetch order → merchant mapping
      const orderIds = [...new Set(rows.map((r) => r.order_id))];
      if (orderIds.length > 0) {
        const { data: orders } = await supabase.from('orders').select('id, merchant_id').in('id', orderIds);
        const orderMap = new Map<string, string>(((orders as OrderMerchant[] | null) ?? []).map((o) => [o.id, o.merchant_id]));
        setOrdMerchantMap(orderMap);
        const merchantIds = [...new Set(orderMap.values())];
        if (merchantIds.length > 0) {
          const { data: mNames } = await supabase.from('merchants').select('id, name').in('id', merchantIds);
          const mMap = new Map<string, string>(((mNames as MerchantName[] | null) ?? []).map((m) => [m.id, m.name]));
          setMerchantNames(mMap);
        }
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = commissions.filter((c) => filter === 'Tous' || c.status === filter);

  const total = commissions.reduce((sum, c) => sum + (c.status === 'reversed' ? 0 : c.amount), 0);
  const pending = commissions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const available = commissions.filter((c) => c.status === 'available').reduce((sum, c) => sum + c.amount, 0);
  const reversed = commissions.filter((c) => c.status === 'reversed').reduce((sum, c) => sum + c.amount, 0);

  return (
    <AdminPage
      eyebrow="Commissions & marges"
      title="Registre financier"
      description="Chaque vente validée génère une écriture. Les reprises créent une écriture compensatoire traçable."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total généré</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(total)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En attente (sécurité)</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{money(pending)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Disponible</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{money(available)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Reprises</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{money(reversed)}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-commission-${f}`}>{f === 'Tous' ? 'Tous' : statusLabelMap[f] ?? f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState glyph={Wallet01Icon} title="Aucune écriture" description="Aucune commission ne correspond à ce filtre." />
        ) : (
          <AdminScrollTable minWidth={720} testId="scroll-admin-commissions">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Réf</th>
                  <th className="px-5 py-3">Commande</th>
                  <th className="px-5 py-3">Vendeur</th>
                  <th className="px-5 py-3">Marchand</th>
                  <th className="px-5 py-3">Modèle</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((c) => {
                  const merchantId = ordMerchantMap?.get(c.order_id);
                  return (
                    <tr key={c.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-commission-${c.id}`}>
                      <td className="px-5 py-4 text-[11px] text-[#9290a2]">{c.id.slice(-8)}</td>
                      <td className="px-5 py-4 font-bold text-[#292541]">CMD-{c.order_id.slice(-6).toUpperCase()}</td>
                      <td className="px-5 py-4 text-[#77738a]">{sellerNames.get(c.seller_id) ?? '—'}</td>
                      <td className="px-5 py-4 text-[#77738a]">{merchantId ? (merchantNames.get(merchantId) ?? '—') : '—'}</td>
                      <td className="px-5 py-4"><AdminBadge tone={c.model === 'marge' ? 'amber' : 'violet'}>{c.model === 'marge' ? 'Marge' : 'Commission'}</AdminBadge></td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(c.amount)}</td>
                      <td className="px-5 py-4"><AdminBadge tone={statusToneMap[c.status] ?? 'amber'}>{statusLabelMap[c.status] ?? c.status}</AdminBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>
    </AdminPage>
  );
}
