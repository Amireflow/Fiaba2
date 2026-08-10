import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Chart02Icon, Store01Icon, UserGroupIcon, Share02Icon, Wallet01Icon, LockKeyIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useSellerDiscovery } from '@/hooks/use-seller-discovery';
import { trackEvent } from '@/lib/analytics';
import { getFirstImageUrl } from '@/lib/storage-upload';
import {
  PotentialBadge,
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
  sellerTextareaClass,
} from '../components/seller-ui';

type CampaignDetail = {
  campaign_id: string;
  campaign_name: string;
  campaign_description: string | null;
  commission: number;
  commission_type: string | null;
  model: string;
  goal: number | null;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  product_image_url: string | null;
  product_category: string | null;
  product_description: string | null;
  merchant_id: string;
  merchant_name: string;
  niche_name: string | null;
  match_score: number;
  is_joined: boolean;
};

type ZoneCoverage = { id: string; name: string; fee: number };

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { joinCampaign } = useSellerDiscovery();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [zones, setZones] = useState<ZoneCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [quantity, setQuantity] = useState('10');

  useEffect(() => {
    async function loadDetail() {
      if (!id) return;
      setLoading(true);

      const { data: raw } = await supabase
        .from('campaigns')
        .select(`
          id, name, description, commission, commission_type, model, goal,
          product_id, niche_id, merchant_id,
          products:product_id (id, name, price, image_url, category, description),
          merchants:merchant_id (id, name),
          niches:niche_id (id, name)
        `)
        .eq('id', id)
        .single();

      if (!raw) {
        setLoading(false);
        return;
      }

      const c = raw as {
        id: string; name: string; description: string | null;
        commission: number; commission_type: string | null; model: string;
        goal: number | null; product_id: string | null; niche_id: string | null;
        merchant_id: string;
        products: { id: string; name: string; price: number; image_url: string | null; category: string | null; description: string | null } | null;
        merchants: { id: string; name: string } | null;
        niches: { id: string; name: string } | null;
      };

      let isJoined = false;
      if (profile) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        const sId = (seller as { id: string } | null)?.id;
        if (sId) {
          const { data: joined } = await supabase
            .from('campaign_sellers')
            .select('campaign_id')
            .eq('seller_id', sId)
            .eq('campaign_id', id)
            .single();
          isJoined = !!joined;
        }
      }

      setCampaign({
        campaign_id: c.id,
        campaign_name: c.name,
        campaign_description: c.description,
        commission: c.commission,
        commission_type: c.commission_type,
        model: c.model,
        goal: c.goal,
        product_id: c.product_id,
        product_name: c.products?.name ?? null,
        product_price: c.products?.price ?? null,
        product_image_url: c.products?.image_url ?? null,
        product_category: c.products?.category ?? null,
        product_description: c.products?.description ?? null,
        merchant_id: c.merchant_id,
        merchant_name: c.merchants?.name ?? 'Boutique',
        niche_name: c.niches?.name ?? null,
        match_score: 50,
        is_joined: isJoined,
      });

      // Analytics: campaign_viewed + product_viewed (CDC §25)
      trackEvent('campaign_viewed', { entityType: 'campaign', entityId: c.id });
      if (c.product_id) {
        trackEvent('product_viewed', { entityType: 'product', entityId: c.product_id });
      }

      const { data: zoneData } = await supabase
        .from('delivery_zones')
        .select('id, name, fee')
        .eq('merchant_id', c.merchant_id)
        .eq('is_active', true);
      setZones(((zoneData as ZoneCoverage[] | null) ?? []));

      setLoading(false);
    }
    loadDetail();
  }, [id, profile]);

  if (loading) {
    return (
      <Page eyebrow="Chargement" title="…" description="">
        <div className="mt-6 flex items-center justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      </Page>
    );
  }

  if (!campaign) {
    return (
      <Page eyebrow="Oups" title="Produit introuvable" description="Cette opportunité n'existe plus ou a été retirée.">
        <Card className="mt-6">
          <Link href="/seller"><Button variant="soft">← Retour à Découvrir</Button></Link>
        </Card>
      </Page>
    );
  }

  const isFixedCommission = campaign.model === 'marge' || campaign.commission_type === 'fixed' || (!campaign.commission_type && campaign.commission >= 100);
  const commissionAmount = isFixedCommission
    ? campaign.commission
    : Math.round(((campaign.product_price ?? 0) * campaign.commission) / 100);
  const qty = Math.max(1, Number(quantity) || 1);
  const potentialEarnings = commissionAmount * qty;
  const potential = campaign.match_score >= 80 ? 'Fort' : campaign.match_score >= 40 ? 'Bon' : 'Moyen';

  async function handleJoin() {
    if (campaign?.is_joined || joining) return;
    setJoining(true);
    haptic('medium');
    const { error } = await joinCampaign(campaign!.campaign_id);
    setJoining(false);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error });
    } else {
      setCampaign((prev) => prev ? { ...prev, is_joined: true } : prev);
      toast({ title: 'Campagne rejointe !', description: 'Votre lien sécurisé est prêt. Personnalisez votre message et partagez.' });
    }
  }

  function saveMessage() {
    haptic('light');
    if (campaign) {
      localStorage.setItem(`seller-message-${campaign.campaign_id}`, customMessage);
    }
    toast({ title: 'Message enregistré', description: 'Votre message personnalisé sera utilisé lors du partage.' });
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0">
      <Page
        eyebrow={campaign.merchant_name}
        title={campaign.product_name ?? campaign.campaign_name}
        description={`Catégorie ${campaign.product_category ?? 'Divers'} · ${campaign.model === 'commission' ? 'Commission' : 'Marge'}`}
      >
        <Link href="/seller" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#5b49e8]" data-testid="link-back-discover">
          <Icon glyph={ArrowLeft01Icon} size={15} /> Retour à Découvrir
        </Link>

        {/* Product visual + description */}
        <Card className="mt-4 overflow-hidden p-0 max-w-full">
          {getFirstImageUrl(campaign.product_image_url) ? (
            <img src={getFirstImageUrl(campaign.product_image_url)!} alt={campaign.product_name ?? ''} className="h-48 sm:h-64 w-full object-cover max-w-full" />
          ) : (
            <div className="grid h-48 sm:h-64 w-full place-items-center bg-[#f8f7fc]">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={36} /></span>
            </div>
          )}
          <div className="p-4 sm:p-5 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
              <PotentialBadge potential={potential} />
              {campaign.product_category && <SellerBadge tone="violet">{campaign.product_category}</SellerBadge>}
              {campaign.niche_name && <SellerBadge tone="mint">{campaign.niche_name}</SellerBadge>}
            </div>
            <p className="mt-3 text-xs sm:text-sm leading-6 text-[#77738a] break-words">
              Produit proposé par <strong className="text-[#292541]">{campaign.merchant_name}</strong>. {campaign.model === 'commission'
                ? 'Vous partagez ce produit au prix fixé par le marchand. Chaque vente validée vous rapporte votre commission.'
                : 'Vous choisissez votre prix de vente (≥ prix de base). La différence est votre marge.'}
            </p>
            {campaign.product_description && (
              <p className="mt-3 text-xs sm:text-sm leading-6 text-[#77738a] break-words">{campaign.product_description}</p>
            )}
          </div>
        </Card>

        {/* Responsive Earnings calculator */}
        <Card className="mt-4 max-w-full">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={Chart02Icon} size={18} /></span>
            <p className="text-sm font-bold text-[#292541]">Calculateur de gains</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0 max-w-full">
            <div className="rounded-2xl bg-[#f8f7fc] p-3.5 sm:p-4 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Prix client</p>
              <p className="mt-1.5 font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#292541] truncate">{campaign.product_price ? money(campaign.product_price) : '—'}</p>
            </div>
            <div className="rounded-2xl bg-[#e7faf2] p-3.5 sm:p-4 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">{isFixedCommission ? 'Marge/unité' : 'Commission/unité'}</p>
              <p className="mt-1.5 font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#278e69] truncate">{money(commissionAmount)}</p>
              <p className="mt-0.5 text-[10px] text-[#278e69]">{isFixedCommission ? 'montant fixe' : `${campaign.commission}%`}</p>
            </div>
            <div className="rounded-2xl bg-[#efedff] p-3.5 sm:p-4 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5b49e8]">Si vous vendez</p>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white px-2.5 py-1.5 text-right font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#5b49e8] outline-none"
                data-testid="input-quantity"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#5745df] p-4 text-white min-w-0 max-w-full">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#d0caff]">Gains potentiels ({qty} ventes)</p>
              <strong className="mt-1 block font-[Space_Grotesk] text-xl sm:text-2xl font-bold truncate">{money(potentialEarnings)}</strong>
            </div>
            <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><Icon glyph={Wallet01Icon} size={22} /></span>
          </div>
        </Card>

        {/* Personalization: custom message */}
        <Card className="mt-4 max-w-full">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Share02Icon} size={18} /></span>
            <p className="text-sm font-bold text-[#292541]">Personnalisez votre message</p>
          </div>
          <p className="mt-2 text-xs text-[#77738a]">Ajoutez votre voix. Ce message accompagne le lien que vous partagez à votre communauté.</p>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={`Ex. "Je vous recommande ce ${campaign.product_name ?? 'produit'} que j'ai testé moi-même. Qualité au top, livraison rapide à Dakar. Utilisez mon code pour commander 👇"`}
            className={`${sellerTextareaClass} mt-3 min-h-24 max-w-full`}
            data-testid="input-custom-message"
          />
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-[10px] text-[#9290a2]">{customMessage.length}/280 caractères</span>
            <Button variant="soft" onClick={saveMessage} testId="button-save-message">Enregistrer le message</Button>
          </div>
        </Card>

        {/* Zones + conditions */}
        <Card className="mt-4 max-w-full">
          <p className="text-sm font-bold text-[#292541]">Zones couvertes</p>
          {zones.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 min-w-0 max-w-full">
              {zones.map((z) => <SellerBadge key={z.id} tone="violet"><Icon glyph={Store01Icon} size={12} /> {z.name}</SellerBadge>)}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#9290a2]">Aucune zone configurée par ce marchand.</p>
          )}
          <p className="mt-4 text-xs leading-5 text-[#77738a]">Les commandes sont acceptées uniquement dans ces zones. Vos clients doivent se trouver dans l'une d'elles.</p>
        </Card>

        {/* Why this recommendation */}
        <Card className="mt-4 max-w-full">
          <p className="text-xs font-bold text-[#292541]">Pourquoi cette recommandation ?</p>
          <p className="mt-2 text-xs leading-5 text-[#77738a] break-words">
            {campaign.niche_name
              ? `Vos niches correspondent à la catégorie "${campaign.niche_name}" de ce produit.`
              : 'Ce produit correspond à votre profil vendeur.'}
            {' '}Votre audience est active sur ces zones géographiques.
          </p>
        </Card>

        {/* CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {campaign.is_joined ? (
            <>
              <SellerBadge tone="mint" className="text-sm self-start"><Icon glyph={CheckmarkCircle02Icon} size={16} /> Campagne rejointe</SellerBadge>
              <Link href={`/seller/share/${campaign.campaign_id}`}>
                <Button testId="button-go-share" className="w-full sm:w-auto"><Icon glyph={UserGroupIcon} size={15} /> Partager maintenant</Button>
              </Link>
              <Link href="/seller/campaigns">
                <Button variant="soft" testId="button-go-campaigns" className="w-full sm:w-auto">Voir mes campagnes</Button>
              </Link>
            </>
          ) : (
            <Button onClick={handleJoin} testId="button-join-campaign" className="w-full sm:w-auto" disabled={joining}>
              {joining ? 'Génération de votre lien…' : 'Rejoindre cette campagne'}
            </Button>
          )}
          {!campaign.is_joined && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#278e69] self-center sm:self-auto">
              <Icon glyph={LockKeyIcon} size={12} /> Lien signé et sécurisé
            </span>
          )}
        </div>
      </Page>
    </div>
  );
}
