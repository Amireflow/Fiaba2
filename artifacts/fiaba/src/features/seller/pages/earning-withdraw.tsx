import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useSellerQuery } from '@/hooks/use-supabase-query';
import { calculatePayoutFee } from '@/lib/monetization';
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

  // Fetch commissions available
  const { data: commissions } = useSellerQuery<{ amount: number; status: string }>('commissions', {
    select: 'amount, status',
  });

  const availableBalance = commissions
    .filter((c: { amount: number; status: string }) => c.status === 'available')
    .reduce((acc: number, c: { amount: number; status: string }) => acc + c.amount, 0);

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

    if (amt > availableBalance && availableBalance > 0) {
      toast({ title: 'Solde insuffisant', description: `Votre solde disponible est de ${money(availableBalance)}.` });
      return;
    }

    const feeCalc = calculatePayoutFee(amt);
    setSubmitting(true);

    const { error } = await (supabase.from('payouts') as any).insert({
      seller_id: sellerId,
      amount: amt,
      fee_amount: feeCalc.feeAmount,
      net_amount: feeCalc.netAmount,
      account_type: account,
      status: 'requested',
    });

    setSubmitting(false);

    if (error) {
      toast({ title: 'Erreur de demande', description: error.message });
    } else {
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
            const payoutCalc = calculatePayoutFee(Number(amount));
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
