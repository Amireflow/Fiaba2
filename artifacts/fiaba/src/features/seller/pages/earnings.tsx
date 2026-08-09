import { useState } from 'react';
import { Link } from 'wouter';
import { CheckmarkCircle02Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
  SellerScrollTable,
} from '../components/seller-ui';
import { seedSellerEarning, seedSellerPayouts } from '@/config/seller-seeds';
import type { SellerEarning, SellerPayout } from '@/types/entities';

const toneFor = (s: SellerPayout['status']): 'mint' | 'amber' => (s === 'Versé' ? 'mint' : 'amber');

export function Earnings() {
  const [earnings, setEarnings] = useState<SellerEarning>(() => read('seller-earnings', seedSellerEarning));
  const [payouts, setPayouts] = useState<SellerPayout[]>(() => read('seller-payouts', seedSellerPayouts));

  return (
    <Page
      eyebrow="Votre rémunération"
      title="Revenus"
      description="Vos commissions et marges, prêtes à être retirées quand vous le décidez."
      action={<Link href="/seller/earnings/withdraw"><Button testId="button-request-payout">Demander un retrait</Button></Link>}
    >
      {/* Balance cards */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Disponible</p>
          <strong className="mt-4 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">{money(earnings.available).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small></strong>
          <p className="mt-3 text-xs text-[#d0caff]">Prêt à être retiré</p>
          <Link href="/seller/earnings/withdraw"><Button variant="white" className="mt-6" testId="button-withdraw"><Icon glyph={Wallet01Icon} size={15} /> Retirer mes fonds</Button></Link>
        </div>
        <Card>
          <p className="text-sm font-bold text-[#292541]">En attente de validation</p>
          <div className="mt-5 flex items-center justify-between">
            <div><strong className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(earnings.pending)}</strong><p className="mt-1 text-[10px] text-[#9290a2]">Ventes livrées, en période de sécurité</p></div>
            <SellerBadge tone="amber">En attente</SellerBadge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#efedf4] pt-4">
            <div><p className="text-[10px] text-[#9290a2]">Total cumulé</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{money(earnings.total)}</p></div>
            <div><p className="text-[10px] text-[#9290a2]">Annulé</p><p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#c45667]">{money(earnings.cancelled)}</p></div>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-5 p-0">
        <div className="px-5 py-4"><p className="text-sm font-bold text-[#292541]">Historique des retraits</p></div>
        <SellerScrollTable minWidth={520} testId="scroll-seller-payouts">
          <div className="divide-y divide-[#f1eef7]">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${p.status === 'Versé' ? 'bg-[#e7faf2] text-[#278e69]' : 'bg-[#fff4de] text-[#ac741e]'}`}>
                  <Icon glyph={CheckmarkCircle02Icon} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#292541]">{money(p.amount)}</p>
                  <p className="mt-0.5 text-[10px] text-[#9290a2]">{p.date} · {p.account}</p>
                </div>
                <SellerBadge tone={toneFor(p.status)}>{p.status}</SellerBadge>
              </div>
            ))}
          </div>
        </SellerScrollTable>
      </Card>

      {/* Info */}
      <div className="mt-4 rounded-2xl bg-[#e7faf2] p-4 text-xs leading-5 text-[#347861]">
        <strong>Comment ça marche.</strong> Vos commissions passent en « En attente » après livraison, puis deviennent « Disponible » après la période de sécurité (7 jours). Vous pouvez alors demander un retrait vers Wave ou Orange Money.
      </div>
    </Page>
  );
}
