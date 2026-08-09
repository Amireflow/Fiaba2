import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, Copy01Icon, Facebook01Icon, InstagramIcon, Share02Icon, Store01Icon, TiktokIcon, WhatsappIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
} from '../components/seller-ui';
import { seedSellerCampaigns } from '@/config/seller-seeds';
import type { SellerCampaign } from '@/types/entities';

const shareChannels = [
  { id: 'whatsapp', label: 'WhatsApp', glyph: WhatsappIcon, color: 'bg-[#25d366] text-white', url: (link: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}` },
  { id: 'instagram', label: 'Instagram', glyph: InstagramIcon, color: 'bg-[#e1306c] text-white', url: () => 'https://instagram.com' },
  { id: 'tiktok', label: 'TikTok', glyph: TiktokIcon, color: 'bg-[#000000] text-white', url: () => 'https://tiktok.com' },
  { id: 'facebook', label: 'Facebook', glyph: Facebook01Icon, color: 'bg-[#1877f2] text-white', url: (link: string) => `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
];

export function Share() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [campaigns] = useState<SellerCampaign[]>(() => read('seller-campaigns', seedSellerCampaigns));

  const campaign = campaigns.find((c) => c.campaignId === id || c.id === id);

  if (!campaign) {
    return (
      <Page eyebrow="Oups" title="Campagne introuvable" description="Cette campagne n'existe plus.">
        <Card className="mt-6">
          <Link href="/seller/campaigns"><Button variant="soft">← Retour à mes campagnes</Button></Link>
        </Card>
      </Page>
    );
  }

  const fullLink = `https://${campaign.link}`;
  const shareText = `Découvrez ${campaign.productName} de ${campaign.merchantName} !`;

  function copyLink() {
    navigator.clipboard?.writeText(fullLink).catch(() => {});
    toast({ title: 'Lien copié !', description: 'Collez-le où vous voulez partager.' });
  }

  function copyCode() {
    navigator.clipboard?.writeText(campaign!.code).catch(() => {});
    toast({ title: 'Code copié', description: `Code ${campaign!.code} prêt à partager.` });
  }

  function shareTo(channel: typeof shareChannels[number]) {
    const url = channel.url(fullLink, shareText);
    window.open(url, '_blank', 'noopener,noreferrer');
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

      {/* Product preview */}
      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={28} /></span>
          <div className="min-w-0">
            <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{campaign.productName}</p>
            <p className="mt-0.5 text-xs text-[#9290a2]">{campaign.merchantName}</p>
            <p className="mt-1 text-xs font-bold text-[#278e69]">Commission : {campaign.commission}%</p>
          </div>
        </div>
      </Card>

      {/* Link to share */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-[#292541]">Votre lien unique</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-4 py-3">
          <Icon glyph={Store01Icon} size={16} />
          <span className="min-w-0 flex-1 truncate text-xs text-[#77738a]">{fullLink}</span>
          <button onClick={copyLink} className="shrink-0 rounded-lg bg-[#5b49e8] px-3 py-1.5 text-[10px] font-bold text-white" data-testid="button-copy-link">
            <Icon glyph={Copy01Icon} size={13} /> Copier
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-4 py-3">
          <span className="text-[10px] font-bold uppercase text-[#9290a2]">Code</span>
          <span className="flex-1 text-xs font-bold text-[#292541]">{campaign.code}</span>
          <button onClick={copyCode} className="shrink-0 rounded-lg bg-[#efedff] px-3 py-1.5 text-[10px] font-bold text-[#5040cf]" data-testid="button-copy-code">
            <Icon glyph={Copy01Icon} size={13} /> Copier
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-[#9290a2]">Chaque commande passée via ce lien vous est automatiquement attribuée.</p>
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

      {/* Performance preview */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-[#292541]">Performance de ce lien</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
            <p className="text-[10px] text-[#9290a2]">Clics</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{campaign.clicks}</p>
          </div>
          <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
            <p className="text-[10px] text-[#9290a2]">Ventes</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{campaign.sales}</p>
          </div>
          <div className="rounded-2xl bg-[#e7faf2] p-3 text-center">
            <p className="text-[10px] text-[#278e69]">Gains</p>
            <p className="mt-1 font-[Space_Grotesk] text-lg font-bold text-[#278e69]">{money(campaign.earnings)}</p>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <div className="mt-6 flex justify-center">
        <Button onClick={copyLink} testId="button-copy-share" className="w-full sm:w-auto"><Icon glyph={Share02Icon} size={16} /> Copier et partager</Button>
      </div>
    </Page>
  );
}
