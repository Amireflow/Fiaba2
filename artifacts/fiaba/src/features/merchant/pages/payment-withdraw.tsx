import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Field,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
  selectClass,
} from '../components/merchant-ui';

type Payout = {
  id: string;
  date: string;
  amount: number;
  account: string;
  status: 'Versé' | 'En attente' | 'Rejeté';
};

const seedPayouts: Payout[] = [
  { id: 'po-1', date: '14 juin 2024', amount: 62300, account: 'Wave · · · 38 42', status: 'Versé' },
  { id: 'po-2', date: '31 mai 2024', amount: 48800, account: 'Wave · · · 38 42', status: 'Versé' },
  { id: 'po-3', date: '15 mai 2024', amount: 36500, account: 'Orange Money · · · 11 07', status: 'Versé' },
  { id: 'po-4', date: '21 juin 2024', amount: 23750, account: 'Wave · · · 38 42', status: 'En attente' },
];

const accounts = [
  { id: 'wave', label: 'Wave · · · 38 42' },
  { id: 'om', label: 'Orange Money · · · 11 07' },
  { id: 'bank', label: 'Ecobank · · · 4521' },
];

export function PaymentWithdraw() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>(() => read('payouts', seedPayouts));
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('wave');

  const balance = 107450;

  function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Montant invalide', description: 'Saisissez un montant valide.' });
      return;
    }
    if (amt > balance) {
      toast({ title: 'Solde insuffisant', description: `Votre solde est de ${money(balance)}.` });
      return;
    }
    const acc = accounts.find((a) => a.id === account)?.label ?? accounts[0].label;
    const newPayout: Payout = { id: `po-${crypto.randomUUID().slice(0, 8)}`, date: 'À venir', amount: amt, account: acc, status: 'En attente' };
    const updated = [newPayout, ...payouts];
    setPayouts(updated);
    write('payouts', updated);
    toast({ title: 'Demande envoyée', description: `${money(amt)} seront versés sur ${acc}.` });
    navigate('/merchant/payments');
  }

  return (
    <Page
      eyebrow="Trésorerie"
      title="Demander un versement"
      description={`Solde disponible : ${money(balance)}`}
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
            <Button type="submit" testId="button-confirm-payout">Confirmer la demande</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
