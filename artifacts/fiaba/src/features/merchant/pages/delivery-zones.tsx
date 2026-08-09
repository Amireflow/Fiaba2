import { useState } from 'react';
import { Link } from 'wouter';
import { Add01Icon, Delete02Icon, MapPinIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, useSupabaseQuery, supabaseDelete, supabaseUpdate } from '@/hooks/use-supabase-query';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ScrollTable,
  Toggle,
} from '../components/merchant-ui';

type ZoneRow = {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
};

export function DeliveryZones() {
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const { data: zones, loading, refetch } = useSupabaseQuery<ZoneRow>('delivery_zones', {
    select: 'id, name, fee, is_active',
    filter: { merchant_id: merchantId },
    order: { column: 'created_at', ascending: true },
    enabled: !!merchantId,
  });
  const [toDelete, setToDelete] = useState<ZoneRow | null>(null);

  async function toggleZone(zone: ZoneRow) {
    haptic('light');
    const { error } = await supabaseUpdate('delivery_zones', zone.id, { is_active: !zone.is_active });
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      refetch();
    }
  }

  async function updateFee(zone: ZoneRow, fee: number) {
    const { error } = await supabaseUpdate('delivery_zones', zone.id, { fee });
    if (error) {
      toast({ title: 'Erreur', description: error });
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    haptic('warning');
    const { error } = await supabaseDelete('delivery_zones', toDelete.id);
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: 'Zone supprimée', description: `${toDelete.name} n'est plus proposée.` });
      refetch();
    }
    setToDelete(null);
  }

  const activeCount = zones.filter((z) => z.is_active).length;

  return (
    <Page
      eyebrow="Livrer avec clarté"
      title="Zones de livraison"
      description="Choisissez où vous livrez et affichez des frais cohérents à vos clients."
      action={<Link href="/merchant/delivery-zones/new"><Button testId="button-add-zone"><Icon glyph={Add01Icon} size={15} /> Ajouter une zone</Button></Link>}
    >
      <Card className="mt-6 overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div><p className="text-sm font-bold text-[#292541]">Couverture du Sénégal</p><p className="mt-1 text-[11px] text-[#9290a2]">Les zones actives sont proposées au moment du paiement.</p></div>
          <Badge tone="mint">{activeCount} zones actives</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : zones.length === 0 ? (
          <EmptyState glyph={MapPinIcon} title="Aucune zone configurée" description="Ajoutez votre première zone de livraison." action={<Link href="/merchant/delivery-zones/new"><Button>Ajouter une zone</Button></Link>} />
        ) : (
          <ScrollTable minWidth={520} testId="scroll-zones">
            <div className="divide-y divide-[#f1eef7]">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center gap-3 px-5 py-4">
                  <Toggle checked={zone.is_active} onChange={() => toggleZone(zone)} testId={`toggle-${zone.id}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#292541]">{zone.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#9290a2]">{zone.is_active ? 'Livraison proposée' : 'Zone masquée'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#77738a]">
                      Frais
                      <input
                        type="number"
                        min="0"
                        defaultValue={String(zone.fee)}
                        onBlur={(e) => updateFee(zone, Number(e.target.value))}
                        className="w-24 rounded-lg border border-[#e5e2ee] bg-[#fbfaff] px-3 py-2 text-right text-xs text-[#292541] outline-none focus:border-[#5b49e8]"
                        data-testid={`fee-${zone.id}`}
                      /> F
                    </label>
                    <button onClick={() => { haptic('light'); setToDelete(zone); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff0f1] text-[#c45667]" data-testid={`delete-${zone.id}`}>
                      <Icon glyph={Delete02Icon} size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollTable>
        )}
      </Card>

      <div className="mt-4 rounded-2xl bg-[#e7faf2] p-4 text-xs leading-5 text-[#347861]">
        <strong>Conseil Fiaba.</strong> Les frais simples et affichés avant la commande rassurent les clients, surtout pour les livraisons hors Dakar.
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer cette zone ?"
        message={toDelete ? `« ${toDelete.name} » ne sera plus proposée à la livraison.` : ''}
        confirmLabel="Supprimer"
      />
    </Page>
  );
}
