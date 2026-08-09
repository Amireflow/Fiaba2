import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowDown01Icon, CheckmarkCircle02Icon, Search01Icon, Store01Icon, DeliveryTruck01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Badge,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ScrollTable,
  inputClass,
  selectClass,
} from '../components/merchant-ui';
import { seedOrders } from '@/config/seeds';
import type { Order, OrderStatus } from '@/types/entities';

const statuses: OrderStatus[] = ['À préparer', 'En livraison', 'Livrée', 'Annulée'];
const filters = ['Tous', ...statuses] as const;

const toneFor = (status: OrderStatus): 'mint' | 'amber' | 'rose' | 'violet' => {
  switch (status) {
    case 'Livrée': return 'mint';
    case 'À préparer': return 'amber';
    case 'Annulée': return 'rose';
    default: return 'violet';
  }
};

const statusGlyph = (status: OrderStatus) => {
  switch (status) {
    case 'Livrée': return CheckmarkCircle02Icon;
    case 'En livraison': return DeliveryTruck01Icon;
    case 'Annulée': return Cancel01Icon;
    default: return Store01Icon;
  }
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>(() => read('orders', seedOrders));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Tous');

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === 'Tous' || o.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const statusCounts = statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <Page
      eyebrow="Le quotidien, bien rangé"
      title="Commandes"
      description="Suivez chaque vente, de la confirmation à la livraison à Dakar et partout au Sénégal."
    >
      {/* Status summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statuses.map((s) => (
          <Card key={s} className="p-4">
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${toneFor(s) === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : toneFor(s) === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : toneFor(s) === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
                <Icon glyph={statusGlyph(s)} size={16} />
              </span>
              <span className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">{statusCounts[s] ?? 0}</span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">{s}</p>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une commande ou un client"
            className={`${inputClass} pl-10`}
            data-testid="input-search"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${selectClass} sm:w-auto`} data-testid="select-filter">
          {filters.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Orders list */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <EmptyState glyph={Search01Icon} title="Aucune commande trouvée" description="Modifiez votre recherche ou votre filtre pour voir d'autres commandes." />
        ) : (
          <ScrollTable minWidth={760} testId="scroll-orders">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_.8fr] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">
              <span>Commande</span><span>Client</span><span>Montant</span><span>Statut</span><span className="text-right">Détail</span>
            </div>
            {filtered.map((o) => (
              <div key={o.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_.8fr] items-center gap-4 border-b border-[#f1eef7] px-5 py-4 last:border-b-0 transition hover:bg-[#faf9fd]">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0eff5] text-[#67627b]"><Icon glyph={Store01Icon} size={18} /></span>
                  <div className="min-w-0"><p className="truncate font-bold text-[#292541]">{o.id}</p><p className="text-xs text-[#9290a2]">{o.date}</p></div>
                </div>
                <span className="truncate text-sm font-medium text-[#292541]">{o.customer}</span>
                <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(o.amount)}</span>
                <Badge tone={toneFor(o.status)}>{o.status}</Badge>
                <div className="text-right">
                  <Link href={`/merchant/orders/${o.id}`}><Button variant="ghost" testId={`view-${o.id}`}>Détail <Icon glyph={ArrowDown01Icon} size={13} /></Button></Link>
                </div>
              </div>
            ))}
          </ScrollTable>
        )}
      </Card>
    </Page>
  );
}
