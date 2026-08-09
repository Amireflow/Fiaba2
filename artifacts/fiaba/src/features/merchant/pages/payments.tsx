import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { CheckmarkCircle02Icon, Wallet01Icon, Clock01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { supabaseDelete } from '@/hooks/use-supabase-query';
import {
  Badge,
  ConfirmDialog,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ScrollTable,
} from '../components/merchant-ui';

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  total_amount: number;
  merchant_amount: number;
  status: string;
};

const statusMap: Record<string, { label: string; tone: 'mint' | 'amber' | 'rose'; glyph: typeof CheckmarkCircle02Icon }> = {
  en_attente: { label: 'En attente', tone: 'amber', glyph: Clock01Icon },
  disponible: { label: 'Disponible', tone: 'amber', glyph: Clock01Icon },
  verse: { label: 'Versé', tone: 'mint', glyph: CheckmarkCircle02Icon },
  echoue: { label: 'Échoué', tone: 'rose', glyph: Cancel01Icon },
};

const methodLabel: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  cash: 'Espèces',
  card: 'Carte bancaire',
};

export function Payments() {
  const { toast } = useToast();
  const { merchantId } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toCancel, setToCancel] = useState<PaymentRow | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!merchantId) {
        setLoading(false);
        return;
      }

      // Fetch payments
      const { data: payData } = await supabase
        .from('payments')
        .select('id, amount, method, status, reference, paid_at, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });
      setPayments((payData as PaymentRow[] | null) ?? []);

      // Fetch orders to compute balance
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, total_amount, merchant_amount, status')
        .eq('merchant_id', merchantId)
        .in('status', ['livree']);
      setOrders((orderData as OrderRow[] | null) ?? []);

      setLoading(false);
    }
    loadData();
  }, [merchantId]);

  // Balance = sum of merchant_amount for delivered orders - sum of paid payments
  const totalRevenue = orders.reduce((s, o) => s + (o.merchant_amount ?? o.total_amount), 0);
  const totalPaid = payments.filter((p) => p.status === 'verse').reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, totalRevenue - totalPaid);
  const pending = payments.filter((p) => p.status === 'en_attente' || p.status === 'disponible').reduce((s, p) => s + p.amount, 0);

  async function cancelPayout() {
    if (!toCancel) return;
    haptic('medium');
    const { error } = await supabaseDelete('payments', toCancel.id);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error });
    } else {
      setPayments((prev) => prev.filter((p) => p.id !== toCancel.id));
      toast({ title: 'Versement annulé', description: `${money(toCancel.amount)} sont de nouveau disponibles.` });
    }
    setToCancel(null);
  }

  return (
    <Page
      eyebrow="Votre trésorerie"
      title="Paiements"
      description="Gardez une vue claire sur ce qui est disponible, en cours et déjà versé."
      action={<Link href="/merchant/payments/withdraw"><Button testId="button-request-payout">Demander un versement</Button></Link>}
    >
      {/* Balance cards */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Solde disponible</p>
          <strong className="mt-4 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">{money(balance).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small></strong>
          <p className="mt-3 text-xs text-[#d0caff]">{orders.length} commande(s) livrée(s)</p>
          <Link href="/merchant/payments/withdraw"><Button variant="white" className="mt-6" testId="button-withdraw"><Icon glyph={Wallet01Icon} size={15} /> Retirer mes fonds</Button></Link>
        </div>
        <Card>
          <p className="text-sm font-bold text-[#292541]">En cours de traitement</p>
          <div className="mt-5 flex items-center justify-between">
            <div><strong className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(pending)}</strong><p className="mt-1 text-[10px] text-[#9290a2]">{payments.filter((p) => p.status === 'en_attente' || p.status === 'disponible').length} demande(s) en attente</p></div>
            <Badge tone="amber">En attente</Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 pt-4">
            <div><p className="text-[10px] text-[#9290a2]">Total versé</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{money(totalPaid)}</p></div>
            <div><p className="text-[10px] text-[#9290a2]">CA livré</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#278e69]">{money(totalRevenue)}</p></div>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-5 p-0">
        <div className="px-5 py-4"><p className="text-sm font-bold text-[#292541]">Historique des versements</p></div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8b88a0]">Aucun versement effectué pour le moment.</div>
        ) : (
          <ScrollTable minWidth={580} testId="scroll-payouts">
            <div className="divide-y divide-[#f1eef7]">
              {payments.map((p) => {
                const cfg = statusMap[p.status] ?? statusMap.en_attente;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${cfg.tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : cfg.tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#fff0f1] text-[#c45667]'}`}>
                      <Icon glyph={cfg.glyph} size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#292541]">{money(p.amount)}</p>
                      <p className="mt-0.5 text-[10px] text-[#9290a2]">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {methodLabel[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ''}</p>
                    </div>
                    <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    {(p.status === 'en_attente' || p.status === 'disponible') && (
                      <Button variant="ghost" onClick={() => { haptic('light'); setToCancel(p); }} testId={`cancel-${p.id}`}>Annuler</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollTable>
        )}
      </Card>

      <ConfirmDialog
        open={toCancel !== null}
        onClose={() => setToCancel(null)}
        onConfirm={cancelPayout}
        title="Annuler ce versement ?"
        message={toCancel ? `Les ${money(toCancel.amount)} seront de nouveau disponibles sur votre solde.` : ''}
        confirmLabel="Annuler le versement"
      />
    </Page>
  );
}
