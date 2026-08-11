import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
} from '../components/merchant-ui';

const accounts = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'cash', label: 'Espèces / Bank transfer' },
];

export function PaymentWithdraw() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { merchantId } = useAuth();
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('wave');
  const [balance, setBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBalance() {
      if (!merchantId) {
        setLoading(false);
        return;
      }
      // Solde disponible calculé côté serveur (déduit les versements en attente).
      const { data, error } = await (supabase.rpc as any)('merchant_available_balance', { p_merchant_id: merchantId });
      if (error) {
        console.error('[payment-withdraw] merchant_available_balance RPC failed:', error.message);
      }
      setBalance(typeof data === 'number' ? data : 0);
      setLoading(false);
    }
    loadBalance();
  }, [merchantId]);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantId) {
      toast({ title: 'Erreur', description: 'Marchand non identifié.' });
      return;
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Montant invalide', description: 'Saisissez un montant valide.' });
      return;
    }
    if (amt > balance) {
      toast({ title: 'Solde insuffisant', description: `Votre solde est de ${money(balance)}.` });
      return;
    }

    haptic('medium');
    setSubmitting(true);

    // Le trigger serveur (validate_payment_request) impose le statut et le
    // contrôle de solde : on n'envoie pas status depuis le client.
    const { error } = await (supabase.from('payments') as any).insert({
      merchant_id: merchantId,
      amount: amt,
      method: account,
    });

    setSubmitting(false);

    if (error) {
      haptic('error');
      toast({ title: 'Demande refusée', description: error.message });
    } else {
      toast({
        title: 'Demande envoyée',
        description: `${money(amt)} seront versés sur votre compte ${accounts.find((a) => a.id === account)?.label ?? account}.`,
      });
      navigate('/merchant/payments');
    }
  }

  return (
    <Page
      eyebrow="Trésorerie"
      title="Demander un versement"
      description={loading ? 'Chargement…' : `Solde disponible : ${money(balance)}`}
      action={
        <Link href="/merchant/payments">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 rounded-[22px] bg-[#5745df] p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Solde disponible</p>
        <strong className="mt-3 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">{money(balance).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small></strong>
      </div>

      <Card className="mt-5">
        <form onSubmit={requestPayout} className="space-y-5">
          <Field label="Montant (FCFA)" hint={`Maximum : ${money(balance)}`}>
            <input type="number" min="0" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputClass} data-testid="input-amount" />
          </Field>
          <Field label="Compte de réception">
            <select value={account} onChange={(e) => setAccount(e.target.value)} className={selectClass} data-testid="input-account">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </Field>
          {amount && Number(amount) > 0 && (
            <div className="rounded-2xl bg-[#f8f7fc] p-4 text-xs">
              <div className="flex justify-between"><span className="text-[#77738a]">Montant</span><span className="font-bold text-[#292541]">{money(Number(amount))}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-[#77738a]">Frais</span><span className="font-bold text-[#292541]">0 F</span></div>
              <div className="mt-2 flex justify-between border-t border-[#e9e6f1] pt-2"><span className="font-bold text-[#292541]">Vous recevrez</span><span className="font-[Space_Grotesk] font-bold text-[#5b49e8]">{money(Number(amount))}</span></div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/merchant/payments"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" disabled={submitting || loading} testId="button-confirm-payout">
              {submitting ? 'Envoi…' : 'Confirmer la demande'}
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
