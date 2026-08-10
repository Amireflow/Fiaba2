import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import {
  ArrowLeft01Icon,
  Copy01Icon,
  Facebook01Icon,
  InstagramIcon,
  Share02Icon,
  Store01Icon,
  TiktokIcon,
  WhatsappIcon,
  Wallet01Icon,
  Chart02Icon,
  CheckmarkCircle02Icon,
  LockKeyIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { money, haptic } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { getFirstImageUrl } from '@/lib/storage-upload';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
  sellerTextareaClass,
} from '../components/seller-ui';

const shareChannels = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    glyph: WhatsappIcon,
    color: 'bg-[#25d366] text-white shadow-sm hover:bg-[#20ba5a]',
    url: (link: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${link}`)}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    glyph: InstagramIcon,
    color: 'bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-sm',
    url: () => 'https://instagram.com',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    glyph: TiktokIcon,
    color: 'bg-[#000000] text-white shadow-sm',
    url: () => 'https://tiktok.com',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    glyph: Facebook01Icon,
    color: 'bg-[#1877f2] text-white shadow-sm',
    url: (link: string) => `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
];

type CampaignData = {
  campaignId: string;
  campaignName: string;
  productName: string;
  merchantName: string;
  commission: number;
  commissionType: string | null;
  model: string;
  productPrice: number;
  productImage: string | null;
  token: string;
  sellerCode: string;
  clicks: number;
  sales: number;
  earnings: number;
};

export function Share() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activePreset, setActivePreset] = useState<'status' | 'story' | 'direct'>('status');

  useEffect(() => {
    async function loadData() {
      if (!id || !profile) {
        setLoading(false);
        return;
      }

      // Fetch seller
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      const sId = (seller as { id: string } | null)?.id;
      if (!sId) {
        setLoading(false);
        return;
      }

      // Fetch tracking link
      const { data: linkRow } = await supabase
        .from('tracking_links')
        .select('token, seller_code, clicks, campaign_id')
        .eq('campaign_id', id)
        .eq('seller_id', sId)
        .maybeSingle();

      const link = linkRow as { token: string; seller_code: string; clicks: number; campaign_id: string } | null;
      if (!link) {
        setLoading(false);
        return;
      }

      // Fetch campaign + product details
      const { data: campaignRow } = await supabase
        .from('campaigns')
        .select(`
          id, name, commission, commission_type, model, product_id, merchant_id,
          products:product_id (name, price, image_url),
          merchants:merchant_id (name)
        `)
        .eq('id', id)
        .maybeSingle();

      const c = campaignRow as {
        id: string;
        name: string;
        commission: number;
        commission_type: string | null;
        model: string;
        product_id: string | null;
        merchant_id: string;
        products: { name: string; price: number; image_url: string | null } | null;
        merchants: { name: string } | null;
      } | null;

      if (!c) {
        setLoading(false);
        return;
      }

      // Fetch commissions for sales + earnings count
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount')
        .eq('seller_id', sId)
        .eq('campaign_id', id);

      const commissionRows = (commissions as { amount: number }[] | null) ?? [];
      const sales = commissionRows.length;
      const earnings = commissionRows.reduce((sum, item) => sum + item.amount, 0);

      const data: CampaignData = {
        campaignId: c.id,
        campaignName: c.name,
        productName: c.products?.name ?? 'Produit',
        merchantName: c.merchants?.name ?? 'Boutique',
        commission: Number(c.commission),
        commissionType: c.commission_type,
        model: c.model,
        productPrice: c.products?.price ?? 0,
        productImage: c.products?.image_url ?? null,
        token: link.token,
        sellerCode: link.seller_code,
        clicks: link.clicks ?? 0,
        sales,
        earnings,
      };

      setCampaign(data);
      applyPreset('status', data);
      setLoading(false);
    }
    loadData();
  }, [id, profile]);

  const applyPreset = (preset: 'status' | 'story' | 'direct', data = campaign) => {
    if (!data) return;
    setActivePreset(preset);

    if (preset === 'status') {
      setMessage(`🔥 Nouveau coup de cœur chez ${data.merchantName} ! Retrouvez « ${data.productName} » au meilleur prix.\nUtilisez mon code promo exclusif : ${data.sellerCode} 👇`);
    } else if (preset === 'story') {
      setMessage(`Je vous recommande vivement ${data.productName} ! Commandez directement via mon lien ou utilisez le code ${data.sellerCode} à la commande 👇`);
    } else {
      setMessage(`Salut ! Je te partage ce super produit de ${data.merchantName} : ${data.productName}. Tu peux commander via mon lien ci-dessous (code ${data.sellerCode}) :`);
    }
  };

  if (loading) {
    return (
      <Page eyebrow="Partage rapide" title="Préparation de votre lien…" description="">
        <Card className="mt-6 p-12 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
            <span className="text-xs font-bold text-[#77738a]">Génération de votre lien sécurisé…</span>
          </div>
        </Card>
      </Page>
    );
  }

  if (!campaign) {
    return (
      <Page eyebrow="Erreur" title="Campagne non trouvée" description="Cette campagne n'est plus accessible.">
        <Card className="mt-6 p-6">
          <Link href="/seller/campaigns">
            <Button variant="soft">← Retour à mes campagnes</Button>
          </Link>
        </Card>
      </Page>
    );
  }

  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
  const fullLink = `${window.location.origin}${baseUrl}/p/${campaign.token}`;
  const checkoutPath = `/checkout/${campaign.campaignId}?t=${campaign.token}`;
  const isFixed = campaign.model === 'marge' || campaign.commissionType === 'fixed';
  const netGain = isFixed ? campaign.commission : Math.round((campaign.productPrice * campaign.commission) / 100);

  function copyLink() {
    haptic('medium');
    navigator.clipboard?.writeText(fullLink).catch(() => {});
    toast({ title: 'Lien copié dans le presse-papier !', description: 'Prêt à être collé dans vos stories ou conversations.' });
  }

  function copyCode() {
    haptic('light');
    navigator.clipboard?.writeText(campaign!.sellerCode).catch(() => {});
    toast({ title: 'Code copié !', description: `Code ${campaign!.sellerCode} copié avec succès.` });
  }

  function copyMessage() {
    haptic('light');
    navigator.clipboard?.writeText(message).catch(() => {});
    toast({ title: 'Message copié !', description: 'Collez-le directement dans votre application préférée.' });
  }

  // Native Mobile Share API with fallback
  async function triggerNativeShare() {
    haptic('medium');
    trackEvent('share_clicked', {
      entityType: 'campaign',
      entityId: campaign?.campaignId ?? '',
      metadata: { channel: 'native_share' },
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign?.productName ?? 'Produit',
          text: message,
          url: fullLink,
        });
        toast({ title: 'Partage initié !', description: 'Merci de partager avec votre communauté.' });
        return;
      } catch (err) {
        // User cancelled or non-critical abort
      }
    }
    // Fallback to WhatsApp
    shareTo(shareChannels[0]);
  }

  function shareTo(channel: (typeof shareChannels)[number]) {
    haptic('light');
    const url = channel.url(fullLink, message);
    trackEvent('share_clicked', {
      entityType: 'campaign',
      entityId: campaign?.campaignId ?? '',
      metadata: { channel: channel.id },
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Page
      eyebrow="Centre de Partage"
      title="Partager & Encaisser"
      description={`Partagez ${campaign.productName} et gagnez +${money(netGain)} à chaque commande confirmée.`}
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/seller/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5b49e8] hover:underline"
          data-testid="link-back-campaigns"
        >
          <Icon glyph={ArrowLeft01Icon} size={15} /> Mes campagnes
        </Link>
        <SellerBadge tone="mint">
          <Icon glyph={Wallet01Icon} size={12} /> Gain : +{money(netGain)} / vente
        </SellerBadge>
      </div>

      {/* Compact Mobile Product Preview Header */}
      <Card className="mt-4 p-4 border border-[#f0edfa]">
        <div className="flex items-center gap-3">
          {getFirstImageUrl(campaign.productImage) ? (
            <img
              src={getFirstImageUrl(campaign.productImage)!}
              alt={campaign.productName}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-[#eee]"
            />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
              <Icon glyph={Store01Icon} size={26} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-[Space_Grotesk] text-base font-bold text-[#292541]">
              {campaign.productName}
            </h2>
            <p className="mt-0.5 truncate text-xs text-[#9290a2]">{campaign.merchantName}</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(campaign.productPrice)}</span>
              <span className="text-[#9290a2]">·</span>
              <span className="font-bold text-[#278e69]">Votre gain: +{money(netGain)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick WhatsApp One-Tap Hero Button (Desktop & Mobile) */}
      <div className="mt-4">
        <button
          onClick={triggerNativeShare}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25d366] px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#20ba5a] active:scale-[0.99]"
          data-testid="button-hero-whatsapp"
        >
          <Icon glyph={WhatsappIcon} size={20} />
          <span>Partager sur WhatsApp (1-Tap)</span>
        </button>
      </div>

      {/* Share Links & Code Touch Card */}
      <Card className="mt-4 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Lien et code vendeur</p>

        {/* Link Input */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f8f7fc] p-2 sm:p-2.5 border border-[#ede9f5]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#5b49e8] shadow-xs">
            <Icon glyph={Store01Icon} size={16} />
          </span>
          <input
            type="text"
            readOnly
            value={fullLink}
            className="w-full bg-transparent text-xs font-medium text-[#403c58] outline-none select-all truncate"
          />
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-[#5b49e8] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#4e3bd5]"
            data-testid="button-copy-link"
          >
            <Icon glyph={Copy01Icon} size={14} /> Copier
          </button>
        </div>

        {/* Seller Code Input */}
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-[#f8f7fc] p-2 sm:p-2.5 border border-[#ede9f5]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#ac741e] shadow-xs text-[10px] font-bold">
            CODE
          </span>
          <span className="flex-1 font-[Space_Grotesk] text-xs font-bold text-[#292541] tracking-wide">
            {campaign.sellerCode}
          </span>
          <button
            onClick={copyCode}
            className="shrink-0 rounded-lg bg-[#efedff] px-3.5 py-2 text-xs font-bold text-[#5040cf] hover:bg-[#e4e1ff]"
            data-testid="button-copy-code"
          >
            <Icon glyph={Copy01Icon} size={14} /> Copier
          </button>
        </div>

        <p className="mt-2.5 text-[11px] text-[#9290a2] leading-4">
          💡 Toute commande passée via votre lien ou votre code sera instantanément créditée sur votre compte.
        </p>
      </Card>

      {/* Message Customization & Presets */}
      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Message de recommandation</p>
          <button
            onClick={copyMessage}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#5b49e8]"
            data-testid="button-copy-message"
          >
            <Icon glyph={Copy01Icon} size={13} /> Copier le texte
          </button>
        </div>

        {/* Preset Selector Chips */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 merchant-scrollbar">
          <button
            onClick={() => {
              haptic('light');
              applyPreset('status');
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
              activePreset === 'status'
                ? 'bg-[#5b49e8] text-white shadow-xs'
                : 'bg-[#f0eff5] text-[#6b6680] hover:bg-[#e4e1ff]'
            }`}
          >
            📱 Statut WhatsApp
          </button>
          <button
            onClick={() => {
              haptic('light');
              applyPreset('story');
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
              activePreset === 'story'
                ? 'bg-[#5b49e8] text-white shadow-xs'
                : 'bg-[#f0eff5] text-[#6b6680] hover:bg-[#e4e1ff]'
            }`}
          >
            📸 Story / TikTok
          </button>
          <button
            onClick={() => {
              haptic('light');
              applyPreset('direct');
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
              activePreset === 'direct'
                ? 'bg-[#5b49e8] text-white shadow-xs'
                : 'bg-[#f0eff5] text-[#6b6680] hover:bg-[#e4e1ff]'
            }`}
          >
            💬 Message Direct
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Personnalisez votre message pour votre communauté…"
          className={`${sellerTextareaClass} mt-3 min-h-24 text-xs sm:text-sm`}
          data-testid="input-share-message"
        />

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#9290a2]">
          <span>{message.length}/280 caractères</span>
          <span>Prêt à être partagé</span>
        </div>
      </Card>

      {/* All Social Channels Grid */}
      <Card className="mt-4 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Autres réseaux d'influence</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {shareChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => shareTo(ch)}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 transition duration-200 active:scale-[0.98] ${ch.color}`}
              data-testid={`share-${ch.id}`}
            >
              <Icon glyph={ch.glyph} size={18} />
              <span className="text-xs font-bold">{ch.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Performance Summary of this Link */}
      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
            <Icon glyph={Chart02Icon} size={18} />
          </span>
          <div>
            <h3 className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">Performance du lien</h3>
            <p className="text-[11px] text-[#9290a2]">Résultats des partages effectués sur ce lien</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
            <p className="text-[10px] uppercase text-[#9290a2]">Clics</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{campaign.clicks}</p>
          </div>
          <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
            <p className="text-[10px] uppercase text-[#9290a2]">Ventes</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{campaign.sales}</p>
          </div>
          <div className="rounded-2xl bg-[#e7faf2] p-3 text-center">
            <p className="text-[10px] uppercase text-[#278e69]">Gains</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#278e69]">{money(campaign.earnings)}</p>
          </div>
        </div>

        {campaign.sales > 0 && campaign.clicks > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#e7faf2] px-3.5 py-2.5 text-xs font-bold text-[#278e69]">
            <Icon glyph={CheckmarkCircle02Icon} size={16} /> Taux de conversion :{' '}
            {Math.round((campaign.sales / campaign.clicks) * 100)}%
          </div>
        )}
      </Card>

      {/* Security & Client Page Preview Link */}
      <div className="mt-6 mb-20 sm:mb-6 flex flex-col items-center gap-2.5 text-center">
        <Link
          href={checkoutPath}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#5b49e8] hover:underline"
          data-testid="link-preview-checkout"
        >
          Aperçu de la page de commande client <Icon glyph={ArrowLeft01Icon} className="rotate-180" size={14} />
        </Link>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#858198]">
          <Icon glyph={LockKeyIcon} size={12} /> Attribution sécurisée & token unique de vente
        </span>
      </div>

      {/* Floating Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e8e5f0] bg-white/95 p-3 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex items-center gap-2">
          <button
            onClick={triggerNativeShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-xs font-bold text-white shadow-sm"
          >
            <Icon glyph={WhatsappIcon} size={18} />
            <span>Partager (WhatsApp)</span>
          </button>
          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#5b49e8] px-4 py-3 text-xs font-bold text-white shadow-sm"
          >
            <Icon glyph={Copy01Icon} size={16} />
            <span>Copier</span>
          </button>
        </div>
      </div>
    </Page>
  );
}

