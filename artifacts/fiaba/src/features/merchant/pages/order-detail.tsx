import { useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Store01Icon, DeliveryTruck01Icon, Cancel01Icon, UserGroupIcon, Wallet01Icon, MapPinIcon, SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Badge,
  ConfirmDialog,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
} from '../components/merchant-ui';
import { seedOrders } from '@/config/seeds';
import type { Order, OrderStatus } from '@/types/entities';

const statuses: OrderStatus[] = ['À préparer', 'En livraison', 'Livrée', 'Annulée'];

const toneFor = (status: OrderStatus): 'mint' | 'amber' | 'rose' | 'violet' => {
  switch (status) {
    case 'Livrée': return 'mint';
    case 'À préparer': return 'amber';
    case 'Annulée': return 'rose';
    default: return 'violet';
  }
};

const statusGlyph = (status: OrderStatus) => {
  switch (status) {
    case 'Livrée': return CheckmarkCircle02Icon;
    case 'En livraison': return DeliveryTruck01Icon;
    case 'Annulée': return Cancel01Icon;
    default: return Store01Icon;
  }
};

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(() => read('orders', seedOrders));
  const [toCancel, setToCancel] = useState<Order | null>(null);

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <Page eyebrow="Commande" title="Introuvable" description="Cette commande n'existe pas.">
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-[#77738a]">La commande {id} est introuvable.</p>
          <Link href="/merchant/orders" className="mt-4 inline-block"><Button variant="soft">Retour aux commandes</Button></Link>
        </Card>
      </Page>
    );
  }

  function updateStatus(target: Order, status: OrderStatus) {
    const updated = orders.map((o) => (o.id === target.id ? { ...o, status } : o));
    setOrders(updated);
    write('orders', updated);
    toast({ title: 'Statut mis à jour', description: `${target.id} : ${status}` });
  }

  const actionsForStatus = (o: Order) => {
    switch (o.status) {
      case 'À préparer':
        return (
          <>
            <Button variant="primary" onClick={() => updateStatus(o, 'En livraison')} testId="button-mark-shipped">Marquer en livraison</Button>
            <Button variant="ghost" onClick={() => setToCancel(o)} testId="button-cancel-order">Annuler</Button>
          </>
        );
      case 'En livraison':
        return (
          <>
            <Button variant="primary" onClick={() => updateStatus(o, 'Livrée')} testId="button-mark-delivered">Marquer livrée</Button>
            <Button variant="ghost" onClick={() => setToCancel(o)} testId="button-cancel-order">Annuler</Button>
          </>
        );
      case 'Livrée':
        return <Badge tone="mint"><Icon glyph={CheckmarkCircle02Icon} size={13} /> Commande terminée</Badge>;
      case 'Annulée':
        return <Button variant="soft" onClick={() => updateStatus(o, 'À préparer')} testId="button-reactivate">Réactiver</Button>;
    }
  };

  return (
    <Page
      eyebrow="Commande"
      title={order.id}
      description={order.date}
      action={
        <Link href="/merchant/orders">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-5">
        <Card>
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneFor(order.status) === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : toneFor(order.status) === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : toneFor(order.status) === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
              <Icon glyph={statusGlyph(order.status)} size={22} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#292541]">Statut : {order.status}</p>
              <p className="mt-0.5 text-xs text-[#9290a2]">Mise à jour automatique</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p>
          <p className="mt-2 text-sm font-bold text-[#292541]">{order.customer}</p>
          {order.phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-[#77738a]"><Icon glyph={SmartPhone01Icon} size={13} /> {order.phone}</p>}
          {order.address && <p className="mt-1 flex items-center gap-1.5 text-xs text-[#77738a]"><Icon glyph={MapPinIcon} size={13} /> {order.address}, {order.zone ?? 'Sénégal'}</p>}
        </Card>

        {/* Seller attribution */}
        {order.sellerCode && (
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={UserGroupIcon} size={20} /></span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeur référent</p>
                <p className="mt-1 text-sm font-bold text-[#292541]">{order.sellerCode}</p>
                {order.sellerName && <p className="text-xs text-[#77738a]">{order.sellerName}</p>}
              </div>
              {order.commissionAmount && order.commissionAmount > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-[#278e69]">Commission</p>
                  <strong className="font-[Space_Grotesk] text-base font-bold text-[#278e69]">{money(order.commissionAmount)}</strong>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Montant</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{money(order.amount)}</p>
          {order.productName && order.quantity && (
            <div className="mt-3 flex justify-between text-xs text-[#77738a]">
              <span>{order.productName} × {order.quantity}</span><span>{money(order.amount - (order.deliveryFee ?? 0))}</span>
            </div>
          )}
          {order.deliveryFee != null && (
            <div className="mt-1 flex justify-between text-xs text-[#77738a]">
              <span>Livraison {order.zone ?? ''}</span><span>{money(order.deliveryFee)}</span>
            </div>
          )}
          {order.paymentMethod && (
            <div className="mt-3 flex items-center gap-2 border-t border-[#f0eff5] pt-3">
              <Icon glyph={Wallet01Icon} size={14} />
              <span className="text-xs font-bold text-[#292541]">Paiement : {order.paymentMethod === 'wave' ? 'Wave' : order.paymentMethod === 'orange' ? 'Orange Money' : 'À la livraison'}</span>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Suivi</p>
          <div className="mt-3 space-y-3">
            {(['À préparer', 'En livraison', 'Livrée'] as OrderStatus[]).map((step, i) => {
              const currentIdx = statuses.indexOf(order.status);
              const stepIdx = statuses.indexOf(step);
              const done = currentIdx > stepIdx || order.status === 'Livrée';
              const active = order.status === step;
              return (
                <div key={step} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? 'bg-[#278e69] text-white' : active ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#9290a2]'}`}>
                    {done ? <Icon glyph={CheckmarkCircle02Icon} size={14} /> : i + 1}
                  </span>
                  <span className={`text-xs font-bold ${active || done ? 'text-[#292541]' : 'text-[#9290a2]'}`}>{step}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          {actionsForStatus(order)}
        </div>
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        onClose={() => setToCancel(null)}
        onConfirm={() => { if (toCancel) updateStatus(toCancel, 'Annulée'); }}
        title="Annuler cette commande ?"
        message={toCancel ? `La commande ${toCancel.id} sera marquée comme annulée. Le client sera notifié.` : ''}
        confirmLabel="Annuler la commande"
      />
    </Page>
  );
}
