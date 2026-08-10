import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock01Icon,
  DeliveryTruck01Icon,
  User02Icon,
  Package01Icon,
  Wallet01Icon,
  Calendar01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
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
  a_preparer: { label: 'À préparer', tone: 'amber', glyph: Clock01Icon },
  en_livraison: { label: 'En livraison', tone: 'violet', glyph: DeliveryTruck01Icon },
  livree: { label: 'Livré', tone: 'mint', glyph: CheckmarkCircle02Icon },
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

  const { profile } = useAuth();

  useEffect(() => {
    async function loadSale() {
      if (!id || !profile) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Get current seller ID
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      const sId = (seller as { id: string } | null)?.id;
      if (!sId) {
        setLoading(false);
        return;
      }

      // Fetch order scoped to seller_id
      const { data: rawOrder } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, commission_amount, status, created_at')
        .eq('id', id)
        .eq('seller_id', sId)
        .maybeSingle();

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

  const statusSteps = [
    { key: 'a_preparer', label: 'Commande passée', glyph: Clock01Icon },
    { key: 'en_livraison', label: 'En livraison', glyph: DeliveryTruck01Icon },
    { key: 'livree', label: 'Livré', glyph: CheckmarkCircle02Icon },
  ] as const;
  const currentStepIdx = statusSteps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'annulee' || order.commission_status === 'reversed';

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
        {/* Hero status card */}
        <div className={`overflow-hidden rounded-[22px] p-5 text-white shadow-lg sm:p-6 ${isCancelled ? 'bg-gradient-to-br from-[#c45667] via-[#d06576] to-[#e07889]' : displayCfg.tone === 'mint' ? 'bg-gradient-to-br from-[#278e69] via-[#2da37a] to-[#36b88a]' : displayCfg.tone === 'violet' ? 'bg-gradient-to-br from-[#5745df] via-[#6b58f0] to-[#7d6cf5]' : 'bg-gradient-to-br from-[#ac741e] via-[#c48d2e] to-[#daa640]'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/70">Statut</p>
              <strong className="mt-2 block font-[Space_Grotesk] text-2xl font-bold tracking-[-.04em] sm:text-3xl">{displayCfg.label}</strong>
              <p className="mt-2 text-xs text-white/70 leading-5 max-w-sm">{statusDescription()}</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Icon glyph={displayCfg.glyph} size={24} />
            </span>
          </div>
        </div>

        {/* Timeline tracker */}
        {!isCancelled && (
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Suivi</p>
            <div className="mt-4 flex items-center gap-1">
              {statusSteps.map((step, i) => {
                const done = currentStepIdx > i || order.status === 'livree';
                const active = order.status === step.key;
                const isLast = i === statusSteps.length - 1;
                return (
                  <div key={step.key} className="flex flex-1 items-center gap-1">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition ${done ? 'bg-[#278e69] text-white' : active ? 'bg-[#5b49e8] text-white ring-4 ring-[#efedff]' : 'bg-[#f0eff5] text-[#9290a2]'}`}>
                        {done ? <Icon glyph={CheckmarkCircle02Icon} size={16} /> : <Icon glyph={step.glyph} size={16} />}
                      </span>
                      <span className={`text-[10px] font-bold ${active || done ? 'text-[#292541]' : 'text-[#9290a2]'}`}>{step.label}</span>
                    </div>
                    {!isLast && <div className={`h-0.5 flex-1 rounded-full ${done ? 'bg-[#278e69]' : 'bg-[#f0eff5]'}`} />}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={User02Icon} size={18} /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Client</p>
                <p className="mt-0.5 truncate text-sm font-bold text-[#292541]">{order.customer_name}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0eff5] text-[#716d82]"><Icon glyph={Package01Icon} size={18} /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Produit</p>
                <p className="mt-0.5 truncate text-sm font-bold text-[#292541]">{order.product_name ?? '—'}{order.quantity ? ` × ${order.quantity}` : ''}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Amount + Commission */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Montant commande</p>
            <p className="mt-2 font-[Space_Grotesk] text-xl font-bold text-[#292541] sm:text-2xl">{money(order.total_amount)}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7faf2] text-[#278e69]"><Icon glyph={Wallet01Icon} size={14} /></span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">Votre commission</p>
            </div>
            <p className="mt-2 font-[Space_Grotesk] text-xl font-bold text-[#278e69] sm:text-2xl">{money(order.commission_amount)}</p>
            {order.commission_available_at && order.commission_status === 'pending' && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#9290a2]">
                <Icon glyph={Calendar01Icon} size={12} />
                Disponible le {new Date(order.commission_available_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </Card>
        </div>

        {/* Commission status badges */}
        <div className="flex flex-wrap gap-2">
          {order.commission_status === 'paid' && <SellerBadge tone="mint"><Icon glyph={CheckmarkCircle02Icon} size={13} /> Commission payée</SellerBadge>}
          {order.commission_status === 'available' && <SellerBadge tone="violet"><Icon glyph={Wallet01Icon} size={13} /> Commission disponible</SellerBadge>}
          {order.commission_status === 'pending' && <SellerBadge tone="amber"><Icon glyph={Clock01Icon} size={13} /> Commission en attente</SellerBadge>}
          {order.commission_status === 'reversed' && <SellerBadge tone="rose"><Icon glyph={Cancel01Icon} size={13} /> Commission annulée</SellerBadge>}
        </div>
      </div>
    </Page>
  );
}
