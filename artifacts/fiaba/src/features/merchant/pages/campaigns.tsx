import { useState } from 'react';
import { Link } from 'wouter';
import { Chart02Icon, Delete02Icon, Edit02Icon, PauseIcon, PlayIcon, Store01Icon, UserGroupIcon, Target01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
} from '../components/merchant-ui';
import { seedCampaigns } from '@/config/seeds';
import type { Campaign } from '@/types/entities';

export function Campaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => read('campaigns', seedCampaigns));
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

  function toggle(c: Campaign) {
    const newStatus = c.status === 'Active' ? ('En pause' as const) : ('Active' as const);
    const updated = campaigns.map((x) => (x.id === c.id ? { ...x, status: newStatus } : x));
    setCampaigns(updated);
    write('campaigns', updated);
    toast({ title: newStatus === 'Active' ? 'Campagne réactivée' : 'Campagne en pause', description: c.name });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const updated = campaigns.filter((c) => c.id !== toDelete.id);
    setCampaigns(updated);
    write('campaigns', updated);
    toast({ title: 'Campagne supprimée', description: toDelete.name });
    setToDelete(null);
  }

  const active = campaigns.filter((c) => c.status === 'Active').length;
  const totalSales = campaigns.reduce((sum, c) => sum + c.sales, 0);

  return (
    <Page
      eyebrow="Animer votre réseau"
      title="Campagnes"
      description="Donnez une raison claire à votre réseau de parler de vos produits."
      action={<Link href="/merchant/campaigns/new"><Button testId="button-add-campaign">Créer une campagne +</Button></Link>}
    >
      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Chart02Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Actives</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{active}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={Store01Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ventes cumulées</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{totalSales}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff4de] text-[#ac741e]"><Icon glyph={UserGroupIcon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeurs impliqués</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{campaigns.reduce((s, c) => s + c.sellers, 0)}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667]"><Icon glyph={Target01Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Taux de conversion</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{totalSales > 0 ? Math.round((totalSales / campaigns.reduce((s, c) => s + c.sellers, 0)) * 100) : 0}%</p>
        </Card>
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <Card className="mt-5 p-0">
          <EmptyState glyph={Chart02Icon} title="Aucune campagne" description="Lancez votre première campagne pour mobiliser votre réseau." action={<Link href="/merchant/campaigns/new"><Button>Créer une campagne +</Button></Link>} />
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => {
            const goal = c.goal ?? 50;
            const progress = Math.min(100, (c.sales / goal) * 100);
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone={c.status === 'Active' ? 'mint' : c.status === 'En pause' ? 'amber' : 'slate'}>{c.status}</Badge>
                    <h3 className="mt-2 font-[Space_Grotesk] text-lg font-bold tracking-[-.04em] text-[#292541]">{c.name}</h3>
                    {c.description && <p className="mt-1 text-xs leading-5 text-[#77738a]">{c.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/merchant/campaigns/${c.id}/edit`}><button className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0eff5] text-[#67627b]" data-testid={`edit-${c.id}`}><Icon glyph={Edit02Icon} size={15} /></button></Link>
                    <button onClick={() => toggle(c)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0eff5] text-[#67627b]" data-testid={`toggle-${c.id}`}><Icon glyph={c.status === 'Active' ? PauseIcon : PlayIcon} size={15} /></button>
                    <button onClick={() => setToDelete(c)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff0f1] text-[#c45667]" data-testid={`delete-${c.id}`}><Icon glyph={Delete02Icon} size={15} /></button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div><p className="text-[10px] text-[#9290a2]">Commission</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.commission}%</p></div>
                  <div><p className="text-[10px] text-[#9290a2]">Vendeurs</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.sellers}</p></div>
                  <div><p className="text-[10px] text-[#9290a2]">Ventes</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.sales}</p></div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-[#9290a2]"><span>Objectif {goal} ventes</span><span>{Math.round(progress)}%</span></div>
                  <div className="mt-1.5"><ProgressBar value={progress} tone={c.status === 'Active' ? 'violet' : 'amber'} /></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer cette campagne ?"
        message={toDelete ? `« ${toDelete.name} » sera définitivement supprimée. Les vendeurs ne pourront plus la voir.` : ''}
        confirmLabel="Supprimer"
      />
    </Page>
  );
}
