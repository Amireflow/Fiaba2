import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Cancel01Icon, Clock01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
} from '../components/seller-ui';

type SaleDetail = {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  status: string;
  product_name: string | null;
  quantity: number | null;
  created_at: string;
  commission_status: string | null;
  commission_available_at: string | null;
};

const orderStatusMap: Record<string, { label: string; tone: 'amber' | 'violet' | 'mint' | 'rose'; glyph: typeof Clock01Icon }> = {
  a_preparer: { label: 'En cours', tone: 'amber', glyph: Clock01Icon },
  en_livraison: { label: 'En cours', tone: 'amber', glyph: Clock01Icon },
  livree: { label: 'Livré', tone: 'violet', glyph: DeliveryTruck01Icon },
  annulee: { label: 'Annulé', tone: 'rose', glyph: Cancel01Icon },
};

const commissionStatusMap: Record<string, { label: string; tone: 'amber' | 'violet' | 'mint' | 'rose'; glyph: typeof Clock01Icon }> = {
  pending: { label: 'En cours', tone: 'amber', glyph: Clock01Icon },
  available: { label: 'Livré', tone: 'violet', glyph: DeliveryTruck01Icon },
  paid: { label: 'Payé', tone: 'mint', glyph: CheckmarkCircle02Icon },
  reversed: { label: 'Annulé', tone: 'rose', glyph: Cancel01Icon },
};

export function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSale() {
      if (!id) return;
      setLoading(true);

      // Fetch order
      const { data: rawOrder } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, commission_amount, status, created_at')
        .eq('id', id)
        .single();

      if (!rawOrder) {
        setLoading(false);
        return;
      }

      const o = rawOrder as Omit<SaleDetail, 'product_name' | 'quantity' | 'commission_status' | 'commission_available_at'>;

      // Fetch order item
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity')
        .eq('order_id', id)
        .limit(1);
      const firstItem = (items as { product_name: string; quantity: number }[] | null)?.[0];

      // Fetch commission
      const { data: comm } = await supabase
        .from('commissions')
        .select('status, available_at')
        .eq('order_id', id)
        .limit(1);
      const commission = (comm as { status: string; available_at: string | null }[] | null)?.[0];

      setOrder({
        ...o,
        product_name: firstItem?.product_name ?? null,
        quantity: firstItem?.quantity ?? null,
        commission_status: commission?.status ?? null,
        commission_available_at: commission?.available_at ?? null,
      });
      setLoading(false);
    }
    loadSale();
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
      <Page eyebrow="Vente" title="Introuvable" description="Cette vente n'existe pas.">
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-[#77738a]">La vente est introuvable.</p>
          <Link href="/seller/sales" className="mt-4 inline-block"><Button variant="soft">Retour aux ventes</Button></Link>
        </Card>
      </Page>
    );
  }

  // Display status: prefer commission status, fallback to order status
  const displayCfg = order.commission_status
    ? (commissionStatusMap[order.commission_status] ?? orderStatusMap[order.status] ?? orderStatusMap.a_preparer)
    : (orderStatusMap[order.status] ?? orderStatusMap.a_preparer);

  const shortId = `CMD-${order.id.slice(-6).toUpperCase()}`;
  const dateStr = new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusDescription = () => {
    if (order.commission_status === 'pending') return 'La commande est en cours de traitement. Votre commission sera disponible après la période de sécurité (14 jours).';
    if (order.commission_status === 'available') return 'Le produit a été livré. Votre commission est disponible pour retrait.';
    if (order.commission_status === 'paid') return 'Le paiement est confirmé. Votre commission a été versée.';
    if (order.commission_status === 'reversed') return 'Cette commande a été annulée. Aucune commission ne sera versée.';
    if (order.status === 'livree') return 'Le produit a été livré. En attente de confirmation du paiement.';
    if (order.status === 'annulee') return 'Cette commande a été annulée. Aucune commission ne sera versée.';
    return 'La commande est en cours de traitement ou de livraison.';
  };

  return (
    <Page
      eyebrow="Vente"
      title={shortId}
      description={dateStr}
      action={
        <Link href="/seller/sales">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${displayCfg.tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : displayCfg.tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : displayCfg.tone === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#efedff] text-[#5b49e8]'}`}>
              <Icon glyph={displayCfg.glyph} size={22} />
            </span>
            <div>
              <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{shortId}</p>
              <p className="text-xs text-[#77738a]">{dateStr}</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p>
          <p className="mt-2 text-sm font-bold text-[#292541]">{order.customer_name}</p>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Produit</p>
          <p className="mt-2 text-sm font-bold text-[#292541]">{order.product_name ?? '—'}{order.quantity ? ` × ${order.quantity}` : ''}</p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Montant commande</p>
            <p className="mt-2 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{money(order.total_amount)}</p>
          </Card>
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">Votre commission</p>
            <p className="mt-2 font-[Space_Grotesk] text-xl font-bold text-[#278e69]">{money(order.commission_amount)}</p>
            {order.commission_available_at && order.commission_status === 'pending' && (
              <p className="mt-1 text-[10px] text-[#9290a2]">Disponible le {new Date(order.commission_available_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
            )}
          </Card>
        </div>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Statut</p>
          <div className="mt-2"><SellerBadge tone={displayCfg.tone}>{displayCfg.label}</SellerBadge></div>
          <p className="mt-2 text-[11px] leading-4 text-[#77738a]">{statusDescription()}</p>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          {order.commission_status === 'paid' && <SellerBadge tone="mint"><Icon glyph={CheckmarkCircle02Icon} size={13} /> Commission validée</SellerBadge>}
          {order.commission_status === 'available' && <SellerBadge tone="violet"><Icon glyph={DeliveryTruck01Icon} size={13} /> Commission disponible</SellerBadge>}
        </div>
      </div>
    </Page>
  );
}
