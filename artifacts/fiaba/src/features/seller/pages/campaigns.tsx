import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight01Icon, Chart02Icon, Copy01Icon, Share02Icon, Store01Icon, Target01Icon, UserGroupIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerEmptyState,
  SellerPage as Page,
  SellerScrollTable,
} from '../components/seller-ui';
import { seedSellerCampaigns } from '@/config/seller-seeds';
import type { SellerCampaign } from '@/types/entities';

const toneFor = (s: SellerCampaign['status']): 'mint' | 'violet' | 'slate' => (s === 'Active' ? 'mint' : s === 'Rejointe' ? 'violet' : 'slate');

export function SellerCampaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<SellerCampaign[]>(() => read('seller-campaigns', seedSellerCampaigns));
  const [toLeave, setToLeave] = useState<SellerCampaign | null>(null);

  function copyLink(c: SellerCampaign) {
    const link = `https://${c.link}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    toast({ title: 'Lien copié', description: 'Partagez-le sur WhatsApp ou vos réseaux.' });
  }

  function copyCode(c: SellerCampaign) {
    navigator.clipboard?.writeText(c.code).catch(() => {});
    toast({ title: 'Code copié', description: `Code ${c.code} prêt à partager.` });
  }

  function confirmLeave() {
    if (!toLeave) return;
    const updated = campaigns.filter((c) => c.id !== toLeave.id);
    setCampaigns(updated);
    write('seller-campaigns', updated);
    toast({ title: 'Campagne quittée', description: `${toLeave.campaignName} n'est plus dans vos campagnes.` });
    setToLeave(null);
  }

  const totalEarnings = campaigns.reduce((s, c) => s + c.earnings, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.sales, 0);

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
      {campaigns.length === 0 ? (
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
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.campaignName}</p>
                  <p className="mt-0.5 text-xs text-[#9290a2]">{c.productName} · {c.merchantName}</p>
                </div>
                <SellerBadge tone={toneFor(c.status)}>{c.status}</SellerBadge>
              </div>

              {/* Stats inline */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#f8f7fc] p-3 text-center sm:grid-cols-4">
                <div><p className="text-[10px] text-[#9290a2]">Clics</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">{c.clicks}</p></div>
                <div><p className="text-[10px] text-[#9290a2]">Ventes</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">{c.sales}</p></div>
                <div><p className="text-[10px] text-[#9290a2]">Commission</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#278e69]">{c.commission}%</p></div>
                <div><p className="text-[10px] text-[#9290a2]">Gains</p><p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">{money(c.earnings)}</p></div>
              </div>

              {/* Link + code */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-3 py-2.5">
                  <Icon glyph={Store01Icon} size={15} />
                  <span className="min-w-0 flex-1 truncate text-xs text-[#77738a]">{c.link}</span>
                  <button onClick={() => copyLink(c)} className="shrink-0 text-[#5b49e8]" data-testid={`copy-link-${c.id}`}><Icon glyph={Copy01Icon} size={15} /></button>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#e9e6f1] bg-[#fbfaff] px-3 py-2.5">
                  <span className="text-[10px] font-bold uppercase text-[#9290a2]">Code</span>
                  <span className="flex-1 text-xs font-bold text-[#292541]">{c.code}</span>
                  <button onClick={() => copyCode(c)} className="shrink-0 text-[#5b49e8]" data-testid={`copy-code-${c.id}`}><Icon glyph={Copy01Icon} size={15} /></button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/seller/share/${c.campaignId}`}>
                  <Button testId={`share-${c.id}`}><Icon glyph={Share02Icon} size={15} /> Partager</Button>
                </Link>
                <Link href="/seller/sales">
                  <Button variant="soft" testId={`sales-${c.id}`}>Voir les ventes <Icon glyph={ArrowUpRight01Icon} size={14} /></Button>
                </Link>
                <Button variant="ghost" onClick={() => setToLeave(c)} testId={`leave-${c.id}`}>Quitter</Button>
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
            <p className="mt-2 text-sm leading-5 text-[#77738a]">Vous ne gagnerez plus de commissions sur les futures ventes de « {toLeave.campaignName} ».</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setToLeave(null)}>Annuler</Button>
              <Button variant="danger" onClick={confirmLeave}>Quitter</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
