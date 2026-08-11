import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { calculatePayoutFee, DEFAULT_PAYOUT_FEE_RULE } from '@/lib/monetization';
import type { PayoutFeeRule } from '@/types/entities';
import { trackEvent } from '@/lib/analytics';
import {
  SellerButton as Button,
  SellerCard as Card,
  SellerField,
  SellerPage as Page,
  sellerInputClass,
  sellerSelectClass,
} from '../components/seller-ui';

const accounts = [
  { id: 'wave', label: 'Wave Mobile Money' },
  { id: 'orange_money', label: 'Orange Money Sénégal' },
];

export function EarningWithdraw() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { sellerId } = useAuth();

  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('wave');
  const [submitting, setSubmitting] = useState(false);
  const [payoutRule, setPayoutRule] = useState<PayoutFeeRule>(DEFAULT_PAYOUT_FEE_RULE);

  // Fetch payout fee rule from Supabase
  useEffect(() => {
    async function loadRule() {
      const { data } = await supabase
        .from('payout_fee_rules')
        .select('id, fee_percent, fixed_fee, free_threshold, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = data as { id: string; fee_percent: number; fixed_fee: number; free_threshold: number; is_active: boolean } | null;
      if (row) {
        setPayoutRule({
          id: row.id,
          feePercent: Number(row.fee_percent),
          fixedFee: row.fixed_fee,
          freeThreshold: row.free_threshold,
          isActive: row.is_active,
        });
      }
    }
    loadRule();
  }, []);

  // Solde disponible calculé côté serveur (déduit les retraits en attente).
  // On ne peut pas utiliser useSellerQuery car c'est un appel RPC.
  const [availableBalance, setAvailableBalance] = useState(0);
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    (supabase.rpc as any)('seller_available_balance', { p_seller_id: sellerId })
      .then(({ data }: { data: number | null }) => {
        if (!cancelled && typeof data === 'number') setAvailableBalance(data);
      })
      .catch((err: unknown) => {
        console.error('[earning-withdraw] seller_available_balance RPC failed:', err);
      });
    return () => { cancelled = true; };
  }, [sellerId]);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerId) {
      toast({ title: 'Erreur', description: 'Vendeur non identifié.' });
      return;
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Montant invalide', description: 'Saisissez un montant valide.' });
      return;
    }

    if (availableBalance <= 0) {
      toast({ title: 'Solde insuffisant', description: 'Vous n\'avez aucun solde disponible pour le moment.' });
      return;
    }

    if (amt > availableBalance) {
      toast({ title: 'Solde insuffisant', description: `Votre solde disponible est de ${money(availableBalance)}.` });
      return;
    }

    const feeCalc = calculatePayoutFee(amt, payoutRule);
    setSubmitting(true);

    // Le trigger serveur (validate_payout_request) impose le statut, le solde
    // et le recalcul des frais : on n'envoie ni fee_amount, ni net_amount, ni
    // status depuis le client.
    const { error } = await (supabase.from('payouts') as any).insert({
      seller_id: sellerId,
      amount: amt,
      account_type: account,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: 'Demande refusée', description: error.message });
    } else {
      // Analytics: payout_requested (CDC §25)
      trackEvent('payout_requested', {
        entityType: 'payout',
        metadata: { amount: amt, fee: feeCalc.feeAmount, net: feeCalc.netAmount, account },
      });
      toast({
        title: 'Demande envoyée !',
        description: `Demande de ${money(feeCalc.netAmount)} envoyée vers votre compte ${account}.`,
      });
      navigate('/seller/earnings');
    }
  }

  return (
    <Page
      eyebrow="Rétribution"
      title="Demander un retrait"
      description={`Disponible : ${money(availableBalance)}`}
      action={
        <Link href="/seller/earnings">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 rounded-[22px] bg-[#5745df] p-5 text-white shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Disponible</p>
        <strong className="mt-3 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">
          {money(availableBalance).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small>
        </strong>
        <p className="mt-2 text-xs text-[#d0caff]">Prêt à être retiré vers votre compte Mobile Money</p>
      </div>

      <Card className="mt-5">
        <form onSubmit={requestPayout} className="space-y-5">
          <SellerField label="Montant (FCFA)" hint={`Disponible : ${money(availableBalance)}`}>
            <input
              type="number"
              min="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 25000"
              className={sellerInputClass}
              data-testid="input-payout-amount"
            />
          </SellerField>

          <SellerField label="Compte de réception">
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className={sellerSelectClass}
              data-testid="input-payout-account"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </SellerField>

          {amount && Number(amount) > 0 && (() => {
            const payoutCalc = calculatePayoutFee(Number(amount), payoutRule);
            return (
              <div className="rounded-2xl bg-[#f8f7fc] p-4 text-xs space-y-1.5 border border-[#e8e5f2]">
                <div className="flex justify-between">
                  <span className="text-[#77738a]">Montant demandé</span>
                  <span className="font-bold text-[#292541]">{money(payoutCalc.requestedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77738a]">Frais Mobile Money</span>
                  <span className={`font-bold ${payoutCalc.isFree ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {payoutCalc.isFree ? 'Gratuit (≥ 25 000 FCFA)' : money(payoutCalc.feeAmount)}
                  </span>
                </div>
                {!payoutCalc.isFree && payoutCalc.thresholdRemaining > 0 && (
                  <p className="text-[11px] text-slate-500 italic pt-0.5">
                    💡 Astuce : Ajoutez {money(payoutCalc.thresholdRemaining)} pour bénéficier des frais 100% gratuits !
                  </p>
                )}
                <div className="mt-2 flex justify-between border-t border-[#e9e6f1] pt-2">
                  <span className="font-bold text-[#292541]">Montant net versé</span>
                  <span className="font-[Space_Grotesk] font-bold text-[#5b49e8]">{money(payoutCalc.netAmount)}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/seller/earnings"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" disabled={submitting} testId="button-confirm-payout">
              {submitting ? 'Envoi...' : 'Confirmer le retrait'}
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
