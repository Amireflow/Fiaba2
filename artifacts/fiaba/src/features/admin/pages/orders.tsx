import { useState } from 'react';
import { CheckmarkCircle02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import {
  AdminBadge,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  adminInputClass,
} from '../components/admin-ui';
import { seedAdminOrders } from '@/config/admin-seeds';
import type { AdminOrder, AdminOrderStatus } from '@/types/entities';

const statusTone = (s: AdminOrderStatus) => (s === 'Payée' ? 'mint' : s === 'Livrée' || s === 'Confirmée' ? 'violet' : s === 'En livraison' || s === 'Créée' ? 'amber' : 'rose');

const allStatuses = ['Tous', 'Créée', 'Confirmée', 'En livraison', 'Livrée', 'Payée', 'Annulée', 'Refusée', 'Litige'] as const;

export function AdminOrders() {
  const [orders] = useState<AdminOrder[]>(seedAdminOrders);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'Tous' || o.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.seller.toLowerCase().includes(q) || o.merchant.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const selectedOrder = selected ? orders.find((o) => o.id === selected.id) ?? selected : null;
  const gmv = orders.reduce((sum, o) => sum + (o.status === 'Annulée' || o.status === 'Refusée' ? 0 : o.amount), 0);
  const delivered = orders.filter((o) => o.status === 'Livrée' || o.status === 'Payée').length;
  const disputes = orders.filter((o) => o.status === 'Litige').length;

  return (
    <AdminPage
      eyebrow="Commandes et statuts"
      title="Toutes les commandes"
      description="Suivez les 15 statuts techniques regroupés en états lisibles. Le détail reste accessible par commande."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">GMV (hors annulées)</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(gmv)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Livrées / payées</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{delivered}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En litige</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{disputes}</p></Card>
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
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === s ? 'bg-[#292541] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-order-${s}`}>{s}</button>
        ))}
      </div>

      {/* Orders table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
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
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer transition hover:bg-[#faf9fd]" data-testid={`row-order-${o.id}`}>
                    <td className="px-5 py-4"><span className="font-bold text-[#292541]">{o.id}</span><p className="mt-0.5 text-[11px] text-[#9290a2]">{o.date}</p></td>
                    <td className="px-5 py-4 text-[#77738a]">{o.customer}</td>
                    <td className="px-5 py-4 text-[#77738a]">{o.seller}</td>
                    <td className="px-5 py-4 text-[#77738a]">{o.merchant}</td>
                    <td className="px-5 py-4"><AdminBadge tone="slate">{o.zone}</AdminBadge></td>
                    <td className="px-5 py-4 text-[#77738a]">{o.paymentMethod}</td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(o.amount)}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusTone(o.status)}>{o.status}</AdminBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>

      {/* Detail drawer */}
      <AdminDrawer
        open={!!selectedOrder}
        onClose={() => setSelected(null)}
        title={selectedOrder?.id ?? ''}
        subtitle={selectedOrder ? `${selectedOrder.date} · ${selectedOrder.paymentMethod}` : ''}
        testId="drawer-order-detail"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AdminBadge tone={statusTone(selectedOrder.status)}>{selectedOrder.status}</AdminBadge>
              <span className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(selectedOrder.amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.customer}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeur</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.seller}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Marchand</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.merchant}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Zone (figée)</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedOrder.zone}</p></div>
            </div>
            <div className="rounded-xl p-4">
              <p className="text-xs font-bold text-[#292541]">Snapshot financier (immuable)</p>
              <div className="mt-3 space-y-2 text-xs text-[#77738a]">
                <div className="flex justify-between"><span>Prix client</span><span className="font-bold text-[#292541]">{money(selectedOrder.amount)}</span></div>
                <div className="flex justify-between"><span>Mode de paiement</span><span className="font-bold text-[#292541]">{selectedOrder.paymentMethod}</span></div>
                <div className="flex justify-between"><span>Statut logistique</span><span className="font-bold text-[#292541]">{selectedOrder.status}</span></div>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminPage>
  );
}
