import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { CheckmarkCircle02Icon, Cancel01Icon, Clock01Icon, DeliveryTruck01Icon, Search01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
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

type SellerOrderRow = {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  status: string;
  product_name: string | null;
  quantity: number | null;
  created_at: string;
};

type StatusFilter = 'Tous' | 'a_preparer' | 'en_livraison' | 'livree' | 'annulee';

const statusMap: Record<string, { label: string; tone: 'amber' | 'violet' | 'mint' | 'rose'; glyph: typeof Store01Icon }> = {
  a_preparer: { label: 'En cours', tone: 'amber', glyph: Clock01Icon },
  en_livraison: { label: 'En cours', tone: 'amber', glyph: Clock01Icon },
  livree: { label: 'Livré', tone: 'violet', glyph: DeliveryTruck01Icon },
  annulee: { label: 'Annulé', tone: 'rose', glyph: Cancel01Icon },
};

// Commission status for "Payé" badge
const commissionStatusMap: Record<string, string> = {
  pending: 'En cours',
  available: 'Livré',
  paid: 'Payé',
  reversed: 'Annulé',
};

const filters: StatusFilter[] = ['Tous', 'a_preparer', 'en_livraison', 'livree', 'annulee'];

export function Sales() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [commissionStatuses, setCommissionStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('Tous');

  useEffect(() => {
    async function loadOrders() {
      if (!profile) {
        setLoading(false);
        return;
      }

      // Get seller
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      const sId = (seller as { id: string } | null)?.id;
      if (!sId) {
        setLoading(false);
        return;
      }

      // Fetch orders attributed to this seller
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, commission_amount, status, created_at')
        .eq('seller_id', sId)
        .order('created_at', { ascending: false });

      const orderRows = (orderData as Omit<SellerOrderRow, 'product_name' | 'quantity'>[] | null) ?? [];
      if (orderRows.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch order items
      const orderIds = orderRows.map((o) => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_name, quantity')
        .in('order_id', orderIds);
      const itemMap = new Map<string, { product_name: string; quantity: number }>(
        ((items as { order_id: string; product_name: string; quantity: number }[] | null) ?? [])
          .map((i) => [i.order_id, { product_name: i.product_name, quantity: i.quantity }])
      );

      // Fetch commissions for status
      const { data: commissions } = await supabase
        .from('commissions')
        .select('order_id, status')
        .eq('seller_id', sId);
      const commMap = new Map<string, string>(
        ((commissions as { order_id: string; status: string }[] | null) ?? [])
          .map((c) => [c.order_id, c.status])
      );
      setCommissionStatuses(Object.fromEntries(commMap));

      setOrders(orderRows.map((o) => ({
        ...o,
        product_name: itemMap.get(o.id)?.product_name ?? null,
        quantity: itemMap.get(o.id)?.quantity ?? null,
      })));
      setLoading(false);
    }
    loadOrders();
  }, [profile]);

  // Determine display status: use commission status if available, else order status
  function displayStatus(o: SellerOrderRow): string {
    const commStatus = commissionStatuses[o.id];
    if (commStatus) {
      return commissionStatusMap[commStatus] ?? 'En cours';
    }
    return statusMap[o.status]?.label ?? 'En cours';
  }

  function displayTone(o: SellerOrderRow): 'amber' | 'violet' | 'mint' | 'rose' {
    const commStatus = commissionStatuses[o.id];
    if (commStatus === 'paid') return 'mint';
    if (commStatus === 'reversed') return 'rose';
    if (o.status === 'livree') return 'violet';
    if (o.status === 'annulee') return 'rose';
    return 'amber';
  }

  function displayGlyph(o: SellerOrderRow): typeof Store01Icon {
    const commStatus = commissionStatuses[o.id];
    if (commStatus === 'paid') return CheckmarkCircle02Icon;
    if (commStatus === 'reversed' || o.status === 'annulee') return Cancel01Icon;
    if (o.status === 'livree') return DeliveryTruck01Icon;
    return Clock01Icon;
  }

  const filtered = orders.filter((o) => {
    const ds = displayStatus(o);
    const matchesFilter = filter === 'Tous' ||
      (filter === 'a_preparer' && o.status === 'a_preparer') ||
      (filter === 'en_livraison' && o.status === 'en_livraison') ||
      (filter === 'livree' && (o.status === 'livree' || commissionStatuses[o.id] === 'paid')) ||
      (filter === 'annulee' && (o.status === 'annulee' || commissionStatuses[o.id] === 'reversed'));
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || o.id.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || (o.product_name?.toLowerCase().includes(q) ?? false);
    return matchesFilter && matchesQuery;
  });

  const statusCounts = filters.slice(1).reduce<Record<string, number>>((acc, s) => {
    if (s === 'livree') {
      acc[s] = orders.filter((o) => o.status === 'livree' || commissionStatuses[o.id] === 'paid').length;
    } else if (s === 'annulee') {
      acc[s] = orders.filter((o) => o.status === 'annulee' || commissionStatuses[o.id] === 'reversed').length;
    } else {
      acc[s] = orders.filter((o) => o.status === s).length;
    }
    return acc;
  }, {});

  const totalCommission = orders
    .filter((o) => commissionStatuses[o.id] === 'paid')
    .reduce((s, o) => s + o.commission_amount, 0);

  return (
    <Page
      eyebrow="Vos résultats"
      title="Mes ventes"
      description="Chaque commande liée à vos liens. Suivez les statuts et vos commissions."
    >
      {/* Status summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {filters.slice(1).map((s) => {
          const cfg = statusMap[s];
          const label = s === 'livree' ? 'Livré' : s === 'annulee' ? 'Annulé' : 'En cours';
          return (
            <Card key={s} className="p-4">
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${cfg.tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : cfg.tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : cfg.tone === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
                  <Icon glyph={cfg.glyph} size={16} />
                </span>
                <span className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">{statusCounts[s] ?? 0}</span>
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">{label}</p>
            </Card>
          );
        })}
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
        <select value={filter} onChange={(e) => { haptic('light'); setFilter(e.target.value as StatusFilter); }} className={`${sellerSelectClass} sm:w-auto`} data-testid="select-seller-orders-filter">
          {filters.map((f) => <option key={f} value={f}>{f === 'Tous' ? 'Tous' : f === 'livree' ? 'Livré' : f === 'annulee' ? 'Annulé' : 'En cours'}</option>)}
        </select>
      </div>

      {/* Orders table */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <SellerEmptyState glyph={Search01Icon} title="Aucune vente trouvée" description="Modifiez votre recherche ou votre filtre pour voir d'autres commandes." />
        ) : (
          <SellerScrollTable minWidth={720} testId="scroll-seller-orders">
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_.8fr] gap-4 border-b border-[#e9e6f1] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">
              <span>Commande</span><span>Client</span><span>Produit</span><span>Commission</span><span className="text-right">Statut</span>
            </div>
            {filtered.map((o) => {
              const shortId = `CMD-${o.id.slice(-6).toUpperCase()}`;
              const ds = displayStatus(o);
              return (
                <Link key={o.id} href={`/seller/sales/${o.id}`} className="grid w-full grid-cols-[1.5fr_1.5fr_1fr_1fr_.8fr] items-center gap-4 border-b border-[#f1eef7] px-5 py-4 text-left last:border-b-0 transition hover:bg-[#faf9fd]" data-testid={`view-seller-order-${o.id}`}>
                  <div className="min-w-0"><p className="truncate font-bold text-[#292541]">{shortId}</p><p className="text-xs text-[#9290a2]">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p></div>
                  <span className="truncate text-sm font-medium text-[#292541]">{o.customer_name}</span>
                  <span className="truncate text-sm text-[#77738a]">{o.product_name ?? '—'}</span>
                  <span className="font-[Space_Grotesk] font-bold text-[#278e69]">{money(o.commission_amount)}</span>
                  <div className="text-right"><SellerBadge tone={displayTone(o)}>{ds}</SellerBadge></div>
                </Link>
              );
            })}
          </SellerScrollTable>
        )}
      </Card>
    </Page>
  );
}
