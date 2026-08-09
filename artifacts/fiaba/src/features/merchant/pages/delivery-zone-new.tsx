import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
} from '../components/merchant-ui';
import { seedZones } from '@/config/seeds';
import type { DeliveryZone } from '@/types/entities';

export function DeliveryZoneNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>(() => read('zones', seedZones));
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');

  function addZone(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const feeNum = Number(fee);
    if (!trimmedName || isNaN(feeNum) || feeNum < 0) {
      toast({ title: 'Champs invalides', description: 'Saisissez un nom et des frais valides.' });
      return;
    }
    const updated = [...zones, [trimmedName, true, feeNum] as DeliveryZone];
    setZones(updated);
    write('zones', updated);
    toast({ title: 'Zone ajoutée', description: `${trimmedName} est maintenant proposée à la livraison.` });
    navigate('/merchant/delivery-zones');
  }

  return (
    <Page
      eyebrow="Nouvelle zone"
      title="Ajouter une zone"
      description="Définissez le nom et les frais de livraison."
      action={
        <Link href="/merchant/delivery-zones">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <Card className="mt-6">
        <form onSubmit={addZone} className="space-y-5">
          <Field label="Nom de la zone">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Saint-Louis" className={inputClass} data-testid="input-zone-name" />
          </Field>
          <Field label="Frais de livraison (FCFA)">
            <input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" className={inputClass} data-testid="input-zone-fee" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/merchant/delivery-zones"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" testId="button-save-zone">Ajouter</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
