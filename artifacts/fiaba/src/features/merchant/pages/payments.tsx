import { useState } from 'react';
import { Link } from 'wouter';
import { CheckmarkCircle02Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
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
  ScrollTable,
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

const toneFor = (s: Payout['status']): 'mint' | 'amber' | 'rose' => (s === 'Versé' ? 'mint' : s === 'En attente' ? 'amber' : 'rose');

export function Payments() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>(() => read('payouts', seedPayouts));
  const [toCancel, setToCancel] = useState<Payout | null>(null);

  const balance = 107450;
  const pending = payouts.filter((p) => p.status === 'En attente').reduce((s, p) => s + p.amount, 0);
  const paid = payouts.filter((p) => p.status === 'Versé').reduce((s, p) => s + p.amount, 0);

  function cancelPayout() {
    if (!toCancel) return;
    const updated = payouts.filter((p) => p.id !== toCancel.id);
    setPayouts(updated);
    write('payouts', updated);
    toast({ title: 'Versement annulé', description: `${money(toCancel.amount)} sont de nouveau disponibles.` });
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
          <p className="mt-3 text-xs text-[#d0caff]">Dernière mise à jour il y a 4 min</p>
          <Link href="/merchant/payments/withdraw"><Button variant="white" className="mt-6" testId="button-withdraw"><Icon glyph={Wallet01Icon} size={15} /> Retirer mes fonds</Button></Link>
        </div>
        <Card>
          <p className="text-sm font-bold text-[#292541]">En cours de traitement</p>
          <div className="mt-5 flex items-center justify-between">
            <div><strong className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(pending)}</strong><p className="mt-1 text-[10px] text-[#9290a2]">{payouts.filter((p) => p.status === 'En attente').length} demande(s) en attente</p></div>
            <Badge tone="amber">En attente</Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 pt-4">
            <div><p className="text-[10px] text-[#9290a2]">Total versé</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{money(paid)}</p></div>
            <div><p className="text-[10px] text-[#9290a2]">Compte par défaut</p><p className="mt-1 text-xs font-bold text-[#292541]">Wave · · · 38 42</p></div>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-5 p-0">
        <div className="px-5 py-4"><p className="text-sm font-bold text-[#292541]">Historique des versements</p></div>
        <ScrollTable minWidth={580} testId="scroll-payouts">
          <div className="divide-y divide-[#f1eef7]">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${p.status === 'Versé' ? 'bg-[#e7faf2] text-[#278e69]' : p.status === 'En attente' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#fff0f1] text-[#c45667]'}`}>
                  <Icon glyph={CheckmarkCircle02Icon} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#292541]">{money(p.amount)}</p>
                  <p className="mt-0.5 text-[10px] text-[#9290a2]">{p.date} · {p.account}</p>
                </div>
                <Badge tone={toneFor(p.status)}>{p.status}</Badge>
                {p.status === 'En attente' && (
                  <Button variant="ghost" onClick={() => setToCancel(p)} testId={`cancel-${p.id}`}>Annuler</Button>
                )}
              </div>
            ))}
          </div>
        </ScrollTable>
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
