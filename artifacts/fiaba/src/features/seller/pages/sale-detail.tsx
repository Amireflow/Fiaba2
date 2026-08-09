import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Cancel01Icon, Clock01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
} from '../components/seller-ui';
import { seedSellerOrders } from '@/config/seller-seeds';
import type { SellerOrder, SellerOrderStatus } from '@/types/entities';

const toneFor = (s: SellerOrderStatus): 'amber' | 'violet' | 'mint' | 'rose' => {
  switch (s) {
    case 'Payé': return 'mint';
    case 'Livré': return 'violet';
    case 'Annulé': return 'rose';
    default: return 'amber';
  }
};

const glyphFor = (s: SellerOrderStatus) => {
  switch (s) {
    case 'Payé': return CheckmarkCircle02Icon;
    case 'Livré': return DeliveryTruck01Icon;
    case 'Annulé': return Cancel01Icon;
    default: return Clock01Icon;
  }
};

export function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<SellerOrder[]>(() => read('seller-orders', seedSellerOrders));

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <Page eyebrow="Vente" title="Introuvable" description="Cette vente n'existe pas.">
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-[#77738a]">La vente {id} est introuvable.</p>
          <Link href="/seller/sales" className="mt-4 inline-block"><Button variant="soft">Retour aux ventes</Button></Link>
        </Card>
      </Page>
    );
  }

  function updateStatus(target: SellerOrder, status: SellerOrderStatus) {
    const updated = orders.map((o) => (o.id === target.id ? { ...o, status } : o));
    setOrders(updated);
    write('seller-orders', updated);
  }

  return (
    <Page
      eyebrow="Vente"
      title={order.id}
      description={order.date}
      action={
        <Link href="/seller/sales">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneFor(order.status) === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : toneFor(order.status) === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : toneFor(order.status) === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
              <Icon glyph={glyphFor(order.status)} size={22} />
            </span>
            <div>
              <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{order.id}</p>
              <p className="text-xs text-[#77738a]">{order.date}</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p>
          <p className="mt-2 text-sm font-bold text-[#292541]">{order.customer}</p>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Produit</p>
          <p className="mt-2 text-sm font-bold text-[#292541]">{order.product}</p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Montant commande</p>
            <p className="mt-2 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{money(order.amount)}</p>
          </Card>
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">Votre commission</p>
            <p className="mt-2 font-[Space_Grotesk] text-xl font-bold text-[#278e69]">{money(order.commission)}</p>
          </Card>
        </div>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Statut</p>
          <div className="mt-2"><SellerBadge tone={toneFor(order.status)}>{order.status}</SellerBadge></div>
          <p className="mt-2 text-[11px] leading-4 text-[#77738a]">
            {order.status === 'En cours' && 'La commande est en cours de traitement ou de livraison.'}
            {order.status === 'Livré' && 'Le produit a été livré. En attente de confirmation du paiement.'}
            {order.status === 'Payé' && 'Le paiement est confirmé. Votre commission est disponible.'}
            {order.status === 'Annulé' && 'Cette commande a été annulée. Aucune commission ne sera versée.'}
          </p>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          {order.status === 'En cours' && (
            <>
              <Button variant="primary" onClick={() => updateStatus(order, 'Livré')} testId="button-mark-delivered">Marquer livré</Button>
              <Button variant="ghost" onClick={() => updateStatus(order, 'Annulé')} testId="button-cancel-seller-order">Annuler</Button>
            </>
          )}
          {order.status === 'Livré' && (
            <Button variant="primary" onClick={() => updateStatus(order, 'Payé')} testId="button-mark-paid">Marquer payé</Button>
          )}
          {order.status === 'Annulé' && (
            <Button variant="soft" onClick={() => updateStatus(order, 'En cours')} testId="button-reactivate-seller-order">Réactiver</Button>
          )}
          {order.status === 'Payé' && <SellerBadge tone="mint"><Icon glyph={CheckmarkCircle02Icon} size={13} /> Commission validée</SellerBadge>}
        </div>
      </div>
    </Page>
  );
}
