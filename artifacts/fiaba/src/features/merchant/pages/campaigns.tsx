import { useState } from 'react';
import { Link } from 'wouter';
import { Chart02Icon, Delete02Icon, Edit02Icon, PauseIcon, PlayIcon, Store01Icon, UserGroupIcon, Target01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { useMerchantId, useSupabaseQuery, supabaseDelete, supabaseUpdate } from '@/hooks/use-supabase-query';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
} from '../components/merchant-ui';

import { getFirstImageUrl } from '@/lib/storage-upload';

type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  commission: number;
  commission_type: string | null;
  model: string;
  status: string;
  goal: number | null;
  product_id: string | null;
  products: { name: string; image_url: string | null } | null;
};

const statusMap: Record<string, { label: string; tone: 'mint' | 'amber' | 'slate' }> = {
  active: { label: 'Active', tone: 'mint' },
  en_pause: { label: 'En pause', tone: 'amber' },
  terminee: { label: 'Terminée', tone: 'slate' },
};

export function Campaigns() {
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const { data: campaigns, loading, refetch } = useSupabaseQuery<CampaignRow>('campaigns', {
    select: 'id, name, description, commission, commission_type, model, status, goal, product_id, products:product_id (name, image_url)',
    filter: { merchant_id: merchantId },
    order: { column: 'created_at', ascending: false },
    enabled: !!merchantId,
  });
  const [toDelete, setToDelete] = useState<CampaignRow | null>(null);

  async function toggle(c: CampaignRow) {
    haptic('light');
    const newStatus = c.status === 'active' ? 'en_pause' : 'active';
    const { error } = await supabaseUpdate('campaigns', c.id, { status: newStatus });
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: newStatus === 'active' ? 'Campagne réactivée' : 'Campagne en pause', description: c.name });
      refetch();
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    haptic('warning');
    const { error } = await supabaseDelete('campaigns', toDelete.id);
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: 'Campagne supprimée', description: toDelete.name });
      refetch();
    }
    setToDelete(null);
  }

  const active = campaigns.filter((c) => c.status === 'active').length;

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
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total campagnes</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{campaigns.length}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff4de] text-[#ac741e]"><Icon glyph={UserGroupIcon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En pause</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{campaigns.filter((c) => c.status === 'en_pause').length}</p>
        </Card>
        <Card className="p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667]"><Icon glyph={Target01Icon} size={18} /></span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Terminées</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{campaigns.filter((c) => c.status === 'terminee').length}</p>
        </Card>
      </div>

      {/* Campaign cards */}
      {loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card className="mt-5 p-0">
          <EmptyState glyph={Chart02Icon} title="Aucune campagne" description="Lancez votre première campagne pour mobiliser votre réseau." action={<Link href="/merchant/campaigns/new"><Button>Créer une campagne +</Button></Link>} />
        </Card>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => {
            const st = statusMap[c.status] ?? statusMap.terminee;
            const imgUrl = getFirstImageUrl(c.products?.image_url);
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {imgUrl ? (
                      <img src={imgUrl} alt={c.products?.name ?? c.name} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-[#eee]" />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Chart02Icon} size={20} /></span>
                    )}
                    <div className="min-w-0">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <h3 className="mt-1 font-[Space_Grotesk] text-lg font-bold tracking-[-.04em] text-[#292541] truncate">{c.name}</h3>
                      {c.description && <p className="mt-0.5 text-xs leading-5 text-[#77738a] line-clamp-1">{c.description}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/merchant/campaigns/${c.id}/edit`}><button className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0eff5] text-[#67627b]" data-testid={`edit-${c.id}`}><Icon glyph={Edit02Icon} size={15} /></button></Link>
                    <button onClick={() => toggle(c)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0eff5] text-[#67627b]" data-testid={`toggle-${c.id}`}><Icon glyph={c.status === 'active' ? PauseIcon : PlayIcon} size={15} /></button>
                    <button onClick={() => { haptic('light'); setToDelete(c); }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff0f1] text-[#c45667]" data-testid={`delete-${c.id}`}><Icon glyph={Delete02Icon} size={15} /></button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Commission</p>
                    <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">
                      {c.model === 'marge' || c.commission_type === 'fixed' || (!c.commission_type && c.commission >= 100) ? money(c.commission) : `${c.commission}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Modèle</p>
                    <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541] capitalize">{c.model}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Objectif</p>
                    <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.goal ?? '—'}</p>
                  </div>
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
