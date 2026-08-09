import { useState } from 'react';
import { Link } from 'wouter';
import { CheckmarkCircle02Icon, Cancel01Icon, Clock01Icon, DeliveryTruck01Icon, Search01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerEmptyState,
  SellerPage as Page,
  SellerScrollTable,
  sellerInputClass,
  sellerSelectClass,
} from '../components/seller-ui';
import { seedSellerOrders } from '@/config/seller-seeds';
import type { SellerOrder, SellerOrderStatus } from '@/types/entities';

const statuses: SellerOrderStatus[] = ['En cours', 'Livré', 'Payé', 'Annulé'];
const filters = ['Tous', ...statuses] as const;

const toneFor = (s: SellerOrderStatus): 'amber' | 'violet' | 'mint' | 'rose' => {
  switch (s) {
    case 'Payé': return 'mint';
    case 'Livré': return 'violet';
    case 'Annulé': return 'rose';
    default: return 'amber';
  }
};

const glyphFor = (s: SellerOrderStatus) => {
  switch (s) {
    case 'Payé': return CheckmarkCircle02Icon;
    case 'Livré': return DeliveryTruck01Icon;
    case 'Annulé': return Cancel01Icon;
    default: return Clock01Icon;
  }
};

export function Sales() {
  const [orders, setOrders] = useState<SellerOrder[]>(() => read('seller-orders', seedSellerOrders));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Tous');

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === 'Tous' || o.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.product.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const statusCounts = statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  const totalCommission = orders.filter((o) => o.status === 'Payé').reduce((s, o) => s + o.commission, 0);

  return (
    <Page
      eyebrow="Vos résultats"
      title="Mes ventes"
      description="Chaque commande liée à vos liens. Suivez les statuts et vos commissions."
    >
      {/* Status summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statuses.map((s) => (
          <Card key={s} className="p-4">
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${toneFor(s) === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : toneFor(s) === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : toneFor(s) === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
                <Icon glyph={glyphFor(s)} size={16} />
              </span>
              <span className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">{statusCounts[s] ?? 0}</span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">{s}</p>
          </Card>
        ))}
      </div>

      {/* Commission summary */}
      <Card className="mt-4 bg-[#5745df] text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Commissions validées</p>
        <strong className="mt-3 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em]">{money(totalCommission).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small></strong>
        <p className="mt-2 text-xs text-[#d0caff]">Disponibles pour retrait dans votre espace Revenus.</p>
      </Card>

      {/* Search + filter */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une commande ou un client…" className={`${sellerInputClass} pl-10`} data-testid="input-seller-orders-search" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${sellerSelectClass} sm:w-auto`} data-testid="select-seller-orders-filter">
          {filters.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Orders table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <SellerEmptyState glyph={Search01Icon} title="Aucune vente trouvée" description="Modifiez votre recherche ou votre filtre pour voir d'autres commandes." />
        ) : (
          <SellerScrollTable minWidth={720} testId="scroll-seller-orders">
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_.8fr] gap-4 border-b border-[#e9e6f1] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">
              <span>Commande</span><span>Client</span><span>Produit</span><span>Commission</span><span className="text-right">Statut</span>
            </div>
            {filtered.map((o) => (
              <Link key={o.id} href={`/seller/sales/${o.id}`} className="grid w-full grid-cols-[1.5fr_1.5fr_1fr_1fr_.8fr] items-center gap-4 border-b border-[#f1eef7] px-5 py-4 text-left last:border-b-0 transition hover:bg-[#faf9fd]" data-testid={`view-seller-order-${o.id}`}>
                <div className="min-w-0"><p className="truncate font-bold text-[#292541]">{o.id}</p><p className="text-xs text-[#9290a2]">{o.date}</p></div>
                <span className="truncate text-sm font-medium text-[#292541]">{o.customer}</span>
                <span className="truncate text-sm text-[#77738a]">{o.product}</span>
                <span className="font-[Space_Grotesk] font-bold text-[#278e69]">{money(o.commission)}</span>
                <div className="text-right"><SellerBadge tone={toneFor(o.status)}>{o.status}</SellerBadge></div>
              </Link>
            ))}
          </SellerScrollTable>
        )}
      </Card>
    </Page>
  );
}
