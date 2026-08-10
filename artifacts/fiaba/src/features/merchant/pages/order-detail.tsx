import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Store01Icon, DeliveryTruck01Icon, Cancel01Icon, UserGroupIcon, Wallet01Icon, MapPinIcon, SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useMerchantId, supabaseUpdate, getOrCreateMerchantId } from '@/hooks/use-supabase-query';
import {
  Badge,
  ConfirmDialog,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
} from '../components/merchant-ui';

type OrderDetail = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  total_amount: number;
  commission_amount: number;
  status: string;
  zone_name: string | null;
  delivery_fee: number;
  payment_method: string | null;
  created_at: string;
  seller_id: string | null;
  seller_code: string | null;
  seller_username?: string | null;
  product_name: string | null;
  quantity: number | null;
};

const statusMap: Record<string, { label: string; tone: 'mint' | 'amber' | 'rose' | 'violet'; glyph: typeof Store01Icon }> = {
  a_preparer: { label: 'À préparer', tone: 'amber', glyph: Store01Icon },
  en_livraison: { label: 'En livraison', tone: 'violet', glyph: DeliveryTruck01Icon },
  livree: { label: 'Livrée', tone: 'mint', glyph: CheckmarkCircle02Icon },
  annulee: { label: 'Annulée', tone: 'rose', glyph: Cancel01Icon },
};

const statusOrder = ['a_preparer', 'en_livraison', 'livree'] as const;

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toCancel, setToCancel] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const activeMerchantId = await getOrCreateMerchantId(merchantId);
      if (!activeMerchantId) {
        setLoading(false);
        return;
      }

      // Fetch order filtered strictly by merchant_id
      const { data: rawOrder } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, customer_address, total_amount, commission_amount, status, zone_name, delivery_fee, payment_method, created_at, seller_id')
        .eq('id', id)
        .eq('merchant_id', activeMerchantId)
        .maybeSingle();

      if (!rawOrder) {
        setLoading(false);
        return;
      }

      const o = rawOrder as Omit<OrderDetail, 'seller_code' | 'seller_username' | 'product_name' | 'quantity'>;

      // Fetch seller username (display_name) from sellers table
      let sellerUsername: string | null = null;
      let sellerCode: string | null = null;

      if (o.seller_id) {
        const { data: sRow } = await (supabase.from('sellers') as any)
          .select('display_name')
          .eq('id', o.seller_id)
          .maybeSingle();

        if (sRow?.display_name) {
          sellerUsername = sRow.display_name;
        }

        const { data: tl } = await supabase
          .from('tracking_links')
          .select('seller_code')
          .eq('seller_id', o.seller_id)
          .limit(1);
        sellerCode = (tl as { seller_code: string }[] | null)?.[0]?.seller_code ?? null;
      }

      // Fetch order items for product name + quantity
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity')
        .eq('order_id', id);
      const firstItem = (items as { product_name: string; quantity: number }[] | null)?.[0];

      setOrder({
        ...o,
        seller_code: sellerCode,
        seller_username: sellerUsername || sellerCode,
        product_name: firstItem?.product_name ?? null,
        quantity: firstItem?.quantity ?? null,
      });
      setLoading(false);
    }
    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <Page eyebrow="Chargement" title="…" description="">
        <div className="mt-6 flex items-center justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page eyebrow="Commande" title="Introuvable" description="Cette commande n'existe pas.">
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-[#77738a]">La commande est introuvable.</p>
          <Link href="/merchant/orders" className="mt-4 inline-block"><Button variant="soft">Retour aux commandes</Button></Link>
        </Card>
      </Page>
    );
  }

  async function updateStatus(target: OrderDetail, newStatus: string) {
    setUpdating(true);
    haptic('medium');
    const { error } = await supabaseUpdate('orders', target.id, { status: newStatus });
    setUpdating(false);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error });
    } else {
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
      const cfg = statusMap[newStatus];
      toast({ title: 'Statut mis à jour', description: `CMD-${target.id.slice(-6).toUpperCase()} : ${cfg?.label ?? newStatus}` });
    }
  }

  const cfg = statusMap[order.status] ?? statusMap.a_preparer;
  const shortId = `CMD-${order.id.slice(-6).toUpperCase()}`;
  const dateStr = new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const actionsForStatus = (o: OrderDetail) => {
    switch (o.status) {
      case 'a_preparer':
        return (
          <>
            <Button variant="primary" onClick={() => updateStatus(o, 'en_livraison')} disabled={updating} testId="button-mark-shipped">Marquer en livraison</Button>
            <Button variant="ghost" onClick={() => { haptic('light'); setToCancel(true); }} testId="button-cancel-order">Annuler</Button>
          </>
        );
      case 'en_livraison':
        return (
          <>
            <Button variant="primary" onClick={() => updateStatus(o, 'livree')} disabled={updating} testId="button-mark-delivered">Marquer livrée</Button>
            <Button variant="ghost" onClick={() => { haptic('light'); setToCancel(true); }} testId="button-cancel-order">Annuler</Button>
          </>
        );
      case 'livree':
        return <Badge tone="mint"><Icon glyph={CheckmarkCircle02Icon} size={13} /> Commande terminée</Badge>;
      case 'annulee':
        return <Button variant="soft" onClick={() => updateStatus(o, 'a_preparer')} disabled={updating} testId="button-reactivate">Réactiver</Button>;
      default:
        return null;
    }
  };

  return (
    <Page
      eyebrow="Commande"
      title={shortId}
      description={dateStr}
      action={
        <Link href="/merchant/orders">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-5">
        <Card>
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${cfg.tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : cfg.tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : cfg.tone === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
              <Icon glyph={cfg.glyph} size={22} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#292541]">Statut : {cfg.label}</p>
              <p className="mt-0.5 text-xs text-[#9290a2]">Mise à jour automatique</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p>
          <p className="mt-2 text-sm font-bold text-[#292541]">{order.customer_name}</p>
          {order.customer_phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-[#77738a]"><Icon glyph={SmartPhone01Icon} size={13} /> {order.customer_phone}</p>}
          {order.customer_address && <p className="mt-1 flex items-center gap-1.5 text-xs text-[#77738a]"><Icon glyph={MapPinIcon} size={13} /> {order.customer_address}, {order.zone_name ?? 'Sénégal'}</p>}
        </Card>

        {/* Seller attribution */}
        {order.seller_username && (
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={UserGroupIcon} size={20} /></span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeur référent</p>
                {order.seller_id ? (
                  <Link href={`/merchant/sellers/${order.seller_id}`} className="mt-1 inline-block text-sm font-bold text-[#5b49e8] hover:underline">
                    {order.seller_username}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm font-bold text-[#292541]">{order.seller_username}</p>
                )}
              </div>
              {order.commission_amount > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-[#278e69]">Commission</p>
                  <strong className="font-[Space_Grotesk] text-base font-bold text-[#278e69]">{money(order.commission_amount)}</strong>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Montant</p>
          <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{money(order.total_amount)}</p>
          {order.product_name && order.quantity && (
            <div className="mt-3 flex justify-between text-xs text-[#77738a]">
              <span>{order.product_name} × {order.quantity}</span><span>{money(order.total_amount - order.delivery_fee)}</span>
            </div>
          )}
          {order.delivery_fee != null && (
            <div className="mt-1 flex justify-between text-xs text-[#77738a]">
              <span>Livraison {order.zone_name ?? ''}</span><span>{money(order.delivery_fee)}</span>
            </div>
          )}
          {order.payment_method && (
            <div className="mt-3 flex items-center gap-2 border-t border-[#f0eff5] pt-3">
              <Icon glyph={Wallet01Icon} size={14} />
              <span className="text-xs font-bold text-[#292541]">Paiement : {order.payment_method === 'wave' ? 'Wave' : order.payment_method === 'orange_money' ? 'Orange Money' : 'À la livraison'}</span>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Suivi</p>
          <div className="mt-3 space-y-3">
            {statusOrder.map((step, i) => {
              const cfgStep = statusMap[step];
              const currentIdx = statusOrder.indexOf(order.status as typeof statusOrder[number]);
              const stepIdx = i;
              const done = currentIdx > stepIdx || order.status === 'livree';
              const active = order.status === step;
              return (
                <div key={step} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? 'bg-[#278e69] text-white' : active ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#9290a2]'}`}>
                    {done ? <Icon glyph={CheckmarkCircle02Icon} size={14} /> : i + 1}
                  </span>
                  <span className={`text-xs font-bold ${active || done ? 'text-[#292541]' : 'text-[#9290a2]'}`}>{cfgStep.label}</span>
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
        open={toCancel}
        onClose={() => setToCancel(false)}
        onConfirm={() => { if (order) updateStatus(order, 'annulee'); setToCancel(false); }}
        title="Annuler cette commande ?"
        message={`La commande ${shortId} sera marquée comme annulée. Le client sera notifié.`}
        confirmLabel="Annuler la commande"
      />
    </Page>
  );
}
