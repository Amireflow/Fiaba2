import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, Copy01Icon, Facebook01Icon, InstagramIcon, Share02Icon, Store01Icon, TiktokIcon, WhatsappIcon, Wallet01Icon, Chart02Icon, CheckmarkCircle02Icon, LockKeyIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import { linkToCheckoutPath, getFullShareableUrl } from '@/lib/link';
import { trackClick } from '@/lib/attribution';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerField,
  SellerPage as Page,
  sellerInputClass,
  sellerTextareaClass,
} from '../components/seller-ui';
import { seedSellerCampaigns, seedOpportunities } from '@/config/seller-seeds';
import type { SellerCampaign, Opportunity } from '@/types/entities';

const shareChannels = [
  { id: 'whatsapp', label: 'WhatsApp', glyph: WhatsappIcon, color: 'bg-[#25d366] text-white', url: (link: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${link}`)}` },
  { id: 'instagram', label: 'Instagram', glyph: InstagramIcon, color: 'bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-white', url: () => 'https://instagram.com' },
  { id: 'tiktok', label: 'TikTok', glyph: TiktokIcon, color: 'bg-[#000000] text-white', url: () => 'https://tiktok.com' },
  { id: 'facebook', label: 'Facebook', glyph: Facebook01Icon, color: 'bg-[#1877f2] text-white', url: (link: string) => `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
];

export function Share() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [campaigns] = useState<SellerCampaign[]>(() => read('seller-campaigns', seedSellerCampaigns));
  const [opportunities] = useState<Opportunity[]>(() => read('opportunities', seedOpportunities));

  const campaign = campaigns.find((c) => c.campaignId === id || c.id === id);
  const op = opportunities.find((o) => o.campaignId === id);

  const savedMessage = campaign ? read(`seller-message-${campaign.campaignId}`, '') : '';
  const [message, setMessage] = useState(savedMessage || (campaign ? `Découvrez ${campaign.productName} de ${campaign.merchantName} ! Qualité au top, livraison rapide. Utilisez mon code ${campaign?.code ?? ''} 👇` : ''));

  if (!campaign) {
    return (
      <Page eyebrow="Oups" title="Campagne introuvable" description="Cette campagne n'existe plus.">
        <Card className="mt-6">
          <Link href="/seller/campaigns"><Button variant="soft">← Retour à mes campagnes</Button></Link>
        </Card>
      </Page>
    );
  }

  const fullLink = getFullShareableUrl(campaign.link);
  const isFixed = campaign.model === 'Marge';
  const commissionDisplay = isFixed ? money(campaign.commission) : `${campaign.commission}%`;

  function copyLink() {
    navigator.clipboard?.writeText(fullLink).catch(() => {});
    toast({ title: 'Lien copié !', description: 'Collez-le où vous voulez partager.' });
  }

  function copyCode() {
    navigator.clipboard?.writeText(campaign!.code).catch(() => {});
    toast({ title: 'Code copié', description: `Code ${campaign!.code} prêt à partager.` });
  }

  function copyMessage() {
    navigator.clipboard?.writeText(message).catch(() => {});
    toast({ title: 'Message copié', description: 'Collez-le dans votre réseau.' });
  }

  function shareTo(channel: typeof shareChannels[number]) {
    const url = channel.url(fullLink, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function saveMessage() {
    write(`seller-message-${campaign!.campaignId}`, message);
    toast({ title: 'Message enregistré', description: 'Votre message sera utilisé à chaque partage.' });
  }

  return (
    <Page
      eyebrow="Partager et gagner"
      title="Partager"
      description={`Partagez ${campaign.productName} avec votre communauté.`}
    >
      <Link href="/seller/campaigns" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#5b49e8]" data-testid="link-back-campaigns">
        <Icon glyph={ArrowLeft01Icon} size={15} /> Retour à mes campagnes
      </Link>

      {/* Product preview card */}
      <Card className="mt-4 overflow-hidden p-0">
        {op?.image && <img src={op.image} alt={campaign.productName} className="h-48 w-full object-cover" />}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={24} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{campaign.productName}</p>
              <p className="mt-0.5 text-xs text-[#9290a2]">{campaign.merchantName}</p>
              <div className="mt-2 flex items-center gap-2">
                <SellerBadge tone="mint"><Icon glyph={Wallet01Icon} size={12} /> {isFixed ? 'Marge' : 'Commission'} : {commissionDisplay}</SellerBadge>
                {op && <SellerBadge tone="violet">{money(op.price)}</SellerBadge>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Personalized message */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#292541]">Votre message personnalisé</p>
          <button onClick={copyMessage} className="text-[10px] font-bold text-[#5b49e8]" data-testid="button-copy-message">Copier</button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écrivez un message authentique pour votre communauté…"
          className={`${sellerTextareaClass} mt-3 min-h-24`}
          data-testid="input-share-message"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-[#9290a2]">{message.length}/280 caractères</span>
          <Button variant="soft" onClick={saveMessage} testId="button-save-message">Enregistrer</Button>
        </div>
      </Card>

      {/* Link + code */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-[#292541]">Votre lien unique</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f8f7fc] px-4 py-3">
          <Icon glyph={Store01Icon} size={16} />
          <span className="min-w-0 flex-1 truncate text-xs text-[#77738a]">{fullLink}</span>
          <button onClick={copyLink} className="shrink-0 rounded-lg bg-[#5b49e8] px-3 py-1.5 text-[10px] font-bold text-white" data-testid="button-copy-link">
            <Icon glyph={Copy01Icon} size={13} /> Copier
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f8f7fc] px-4 py-3">
          <span className="text-[10px] font-bold uppercase text-[#9290a2]">Code</span>
          <span className="flex-1 text-xs font-bold text-[#292541]">{campaign.code}</span>
          <button onClick={copyCode} className="shrink-0 rounded-lg bg-[#efedff] px-3 py-1.5 text-[10px] font-bold text-[#5040cf]" data-testid="button-copy-code">
            <Icon glyph={Copy01Icon} size={13} /> Copier
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-[#9290a2]">Chaque commande passée via ce lien ou ce code vous est automatiquement attribuée.</p>
      </Card>

      {/* Share channels */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-[#292541]">Partager sur</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shareChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => shareTo(ch)}
              className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition hover:-translate-y-0.5 ${ch.color}`}
              data-testid={`share-${ch.id}`}
            >
              <Icon glyph={ch.glyph} size={24} />
              <span className="text-[10px] font-bold">{ch.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Performance */}
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Chart02Icon} size={18} /></span>
          <p className="text-sm font-bold text-[#292541]">Performance de ce lien</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f8f7fc] p-4 text-center">
            <p className="text-[10px] text-[#9290a2]">Clics</p>
            <p className="mt-1 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{campaign.clicks}</p>
          </div>
          <div className="rounded-2xl bg-[#f8f7fc] p-4 text-center">
            <p className="text-[10px] text-[#9290a2]">Ventes</p>
            <p className="mt-1 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{campaign.sales}</p>
          </div>
          <div className="rounded-2xl bg-[#e7faf2] p-4 text-center">
            <p className="text-[10px] text-[#278e69]">Gains</p>
            <p className="mt-1 font-[Space_Grotesk] text-xl font-bold text-[#278e69]">{money(campaign.earnings)}</p>
          </div>
        </div>
        {campaign.sales > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#e7faf2] px-4 py-3 text-xs font-bold text-[#278e69]">
            <Icon glyph={CheckmarkCircle02Icon} size={16} /> Taux de conversion : {Math.round((campaign.sales / campaign.clicks) * 100)}%
          </div>
        )}
      </Card>

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Button onClick={copyLink} testId="button-copy-share" className="w-full sm:w-auto"><Icon glyph={Share02Icon} size={16} /> Copier et partager</Button>
        <Link
          href={linkToCheckoutPath(campaign.link)}
          onClick={() => trackClick(campaign.campaignId, campaign.code)}
          className="text-xs font-bold text-[#5b49e8] hover:underline"
          data-testid="link-preview-checkout"
        >
          Voir la page d'achat de mes clients →
        </Link>
        <span className="flex items-center gap-1 text-[10px] font-bold text-[#278e69]">
          <Icon glyph={LockKeyIcon} size={12} /> Lien signé HMAC-SHA256 · expire dans 90 jours
        </span>
      </div>
    </Page>
  );
}
