import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { useMerchantId, useSupabaseQuery, supabaseInsert, getOrCreateMerchantId } from '@/hooks/use-supabase-query';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
} from '../components/merchant-ui';

type ZoneRef = {
  id: string;
  name: string;
  level: string;
};

export function DeliveryZoneNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const { data: zoneRefs } = useSupabaseQuery<ZoneRef>('zones', {
    select: 'id, name, level',
    filter: { is_active: true },
    order: { column: 'name', ascending: true },
  });
  const [name, setName] = useState('');
  const [zoneRefId, setZoneRefId] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-fill name when a zone ref is selected
  useEffect(() => {
    if (zoneRefId) {
      const ref = zoneRefs.find((z) => z.id === zoneRefId);
      if (ref && !name) setName(ref.name);
    }
  }, [zoneRefId, zoneRefs, name]);

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    const activeMerchantId = await getOrCreateMerchantId(merchantId);
    if (!activeMerchantId) {
      haptic('error');
      toast({ title: 'Boutique introuvable', description: 'Impossible d\'identifier votre boutique. Veuillez rafraîchir la page.' });
      return;
    }
    const trimmedName = name.trim();
    const feeNum = Number(fee);
    if (!trimmedName || isNaN(feeNum) || feeNum < 0) {
      haptic('error');
      toast({ title: 'Champs invalides', description: 'Saisissez un nom et des frais valides.' });
      return;
    }

    setSaving(true);
    haptic('medium');
    const { error } = await supabaseInsert('delivery_zones', {
      merchant_id: activeMerchantId,
      name: trimmedName,
      fee: feeNum,
      is_active: true,
      zone_ref_id: zoneRefId || null,
    });
    setSaving(false);

    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error });
    } else {
      haptic('success');
      toast({ title: 'Zone ajoutée', description: `${trimmedName} est maintenant proposée à la livraison.` });
      navigate('/merchant/delivery-zones');
    }
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
          <Field label="Zone de référence (optionnel)" hint="Sélectionnez une zone du référentiel national">
            <select value={zoneRefId} onChange={(e) => setZoneRefId(e.target.value)} className={selectClass} data-testid="input-zone-ref">
              <option value="">— Zone personnalisée —</option>
              {zoneRefs.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.level})</option>
              ))}
            </select>
          </Field>
          <Field label="Nom de la zone">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Saint-Louis" className={inputClass} data-testid="input-zone-name" />
          </Field>
          <Field label="Frais de livraison (FCFA)">
            <input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" className={inputClass} data-testid="input-zone-fee" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/merchant/delivery-zones"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" disabled={saving} testId="button-save-zone">{saving ? 'Ajout…' : 'Ajouter'}</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
