import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Chart02Icon, Store01Icon, UserGroupIcon, Share02Icon, Wallet01Icon, LockKeyIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import { generateSecureLink, generateSellerCode, generateSellerId } from '@/lib/link';
import { seedSellerProfile, seedOpportunities, seedSellerCampaigns } from '@/config/seller-seeds';
import {
  PotentialBadge,
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerField,
  SellerPage as Page,
  sellerInputClass,
  sellerTextareaClass,
} from '../components/seller-ui';
import type { Opportunity, SellerCampaign } from '@/types/entities';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [opportunities] = useState<Opportunity[]>(() => read('opportunities', seedOpportunities));
  const [joined, setJoined] = useState<string[]>(() => read('seller-joined', seedSellerCampaigns.map((c) => c.campaignId)));
  const [sellerCampaigns, setSellerCampaigns] = useState<SellerCampaign[]>(() => read('seller-campaigns', seedSellerCampaigns));
  const [customMessage, setCustomMessage] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [joining, setJoining] = useState(false);
  const profile = read('seller-profile', seedSellerProfile);

  const op = opportunities.find((o) => o.id === id);

  if (!op) {
    return (
      <Page eyebrow="Oups" title="Produit introuvable" description="Cette opportunité n'existe plus ou a été retirée.">
        <Card className="mt-6">
          <Link href="/seller"><Button variant="soft">← Retour à Découvrir</Button></Link>
        </Card>
      </Page>
    );
  }

  const isJoined = joined.includes(op.campaignId);
  const isFixedCommission = op.model === 'Marge';
  const commissionAmount = isFixedCommission ? op.commission : Math.round((op.price * op.commission) / 100);
  const qty = Math.max(1, Number(quantity) || 1);
  const potentialEarnings = commissionAmount * qty;

  async function joinCampaign() {
    if (isJoined || joining) return;
    setJoining(true);
    try {
      const sellerName = profile.name;
      const sellerId = generateSellerId(sellerName);
      const sellerCode = generateSellerCode(sellerName);

      const { link, code } = await generateSecureLink({
        productId: op!.id,
        campaignId: op!.campaignId,
        sellerId,
        sellerCode,
      });

      const updated = [...joined, op!.campaignId];
      setJoined(updated);
      write('seller-joined', updated);

      const newCampaign: SellerCampaign = {
        id: `sc-${crypto.randomUUID().slice(0, 8)}`,
        campaignId: op!.campaignId,
        campaignName: op!.productName,
        productName: op!.productName,
        merchantName: op!.merchantName,
        commission: op!.commission,
        model: op!.model,
        status: 'Active',
        link,
        code,
        clicks: 0,
        sales: 0,
        earnings: 0,
        joinedDate: "Aujourd'hui",
      };
      const updatedCampaigns = [newCampaign, ...sellerCampaigns];
      setSellerCampaigns(updatedCampaigns);
      write('seller-campaigns', updatedCampaigns);

      toast({ title: 'Campagne rejointe !', description: 'Votre lien sécurisé est prêt. Personnalisez votre message et partagez.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de générer votre lien. Réessayez.' });
    } finally {
      setJoining(false);
    }
  }

  function saveMessage() {
    write(`seller-message-${op!.campaignId}`, customMessage);
    toast({ title: 'Message enregistré', description: 'Votre message personnalisé sera utilisé lors du partage.' });
  }

  return (
    <Page
      eyebrow={op.merchantName}
      title={op.productName}
      description={`Catégorie ${op.category} · ${op.model}`}
    >
      <Link href="/seller" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#5b49e8]" data-testid="link-back-discover">
        <Icon glyph={ArrowLeft01Icon} size={15} /> Retour à Découvrir
      </Link>

      {/* Product visual + description */}
      <Card className="mt-4 overflow-hidden p-0">
        {op.image ? (
          <img src={op.image} alt={op.productName} className="h-56 w-full object-cover" />
        ) : (
          <div className="grid h-56 w-full place-items-center bg-[#f8f7fc]">
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={36} /></span>
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2">
            <PotentialBadge potential={op.potential} />
            <SellerBadge tone="violet">{op.category}</SellerBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#77738a]">
            Produit proposé par <strong className="text-[#292541]">{op.merchantName}</strong>. {op.model === 'Commission'
              ? 'Vous partagez ce produit au prix fixé par le marchand. Chaque vente validée vous rapporte votre commission.'
              : 'Vous choisissez votre prix de vente (≥ prix de base). La différence est votre marge.'}
          </p>
        </div>
      </Card>

      {/* Earnings calculator */}
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={Chart02Icon} size={18} /></span>
          <p className="text-sm font-bold text-[#292541]">Calculateur de gains</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#f8f7fc] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Prix client</p>
            <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{money(op.price)}</p>
          </div>
          <div className="rounded-2xl bg-[#e7faf2] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">{isFixedCommission ? 'Marge/unité' : 'Commission/unité'}</p>
            <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#278e69]">{money(commissionAmount)}</p>
            <p className="mt-0.5 text-[10px] text-[#278e69]">{isFixedCommission ? 'montant fixe' : `${op.commission}%`}</p>
          </div>
          <div className="rounded-2xl bg-[#efedff] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5b49e8]">Si vous vendez</p>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white px-2 py-1 text-right font-[Space_Grotesk] text-lg font-bold text-[#5b49e8] outline-none"
              data-testid="input-quantity"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#5745df] p-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#d0caff]">Gains potentiels ({qty} ventes)</p>
            <strong className="mt-1 block font-[Space_Grotesk] text-2xl font-bold">{money(potentialEarnings)}</strong>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Icon glyph={Wallet01Icon} size={24} /></span>
        </div>
      </Card>

      {/* Personalization: custom message */}
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Share02Icon} size={18} /></span>
          <p className="text-sm font-bold text-[#292541]">Personnalisez votre message</p>
        </div>
        <p className="mt-2 text-xs text-[#77738a]">Ajoutez votre voix. Ce message accompagne le lien que vous partagez à votre communauté.</p>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder={`Ex. "Je vous recommande ce ${op.productName} que j'ai testé moi-même. Qualité au top, livraison rapide à Dakar. Utilisez mon code MARIFALL pour commander 👇"`}
          className={`${sellerTextareaClass} mt-3 min-h-24`}
          data-testid="input-custom-message"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-[#9290a2]">{customMessage.length}/280 caractères</span>
          <Button variant="soft" onClick={saveMessage} testId="button-save-message">Enregistrer le message</Button>
        </div>
      </Card>

      {/* Zones + conditions */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-[#292541]">Zones couvertes</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {op.zones.map((z) => <SellerBadge key={z} tone="violet"><Icon glyph={Store01Icon} size={12} /> {z}</SellerBadge>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#77738a]">Les commandes sont acceptées uniquement dans ces zones. Vos clients doivent se trouver dans l'une d'elles.</p>
      </Card>

      {/* Why this recommendation */}
      <Card className="mt-4">
        <p className="text-xs font-bold text-[#292541]">Pourquoi cette recommandation ?</p>
        <p className="mt-2 text-xs leading-5 text-[#77738a]">Vos niches (Beauté, Mode) correspondent à la catégorie de ce produit. Votre audience est active sur ces zones géographiques.</p>
      </Card>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {isJoined ? (
          <>
            <SellerBadge tone="mint" className="text-sm"><Icon glyph={CheckmarkCircle02Icon} size={16} /> Campagne rejointe</SellerBadge>
            <Link href={`/seller/share/${op.campaignId}`}>
              <Button testId="button-go-share"><Icon glyph={UserGroupIcon} size={15} /> Partager maintenant</Button>
            </Link>
            <Link href="/seller/campaigns">
              <Button variant="soft" testId="button-go-campaigns">Voir mes campagnes</Button>
            </Link>
          </>
        ) : (
          <Button onClick={joinCampaign} testId="button-join-campaign" className="w-full sm:w-auto" disabled={joining}>
            {joining ? 'Génération de votre lien…' : 'Rejoindre cette campagne'}
          </Button>
        )}
        {!isJoined && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#278e69]">
            <Icon glyph={LockKeyIcon} size={12} /> Lien signé et sécurisé par HMAC-SHA256
          </span>
        )}
      </div>
    </Page>
  );
}
