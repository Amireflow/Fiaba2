import { useState, useEffect, useMemo } from 'react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar03Icon,
  Chart02Icon,
  ChartColumnIcon,
  ChartUpIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CursorPointer01Icon,
  Download01Icon,
  EyeIcon,
  FireIcon,
  PackageIcon,
  ShoppingBag01Icon,
  SparklesIcon,
  Store01Icon,
  Target01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
  SectionTitle,
  inputClass,
} from '../components/merchant-ui';

const periods = ['7 jours', '30 jours', '90 jours', 'Année', 'Personnalisé'] as const;

type OrderRow = {
  id: string;
  total_amount: number;
  seller_id: string | null;
  created_at: string;
  status: string;
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

function getPreviousRange(period: string, from: Date, to: Date, customFrom: string, customTo: string): { from: Date; to: Date } {
  if (period === 'Personnalisé' && customFrom && customTo) {
    const diff = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - diff);
    return { from: prevFrom, to: prevTo };
  }
  const days = getPeriodDays(period);
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days);
  return { from: prevFrom, to: prevTo };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const dayNamesShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function Analytics() {
  const { merchantId } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<string>('30 jours');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [prevOrders, setPrevOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const { from, to } = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const { from: prevFrom, to: prevTo } = useMemo(
    () => getPreviousRange(period, from, to, customFrom, customTo),
    [period, from, to, customFrom, customTo],
  );

  useEffect(() => {
    async function loadData() {
      if (!merchantId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Fetch orders in current date range
      const { data: orderRows } = await supabase
        .from('orders')
        .select('id, total_amount, seller_id, created_at, status')
        .eq('merchant_id', merchantId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true });

      const oRows = (orderRows as OrderRow[] | null) ?? [];
      setOrders(oRows);

      // Fetch orders in previous period for trend comparison
      const { data: prevRows } = await supabase
        .from('orders')
        .select('id, total_amount, seller_id, created_at, status')
        .eq('merchant_id', merchantId)
        .gte('created_at', prevFrom.toISOString())
        .lte('created_at', prevTo.toISOString());
      setPrevOrders((prevRows as OrderRow[] | null) ?? []);

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
  }, [merchantId, from, to, prevFrom, prevTo]);

  // ── Current period stats ──
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const orderCount = orders.length;
  const avgBasket = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
  const conversionRate = totalClicks > 0 ? (orderCount / totalClicks) * 100 : 0;
  const deliveredCount = orders.filter((o) => o.status === 'livree').length;
  const uniqueProducts = new Set(orderItems.map((i) => i.product_id ?? i.product_name)).size;

  // ── Previous period stats (for trends) ──
  const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const prevOrderCount = prevOrders.length;
  const prevAvgBasket = prevOrderCount > 0 ? Math.round(prevRevenue / prevOrderCount) : 0;

  const revenueChange = pctChange(totalRevenue, prevRevenue);
  const orderChange = pctChange(orderCount, prevOrderCount);
  const basketChange = pctChange(avgBasket, prevAvgBasket);
  const conversionChange = totalClicks > 0 ? pctChange(conversionRate, prevOrderCount > 0 ? (prevOrderCount / totalClicks) * 100 : 0) : 0;

  // ── Chart data ──
  const chartData = useMemo(() => {
    if (period === 'Année') {
      const monthly: { value: number; label: string; raw: number }[] = [];
      for (let m = 0; m < 12; m++) {
        const raw = orders
          .filter((o) => new Date(o.created_at).getMonth() === m)
          .reduce((sum, o) => sum + o.total_amount, 0);
        monthly.push({ value: 0, label: monthNames[m], raw });
      }
      const max = Math.max(...monthly.map((m) => m.raw), 1);
      return monthly.map((m) => ({ ...m, value: Math.round((m.raw / max) * 100) }));
    }
    const days = getPeriodDays(period);
    const daily: { value: number; label: string; raw: number }[] = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      const dayStr = date.toISOString().slice(0, 10);
      const raw = orders
        .filter((o) => o.created_at.slice(0, 10) === dayStr)
        .reduce((sum, o) => sum + o.total_amount, 0);
      const label = days <= 7
        ? dayNamesShort[date.getDay()]
        : days <= 30
          ? `${date.getDate()}/${date.getMonth() + 1}`
          : `${date.getDate()}/${date.getMonth() + 1}`;
      daily.push({ value: 0, label, raw });
    }
    const max = Math.max(...daily.map((d) => d.raw), 1);
    return daily.map((d) => ({ ...d, value: Math.round((d.raw / max) * 100) }));
  }, [orders, period]);

  // ── Top sellers ──
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
        avgBasket: Math.round(v.amount / v.sales),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [orders, sellers]);

  // ── Top products ──
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { sales: number; revenue: number }>();
    orderItems.forEach((item) => {
      const key = item.product_id ?? item.product_name;
      const agg = productMap.get(key) ?? { sales: 0, revenue: 0 };
      agg.sales += item.quantity;
      agg.revenue += item.line_total;
      productMap.set(key, agg);
    });
    const maxSales = Math.max(...Array.from(productMap.values()).map((v) => v.sales), 1);
    return Array.from(productMap.entries())
      .map(([key, v]) => ({
        name: orderItems.find((i) => (i.product_id ?? i.product_name) === key)?.product_name ?? 'Produit',
        sales: v.sales,
        revenue: v.revenue,
        pct: Math.round((v.sales / maxSales) * 100),
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [orderItems]);

  // ── Best day of week ──
  const bestDay = useMemo(() => {
    const dayMap = new Map<number, { revenue: number; count: number }>();
    orders.forEach((o) => {
      const dow = new Date(o.created_at).getDay();
      const agg = dayMap.get(dow) ?? { revenue: 0, count: 0 };
      agg.revenue += o.total_amount;
      agg.count += 1;
      dayMap.set(dow, agg);
    });
    if (dayMap.size === 0) return null;
    const sorted = Array.from(dayMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
    const [bestDow, stats] = sorted[0];
    return { day: dayNames[bestDow], revenue: stats.revenue, count: stats.count };
  }, [orders]);

  // ── Peak day (best single day in period) ──
  const peakDay = useMemo(() => {
    if (chartData.length === 0) return null;
    const peak = chartData.reduce((best, d) => (d.raw > best.raw ? d : best), chartData[0]);
    return peak.raw > 0 ? peak : null;
  }, [chartData]);

  function exportCSV() {
    haptic('light');
    const sections: string[][] = [];

    sections.push(['=== ANALYTIQUE FIABA ===']);
    sections.push(['Période', period === 'Personnalisé' ? `${customFrom} → ${customTo}` : period]);
    sections.push([]);
    sections.push(['=== INDICATEURS CLÉS ===']);
    sections.push(['CA généré (FCFA)', String(totalRevenue)]);
    sections.push(['Commandes', String(orderCount)]);
    sections.push(['Panier moyen (FCFA)', String(avgBasket)]);
    sections.push(['Taux conversion (%)', conversionRate.toFixed(2)]);
    sections.push(['Clics totaux', String(totalClicks)]);
    sections.push(['Produits uniques vendus', String(uniqueProducts)]);
    sections.push([]);
    sections.push(['=== TOP VENDEURS ===']);
    sections.push(['Vendeur', 'Ventes', 'CA (FCFA)', 'Panier moyen (FCFA)']);
    sections.push(...topSellers.map((s) => [s.name, String(s.sales), String(s.amount), String(s.avgBasket)]));
    sections.push([]);
    sections.push(['=== TOP PRODUITS ===']);
    sections.push(['Produit', 'Quantité', 'CA (FCFA)']);
    sections.push(...topProducts.map((p) => [p.name, String(p.sales), String(p.revenue)]));

    const csv = sections.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiaba-analytique-${period.replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export généré', description: 'Le fichier CSV a été téléchargé.' });
  }

  const periodLabel = period === 'Personnalisé' && customFrom && customTo ? `${customFrom} → ${customTo}` : period;

  return (
    <Page
      eyebrow="Décider avec confiance"
      title="Analytique"
      description="Les chiffres utiles, sans bruit. Comprenez ce qui fait avancer vos ventes."
      action={
        <Button variant="soft" onClick={exportCSV} testId="button-export" className="shrink-0">
          <Icon glyph={Download01Icon} size={15} /> Exporter
        </Button>
      }
    >
      {/* ── Period selector ── */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => { haptic('light'); setPeriod(p); }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                period === p ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'
              }`}
              data-testid={`period-${p}`}
            >
              {p === 'Personnalisé' && <Icon glyph={Calendar03Icon} size={14} />}
              {p}
            </button>
          ))}
        </div>
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
        <div className="mt-10 flex items-center justify-center py-16">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards (5 stats with trends) ── */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="CA généré"
              value={money(totalRevenue)}
              change={revenueChange}
              glyph={Wallet01Icon}
              tone="violet"
            />
            <KpiCard
              label="Commandes"
              value={String(orderCount)}
              change={orderChange}
              glyph={ShoppingBag01Icon}
              tone="mint"
              sub={`${deliveredCount} livrées`}
            />
            <KpiCard
              label="Panier moyen"
              value={money(avgBasket)}
              change={basketChange}
              glyph={Chart02Icon}
              tone="amber"
            />
            <KpiCard
              label="Taux conversion"
              value={`${conversionRate.toFixed(1)}%`}
              change={conversionChange}
              glyph={Target01Icon}
              tone="violet"
              sub={`${totalClicks} clics`}
            />
          </div>

          {/* ── Revenue chart with tooltips ── */}
          <div className="mt-5 rounded-[22px] bg-[#5745df] p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold">Chiffre d'affaires</p>
                <p className="mt-1 text-[11px] text-white/70">Période : {periodLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {peakDay && (
                  <span className="hidden rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white sm:inline-flex sm:items-center sm:gap-1">
                    <Icon glyph={FireIcon} size={12} /> Pic : {money(peakDay.raw).replace(' F', '')} F
                  </span>
                )}
                <Badge tone="mint" className="bg-white/15 text-white">{orderCount} cmd</Badge>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">
                {money(totalRevenue).replace(' F', '')}
              </span>
              <span className="mb-1 text-sm text-white/70">FCFA</span>
              {prevRevenue > 0 && (
                <span className={`mb-1 ml-2 inline-flex items-center gap-1 text-xs font-bold ${revenueChange >= 0 ? 'text-[#7ef0c3]' : 'text-[#ffb3b8]'}`}>
                  <Icon glyph={revenueChange >= 0 ? ArrowUp01Icon : ArrowDown01Icon} size={13} />
                  {formatChange(revenueChange)}
                </span>
              )}
            </div>

            {/* Chart bars with hover tooltips */}
            <div className="mt-6 flex h-[200px] items-end gap-1 px-1 sm:gap-2">
              {chartData.map((d, i) => (
                <div
                  key={i}
                  className="group relative flex flex-1 flex-col justify-end"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip */}
                  {hoveredBar === i && d.raw > 0 && (
                    <div className="absolute -top-14 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#201b3c] px-3 py-2 text-center shadow-lg">
                      <p className="font-[Space_Grotesk] text-sm font-bold text-white">{money(d.raw).replace(' F', '')} F</p>
                      <p className="text-[10px] text-[#c1bdd8]">{d.label}</p>
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      hoveredBar === i ? 'bg-white' : i > chartData.length / 2 ? 'bg-white/80' : 'bg-white/30'
                    } ${d.raw === 0 ? 'opacity-20' : ''}`}
                    style={{ height: `${Math.max(d.value, d.raw > 0 ? 3 : 0)}%` }}
                  />
                </div>
              ))}
            </div>

            {/* X-axis labels (sparse) */}
            <div className="mt-2 flex justify-between text-[10px] text-white/50">
              <span>{chartData[0]?.label ?? ''}</span>
              <span>{chartData[Math.floor(chartData.length / 2)]?.label ?? ''}</span>
              <span>{chartData[chartData.length - 1]?.label ?? ''}</span>
            </div>
          </div>

          {/* ── Conversion funnel + insights ── */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            {/* Funnel */}
            <Card>
              <SectionTitle title="Entonnoir de conversion" subtitle="Du clic à la commande" />
              {totalClicks > 0 ? (
                <div className="mt-5 space-y-4">
                  <FunnelStep
                    glyph={CursorPointer01Icon}
                    label="Clics sur les campagnes"
                    value={totalClicks}
                    pct={100}
                    tone="violet"
                  />
                  <FunnelStep
                    glyph={EyeIcon}
                    label="Commandes générées"
                    value={orderCount}
                    pct={totalClicks > 0 ? (orderCount / totalClicks) * 100 : 0}
                    tone="mint"
                  />
                  <FunnelStep
                    glyph={CheckmarkCircle02Icon}
                    label="Commandes livrées"
                    value={deliveredCount}
                    pct={totalClicks > 0 ? (deliveredCount / totalClicks) * 100 : 0}
                    tone="amber"
                  />
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#f4f3f8] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f0eff5] text-[#9290a2]">
                    <Icon glyph={Target01Icon} size={18} />
                  </span>
                  <p className="text-xs text-[#77738a]">
                    Aucun clic enregistré sur vos campagnes. Créez une campagne pour activer le suivi de conversion.
                  </p>
                </div>
              )}
            </Card>

            {/* Insights */}
            <Card>
              <SectionTitle title="Signaux forts" subtitle="Ce qui ressort sur la période" />
              <div className="mt-5 space-y-4">
                {bestDay ? (
                  <InsightRow
                    glyph={FireIcon}
                    tone="amber"
                    label="Meilleur jour"
                    value={bestDay.day}
                    sub={`${money(bestDay.revenue)} · ${bestDay.count} cmd`}
                  />
                ) : (
                  <InsightRow
                    glyph={Clock01Icon}
                    tone="slate"
                    label="Meilleur jour"
                    value="—"
                    sub="Pas assez de données"
                  />
                )}
                <InsightRow
                  glyph={PackageIcon}
                  tone="violet"
                  label="Produits uniques vendus"
                  value={String(uniqueProducts)}
                  sub={`${orderItems.length} lignes de commande`}
                />
                <InsightRow
                  glyph={UserGroupIcon}
                  tone="mint"
                  label="Vendeurs actifs"
                  value={String(topSellers.length)}
                  sub={topSellers.length > 0 ? `Top : ${topSellers[0].name}` : 'Aucun'}
                />
                <InsightRow
                  glyph={SparklesIcon}
                  tone="violet"
                  label="Panier moyen"
                  value={money(avgBasket)}
                  sub={basketChange !== 0 ? formatChange(basketChange) : 'Stable'}
                />
              </div>
            </Card>
          </div>

          {/* ── Top sellers + products ── */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {/* Top sellers */}
            <Card>
              <SectionTitle
                title="Vos meilleurs relais"
                subtitle="Classement par chiffre d'affaires"
                action={<Badge tone="violet">{topSellers.length}</Badge>}
              />
              {topSellers.length === 0 ? (
                <p className="mt-5 text-xs text-[#9290a2]">Aucune vente sur cette période.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {topSellers.map((s, idx) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                            idx === 0 ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#716d82]'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#292541]">{s.name}</span>
                        </div>
                        <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(s.amount)}</span>
                      </div>
                      <div className="mt-2"><ProgressBar value={s.pct} tone="violet" /></div>
                      <div className="mt-1.5 flex justify-between text-[10px] text-[#9290a2]">
                        <span>{s.sales} ventes</span>
                        <span>Panier : {money(s.avgBasket)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top products */}
            <Card>
              <SectionTitle
                title="Produits les plus vendus"
                subtitle="Classement par quantité écoulée"
                action={<Badge tone="mint">{topProducts.length}</Badge>}
              />
              {topProducts.length === 0 ? (
                <p className="mt-5 text-xs text-[#9290a2]">Aucune vente sur cette période.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {topProducts.map((p, idx) => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                            idx === 0 ? 'bg-[#278e69] text-white' : 'bg-[#f0eff5] text-[#716d82]'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#292541]">{p.name}</span>
                        </div>
                        <span className="text-[#77738a]">{p.sales} ventes</span>
                      </div>
                      <div className="mt-2"><ProgressBar value={p.pct} tone="mint" /></div>
                      <p className="mt-1.5 text-right text-[10px] text-[#9290a2]">CA : {money(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Revenue by day of week ── */}
          {orders.length > 0 && (
            <Card className="mt-5">
              <SectionTitle
                title="Répartition par jour de la semaine"
                subtitle="Identifiez vos journées les plus fortes"
              />
              <div className="mt-5 grid grid-cols-7 gap-2">
                {dayNames.map((day, dow) => {
                  const dayOrders = orders.filter((o) => new Date(o.created_at).getDay() === dow);
                  const dayRevenue = dayOrders.reduce((s, o) => s + o.total_amount, 0);
                  const maxDayRevenue = Math.max(...dayNames.map((_, d) =>
                    orders.filter((o) => new Date(o.created_at).getDay() === d).reduce((s, o) => s + o.total_amount, 0)
                  ), 1);
                  const pct = Math.round((dayRevenue / maxDayRevenue) * 100);
                  return (
                    <div key={day} className="text-center">
                      <div className="flex h-[100px] items-end justify-center">
                        <div
                          className={`w-full rounded-t-md transition-all ${dayRevenue > 0 ? 'bg-[#5b49e8]' : 'bg-[#f0eff5]'}`}
                          style={{ height: `${Math.max(pct, dayRevenue > 0 ? 4 : 0)}%` }}
                          title={`${day} : ${money(dayRevenue)} (${dayOrders.length} cmd)`}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-[#292541]">{dayNamesShort[dow]}</p>
                      <p className="text-[9px] text-[#9290a2]">{dayOrders.length} cmd</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}

/* ── KPI Card with trend ── */
function KpiCard({
  label,
  value,
  change,
  glyph,
  tone,
  sub,
}: {
  label: string;
  value: string;
  change: number;
  glyph: typeof Chart02Icon;
  tone: 'violet' | 'mint' | 'amber';
  sub?: string;
}) {
  const toneClass = tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#efedff] text-[#5b49e8]';
  const isPositive = change >= 0;
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>
          <Icon glyph={glyph} size={18} />
        </span>
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isPositive ? 'text-[#278e69]' : 'text-[#c45667]'}`}>
          <Icon glyph={isPositive ? ArrowUp01Icon : ArrowDown01Icon} size={12} />
          {formatChange(change)}
        </span>
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">{label}</p>
      <strong className="mt-1 block font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{value}</strong>
      {sub && <p className="mt-1 text-[10px] text-[#9290a2]">{sub}</p>}
    </Card>
  );
}

/* ── Funnel step ── */
function FunnelStep({
  glyph,
  label,
  value,
  pct,
  tone,
}: {
  glyph: typeof Chart02Icon;
  label: string;
  value: number;
  pct: number;
  tone: 'violet' | 'mint' | 'amber';
}) {
  const toneClass = tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#efedff] text-[#5b49e8]';
  const barTone = tone === 'mint' ? 'bg-[#278e69]' : tone === 'amber' ? 'bg-[#ac741e]' : 'bg-[#5b49e8]';
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon glyph={glyph} size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#292541]">{label}</p>
          <p className="text-[10px] text-[#9290a2]">{pct.toFixed(1)}% du total</p>
        </div>
        <strong className="shrink-0 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{value}</strong>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[#efedf5]">
        <div className={`h-1.5 rounded-full ${barTone} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/* ── Insight row ── */
function InsightRow({
  glyph,
  tone,
  label,
  value,
  sub,
}: {
  glyph: typeof Chart02Icon;
  tone: 'violet' | 'mint' | 'amber' | 'slate';
  label: string;
  value: string;
  sub: string;
}) {
  const toneClass = tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : tone === 'slate' ? 'bg-[#f0eff5] text-[#716d82]' : 'bg-[#efedff] text-[#5b49e8]';
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        <Icon glyph={glyph} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9290a2]">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-[#292541]">{value}</p>
      </div>
      <span className="shrink-0 text-right text-[10px] text-[#9290a2]">{sub}</span>
    </div>
  );
}
