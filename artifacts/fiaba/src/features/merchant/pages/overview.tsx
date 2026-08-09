import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowUpRightIcon, CheckmarkCircle02Icon, Store01Icon, UserGroupIcon, ViewIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Badge, MerchantButton as Button, MerchantCard as Card, Page, Stat, ProgressBar } from '../components/merchant-ui';

type OrderRow = {
  id: string;
  customer_name: string;
  total_amount: number;
  merchant_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
};

type SellerRow = {
  id: string;
  status: string;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
};

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

export function Overview() {
  const { profile, merchantId } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!merchantId) {
        setLoading(false);
        return;
      }

      // Fetch recent orders
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, merchant_amount, commission_amount, status, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(20);
      setOrders((orderData as OrderRow[] | null) ?? []);

      // Fetch sellers
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('id, status')
        .eq('merchant_id', merchantId);
      setSellers((sellerData as SellerRow[] | null) ?? []);

      // Fetch campaigns
      const { data: campData } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('merchant_id', merchantId);
      setCampaigns((campData as CampaignRow[] | null) ?? []);

      setLoading(false);
    }
    loadData();
  }, [merchantId]);

  // Compute stats
  const deliveredOrders = orders.filter((o) => o.status === 'livree');
  const pendingOrders = orders.filter((o) => o.status === 'a_preparer' || o.status === 'en_livraison');
  const revenue = deliveredOrders.reduce((s, o) => s + o.total_amount, 0);
  const commissionTotal = orders.reduce((s, o) => s + (o.commission_amount ?? 0), 0);
  const pendingSellers = sellers.filter((s) => s.status === 'invite').length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

  // Build 12-bar chart from last 12 days of orders
  const bars = (() => {
    const days: number[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayRevenue = orders
        .filter((o) => o.created_at.slice(0, 10) === dayStr)
        .reduce((s, o) => s + o.total_amount, 0);
      days.push(dayRevenue);
    }
    const max = Math.max(...days, 1);
    return days.map((v) => Math.round((v / max) * 100));
  })();

  const recentOrders = orders.slice(0, 4);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'cher marchand';
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Page
      eyebrow={today}
      title={`Bonjour, ${firstName}`}
      description="Voici ce qui se passe dans votre réseau aujourd'hui."
      action={
        <Link href="/merchant/analytics">
          <Button variant="soft">
            Voir l'analytique <Icon glyph={ArrowUpRightIcon} size={15} />
          </Button>
        </Link>
      }
    >
      {/* Revenue + sales */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">Chiffre d'affaires livré</p>
            <Link href="/merchant/payments" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/25" data-testid="link-overview-payments">
              Gérer paiements <Icon glyph={ArrowUpRightIcon} size={13} />
            </Link>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">{showBalance ? money(revenue).replace(' F', '') : '•• •••'}</span>
            <span className="mb-1 text-sm text-white/70">FCFA</span>
            <button type="button" onClick={() => setShowBalance((v) => !v)} className="mb-1 ml-auto text-white/80 hover:text-white" aria-label="Afficher/masquer le solde">
              <Icon glyph={ViewIcon} size={24} />
            </button>
          </div>
          <div className="mt-3"><Badge tone="mint">{deliveredOrders.length} commande(s) livrée(s)</Badge></div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-sm">
            <div>
              <p className="text-white/70">Commissions réseau</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">{money(commissionTotal).replace(' F', '')} F</p>
            </div>
            <div>
              <p className="text-white/70">Vendeurs actifs</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">{sellers.filter((s) => s.status === 'actif').length}</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#292541]">Ventes 12 derniers jours</p>
            <Badge>{orders.length} cmd</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{money(orders.reduce((s, o) => s + o.total_amount, 0)).replace(' F', '')} F</strong>
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
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Commandes livrées" value={String(deliveredOrders.length).padStart(2, '0')} change={`${pendingOrders.length} en cours`} glyph={CheckmarkCircle02Icon} tone="mint" />
        <Stat label="Commandes en cours" value={String(pendingOrders.length).padStart(2, '0')} change={`${orders.filter((o) => o.status === 'a_preparer').length} à préparer`} glyph={Store01Icon} />
        <Stat label="Campagnes actives" value={String(activeCampaigns).padStart(2, '0')} change={`${campaigns.length} au total`} glyph={UserGroupIcon} tone="amber" />
      </div>

      {/* Recent orders + alerts */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#292541]">Dernières commandes</p>
            <Link href="/merchant/orders" className="text-xs font-bold text-[#5b49e8] hover:text-[#4e3bd5]" data-testid="link-overview-orders">Voir tout <Icon glyph={ArrowUpRightIcon} size={13} /></Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8b88a0]">Aucune commande pour le moment.</div>
          ) : (
            <div className="mt-4 divide-y divide-[#f1eef7]">
              {recentOrders.map((order) => {
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
                      <Badge tone={tone}>{statusLabel[order.status] ?? order.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <p className="text-sm font-bold text-[#292541]">À ne pas manquer</p>
          <div className="mt-4 space-y-3">
            {pendingSellers > 0 && (
              <Link href="/merchant/sellers" className="block rounded-2xl bg-[#5745df] p-4 text-white transition hover:opacity-95" data-testid="link-overview-sellers">
                <p className="text-sm font-bold">{pendingSellers} vendeur(s) en attente</p>
                <p className="mt-1 text-xs text-white/70">Cliquez pour les examiner <Icon glyph={ArrowUpRightIcon} size={13} /></p>
              </Link>
            )}
            <Link href="/merchant/payments" className="block rounded-2xl bg-[#e7faf2] p-4 text-[#1f7a3a] transition hover:bg-[#ddf5e8]" data-testid="link-overview-payout">
              <p className="text-sm font-bold">Gérer vos versements</p>
              <p className="mt-1 text-xs opacity-80">Suivez votre trésorerie <Icon glyph={ArrowUpRightIcon} size={13} /></p>
            </Link>
            {activeCampaigns > 0 && (
              <Link href="/merchant/campaigns" className="block rounded-2xl bg-[#fff4de] p-4 text-[#ac741e] transition hover:opacity-95">
                <p className="text-sm font-bold">{activeCampaigns} campagne(s) active(s)</p>
                <div className="mt-2"><ProgressBar value={Math.min(100, (activeCampaigns / Math.max(campaigns.length, 1)) * 100)} tone="amber" /></div>
                <p className="mt-2 text-xs opacity-80">Suivez vos performances</p>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}
