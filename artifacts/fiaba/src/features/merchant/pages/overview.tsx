import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRightIcon, CheckmarkCircle02Icon, Store01Icon, UserGroupIcon, ViewIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { Badge, MerchantButton as Button, MerchantCard as Card, Page, Stat, ProgressBar } from '../components/merchant-ui';
import { seedOrders } from '@/config/seeds';

export function Overview() {
  const [showBalance, setShowBalance] = useState(true);
  const bars = [31, 48, 38, 57, 46, 70, 62, 85, 75, 100, 88, 94];

  return (
    <Page
      eyebrow="Mercredi 19 juin 2024"
      title="Bonjour, Aminata"
      description="Voici ce qui se passe dans votre réseau aujourd'hui."
      action={
        <Link href="/merchant/analytics">
          <Button variant="soft">
            Voir l'analytique <Icon glyph={ArrowUpRightIcon} size={15} />
          </Button>
        </Link>
      }
    >
      {/* Revenue + sales */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">Chiffre d'affaires · juin</p>
            <Link href="/merchant/payments" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/25" data-testid="link-overview-payments">
              Gérer paiements <Icon glyph={ArrowUpRightIcon} size={13} />
            </Link>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">{showBalance ? '184 250' : '•• •••'}</span>
            <span className="mb-1 text-sm text-white/70">FCFA</span>
            <button type="button" onClick={() => setShowBalance((v) => !v)} className="mb-1 ml-auto text-white/80 hover:text-white" aria-label="Afficher/masquer le solde">
              <Icon glyph={ViewIcon} size={24} />
            </button>
          </div>
          <div className="mt-3"><Badge tone="mint">+18,4% ce mois</Badge></div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-sm">
            <div>
              <p className="text-white/70">À encaisser</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">23 750 F</p>
            </div>
            <div>
              <p className="text-white/70">Commission réseau</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">21 480 F</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#292541]">Ventes accompagnées</p>
            <Badge>7 derniers jours</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">47 200 F</strong>
            <span className="text-sm text-[#77738a]">aujourd'hui</span>
          </div>
          <div className="mt-6 flex h-[120px] items-end justify-between gap-1.5 sm:gap-2">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, backgroundColor: i >= bars.length - 3 ? '#5b49e8' : '#dedbfa' }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[#9290a2]">
            <span>13 juin</span><span>19 juin</span>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Commandes livrées" value="42" change="+12,6%" glyph={CheckmarkCircle02Icon} tone="mint" />
        <Stat label="Commandes en cours" value="08" change="4 à préparer" glyph={Store01Icon} />
        <Stat label="Taux de conversion" value="7,8%" change="+1,2 pt" glyph={UserGroupIcon} tone="amber" />
      </div>

      {/* Recent orders + alerts */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#292541]">Dernières commandes</p>
            <Link href="/merchant/orders" className="text-xs font-bold text-[#5b49e8] hover:text-[#4e3bd5]" data-testid="link-overview-orders">Voir tout <Icon glyph={ArrowUpRightIcon} size={13} /></Link>
          </div>
          <div className="mt-4 divide-y divide-[#f1eef7]">
            {seedOrders.slice(0, 3).map((order) => {
              const tone = order.status === 'Livrée' ? 'mint' : order.status === 'En livraison' ? 'violet' : order.status === 'Annulée' ? 'rose' : 'amber';
              return (
                <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#292541]">{order.id}</p>
                    <p className="truncate text-xs text-[#9290a2]">{order.customer} · {order.date}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-[#292541]">{money(order.amount)}</span>
                    <Badge tone={tone}>{order.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-bold text-[#292541]">À ne pas manquer</p>
          <div className="mt-4 space-y-3">
            <Link href="/merchant/sellers" className="block rounded-2xl bg-[#5745df] p-4 text-white transition hover:opacity-95" data-testid="link-overview-sellers">
              <p className="text-sm font-bold">4 vendeurs attendent votre validation</p>
              <p className="mt-1 text-xs text-white/70">Cliquez pour les examiner <Icon glyph={ArrowUpRightIcon} size={13} /></p>
            </Link>
            <Link href="/merchant/payments" className="block rounded-2xl bg-[#e7faf2] p-4 text-[#1f7a3a] transition hover:bg-[#ddf5e8]" data-testid="link-overview-payout">
              <p className="text-sm font-bold">23 750 F disponibles vendredi</p>
              <p className="mt-1 text-xs opacity-80">Préparez votre versement <Icon glyph={ArrowUpRightIcon} size={13} /></p>
            </Link>
            <div className="rounded-2xl bg-[#fff4de] p-4 text-[#ac741e]">
              <p className="text-sm font-bold">Campagne « Rentrée douce »</p>
              <div className="mt-2"><ProgressBar value={46} tone="amber" /></div>
              <p className="mt-2 text-xs opacity-80">46 ventes sur objectif 100</p>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
