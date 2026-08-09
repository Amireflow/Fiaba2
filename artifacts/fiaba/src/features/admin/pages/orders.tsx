import { useState, useEffect } from 'react';
import { CheckmarkCircle02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  adminInputClass,
} from '../components/admin-ui';

type OrderRow = {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  merchant_amount: number;
  status: string;
  zone_name: string | null;
  payment_method: string | null;
  created_at: string;
  seller_id: string | null;
  merchant_id: string;
};

type MerchantName = { id: string; name: string };
type SellerName = { id: string; display_name: string };

const statusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'violet'> = {
  livree: 'mint',
  a_preparer: 'amber',
  en_livraison: 'violet',
  annulee: 'rose',
};

const statusLabelMap: Record<string, string> = {
  livree: 'Livrée',
  a_preparer: 'À préparer',
  en_livraison: 'En livraison',
  annulee: 'Annulée',
};

const paymentLabel: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  cash: 'À la livraison',
  card: 'Carte',
};

const allStatuses = ['Tous', 'a_preparer', 'en_livraison', 'livree', 'annulee'] as const;

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [sellerNames, setSellerNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [selected, setSelected] = useState<OrderRow | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, commission_amount, merchant_amount, status, zone_name, payment_method, created_at, seller_id, merchant_id')
        .order('created_at', { ascending: false })
        .limit(100);
      const rows = (orderData as OrderRow[] | null) ?? [];
      setOrders(rows);

      // Fetch merchant names
      const merchantIds = [...new Set(rows.map((r) => r.merchant_id))];
      if (merchantIds.length > 0) {
        const { data: mNames } = await supabase.from('merchants').select('id, name').in('id', merchantIds);
        const mMap = new Map<string, string>(((mNames as MerchantName[] | null) ?? []).map((m) => [m.id, m.name]));
        setMerchantNames(mMap);
      }

      // Fetch seller names
      const sellerIds = [...new Set(rows.filter((r) => r.seller_id).map((r) => r.seller_id!))];
      if (sellerIds.length > 0) {
        const { data: sNames } = await supabase.from('sellers').select('id, display_name').in('id', sellerIds);
        const sMap = new Map<string, string>(((sNames as SellerName[] | null) ?? []).map((s) => [s.id, s.display_name]));
        setSellerNames(sMap);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'Tous' || o.status === statusFilter;
    const q = query.trim().toLowerCase();
    const merchantName = merchantNames.get(o.merchant_id)?.toLowerCase() ?? '';
    const sellerName = o.seller_id ? (sellerNames.get(o.seller_id)?.toLowerCase() ?? '') : '';
    const matchesQuery = q === '' || o.id.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || sellerName.includes(q) || merchantName.includes(q);
    return matchesStatus && matchesQuery;
  });

  const selectedOrder = selected ? orders.find((o) => o.id === selected.id) ?? selected : null;
  const gmv = orders.reduce((sum, o) => sum + (o.status === 'annulee' ? 0 : o.total_amount), 0);
  const delivered = orders.filter((o) => o.status === 'livree').length;
  const disputes = 0; // Would need to join with disputes table

  return (
    <AdminPage
      eyebrow="Commandes et statuts"
      title="Toutes les commandes"
      description="Suivez les commandes de la plateforme. Le détail reste accessible par commande."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">GMV (hors annulées)</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(gmv)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Livrées</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{delivered}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total commandes</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{orders.length}</p></Card>
      </div>

      {/* Search + filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par n° commande, client, vendeur…" className={`${adminInputClass} pl-10`} data-testid="input-admin-orders-search" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {allStatuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === s ? 'bg-[#292541] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-order-${s}`}>{s === 'Tous' ? 'Tous' : statusLabelMap[s] ?? s}</button>
        ))}
      </div>

      {/* Orders table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState glyph={CheckmarkCircle02Icon} title="Aucune commande" description="Aucune commande ne correspond à vos filtres." />
        ) : (
          <AdminScrollTable minWidth={820} testId="scroll-admin-orders">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Commande</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Vendeur</th>
                  <th className="px-5 py-3">Marchand</th>
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-5 py-3">Paiement</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((o) => {
                  const shortId = `CMD-${o.id.slice(-6).toUpperCase()}`;
                  return (
                    <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer transition hover:bg-[#faf9fd]" data-testid={`row-order-${o.id}`}>
                      <td className="px-5 py-4"><span className="font-bold text-[#292541]">{shortId}</span><p className="mt-0.5 text-[11px] text-[#9290a2]">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></td>
                      <td className="px-5 py-4 text-[#77738a]">{o.customer_name}</td>
                      <td className="px-5 py-4 text-[#77738a]">{o.seller_id ? (sellerNames.get(o.seller_id) ?? '—') : '—'}</td>
                      <td className="px-5 py-4 text-[#77738a]">{merchantNames.get(o.merchant_id) ?? '—'}</td>
                      <td className="px-5 py-4"><AdminBadge tone="slate">{o.zone_name ?? '—'}</AdminBadge></td>
                      <td className="px-5 py-4 text-[#77738a]">{o.payment_method ? (paymentLabel[o.payment_method] ?? o.payment_method) : '—'}</td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(o.total_amount)}</td>
                      <td className="px-5 py-4"><AdminBadge tone={statusToneMap[o.status] ?? 'amber'}>{statusLabelMap[o.status] ?? o.status}</AdminBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      {/* Detail drawer */}
      <AdminDrawer
        open={!!selectedOrder}
        onClose={() => setSelected(null)}
        title={selectedOrder ? `CMD-${selectedOrder.id.slice(-6).toUpperCase()}` : ''}
        subtitle={selectedOrder ? `${new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')} · ${selectedOrder.payment_method ? (paymentLabel[selectedOrder.payment_method] ?? selectedOrder.payment_method) : '—'}` : ''}
        testId="drawer-order-detail"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AdminBadge tone={statusToneMap[selectedOrder.status] ?? 'amber'}>{statusLabelMap[selectedOrder.status] ?? selectedOrder.status}</AdminBadge>
              <span className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(selectedOrder.total_amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.customer_name}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeur</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.seller_id ? (sellerNames.get(selectedOrder.seller_id) ?? '—') : '—'}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Marchand</p><p className="mt-1 text-sm font-bold text-[#292541]">{merchantNames.get(selectedOrder.merchant_id) ?? '—'}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Zone (figée)</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.zone_name ?? '—'}</p></div>
            </div>
            <div className="rounded-xl p-4">
              <p className="text-xs font-bold text-[#292541]">Snapshot financier (immuable)</p>
              <div className="mt-3 space-y-2 text-xs text-[#77738a]">
                <div className="flex justify-between"><span>Prix client</span><span className="font-bold text-[#292541]">{money(selectedOrder.total_amount)}</span></div>
                <div className="flex justify-between"><span>Commission vendeur</span><span className="font-bold text-[#292541]">{money(selectedOrder.commission_amount)}</span></div>
                <div className="flex justify-between"><span>Net marchand</span><span className="font-bold text-[#292541]">{money(selectedOrder.merchant_amount)}</span></div>
                <div className="flex justify-between"><span>Mode de paiement</span><span className="font-bold text-[#292541]">{selectedOrder.payment_method ? (paymentLabel[selectedOrder.payment_method] ?? selectedOrder.payment_method) : '—'}</span></div>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminPage>
  );
}
