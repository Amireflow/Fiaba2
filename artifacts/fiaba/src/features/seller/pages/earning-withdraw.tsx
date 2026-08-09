import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerButton as Button,
  SellerCard as Card,
  SellerField,
  SellerPage as Page,
  sellerInputClass,
  sellerSelectClass,
} from '../components/seller-ui';
import { seedSellerEarning, seedSellerPayouts } from '@/config/seller-seeds';
import type { SellerEarning, SellerPayout } from '@/types/entities';

const accounts = [
  { id: 'wave', label: 'Wave · · · 38 42' },
  { id: 'om', label: 'Orange Money · · · 11 07' },
];

export function EarningWithdraw() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<SellerEarning>(() => read('seller-earnings', seedSellerEarning));
  const [payouts, setPayouts] = useState<SellerPayout[]>(() => read('seller-payouts', seedSellerPayouts));
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('wave');

  function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Montant invalide', description: 'Saisissez un montant valide.' });
      return;
    }
    if (amt > earnings.available) {
      toast({ title: 'Solde insuffisant', description: `Votre solde disponible est de ${money(earnings.available)}.` });
      return;
    }
    const acc = accounts.find((a) => a.id === account)?.label ?? accounts[0].label;
    const newPayout: SellerPayout = { id: `sp-${crypto.randomUUID().slice(0, 8)}`, date: 'À venir', amount: amt, account: acc, status: 'En attente' };
    const updatedPayouts = [newPayout, ...payouts];
    setPayouts(updatedPayouts);
    write('seller-payouts', updatedPayouts);
    const updatedEarnings = { ...earnings, available: earnings.available - amt, pending: earnings.pending + amt };
    setEarnings(updatedEarnings);
    write('seller-earnings', updatedEarnings);
    toast({ title: 'Demande envoyée', description: `${money(amt)} seront versés sur ${acc}.` });
    navigate('/seller/earnings');
  }

  return (
    <Page
      eyebrow="Rétribution"
      title="Demander un retrait"
      description={`Disponible : ${money(earnings.available)}`}
      action={
        <Link href="/seller/earnings">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 rounded-[22px] bg-[#5745df] p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Disponible</p>
        <strong className="mt-3 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">{money(earnings.available).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small></strong>
        <p className="mt-2 text-xs text-[#d0caff]">Prêt à être retiré</p>
      </div>

      <Card className="mt-5">
        <form onSubmit={requestPayout} className="space-y-5">
          <SellerField label="Montant (FCFA)" hint={`Maximum : ${money(earnings.available)}`}>
            <input type="number" min="0" max={earnings.available} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={sellerInputClass} data-testid="input-payout-amount" />
          </SellerField>
          <SellerField label="Compte de réception">
            <select value={account} onChange={(e) => setAccount(e.target.value)} className={sellerSelectClass} data-testid="input-payout-account">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </SellerField>
          {amount && Number(amount) > 0 && (
            <div className="rounded-2xl bg-[#f8f7fc] p-4 text-xs">
              <div className="flex justify-between"><span className="text-[#77738a]">Montant</span><span className="font-bold text-[#292541]">{money(Number(amount))}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-[#77738a]">Frais</span><span className="font-bold text-[#292541]">0 F</span></div>
              <div className="mt-2 flex justify-between border-t border-[#e9e6f1] pt-2"><span className="font-bold text-[#292541]">Vous recevrez</span><span className="font-[Space_Grotesk] font-bold text-[#5b49e8]">{money(Number(amount))}</span></div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/seller/earnings"><Button variant="ghost" type="button">Annuler</Button></Link>
            <Button type="submit" testId="button-confirm-payout">Confirmer</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
