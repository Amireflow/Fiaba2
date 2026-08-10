import { useState, useEffect, useMemo } from 'react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar03Icon,
  Chart02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Coins01Icon,
  Download01Icon,
  FireIcon,
  Search01Icon,
  Store01Icon,
  Target01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  AdminSectionTitle,
  adminInputClass,
  adminSelectClass,
} from '../components/admin-ui';

// ── Types ──
type CommissionRow = {
  id: string;
  order_id: string;
  seller_id: string;
  campaign_id: string | null;
  amount: number;
  status: string;
  model: string | null;
  created_at: string;
  available_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
};

type OrderRow = {
  id: string;
  merchant_id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type SellerName = { id: string; display_name: string };
type MerchantName = { id: string; name: string };
type CampaignName = { id: string; name: string };

// ── Maps ──
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

const statusGlyphMap: Record<string, typeof Wallet01Icon> = {
  pending: Clock01Icon,
  available: CheckmarkCircle02Icon,
  paid: Wallet01Icon,
  reversed: ArrowDown01Icon,
};

const statusFilters = ['Tous', 'pending', 'available', 'paid', 'reversed'] as const;
const modelFilters = ['all', 'commission', 'marge'] as const;
const periods = ['30 jours', '90 jours', 'Année', 'Tout'] as const;

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function getPeriodDays(period: string): number {
  switch (period) {
    case '30 jours': return 30;
    case '90 jours': return 90;
    case 'Année': return 365;
    default: return 9999;
  }
}

export function AdminCommissions() {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [orders, setOrders] = useState<Map<string, OrderRow>>(new Map());
  const [sellerNames, setSellerNames] = useState<Map<string, string>>(new Map());
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [campaignNames, setCampaignNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('Tout');

  // Detail drawer
  const [selected, setSelected] = useState<CommissionRow | null>(null);

  // ── Load data ──
  useEffect(() => {
    async function loadData() {
      const { data: commData } = await supabase
        .from('commissions')
        .select('id, order_id, seller_id, campaign_id, amount, status, model, created_at, available_at, reversed_at, reversal_reason')
        .order('created_at', { ascending: false })
        .limit(200);
      const rows = (commData as CommissionRow[] | null) ?? [];
      setCommissions(rows);

      // Fetch orders (for merchant, customer, total)
      const orderIds = [...new Set(rows.map((r) => r.order_id))];
      if (orderIds.length > 0) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, merchant_id, customer_name, total_amount, status, created_at')
          .in('id', orderIds);
        const orderMap = new Map<string, OrderRow>();
        ((orderData as OrderRow[] | null) ?? []).forEach((o) => orderMap.set(o.id, o));
        setOrders(orderMap);

        // Merchant names
        const merchantIds = [...new Set(orderMap.values().map((o) => o.merchant_id))];
        if (merchantIds.length > 0) {
          const { data: mNames } = await supabase.from('merchants').select('id, name').in('id', merchantIds);
          setMerchantNames(new Map<string, string>(((mNames as MerchantName[] | null) ?? []).map((m) => [m.id, m.name])));
        }
      }

      // Seller names
      const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
      if (sellerIds.length > 0) {
        const { data: sNames } = await supabase.from('sellers').select('id, display_name').in('id', sellerIds);
        setSellerNames(new Map<string, string>(((sNames as SellerName[] | null) ?? []).map((s) => [s.id, s.display_name])));
      }

      // Campaign names
      const campaignIds = [...new Set(rows.filter((r) => r.campaign_id).map((r) => r.campaign_id!))];
      if (campaignIds.length > 0) {
        const { data: cNames } = await supabase.from('campaigns').select('id, name').in('id', campaignIds);
        setCampaignNames(new Map<string, string>(((cNames as CampaignName[] | null) ?? []).map((c) => [c.id, c.name])));
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // ── Period filtering ──
  const periodFiltered = useMemo(() => {
    if (period === 'Tout') return commissions;
    const days = getPeriodDays(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return commissions.filter((c) => new Date(c.created_at) >= cutoff);
  }, [commissions, period]);

  // ── Filtered commissions ──
  const filtered = useMemo(() => {
    return periodFiltered.filter((c) => {
      const q = search.trim().toLowerCase();
      const order = orders.get(c.order_id);
      const matchesSearch = q === '' ||
        (sellerNames.get(c.seller_id) ?? '').toLowerCase().includes(q) ||
        (order?.customer_name ?? '').toLowerCase().includes(q) ||
        c.order_id.toLowerCase().includes(q) ||
        (campaignNames.get(c.campaign_id ?? '') ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'Tous' || c.status === statusFilter;
      const matchesModel = modelFilter === 'all' || c.model === modelFilter;
      return matchesSearch && matchesStatus && matchesModel;
    });
  }, [periodFiltered, orders, sellerNames, campaignNames, search, statusFilter, modelFilter]);

  // ── KPIs ──
  const totalAmount = periodFiltered.reduce((sum, c) => sum + (c.status === 'reversed' ? 0 : c.amount), 0);
  const pendingAmount = periodFiltered.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const availableAmount = periodFiltered.filter((c) => c.status === 'available').reduce((s, c) => s + c.amount, 0);
  const paidAmount = periodFiltered.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  const reversedAmount = periodFiltered.filter((c) => c.status === 'reversed').reduce((s, c) => s + c.amount, 0);
  const totalCount = periodFiltered.length;
  const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  // ── Model breakdown ──
  const commissionModelAmount = periodFiltered.filter((c) => c.model === 'commission' && c.status !== 'reversed').reduce((s, c) => s + c.amount, 0);
  const margeModelAmount = periodFiltered.filter((c) => c.model === 'marge' && c.status !== 'reversed').reduce((s, c) => s + c.amount, 0);
  const modelTotal = commissionModelAmount + margeModelAmount;
  const commissionPct = modelTotal > 0 ? Math.round((commissionModelAmount / modelTotal) * 100) : 0;
  const margePct = modelTotal > 0 ? 100 - commissionPct : 0;

  // ── Chart data (monthly) ──
  const chartData = useMemo(() => {
    const valid = periodFiltered.filter((c) => c.status !== 'reversed');
    const monthly: { value: number; label: string; raw: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const raw = valid
        .filter((c) => new Date(c.created_at).getMonth() === m)
        .reduce((sum, c) => sum + c.amount, 0);
      monthly.push({ value: 0, label: monthNames[m], raw });
    }
    const max = Math.max(...monthly.map((m) => m.raw), 1);
    return monthly.map((m) => ({ ...m, value: Math.round((m.raw / max) * 100) }));
  }, [periodFiltered]);

  const peakMonth = useMemo(() => {
    const peak = chartData.reduce((best, d) => (d.raw > best.raw ? d : best), chartData[0]);
    return peak.raw > 0 ? peak : null;
  }, [chartData]);

  // ── Top sellers ──
  const topSellers = useMemo(() => {
    const sellerMap = new Map<string, { earnings: number; count: number }>();
    periodFiltered
      .filter((c) => c.status !== 'reversed')
      .forEach((c) => {
        const agg = sellerMap.get(c.seller_id) ?? { earnings: 0, count: 0 };
        agg.earnings += c.amount;
        agg.count += 1;
        sellerMap.set(c.seller_id, agg);
      });
    const maxEarnings = Math.max(...Array.from(sellerMap.values()).map((v) => v.earnings), 1);
    return Array.from(sellerMap.entries())
      .map(([id, v]) => ({
        name: sellerNames.get(id) ?? 'Vendeur',
        earnings: v.earnings,
        count: v.count,
        pct: Math.round((v.earnings / maxEarnings) * 100),
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);
  }, [periodFiltered, sellerNames]);

  // ── Export CSV ──
  function exportCSV() {
    haptic('light');
    const sections: string[][] = [];
    sections.push(['=== REGISTRE COMMISSIONS FIABA ===']);
    sections.push(['Période', period]);
    sections.push([]);
    sections.push(['=== INDICATEURS ===']);
    sections.push(['Total généré (FCFA)', String(totalAmount)]);
    sections.push(['En attente (FCFA)', String(pendingAmount)]);
    sections.push(['Disponible (FCFA)', String(availableAmount)]);
    sections.push(['Versées (FCFA)', String(paidAmount)]);
    sections.push(['Reprises (FCFA)', String(reversedAmount)]);
    sections.push(['Nombre d\'écritures', String(totalCount)]);
    sections.push(['Montant moyen (FCFA)', String(avgAmount)]);
    sections.push([]);
    sections.push(['=== RÉPARTITION PAR MODÈLE ===']);
    sections.push(['Modèle', 'Montant (FCFA)', 'Part (%)']);
    sections.push(['Commission', String(commissionModelAmount), String(commissionPct)]);
    sections.push(['Marge', String(margeModelAmount), String(margePct)]);
    sections.push([]);
    sections.push(['=== TOP VENDEURS ===']);
    sections.push(['Vendeur', 'Commissions (FCFA)', 'Nombre']);
    sections.push(...topSellers.map((s) => [s.name, String(s.earnings), String(s.count)]));
    sections.push([]);
    sections.push(['=== DÉTAIL DES ÉCRITURES ===']);
    sections.push(['Réf', 'Commande', 'Vendeur', 'Marchand', 'Campagne', 'Client', 'Modèle', 'Montant (FCFA)', 'Statut', 'Date']);

    filtered.forEach((c) => {
      const order = orders.get(c.order_id);
      sections.push([
        c.id.slice(-8),
        `CMD-${c.order_id.slice(-6).toUpperCase()}`,
        sellerNames.get(c.seller_id) ?? '—',
        order ? (merchantNames.get(order.merchant_id) ?? '—') : '—',
        c.campaign_id ? (campaignNames.get(c.campaign_id) ?? '—') : '—',
        order?.customer_name ?? '—',
        c.model === 'marge' ? 'Marge' : 'Commission',
        String(c.amount),
        statusLabelMap[c.status] ?? c.status,
        new Date(c.created_at).toLocaleDateString('fr-FR'),
      ]);
    });

    const csv = sections.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiaba-commissions-${period.replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export généré', description: 'Le registre CSV a été téléchargé.' });
  }

  // ── Selected commission details ──
  const selectedOrder = selected ? orders.get(selected.order_id) : null;
  const selectedMerchant = selectedOrder ? merchantNames.get(selectedOrder.merchant_id) : null;
  const selectedSeller = selected ? sellerNames.get(selected.seller_id) : null;
  const selectedCampaign = selected?.campaign_id ? campaignNames.get(selected.campaign_id) : null;

  return (
    <AdminPage
      eyebrow="Commissions & marges"
      title="Registre financier"
      description="Chaque vente validée génère une écriture. Les reprises créent une écriture compensatoire traçable."
      action={
        <Button variant="soft" onClick={exportCSV} testId="button-export-commissions" className="shrink-0">
          <Icon glyph={Download01Icon} size={15} /> Exporter
        </Button>
      }
    >
      {/* ── Period selector ── */}
      <div className="mt-6 flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => { haptic('light'); setPeriod(p); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              period === p ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'
            }`}
            data-testid={`period-commission-${p}`}
          >
            {p === 'Année' && <Icon glyph={Calendar03Icon} size={14} />}
            {p}
          </button>
        ))}
      </div>

      {/* ── KPIs ── */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total généré" value={money(totalAmount)} glyph={Coins01Icon} tone="violet" sub={`${totalCount} écritures`} />
        <KpiCard label="En attente" value={money(pendingAmount)} glyph={Clock01Icon} tone="amber" sub="Période de sécurité" />
        <KpiCard label="Disponible" value={money(availableAmount)} glyph={CheckmarkCircle02Icon} tone="mint" sub="Prêt à verser" />
        <KpiCard label="Versées" value={money(paidAmount)} glyph={Wallet01Icon} tone="violet" sub={`Reprises : ${money(reversedAmount)}`} />
      </div>

      {loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : commissions.length === 0 ? (
        <Card className="mt-5 p-0">
          <AdminEmptyState glyph={Wallet01Icon} title="Aucune écriture" description="Aucune commission n'a été enregistrée pour le moment." />
        </Card>
      ) : (
        <>
          {/* ── Chart + Model breakdown ── */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
            {/* Chart */}
            <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">Évolution mensuelle</p>
                  <p className="mt-1 text-[11px] text-white/70">Commissions générées (hors reprises)</p>
                </div>
                {peakMonth && (
                  <span className="hidden rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white sm:inline-flex sm:items-center sm:gap-1">
                    <Icon glyph={FireIcon} size={12} /> Pic : {peakMonth.label} ({money(peakMonth.raw).replace(' F', '')} F)
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">
                  {money(totalAmount).replace(' F', '')}
                </span>
                <span className="mb-1 text-sm text-white/70">FCFA</span>
              </div>
              <div className="mt-6 flex h-[160px] items-end gap-1.5 px-1 sm:gap-2">
                {chartData.map((d, i) => (
                  <div key={i} className="group relative flex flex-1 flex-col justify-end">
                    <div className={`w-full rounded-t-md transition-all duration-200 ${d.raw > 0 ? 'bg-white/80 hover:bg-white' : 'bg-white/10'}`} style={{ height: `${Math.max(d.value, d.raw > 0 ? 3 : 0)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/50">
                <span>Jan</span><span>Mar</span><span>Mai</span><span>Juil</span><span>Sep</span><span>Nov</span>
              </div>
            </div>

            {/* Model breakdown */}
            <Card>
              <AdminSectionTitle title="Par modèle" subtitle="Commission vs marge" />
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#efedff] text-[#5b49e8]">
                        <Icon glyph={Target01Icon} size={14} />
                      </span>
                      <span className="font-bold text-[#292541]">Commission</span>
                    </div>
                    <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(commissionModelAmount)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#efedf5]">
                    <div className="h-2 rounded-full bg-[#5b49e8] transition-all" style={{ width: `${commissionPct}%` }} />
                  </div>
                  <p className="mt-1.5 text-right text-[10px] text-[#9290a2]">{commissionPct}% du total</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fff4de] text-[#ac741e]">
                        <Icon glyph={Store01Icon} size={14} />
                      </span>
                      <span className="font-bold text-[#292541]">Marge</span>
                    </div>
                    <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(margeModelAmount)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#efedf5]">
                    <div className="h-2 rounded-full bg-[#ac741e] transition-all" style={{ width: `${margePct}%` }} />
                  </div>
                  <p className="mt-1.5 text-right text-[10px] text-[#9290a2]">{margePct}% du total</p>
                </div>
                <div className="border-t border-[#efedf4] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9290a2]">Montant moyen / écriture</p>
                  <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{money(avgAmount)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Top sellers ── */}
          {topSellers.length > 0 && (
            <Card className="mt-5">
              <AdminSectionTitle
                title="Top vendeurs"
                subtitle="Classement par commissions générées"
                action={<AdminBadge tone="violet">{topSellers.length}</AdminBadge>}
              />
              <div className="mt-5 space-y-4">
                {topSellers.map((s, idx) => (
                  <div key={s.name + idx}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                          idx === 0 ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#716d82]'
                        }`}>{idx + 1}</span>
                        <span className="font-bold text-[#292541]">{s.name}</span>
                        <span className="text-[10px] text-[#9290a2]">{s.count} cmd</span>
                      </div>
                      <span className="shrink-0 font-[Space_Grotesk] font-bold text-[#292541]">{money(s.earnings)}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#efedf5]">
                      <div className="h-1.5 rounded-full bg-[#5b49e8] transition-all" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Filters ── */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9290a2]">
                <Icon glyph={Search01Icon} size={16} />
              </span>
              <input
                type="text"
                placeholder="Rechercher par vendeur, client, commande, campagne…"
                value={search}
                onChange={(e) => { haptic('light'); setSearch(e.target.value); }}
                className={`${adminInputClass} pl-11`}
                data-testid="input-commission-search"
              />
            </div>
            <select
              value={modelFilter}
              onChange={(e) => { haptic('light'); setModelFilter(e.target.value); }}
              className={`${adminSelectClass} lg:w-44`}
              data-testid="select-model-commission"
            >
              <option value="all">Tous modèles</option>
              <option value="commission">Commission</option>
              <option value="marge">Marge</option>
            </select>
          </div>

          {/* Status filter pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {statusFilters.map((f) => {
              const count = f === 'Tous' ? periodFiltered.length : periodFiltered.filter((c) => c.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => { haptic('light'); setStatusFilter(f); }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    statusFilter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'
                  }`}
                  data-testid={`filter-commission-${f}`}
                >
                  {f === 'Tous' ? 'Tous' : statusLabelMap[f] ?? f}
                  <span className={`rounded-full px-1.5 text-[9px] ${statusFilter === f ? 'bg-white/20' : 'bg-white'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <Card className="mt-5 p-0">
              <AdminEmptyState
                glyph={Wallet01Icon}
                title="Aucun résultat"
                description="Ajustez vos filtres pour afficher des écritures."
              />
            </Card>
          ) : (
            <Card className="mt-5 p-0">
              <div className="px-5 py-4">
                <AdminSectionTitle
                  title="Écritures"
                  subtitle={`${filtered.length} commission(s) affichée(s)`}
                  action={<AdminBadge tone="violet">{periodFiltered.length} total</AdminBadge>}
                />
              </div>
              <AdminScrollTable minWidth={760} testId="scroll-admin-commissions">
                <div className="divide-y divide-[#f1eef7]">
                  {filtered.map((c) => {
                    const order = orders.get(c.order_id);
                    const merchantId = order?.merchant_id;
                    const StatusGlyph = statusGlyphMap[c.status] ?? Clock01Icon;
                    return (
                      <div
                        key={c.id}
                        className="flex cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-[#faf9fd]"
                        onClick={() => { haptic('light'); setSelected(c); }}
                        data-testid={`row-commission-${c.id}`}
                      >
                        {/* Status icon */}
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          c.status === 'available' ? 'bg-[#e7faf2] text-[#278e69]' :
                          c.status === 'pending' ? 'bg-[#fff4de] text-[#ac741e]' :
                          c.status === 'paid' ? 'bg-[#efedff] text-[#5b49e8]' :
                          'bg-[#fff0f1] text-[#c45667]'
                        }`}>
                          <Icon glyph={StatusGlyph} size={16} />
                        </span>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-[#292541]">CMD-{c.order_id.slice(-6).toUpperCase()}</p>
                            <AdminBadge tone={c.model === 'marge' ? 'amber' : 'violet'}>
                              {c.model === 'marge' ? 'Marge' : 'Commission'}
                            </AdminBadge>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[#9290a2]">
                            {sellerNames.get(c.seller_id) ?? '—'} · {order?.customer_name ?? '—'} · {new Date(c.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>

                        {/* Merchant (hidden on mobile) */}
                        <div className="hidden shrink-0 md:block">
                          <p className="truncate text-xs text-[#77738a]">{merchantId ? (merchantNames.get(merchantId) ?? '—') : '—'}</p>
                        </div>

                        {/* Amount */}
                        <div className="shrink-0 text-right">
                          <p className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">{money(c.amount).replace(' F', '')}</p>
                          <p className="text-[10px] text-[#9290a2]">FCFA</p>
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0">
                          <AdminBadge tone={statusToneMap[c.status] ?? 'amber'}>
                            {statusLabelMap[c.status] ?? c.status}
                          </AdminBadge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminScrollTable>
            </Card>
          )}
        </>
      )}

      {/* ── Detail drawer ── */}
      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `CMD-${selected.order_id.slice(-6).toUpperCase()}` : ''}
        subtitle="Détail de l'écriture de commission"
        testId="drawer-commission-detail"
      >
        {selected && (
          <div className="space-y-5">
            {/* Amount + status */}
            <div className="rounded-2xl bg-gradient-to-br from-[#5745df] to-[#7d6cf5] p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Montant</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em]">{money(selected.amount).replace(' F', '')}</span>
                <span className="mb-1 text-sm text-[#d0caff]">FCFA</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <AdminBadge tone={statusToneMap[selected.status] ?? 'amber'} className="bg-white/15 text-white">
                  {statusLabelMap[selected.status] ?? selected.status}
                </AdminBadge>
                <AdminBadge tone={selected.model === 'marge' ? 'amber' : 'violet'} className="bg-white/15 text-white">
                  {selected.model === 'marge' ? 'Marge' : 'Commission'}
                </AdminBadge>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <DetailRow label="Référence" value={selected.id.slice(-8)} />
              <DetailRow label="Commande" value={`CMD-${selected.order_id.slice(-6).toUpperCase()}`} />
              <DetailRow label="Vendeur" value={selectedSeller ?? '—'} />
              <DetailRow label="Marchand" value={selectedMerchant ?? '—'} />
              <DetailRow label="Client" value={selectedOrder?.customer_name ?? '—'} />
              <DetailRow label="Campagne" value={selectedCampaign ?? '—'} />
              <DetailRow label="Total commande" value={selectedOrder ? money(selectedOrder.total_amount) : '—'} />
              <DetailRow label="Statut commande" value={selectedOrder?.status ?? '—'} />
              <DetailRow label="Date création" value={new Date(selected.created_at).toLocaleString('fr-FR')} />
              {selected.available_at && <DetailRow label="Disponible le" value={new Date(selected.available_at).toLocaleString('fr-FR')} />}
              {selected.reversed_at && <DetailRow label="Reprise le" value={new Date(selected.reversed_at).toLocaleString('fr-FR')} />}
              {selected.reversal_reason && <DetailRow label="Motif reprise" value={selected.reversal_reason} />}
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminPage>
  );
}

/* ── KPI Card ── */
function KpiCard({
  label,
  value,
  glyph,
  tone,
  sub,
}: {
  label: string;
  value: string;
  glyph: typeof Wallet01Icon;
  tone: 'violet' | 'mint' | 'amber';
  sub?: string;
}) {
  const toneClass = tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#efedff] text-[#5b49e8]';
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>
          <Icon glyph={glyph} size={18} />
        </span>
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">{label}</p>
      <strong className="mt-1 block font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{value}</strong>
      {sub && <p className="mt-1 text-[10px] text-[#9290a2]">{sub}</p>}
    </Card>
  );
}

/* ── Detail row ── */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#f1eef7] pb-3">
      <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#9290a2]">{label}</span>
      <span className="text-right text-sm font-bold text-[#292541]">{value}</span>
    </div>
  );
}
