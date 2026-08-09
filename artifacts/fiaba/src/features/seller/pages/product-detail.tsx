import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Store01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  PotentialBadge,
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
} from '../components/seller-ui';
import { seedOpportunities, seedSellerCampaigns } from '@/config/seller-seeds';
import type { Opportunity, SellerCampaign } from '@/types/entities';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [opportunities] = useState<Opportunity[]>(() => read('opportunities', seedOpportunities));
  const [joined, setJoined] = useState<string[]>(() => read('seller-joined', seedSellerCampaigns.map((c) => c.campaignId)));
  const [sellerCampaigns, setSellerCampaigns] = useState<SellerCampaign[]>(() => read('seller-campaigns', seedSellerCampaigns));

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
  const commissionAmount = Math.round((op.price * op.commission) / 100);

  function joinCampaign() {
    if (isJoined) return;
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
      link: `fiaba.sn/p/${op!.id}?ref=marieme`,
      code: 'MARIFALL',
      clicks: 0,
      sales: 0,
      earnings: 0,
      joinedDate: "Aujourd'hui",
    };
    const updatedCampaigns = [newCampaign, ...sellerCampaigns];
    setSellerCampaigns(updatedCampaigns);
    write('seller-campaigns', updatedCampaigns);

    toast({ title: 'Campagne rejointe !', description: 'Vous pouvez maintenant partager ce produit et gagner des commissions.' });
  }

  return (
    <Page
      eyebrow={op.merchantName}
      title={op.productName}
      description={`Catégorie ${op.category} · ${op.model} de ${op.commission}%`}
    >
      {/* Back link */}
      <Link href="/seller" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#5b49e8]" data-testid="link-back-discover">
        <Icon glyph={ArrowLeft01Icon} size={15} /> Retour à Découvrir
      </Link>

      {/* Product visual */}
      <Card className="mt-4 flex items-center justify-center py-16">
        <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={36} /></span>
      </Card>

      {/* Potential + key info */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <PotentialBadge potential={op.potential} />
            <p className="mt-3 text-xs text-[#9290a2]">Pourquoi cette recommandation ?</p>
            <p className="mt-1 text-xs leading-5 text-[#77738a]">Vos niches ({['Beauté', 'Mode'].join(', ')}) correspondent à la catégorie de ce produit. Votre audience est active sur ces zones.</p>
          </div>
        </div>
      </Card>

      {/* Financial details */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-[#292541]">Ce que vous pouvez gagner</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#f8f7fc] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Prix client</p>
            <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(op.price)}</p>
          </div>
          <div className="rounded-2xl bg-[#e7faf2] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">{op.model === 'Commission' ? 'Votre commission' : 'Votre marge'}</p>
            <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{money(commissionAmount)}</p>
            <p className="mt-1 text-[10px] text-[#278e69]">{op.commission}% du prix</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-[#e9e6f1] p-4 text-xs leading-5 text-[#77738a]">
          <strong className="text-[#292541]">Comment ça marche.</strong> {op.model === 'Commission'
            ? 'Vous partagez le produit au prix fixé. Chaque vente validée vous rapporte votre commission.'
            : 'Vous choisissez votre prix de vente (≥ prix de base). La différence est votre marge.'}
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
          <Button onClick={joinCampaign} testId="button-join-campaign" className="w-full sm:w-auto">Rejoindre cette campagne</Button>
        )}
      </div>
    </Page>
  );
}
