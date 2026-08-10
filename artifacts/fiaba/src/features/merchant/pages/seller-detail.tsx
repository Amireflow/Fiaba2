import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import {
  ArrowLeft01Icon,
  ArrowUpRightIcon,
  UserRemove01Icon,
  Chart02Icon,
  Store01Icon,
  Wallet01Icon,
  UserGroupIcon,
  Target01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { money, haptic } from '@/lib/utils';
import {
  Badge,
  ConfirmDialog,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
} from '../components/merchant-ui';

type JoinedCampaignItem = {
  id: string;
  name: string;
  productName: string | null;
  commission: number;
  commissionType: string | null;
  model: string;
  status: string;
  joinedAt: string | null;
};

type SellerDetail = {
  id: string;
  display_name: string;
  status: string;
  followers: number;
  phone: string | null;
  joined_at: string | null;
  invited_at: string;
  city: string | null;
  salesCount: number;
  totalRevenue: number;
  totalCommissions: number;
  totalClicks: number;
  conversionRate: number;
  activeCampaignsCount: number;
  joinedCampaigns: JoinedCampaignItem[];
};

const statusLabel: Record<string, 'Actif' | 'Invité' | 'En attente'> = {
  actif: 'Actif',
  invite: 'Invité',
  suspendu: 'En attente',
};

const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k abonnés`;
  return `${n} abonnés`;
}

export function SellerDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { merchantId } = useAuth();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toRemove, setToRemove] = useState<SellerDetail | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setLoading(false);
        return;
      }

      // Fetch seller by ID or profile_id
      let { data: sellerRow } = await supabase
        .from('sellers')
        .select('id, display_name, status, followers, phone, joined_at, invited_at, profile_id, merchant_id')
        .eq('id', id)
        .maybeSingle();

      if (!sellerRow) {
        const { data: altRow } = await supabase
          .from('sellers')
          .select('id, display_name, status, followers, phone, joined_at, invited_at, profile_id, merchant_id')
          .eq('profile_id', id)
          .maybeSingle();
        sellerRow = altRow;
      }

      const row = sellerRow as {
        id: string;
        display_name: string;
        status: string;
        followers: number;
        phone: string | null;
        joined_at: string | null;
        invited_at: string;
        profile_id: string | null;
        merchant_id: string | null;
      } | null;

      if (!row) {
        setSeller(null);
        setLoading(false);
        return;
      }

      // Execute parallel queries for real statistics and joined campaigns
      const [profileRes, ordersRes, linksRes, campaignsRes] = await Promise.all([
        row.profile_id
          ? supabase.from('profiles').select('city, full_name, phone').eq('id', row.profile_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('orders')
          .select('id, total_amount, commission_amount, status')
          .eq('seller_id', row.id)
          .neq('status', 'annulee'),
        supabase
          .from('tracking_links')
          .select('clicks')
          .eq('seller_id', row.id),
        supabase
          .from('campaign_sellers')
          .select(`
            id, campaign_id, joined_at,
            campaigns:campaign_id (id, name, commission, commission_type, model, status, products:product_id(name))
          `)
          .eq('seller_id', row.id),
      ]);

      const prof = profileRes.data as { city: string | null; full_name: string | null; phone: string | null } | null;
      const orderRows = (ordersRes.data as { total_amount: number; commission_amount: number }[] | null) ?? [];
      const linkRows = (linksRes.data as { clicks: number }[] | null) ?? [];
      const rawCampaignSellers = (campaignsRes.data as any[] | null) ?? [];

      const joinedCampaigns: JoinedCampaignItem[] = rawCampaignSellers
        .map((j) => ({
          id: j.campaigns?.id,
          name: j.campaigns?.name ?? 'Campagne',
          productName: j.campaigns?.products?.name ?? null,
          commission: j.campaigns?.commission ?? 0,
          commissionType: j.campaigns?.commission_type ?? null,
          model: j.campaigns?.model ?? 'commission',
          status: j.campaigns?.status ?? 'active',
          joinedAt: j.joined_at,
        }))
        .filter((c) => !!c.id);

      const salesCount = orderRows.length;
      const totalRevenue = orderRows.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalCommissions = orderRows.reduce((sum, o) => sum + (o.commission_amount || 0), 0);
      const totalClicks = linkRows.reduce((sum, l) => sum + (l.clicks || 0), 0);
      const conversionRate = totalClicks > 0 ? Math.round((salesCount / totalClicks) * 100) : 0;
      const activeCampaignsCount = joinedCampaigns.filter((c) => c.status === 'active').length;
      const city = prof?.city ?? 'Dakar';
      const displayName = row.display_name || prof?.full_name || 'Vendeur';

      setSeller({
        id: row.id,
        display_name: displayName,
        status: row.status ?? 'actif',
        followers: row.followers ?? 0,
        phone: row.phone || prof?.phone || null,
        joined_at: row.joined_at,
        invited_at: row.invited_at,
        city,
        salesCount,
        totalRevenue,
        totalCommissions,
        totalClicks,
        conversionRate,
        activeCampaignsCount,
        joinedCampaigns,
      });
      setLoading(false);
    }

    loadData().catch(() => setLoading(false));
  }, [id, merchantId]);

  async function confirmRemove() {
    if (!toRemove) return;
    haptic('warning');
    const { error } = await supabase.from('sellers').delete().eq('id', toRemove.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Vendeur retiré', description: `${toRemove.display_name} ne fait plus partie de votre réseau.` });
    }
    setToRemove(null);
    setSeller(null);
  }

  if (loading) {
    return (
      <Page eyebrow="Vendeur" title="Chargement…" description="">
        <Card className="mt-6 p-12">
          <div className="flex items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      </Page>
    );
  }

  if (!seller) {
    return (
      <Page eyebrow="Vendeur" title="Introuvable" description="Ce vendeur n'existe pas.">
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-[#77738a]">Le vendeur est introuvable.</p>
          <Link href="/merchant/sellers" className="mt-4 inline-block"><Button variant="soft">Retour aux vendeurs</Button></Link>
        </Card>
      </Page>
    );
  }

  const label = statusLabel[seller.status] ?? 'Actif';

  return (
    <Page
      eyebrow="Fiche Affilié"
      title={seller.display_name}
      description={`${seller.city} · ${formatFollowers(seller.followers)}`}
      action={
        <Link href="/merchant/sellers">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-5">
        {/* Profile Card Header */}
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#dfdbff] text-lg font-bold text-[#5140d4]">
              {getInitials(seller.display_name)}
            </span>
            <div>
              <p className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">{seller.display_name}</p>
              <p className="mt-0.5 text-xs text-[#77738a]">{seller.city}, Sénégal</p>
              <div className="mt-1.5">
                <Badge tone={seller.status === 'actif' ? 'mint' : seller.status === 'invite' ? 'violet' : 'amber'}>{label}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Real Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3.5 sm:p-4">
            <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]">
              <Icon glyph={Store01Icon} size={18} />
            </span>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ventes réalisées</p>
            <p className="mt-1 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#292541]">{seller.salesCount}</p>
          </Card>

          <Card className="p-3.5 sm:p-4">
            <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
              <Icon glyph={Wallet01Icon} size={18} />
            </span>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">CA généré</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg sm:text-2xl font-bold text-[#292541]">{money(seller.totalRevenue)}</p>
          </Card>

          <Card className="p-3.5 sm:p-4">
            <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#fff4de] text-[#ac741e]">
              <Icon glyph={Chart02Icon} size={18} />
            </span>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Commissions</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg sm:text-2xl font-bold text-[#278e69]">{money(seller.totalCommissions)}</p>
          </Card>

          <Card className="p-3.5 sm:p-4">
            <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#f0eff5] text-[#67627b]">
              <Icon glyph={UserGroupIcon} size={18} />
            </span>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Clics (Conv.)</p>
            <p className="mt-1 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#292541]">
              {seller.totalClicks} <small className="text-xs font-sans text-[#807b98]">({seller.conversionRate}%)</small>
            </p>
          </Card>
        </div>

        {/* Real Performance Progress Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Niveau de Performance</p>
              <p className="mt-0.5 font-[Space_Grotesk] text-base font-bold text-[#292541]">
                {seller.salesCount} vente{seller.salesCount > 1 ? 's' : ''} · {seller.activeCampaignsCount} campagne{seller.activeCampaignsCount > 1 ? 's' : ''} active{seller.activeCampaignsCount > 1 ? 's' : ''}
              </p>
            </div>
            <Badge tone={seller.salesCount >= 10 ? 'mint' : seller.salesCount >= 1 ? 'violet' : 'slate'}>
              {seller.salesCount >= 10 ? 'Top Vendeur' : seller.salesCount >= 1 ? 'Actif' : 'Nouveau'}
            </Badge>
          </div>
          <div className="mt-3">
            <ProgressBar value={Math.min(100, Math.round((seller.salesCount / 20) * 100))} tone="violet" />
          </div>
          <p className="mt-2 text-xs text-[#77738a]">
            {seller.salesCount} ventes enregistrées · Taux de conversion {seller.conversionRate}% sur {seller.totalClicks} clics.
          </p>
        </Card>

        {/* Card for Joined Campaigns */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
              Campagnes rejointes ({seller.joinedCampaigns.length})
            </p>
            <Link href="/merchant/campaigns">
              <Button variant="ghost" className="text-xs py-1 px-2.5">
                Voir toutes les campagnes <Icon glyph={ArrowUpRightIcon} size={13} />
              </Button>
            </Link>
          </div>

          {seller.joinedCampaigns.length === 0 ? (
            <p className="text-xs text-[#77738a] py-2">Ce vendeur n'a rejoint aucune campagne pour le moment.</p>
          ) : (
            <div className="space-y-2 divide-y divide-[#f1eef7]">
              {seller.joinedCampaigns.map((c) => (
                <div key={c.id} className="pt-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#292541] truncate">{c.name}</p>
                    {c.productName && <p className="text-[11px] text-[#9290a2] truncate">{c.productName}</p>}
                  </div>
                  <div className="shrink-0 ml-3">
                    <Badge tone={c.status === 'active' ? 'mint' : 'slate'}>
                      {c.status === 'active' ? 'Active' : 'En pause'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Detailed Information Card */}
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Informations du profil</p>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#77738a]">Téléphone</span><span className="font-bold text-[#292541]">{seller.phone ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Audience</span><span className="font-bold text-[#292541]">{formatFollowers(seller.followers)}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Inscrit le</span><span className="font-bold text-[#292541]">{formatDate(seller.joined_at || seller.invited_at)}</span></div>
          </div>
        </Card>

        {/* Actions Footer */}
        <div className="flex flex-wrap justify-between gap-2">
          {seller.status === 'actif' ? (
            <Button variant="danger" onClick={() => setToRemove(seller)} testId="button-remove-seller">
              <Icon glyph={UserRemove01Icon} size={15} /> Retirer du réseau
            </Button>
          ) : seller.status === 'invite' ? (
            <Badge tone="violet">Invitation envoyée</Badge>
          ) : (
            <Badge tone="amber">Suspendu</Badge>
          )}
          <Link href="/merchant/campaigns">
            <Button variant="ghost">Voir les campagnes <Icon glyph={ArrowUpRightIcon} size={14} /></Button>
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        title="Retirer ce vendeur ?"
        message={toRemove ? `${toRemove.display_name} ne fera plus partie de votre réseau. Il ne recevra plus vos campagnes.` : ''}
        confirmLabel="Retirer"
      />
    </Page>
  );
}
