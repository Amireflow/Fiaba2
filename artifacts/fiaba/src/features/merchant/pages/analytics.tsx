import { useState, useEffect, useMemo } from 'react';
import { Calendar03Icon, Chart02Icon, Download01Icon, UserGroupIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { money } from '@/lib/utils';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
  Stat,
  inputClass,
} from '../components/merchant-ui';

const periods = ['7 jours', '30 jours', '90 jours', 'Année', 'Personnalisé'] as const;

type OrderRow = {
  id: string;
  total_amount: number;
  seller_id: string | null;
  created_at: string;
};

type OrderItemRow = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total: number;
};

type SellerRow = {
  id: string;
  display_name: string;
};

function getPeriodDays(period: string): number {
  switch (period) {
    case '7 jours': return 7;
    case '30 jours': return 30;
    case '90 jours': return 90;
    case 'Année': return 365;
    default: return 30;
  }
}

function getDateRange(period: string, customFrom: string, customTo: string): { from: Date; to: Date } {
  const to = new Date();
  if (period === 'Personnalisé' && customFrom && customTo) {
    const from = new Date(customFrom);
    const toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999);
    return { from, to: toDate };
  }
  const days = getPeriodDays(period);
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
}

export function Analytics() {
  const { merchantId } = useAuth();
  const [period, setPeriod] = useState<string>('30 jours');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);

  useEffect(() => {
    async function loadData() {
      if (!merchantId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Fetch orders in date range
      const { data: orderRows } = await supabase
        .from('orders')
        .select('id, total_amount, seller_id, created_at')
        .eq('merchant_id', merchantId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true });

      const oRows = (orderRows as OrderRow[] | null) ?? [];
      setOrders(oRows);

      // Fetch order_items for these orders
      if (oRows.length > 0) {
        const orderIds = oRows.map((o) => o.id);
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, product_name, quantity, line_total')
          .in('order_id', orderIds);
        setOrderItems((items as OrderItemRow[] | null) ?? []);
      } else {
        setOrderItems([]);
      }

      // Fetch sellers for this merchant (for names)
      const { data: sellerRows } = await supabase
        .from('sellers')
        .select('id, display_name')
        .eq('merchant_id', merchantId);
      setSellers((sellerRows as SellerRow[] | null) ?? []);

      // Fetch total clicks from tracking_links for this merchant's campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('merchant_id', merchantId);
      const campaignIds = ((campaigns as { id: string }[] | null) ?? []).map((c) => c.id);
      if (campaignIds.length > 0) {
        const { data: links } = await supabase
          .from('tracking_links')
          .select('clicks')
          .in('campaign_id', campaignIds);
        const clicks = ((links as { clicks: number }[] | null) ?? []).reduce((sum, l) => sum + (l.clicks ?? 0), 0);
        setTotalClicks(clicks);
      } else {
        setTotalClicks(0);
      }

      setLoading(false);
    }
    loadData();
  }, [merchantId, from, to]);

  // Compute stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const orderCount = orders.length;
  const avgBasket = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
  const conversionRate = totalClicks > 0 ? (orderCount / totalClicks) * 100 : 0;

  // Build daily revenue bars
  const bars = useMemo(() => {
    const days = getPeriodDays(period);
    if (period === 'Année') {
      // Monthly bars
      const monthly: number[] = new Array(12).fill(0);
      orders.forEach((o) => {
        const month = new Date(o.created_at).getMonth();
        monthly[month] += o.total_amount;
      });
      const max = Math.max(...monthly, 1);
      return monthly.map((v) => Math.round((v / max) * 100));
    }
    // Daily bars
    const daily: number[] = new Array(days).fill(0);
    const now = new Date();
    orders.forEach((o) => {
      const orderDate = new Date(o.created_at);
      const dayDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      const idx = days - 1 - dayDiff;
      if (idx >= 0 && idx < days) daily[idx] += o.total_amount;
    });
    const max = Math.max(...daily, 1);
    return daily.map((v) => Math.round((v / max) * 100));
  }, [orders, period]);

  // Top sellers
  const topSellers = useMemo(() => {
    const sellerMap = new Map<string, { amount: number; sales: number }>();
    orders.forEach((o) => {
      if (!o.seller_id) return;
      const agg = sellerMap.get(o.seller_id) ?? { amount: 0, sales: 0 };
      agg.amount += o.total_amount;
      agg.sales += 1;
      sellerMap.set(o.seller_id, agg);
    });
    const sellerNameMap = new Map(sellers.map((s) => [s.id, s.display_name]));
    const maxAmount = Math.max(...Array.from(sellerMap.values()).map((v) => v.amount), 1);
    return Array.from(sellerMap.entries())
      .map(([id, v]) => ({
        name: sellerNameMap.get(id) ?? 'Vendeur',
        amount: v.amount,
        sales: v.sales,
        pct: Math.round((v.amount / maxAmount) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [orders, sellers]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { sales: number }>();
    orderItems.forEach((item) => {
      const key = item.product_id ?? item.product_name;
      const agg = productMap.get(key) ?? { sales: 0 };
      agg.sales += item.quantity;
      productMap.set(key, agg);
    });
    const maxSales = Math.max(...Array.from(productMap.values()).map((v) => v.sales), 1);
    return Array.from(productMap.entries())
      .map(([key, v]) => ({
        name: orderItems.find((i) => (i.product_id ?? i.product_name) === key)?.product_name ?? 'Produit',
        sales: v.sales,
        pct: Math.round((v.sales / maxSales) * 100),
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [orderItems]);

  function exportCSV() {
    const rows = [
      ['Vendeur', 'Ventes', 'CA généré (FCFA)'],
      ...topSellers.map((s) => [s.name, String(s.sales), String(s.amount)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiaba-analytique-${period.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page
      eyebrow="Décider avec confiance"
      title="Analytique"
      description="Les chiffres utiles, sans bruit. Comprenez ce qui fait avancer vos ventes."
    >
      {/* Filters — below title, full width */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${period === p ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`}
              data-testid={`period-${p}`}
            >
              {p === 'Personnalisé' && <Icon glyph={Calendar03Icon} size={14} />}
              {p}
            </button>
          ))}
        </div>
        <Button variant="soft" onClick={exportCSV} testId="button-export" className="shrink-0">
          <Icon glyph={Download01Icon} size={15} /> Exporter
        </Button>
      </div>

      {/* Custom date range */}
      {period === 'Personnalisé' && (
        <div className="mt-4 flex flex-col gap-3 rounded-[22px] bg-[#fffefd] p-5 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-bold text-[#514b71]">Du</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={inputClass} data-testid="input-date-from" />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-bold text-[#514b71]">Au</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={inputClass} data-testid="input-date-to" />
          </label>
          <Button
            variant="primary"
            className="shrink-0"
            onClick={() => {
              if (customFrom && customTo) {
                setPeriod('Personnalisé');
              }
            }}
            testId="button-apply-date"
          >
            Appliquer
          </Button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center p-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Ventes générées" value={money(totalRevenue)} glyph={Chart02Icon} />
            <Stat label="Taux de conversion" value={`${conversionRate.toFixed(1)}%`} glyph={UserGroupIcon} tone="mint" />
            <Stat label="Panier moyen" value={money(avgBasket)} glyph={Wallet01Icon} tone="amber" />
          </div>

          {/* Revenue chart — fixed card (no color conflict) */}
          <div className="mt-5 rounded-[22px] bg-[#5745df] p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold">Chiffre d'affaires</p>
                <p className="mt-1 text-[11px] text-white/70">Période : {period === 'Personnalisé' && customFrom && customTo ? `${customFrom} → ${customTo}` : period}</p>
              </div>
              <Badge tone="mint">{orderCount} cmd</Badge>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">{money(totalRevenue).replace(' F', '')}</span>
              <span className="mb-1 text-sm text-white/70">FCFA</span>
            </div>
            <div className="mt-6 flex h-[200px] items-end gap-1 px-1 sm:gap-2">
              {bars.map((height, i) => (
                <div key={i} className="group relative flex flex-1 flex-col justify-end">
                  <div className={`w-full rounded-t-md transition group-hover:bg-white/80 ${i > bars.length / 2 ? 'bg-white/80' : 'bg-white/30'}`} style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Top sellers + products */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="text-sm font-bold text-[#292541]">Vos meilleurs relais</p>
              {topSellers.length === 0 ? (
                <p className="mt-5 text-xs text-[#9290a2]">Aucune vente sur cette période.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {topSellers.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#292541]">{s.name}</span>
                        <span className="text-[#77738a]">{money(s.amount)}</span>
                      </div>
                      <div className="mt-2"><ProgressBar value={s.pct} tone="violet" /></div>
                      <p className="mt-1 text-[10px] text-[#9290a2]">{s.sales} ventes</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <p className="text-sm font-bold text-[#292541]">Produits les plus vendus</p>
              {topProducts.length === 0 ? (
                <p className="mt-5 text-xs text-[#9290a2]">Aucune vente sur cette période.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {topProducts.map((p) => (
                    <div key={p.name}>
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#292541]">{p.name}</span>
                        <span className="text-[#77738a]">{p.sales} ventes</span>
                      </div>
                      <div className="mt-2"><ProgressBar value={p.pct} tone="mint" /></div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </Page>
  );
}
