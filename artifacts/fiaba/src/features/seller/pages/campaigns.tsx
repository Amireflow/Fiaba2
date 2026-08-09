import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight01Icon, Chart02Icon, Copy01Icon, Share02Icon, Store01Icon, Target01Icon, UserGroupIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerEmptyState,
  SellerPage as Page,
} from '../components/seller-ui';

type JoinedCampaign = {
  campaign_seller_id: string;
  campaign_id: string;
  campaign_name: string;
  product_name: string | null;
  merchant_name: string;
  commission: number;
  commission_type: string | null;
  model: string;
  status: string;
  tracking_token: string | null;
  seller_code: string | null;
  clicks: number;
  sales: number;
  earnings: number;
};

export function SellerCampaigns() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<JoinedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [toLeave, setToLeave] = useState<JoinedCampaign | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    async function loadCampaigns() {
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

      // Get joined campaigns
      const { data: joined } = await supabase
        .from('campaign_sellers')
        .select('id, campaign_id, joined_at')
        .eq('seller_id', sId);

      const joinedRows = (joined as { id: string; campaign_id: string; joined_at: string }[] | null) ?? [];
      if (joinedRows.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Fetch campaign details
      const campaignIds = joinedRows.map((j) => j.campaign_id);
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select(`
          id, name, commission, commission_type, model, status,
          product_id, merchant_id,
          products:product_id (name),
          merchants:merchant_id (name)
        `)
        .in('id', campaignIds);

      // Fetch tracking links
      const { data: links } = await supabase
        .from('tracking_links')
        .select('campaign_id, token, seller_code, clicks')
        .eq('seller_id', sId);

      // Fetch commissions for earnings + sales count
      const { data: commissions } = await supabase
        .from('commissions')
        .select('campaign_id, amount, status')
        .eq('seller_id', sId);

      const campaignMap = new Map<string, JoinedCampaign>();
      const linkMap = new Map<string, { token: string; seller_code: string; clicks: number }>(
        ((links as { campaign_id: string; token: string; seller_code: string; clicks: number }[] | null) ?? [])
          .map((l) => [l.campaign_id, { token: l.token, seller_code: l.seller_code, clicks: l.clicks }])
      );

      const commissionAgg = new Map<string, { earnings: number; sales: number }>();
      ((commissions as { campaign_id: string; amount: number; status: string }[] | null) ?? []).forEach((c) => {
        const agg = commissionAgg.get(c.campaign_id) ?? { earnings: 0, sales: 0 };
        agg.earnings += c.amount;
        agg.sales += 1;
        commissionAgg.set(c.campaign_id, agg);
      });

      for (const j of joinedRows) {
        const c = (campaignData as unknown[] | null)?.find((r) => {
          const row = r as { id: string };
          return row.id === j.campaign_id;
        }) as {
          id: string; name: string; commission: number; commission_type: string | null;
          model: string; status: string;
          products: { name: string } | null;
          merchants: { name: string } | null;
        } | undefined;

        const link = linkMap.get(j.campaign_id);
        const agg = commissionAgg.get(j.campaign_id) ?? { earnings: 0, sales: 0 };

        if (c) {
          campaignMap.set(j.campaign_id, {
            campaign_seller_id: j.id,
            campaign_id: j.campaign_id,
            campaign_name: c.name,
            product_name: c.products?.name ?? null,
            merchant_name: c.merchants?.name ?? 'Boutique',
            commission: c.commission,
            commission_type: c.commission_type,
            model: c.model,
            status: c.status,
            tracking_token: link?.token ?? null,
            seller_code: link?.seller_code ?? null,
            clicks: link?.clicks ?? 0,
            sales: agg.sales,
            earnings: agg.earnings,
          });
        }
      }

      setCampaigns(Array.from(campaignMap.values()));
      setLoading(false);
    }
    loadCampaigns();
  }, [profile]);

  function copyLink(c: JoinedCampaign) {
    haptic('light');
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
    const link = `${window.location.origin}${baseUrl}/p/${c.tracking_token ?? c.campaign_id}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    toast({ title: 'Lien copié', description: 'Partagez-le sur WhatsApp ou vos réseaux.' });
  }

  function copyCode(c: JoinedCampaign) {
    haptic('light');
    navigator.clipboard?.writeText(c.seller_code ?? '').catch(() => {});
    toast({ title: 'Code copié', description: `Code ${c.seller_code} prêt à partager.` });
  }

  async function confirmLeave() {
    if (!toLeave) return;
    setLeaving(true);
    haptic('warning');
    const { error } = await supabase
      .from('campaign_sellers')
      .delete()
      .eq('id', toLeave.campaign_seller_id);

    setLeaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      setCampaigns((prev) => prev.filter((c) => c.campaign_id !== toLeave.campaign_id));
      toast({ title: 'Campagne quittée', description: `${toLeave.campaign_name} n'est plus dans vos campagnes.` });
    }
    setToLeave(null);
  }

  const totalEarnings = campaigns.reduce((s, c) => s + c.earnings, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.sales, 0);

  const toneFor = (s: string): 'mint' | 'violet' | 'slate' =>
    s === 'active' ? 'mint' : s === 'en_pause' ? 'slate' : 'violet';

  return (
    <Page
      eyebrow="Votre activité"
      title="Mes campagnes"
      description="Les campagnes que vous avez rejointes. Partagez, suivez vos clics et vos ventes."
    >
      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={Wallet01Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Gains totaux</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(totalEarnings)}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={UserGroupIcon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Clics générés</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{totalClicks}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff4de] text-[#ac741e]"><Icon glyph={Store01Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ventes</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{totalSales}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667]"><Icon glyph={Target01Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Taux de conversion</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{totalClicks > 0 ? Math.round((totalSales / totalClicks) * 100) : 0}%</p>
        </Card>
      </div>

      {/* Campaigns list */}
      {loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card className="mt-5">
          <SellerEmptyState
            glyph={Chart02Icon}
            title="Aucune campagne rejointe"
            description="Explorez les opportunités disponibles et rejoignez votre première campagne."
            action={<Link href="/seller"><Button>Découvrir les produits</Button></Link>}
          />
        </Card>
      ) : (
        <div className="mt-5 space-y-4">
          {campaigns.map((c) => (
            <Card key={c.campaign_id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.campaign_name}</p>
                  <p className="mt-0.5 text-xs text-[#9290a2]">{c.product_name ?? 'Produit'} · {c.merchant_name}</p>
                </div>
                <SellerBadge tone={toneFor(c.status)}>{c.status === 'active' ? 'Active' : c.status === 'en_pause' ? 'En pause' : c.status}</SellerBadge>
              </div>

              {/* Stats inline */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#f8f7fc] p-3 text-center sm:grid-cols-4">
                <div><p className="text-[10px] text-[#9290a2]">Clics</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">{c.clicks}</p></div>
                <div><p className="text-[10px] text-[#9290a2]">Ventes</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">{c.sales}</p></div>
                <div><p className="text-[10px] text-[#9290a2]">Commission</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#278e69]">{c.commission_type === 'fixed' ? money(c.commission) : `${c.commission}%`}</p></div>
                <div><p className="text-[10px] text-[#9290a2]">Gains</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">{money(c.earnings)}</p></div>
              </div>

              {/* Link + code */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-3 py-2.5">
                  <Icon glyph={Store01Icon} size={15} />
                  <span className="min-w-0 flex-1 truncate text-xs text-[#77738a]">/p/{c.tracking_token ?? c.campaign_id}</span>
                  <button onClick={() => copyLink(c)} className="shrink-0 text-[#5b49e8]" data-testid={`copy-link-${c.campaign_id}`}><Icon glyph={Copy01Icon} size={15} /></button>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-3 py-2.5">
                  <span className="text-[10px] font-bold uppercase text-[#9290a2]">Code</span>
                  <span className="flex-1 text-xs font-bold text-[#292541]">{c.seller_code ?? '—'}</span>
                  <button onClick={() => copyCode(c)} className="shrink-0 text-[#5b49e8]" data-testid={`copy-code-${c.campaign_id}`}><Icon glyph={Copy01Icon} size={15} /></button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/seller/share/${c.campaign_id}`}>
                  <Button testId={`share-${c.campaign_id}`}><Icon glyph={Share02Icon} size={15} /> Partager</Button>
                </Link>
                <Link href="/seller/sales">
                  <Button variant="soft" testId={`sales-${c.campaign_id}`}>Voir les ventes <Icon glyph={ArrowUpRight01Icon} size={14} /></Button>
                </Link>
                <Button variant="ghost" onClick={() => { haptic('light'); setToLeave(c); }} testId={`leave-${c.campaign_id}`}>Quitter</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm leave */}
      {toLeave && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#201b3c]/75 p-4" role="alertdialog">
          <div className="w-full max-w-[380px] rounded-[22px] bg-[#fffefd] p-6 shadow-2xl">
            <p className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">Quitter cette campagne ?</p>
            <p className="mt-2 text-sm leading-5 text-[#77738a]">Vous ne gagnerez plus de commissions sur les futures ventes de « {toLeave.campaign_name} ».</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setToLeave(null)}>Annuler</Button>
              <Button variant="danger" onClick={confirmLeave} disabled={leaving}>{leaving ? '…' : 'Quitter'}</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
