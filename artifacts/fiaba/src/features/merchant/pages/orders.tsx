import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowDown01Icon, CheckmarkCircle02Icon, Search01Icon, Store01Icon, DeliveryTruck01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { useMerchantId, useSupabaseQuery, supabaseUpdate } from '@/hooks/use-supabase-query';
import { supabase } from '@/lib/supabase';
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

type OrderRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  commission_amount: number;
  status: string;
  zone_name: string | null;
  delivery_fee: number;
  payment_method: string | null;
  created_at: string;
  seller_id: string | null;
  seller_code: string | null;
};

type StatusFilter = 'Tous' | 'a_preparer' | 'en_livraison' | 'livree' | 'annulee';

const statusMap: Record<string, { label: string; tone: 'mint' | 'amber' | 'rose' | 'violet'; glyph: typeof Store01Icon }> = {
  a_preparer: { label: 'À préparer', tone: 'amber', glyph: Store01Icon },
  en_livraison: { label: 'En livraison', tone: 'violet', glyph: DeliveryTruck01Icon },
  livree: { label: 'Livrée', tone: 'mint', glyph: CheckmarkCircle02Icon },
  annulee: { label: 'Annulée', tone: 'rose', glyph: Cancel01Icon },
};

const statusKeys = ['a_preparer', 'en_livraison', 'livree', 'annulee'] as const;
const filters: StatusFilter[] = ['Tous', ...statusKeys];

export function Orders() {
  const { merchantId } = useMerchantId();
  const { data: orders, loading, refetch } = useSupabaseQuery<OrderRow>('orders', {
    select: 'id, customer_name, customer_phone, total_amount, commission_amount, status, zone_name, delivery_fee, payment_method, created_at, seller_id',
    filter: { merchant_id: merchantId },
    order: { column: 'created_at', ascending: false },
    enabled: !!merchantId,
  });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('Tous');
  const [sellerCodes, setSellerCodes] = useState<Map<string, string>>(new Map());

  // Fetch seller codes via tracking_links when orders change
  useEffect(() => {
    async function fetchSellerCodes() {
      const sellerIds = [...new Set(orders.map((o) => o.seller_id).filter(Boolean))] as string[];
      if (sellerIds.length === 0) return;
      const { data: links } = await supabase
        .from('tracking_links')
        .select('seller_id, seller_code')
        .in('seller_id', sellerIds);
      const map = new Map<string, string>();
      ((links as { seller_id: string; seller_code: string }[] | null) ?? []).forEach((l) => {
        if (!map.has(l.seller_id)) map.set(l.seller_id, l.seller_code);
      });
      setSellerCodes(map);
    }
    fetchSellerCodes();
  }, [orders]);

  // Enrich orders with seller codes
  const ordersWithCodes = orders.map((o) => ({
    ...o,
    seller_code: o.seller_id ? (sellerCodes.get(o.seller_id) ?? null) : null,
  }));
  const filtered = ordersWithCodes.filter((o) => {
    const matchesFilter = filter === 'Tous' || o.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || o.id.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || (o.seller_code?.toLowerCase().includes(q) ?? false);
    return matchesFilter && matchesQuery;
  });

  const statusCounts = statusKeys.reduce<Record<string, number>>((acc, s) => {
    acc[s] = ordersWithCodes.filter((o) => o.status === s).length;
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
        {statusKeys.map((s) => {
          const cfg = statusMap[s];
          return (
            <Card key={s} className="p-4">
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${cfg.tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : cfg.tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : cfg.tone === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
                  <Icon glyph={cfg.glyph} size={16} />
                </span>
                <span className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">{statusCounts[s] ?? 0}</span>
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">{cfg.label}</p>
            </Card>
          );
        })}
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
        <select value={filter} onChange={(e) => { haptic('light'); setFilter(e.target.value as StatusFilter); }} className={`${selectClass} sm:w-auto`} data-testid="select-filter">
          {filters.map((f) => <option key={f} value={f}>{f === 'Tous' ? 'Tous' : statusMap[f]?.label ?? f}</option>)}
        </select>
      </div>

      {/* Orders list */}
      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState glyph={Search01Icon} title="Aucune commande trouvée" description="Modifiez votre recherche ou votre filtre pour voir d'autres commandes." />
        ) : (
          <ScrollTable minWidth={860} testId="scroll-orders">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_.8fr] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">
              <span>Commande</span><span>Client</span><span>Vendeur</span><span>Montant</span><span>Statut</span><span className="text-right">Détail</span>
            </div>
            {filtered.map((o) => {
              const cfg = statusMap[o.status] ?? statusMap.a_preparer;
              const shortId = `CMD-${o.id.slice(-6).toUpperCase()}`;
              return (
                <div key={o.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_.8fr] items-center gap-4 border-b border-[#f1eef7] px-5 py-4 last:border-b-0 transition hover:bg-[#faf9fd]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0eff5] text-[#67627b]"><Icon glyph={Store01Icon} size={18} /></span>
                    <div className="min-w-0"><p className="truncate font-bold text-[#292541]">{shortId}</p><p className="text-xs text-[#9290a2]">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                  </div>
                  <span className="truncate text-sm font-medium text-[#292541]">{o.customer_name}</span>
                  <span className="truncate text-xs font-bold text-[#5b49e8]">{o.seller_code ?? '—'}</span>
                  <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(o.total_amount)}</span>
                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                  <div className="text-right">
                    <Link href={`/merchant/orders/${o.id}`}><Button variant="ghost" testId={`view-${o.id}`}>Détail <Icon glyph={ArrowDown01Icon} size={13} /></Button></Link>
                  </div>
                </div>
              );
            })}
          </ScrollTable>
        )}
      </Card>
    </Page>
  );
}
