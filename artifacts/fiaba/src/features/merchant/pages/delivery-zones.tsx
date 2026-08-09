import { useState } from 'react';
import { Link } from 'wouter';
import { Add01Icon, Delete02Icon, MapPinIcon } from '@hugeicons/core-free-icons';
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
  ScrollTable,
  Toggle,
} from '../components/merchant-ui';
import { seedZones } from '@/config/seeds';
import type { DeliveryZone } from '@/types/entities';

export function DeliveryZones() {
  const { toast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>(() => read('zones', seedZones));
  const [toDelete, setToDelete] = useState<number | null>(null);

  const updateZones = (fn: (prev: DeliveryZone[]) => DeliveryZone[]) => {
    const updated = fn(zones);
    setZones(updated);
    write('zones', updated);
  };

  function toggleZone(i: number) {
    updateZones((all) => all.map((z, idx): DeliveryZone => (idx === i ? [z[0], !z[1], z[2]] : z)));
  }

  function updateFee(i: number, fee: number) {
    updateZones((all) => all.map((z, idx): DeliveryZone => (idx === i ? [z[0], z[1], fee] : z)));
  }

  function confirmDelete() {
    if (toDelete === null) return;
    const removed = zones[toDelete]?.[0] ?? '';
    updateZones((all) => all.filter((_, idx) => idx !== toDelete));
    toast({ title: 'Zone supprimée', description: `${removed} n'est plus proposée.` });
    setToDelete(null);
  }

  const activeCount = zones.filter((z) => z[1]).length;

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

        {zones.length === 0 ? (
          <EmptyState glyph={MapPinIcon} title="Aucune zone configurée" description="Ajoutez votre première zone de livraison." action={<Link href="/merchant/delivery-zones/new"><Button>Ajouter une zone</Button></Link>} />
        ) : (
          <ScrollTable minWidth={520} testId="scroll-zones">
            <div className="divide-y divide-[#f1eef7]">
              {zones.map(([name, active, fee], i) => (
                <div key={`${name}-${i}`} className="flex items-center gap-3 px-5 py-4">
                  <Toggle checked={active} onChange={() => toggleZone(i)} testId={`toggle-${i}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#292541]">{name}</p>
                    <p className="mt-0.5 text-[10px] text-[#9290a2]">{active ? 'Livraison proposée' : 'Zone masquée'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#77738a]">
                      Frais
                      <input
                        type="number"
                        min="0"
                        value={String(fee)}
                        onChange={(e) => updateFee(i, Number(e.target.value))}
                        className="w-24 rounded-lg border border-[#e5e2ee] bg-[#fbfaff] px-3 py-2 text-right text-xs text-[#292541] outline-none focus:border-[#5b49e8]"
                        data-testid={`fee-${i}`}
                      /> F
                    </label>
                    <button onClick={() => setToDelete(i)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff0f1] text-[#c45667]" data-testid={`delete-${i}`}>
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
        message={toDelete !== null ? `« ${zones[toDelete]?.[0]} » ne sera plus proposée à la livraison.` : ''}
        confirmLabel="Supprimer"
      />
    </Page>
  );
}
