import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Alert01Icon, ArrowUpRightIcon, CheckmarkCircle02Icon, Shield01Icon, Store01Icon, UserGroupIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { AdminBadge, AdminButton as Button, AdminCard as Card, AdminPage, AdminStat, SeverityBadge } from '../components/admin-ui';

type OrderRow = {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  platform_fee_amount: number;
  status: string;
  created_at: string;
  seller_id: string | null;
};

type ProfileRow = { id: string; role: string; verification_status: string };
type MerchantRow = { id: string; status: string };
type SellerRow = { id: string; status: string };
type DisputeRow = { id: string; status: string };
type FraudRow = { id: string; signal_type: string; target_user: string | null; detail: string | null; severity: string; status: string; created_at: string };

const statusTone: Record<string, 'mint' | 'amber' | 'rose' | 'violet'> = {
  livree: 'mint',
  a_preparer: 'amber',
  en_livraison: 'violet',
  annulee: 'rose',
};

const statusLabel: Record<string, string> = {
  livree: 'Livrée',
  a_preparer: 'À préparer',
  en_livraison: 'En livraison',
  annulee: 'Annulée',
};

const fraudSeverityMap: Record<string, 'Critique' | 'Élevé' | 'Moyen'> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
};

const fraudStatusMap: Record<string, string> = {
  new: 'Nouveau',
  in_review: 'En revue',
  blocked: 'Bloqué',
  ignored: 'Ignoré',
};

export function AdminOverview() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [ordersRes, profilesRes, merchantsRes, sellersRes, disputesRes, fraudRes] = await Promise.all([
        supabase.from('orders').select('id, customer_name, total_amount, commission_amount, platform_fee_amount, status, created_at, seller_id').order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('id, role, verification_status'),
        supabase.from('merchants').select('id, status'),
        supabase.from('sellers').select('id, status'),
        supabase.from('disputes').select('id, status'),
        supabase.from('fraud_signals').select('id, signal_type, target_user, detail, severity, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setOrders((ordersRes.data as OrderRow[] | null) ?? []);
      setProfiles((profilesRes.data as ProfileRow[] | null) ?? []);
      setMerchants((merchantsRes.data as MerchantRow[] | null) ?? []);
      setSellers((sellersRes.data as SellerRow[] | null) ?? []);
      setDisputes((disputesRes.data as DisputeRow[] | null) ?? []);
      setFraudAlerts((fraudRes.data as FraudRow[] | null) ?? []);
      setLoading(false);
    }
    loadData();
  }, []);

  const gmv = orders.reduce((s, o) => s + (o.status === 'annulee' ? 0 : o.total_amount), 0);
  const commissionTotal = orders.reduce((s, o) => s + (o.commission_amount ?? 0), 0);
  const platformFeeTotal = orders.reduce((s, o) => s + (o.platform_fee_amount ?? 0), 0);
  const pendingVerifications = profiles.filter((p) => p.verification_status === 'pending').length;
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'in_review').length;
  const newFraud = fraudAlerts.filter((f) => f.status === 'new').length;
  const activeMerchants = merchants.filter((m) => m.status === 'actif').length;
  const activeSellers = sellers.filter((s) => s.status === 'actif').length;

  // Build 12-bar chart from last 12 days
  const bars = (() => {
    const days: number[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayCount = orders.filter((o) => o.created_at.slice(0, 10) === dayStr).length;
      days.push(dayCount);
    }
    const max = Math.max(...days, 1);
    return days.map((v) => Math.round((v / max) * 100));
  })();

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AdminPage
      eyebrow={today}
      title="Vue d'ensemble"
      description="L'état de la plateforme en un coup d'œil — adoption, liquidité et signaux de confiance."
      action={
        <Link href="/admin/fraud">
          <Button variant="soft">
            Examiner les risques <Icon glyph={Shield01Icon} size={15} />
          </Button>
        </Link>
      }
    >
      {/* GMV + adoption */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">GMV (10 dernières commandes)</p>
            <Link href="/admin/orders" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/25" data-testid="link-overview-orders">
              Voir les commandes <Icon glyph={ArrowUpRightIcon} size={13} />
            </Link>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">{money(gmv).replace(' F', '')}</span>
            <span className="mb-1 text-sm text-white/70">FCFA</span>
          </div>
          <div className="mt-3"><AdminBadge tone="mint">{orders.length} commandes récentes</AdminBadge></div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-sm">
            <div>
              <p className="text-white/70">Commissions générées</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">{money(commissionTotal).replace(' F', '')} F</p>
            </div>
            <div>
              <p className="text-white/70">Frais de plateforme</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">{money(platformFeeTotal).replace(' F', '')} F</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#292541]">Commandes · 12 derniers jours</p>
            <AdminBadge>{orders.length} récentes</AdminBadge>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{orders.length}</strong>
            <span className="text-sm text-[#77738a]">échantillon</span>
          </div>
          <div className="mt-6 flex h-[120px] items-end justify-between gap-1.5 sm:gap-2">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(h, 4)}%`, backgroundColor: i >= bars.length - 3 ? '#5b49e8' : '#dedbfa' }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[#9290a2]">
            <span>il y a 12j</span><span>aujourd'hui</span>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Commerçants actifs" value={String(activeMerchants)} change={`${merchants.length} au total`} glyph={Store01Icon} />
        <AdminStat label="Vendeurs actifs" value={String(activeSellers)} change={`${sellers.length} au total`} glyph={UserGroupIcon} tone="mint" />
        <AdminStat label="Litiges ouverts" value={String(openDisputes)} change={`${disputes.length} au total`} glyph={CheckmarkCircle02Icon} tone="amber" />
        <AdminStat label="Signaux fraude" value={String(newFraud)} change={`${fraudAlerts.length} récents`} glyph={Wallet01Icon} />
      </div>

      {/* Action queue + recent orders */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#292541]">Dernières commandes</p>
            <Link href="/admin/orders" className="text-xs font-bold text-[#5b49e8] hover:text-[#4e3bd5]" data-testid="link-overview-all-orders">Voir tout <Icon glyph={ArrowUpRightIcon} size={13} /></Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8b88a0]">Aucune commande pour le moment.</div>
          ) : (
            <div className="mt-4 divide-y divide-[#f1eef7]">
              {orders.slice(0, 4).map((order) => {
                const tone = statusTone[order.status] ?? 'amber';
                const shortId = `CMD-${order.id.slice(-6).toUpperCase()}`;
                return (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#292541]">{shortId}</p>
                      <p className="truncate text-xs text-[#9290a2]">{order.customer_name} · {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold text-[#292541]">{money(order.total_amount)}</span>
                      <AdminBadge tone={tone}>{statusLabel[order.status] ?? order.status}</AdminBadge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <p className="text-sm font-bold text-[#292541]">File d'action</p>
          <div className="mt-4 space-y-3">
            {pendingVerifications > 0 && (
              <Link href="/admin/users" className="block rounded-2xl bg-[#fff4de] p-4 text-[#ac741e] transition hover:bg-[#fff3d0]" data-testid="link-overview-verifications">
                <p className="text-sm font-bold">{pendingVerifications} compte(s) à vérifier</p>
                <p className="mt-1 text-xs opacity-80">Marchands et vendeurs en attente <Icon glyph={ArrowUpRightIcon} size={13} /></p>
              </Link>
            )}
            {openDisputes > 0 && (
              <Link href="/admin/disputes" className="block rounded-2xl bg-[#fff0f1] p-4 text-[#c45667] transition hover:bg-[#ffe6e8]" data-testid="link-overview-disputes">
                <p className="text-sm font-bold">{openDisputes} litige(s) ouverts</p>
                <p className="mt-1 text-xs opacity-80">À arbitrer sous 48h <Icon glyph={ArrowUpRightIcon} size={13} /></p>
              </Link>
            )}
            {newFraud > 0 && (
              <Link href="/admin/fraud" className="block rounded-2xl bg-[#5745df] p-4 text-white transition hover:opacity-95" data-testid="link-overview-fraud">
                <p className="text-sm font-bold">{newFraud} signal(aux) de fraude nouveaux</p>
                <p className="mt-1 text-xs text-white/70">Examiner avant blocage <Icon glyph={ArrowUpRightIcon} size={13} /></p>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Top fraud signals */}
      {fraudAlerts.length > 0 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#292541]">Signaux de fraude récents</p>
              <p className="mt-1 text-[11px] text-[#9290a2]">Revue administrative avant tout blocage automatique.</p>
            </div>
            <Link href="/admin/fraud" className="text-xs font-bold text-[#5b49e8] hover:text-[#4e3bd5]" data-testid="link-overview-all-fraud">Tout examiner <Icon glyph={ArrowUpRightIcon} size={13} /></Link>
          </div>
          <div className="mt-4 divide-y divide-[#f1eef7]">
            {fraudAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667]"><Icon glyph={Alert01Icon} size={17} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#292541]">{alert.signal_type}</p>
                    <p className="truncate text-xs text-[#9290a2]">{alert.detail ?? '—'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severity={fraudSeverityMap[alert.severity] ?? 'Moyen'} />
                  <AdminBadge tone="slate">{fraudStatusMap[alert.status] ?? alert.status}</AdminBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AdminPage>
  );
}
