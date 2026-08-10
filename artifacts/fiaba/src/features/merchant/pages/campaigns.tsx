import { useState } from 'react';
import { Link } from 'wouter';
import { Chart02Icon, Delete02Icon, Edit02Icon, PauseIcon, PlayIcon, Store01Icon, UserGroupIcon, Target01Icon, Add01Icon } from '@hugeicons/core-free-icons';
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
} from '../components/merchant-ui';
import { SafeImage } from '@/components/shared/safe-image';

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

  const safeCampaigns = campaigns ?? [];
  const active = safeCampaigns.filter((c) => c?.status === 'active').length;

  return (
    <Page
      eyebrow="Affiliation"
      title="Campagnes"
      description="Gérez les commissions et offres soumises à votre réseau d'affiliés."
      action={
        <Link href="/merchant/campaigns/new">
          <Button testId="button-add-campaign">
            <Icon glyph={Add01Icon} size={15} /> Créer une campagne
          </Button>
        </Link>
      }
    >
      {/* Summary */}
      <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <Card className="p-3.5 sm:p-4">
          <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Chart02Icon} size={18} /></span>
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Actives</p>
          <p className="mt-1 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#292541]">{active}</p>
        </Card>
        <Card className="p-3.5 sm:p-4">
          <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]"><Icon glyph={Store01Icon} size={18} /></span>
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total</p>
          <p className="mt-1 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#292541]">{safeCampaigns.length}</p>
        </Card>
        <Card className="p-3.5 sm:p-4">
          <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#fff4de] text-[#ac741e]"><Icon glyph={UserGroupIcon} size={18} /></span>
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En pause</p>
          <p className="mt-1 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#292541]">{safeCampaigns.filter((c) => c?.status === 'en_pause').length}</p>
        </Card>
        <Card className="p-3.5 sm:p-4">
          <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667]"><Icon glyph={Target01Icon} size={18} /></span>
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Terminées</p>
          <p className="mt-1 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#292541]">{safeCampaigns.filter((c) => c?.status === 'terminee').length}</p>
        </Card>
      </div>

      {/* Campaign cards */}
      {loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : safeCampaigns.length === 0 ? (
        <Card className="mt-5 p-0">
          <EmptyState glyph={Chart02Icon} title="Aucune campagne" description="Lancez votre première campagne pour mobiliser votre réseau." action={<Link href="/merchant/campaigns/new"><Button>Créer une campagne +</Button></Link>} />
        </Card>
      ) : (
        <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 lg:grid-cols-2">
          {safeCampaigns.map((c) => {
            const st = statusMap[c.status] ?? statusMap.terminee;
            const imgUrl = getFirstImageUrl(c.products?.image_url);
            return (
              <Card key={c.id} className="p-4 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <SafeImage src={imgUrl} alt={c.products?.name ?? c.name} className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl object-cover" fallbackGlyph={Chart02Icon} iconSize={20} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <h3 className="mt-1 font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#292541] truncate">{c.name}</h3>
                      {c.description && <p className="mt-0.5 text-xs text-[#77738a] line-clamp-1">{c.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f1eef7]">
                    <Link href={`/merchant/campaigns/${c.id}/edit`}>
                      <button className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff] transition" data-testid={`edit-${c.id}`} title="Éditer">
                        <Icon glyph={Edit02Icon} size={15} />
                      </button>
                    </Link>
                    <button onClick={() => toggle(c)} className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff] transition" data-testid={`toggle-${c.id}`} title={c.status === 'active' ? 'Mettre en pause' : 'Activer'}>
                      <Icon glyph={c.status === 'active' ? PauseIcon : PlayIcon} size={15} />
                    </button>
                    <button onClick={() => { haptic('light'); setToDelete(c); }} className="grid h-8 w-8 place-items-center rounded-xl bg-[#fff0f1] text-[#c45667] hover:bg-[#ffe2e5] transition" data-testid={`delete-${c.id}`} title="Supprimer">
                      <Icon glyph={Delete02Icon} size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-xl bg-[#f8f7fc] p-3 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Commission</p>
                    <p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#292541]">
                      {c.model === 'marge' || c.commission_type === 'fixed' || (!c.commission_type && c.commission >= 100) ? money(c.commission) : `${c.commission}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Modèle</p>
                    <p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#292541] capitalize">{c.model}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Objectif</p>
                    <p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#292541]">{c.goal ?? '—'}</p>
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
        message={toDelete ? `« ${toDelete.name} » sera définitivement supprimée.` : ''}
        confirmLabel="Supprimer"
      />
    </Page>
  );
}
