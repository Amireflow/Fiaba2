import { useState } from 'react';
import { Link } from 'wouter';
import { CheckmarkCircle02Icon, Wallet01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
  SellerScrollTable,
} from '../components/seller-ui';
import { useAuth } from '@/hooks/use-auth';
import { useSellerQuery } from '@/hooks/use-supabase-query';

type PayoutDbRow = {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number | null;
  account_type: string;
  status: string;
  created_at: string;
};

type CommissionDbRow = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
};

export function Earnings() {
  const { sellerId } = useAuth();

  // Fetch payouts
  const { data: rawPayouts, loading: loadingPayouts } = useSellerQuery<PayoutDbRow>('payouts', {
    select: 'id, amount, fee_amount, net_amount, account_type, status, created_at',
    order: { column: 'created_at', ascending: false },
  });

  // Fetch commissions
  const { data: rawCommissions, loading: loadingCommissions } = useSellerQuery<CommissionDbRow>('commissions', {
    select: 'id, amount, status, created_at',
  });

  // Compute balances
  const availableBalance = rawCommissions
    .filter((c: CommissionDbRow) => c.status === 'available')
    .reduce((acc: number, c: CommissionDbRow) => acc + c.amount, 0);

  const pendingBalance = rawCommissions
    .filter((c: CommissionDbRow) => c.status === 'pending')
    .reduce((acc: number, c: CommissionDbRow) => acc + c.amount, 0);

  const totalEarned = rawCommissions
    .filter((c: CommissionDbRow) => c.status === 'available' || c.status === 'paid')
    .reduce((acc: number, c: CommissionDbRow) => acc + c.amount, 0);

  return (
    <Page
      eyebrow="Votre rémunération"
      title="Revenus"
      description="Vos commissions et marges réelles Supabase, prêtes à être retirées."
      action={<Link href="/seller/earnings/withdraw"><Button testId="button-request-payout">Demander un retrait</Button></Link>}
    >
      {/* Balance cards */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Disponible</p>
          <strong className="mt-4 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">
            {money(availableBalance).replace(' F', '')} <small className="font-sans text-sm tracking-normal text-[#d0caff]">FCFA</small>
          </strong>
          <p className="mt-3 text-xs text-[#d0caff]">Prêt à être retiré vers votre Mobile Money</p>
          <Link href="/seller/earnings/withdraw">
            <Button variant="white" className="mt-6" testId="button-withdraw">
              <Icon glyph={Wallet01Icon} size={15} /> Retirer mes fonds
            </Button>
          </Link>
        </div>

        <Card>
          <p className="text-sm font-bold text-[#292541]">En attente de validation</p>
          <div className="mt-5 flex items-center justify-between">
            <div>
              <strong className="font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(pendingBalance)}</strong>
              <p className="mt-1 text-[10px] text-[#9290a2]">Ventes en cours de livraison ou délai de sécurité</p>
            </div>
            <SellerBadge tone="amber">En attente</SellerBadge>
          </div>
          <div className="mt-6 border-t border-[#efedf4] pt-4">
            <p className="text-[10px] text-[#9290a2]">Total cumulé encaissé</p>
            <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#278e69]">{money(totalEarned)}</p>
          </div>
        </Card>
      </div>

      {/* History of Payouts */}
      <Card className="mt-5 p-0">
        <div className="px-5 py-4 border-b border-[#efedf4]">
          <p className="text-sm font-bold text-[#292541]">Historique des demandes de retraits</p>
        </div>

        {loadingPayouts ? (
          <div className="p-8 text-center text-xs font-bold text-[#8b88a0]">Chargement de vos retraits Supabase...</div>
        ) : rawPayouts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8b88a0]">Aucune demande de retrait effectuée pour le moment.</div>
        ) : (
          <SellerScrollTable minWidth={520} testId="scroll-seller-payouts">
            <div className="divide-y divide-[#f1eef7]">
              {rawPayouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      p.status === 'paid' ? 'bg-[#e7faf2] text-[#278e69]' : 'bg-[#fff4de] text-[#ac741e]'
                    }`}>
                      <Icon glyph={p.status === 'paid' ? CheckmarkCircle02Icon : Clock01Icon} size={17} />
                    </span>
                    <div>
                      <p className="font-bold text-[#292541] capitalize">Retrait {p.account_type}</p>
                      <p className="text-[10px] text-[#9290a2]">{new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-[Space_Grotesk] font-bold text-[#292541]">{money(p.amount)}</p>
                    <p className="text-[10px] text-[#77738a]">
                      Net : <strong className="text-[#5745df]">{money(p.net_amount ?? p.amount)}</strong>
                    </p>
                  </div>
                  <SellerBadge tone={p.status === 'paid' ? 'mint' : 'amber'}>
                    {p.status === 'paid' ? 'Versé' : 'En traitement'}
                  </SellerBadge>
                </div>
              ))}
            </div>
          </SellerScrollTable>
        )}
      </Card>
    </Page>
  );
}
