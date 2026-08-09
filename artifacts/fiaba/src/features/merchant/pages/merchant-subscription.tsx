import { useState } from 'react';
import {
  AlertCircleIcon,
  ArrowRight02Icon,
  Chart02Icon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  PercentIcon,
  SparklesIcon,
  Store01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionPlan } from '../../../types/entities';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../../../lib/monetization';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
  SectionTitle,
} from '../components/merchant-ui';

export const MerchantSubscriptionPage: React.FC = () => {
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>(DEFAULT_SUBSCRIPTION_PLANS[0]); // Plan Free initial
  const [activeProductsCount] = useState(4); // 4 / 5 produits
  const [activeCampaignsCount] = useState(2); // 2 / 2 campagnes (limite atteinte)
  const [isUpgrading, setIsUpgrading] = useState(false);

  const productPct = Math.round((activeProductsCount / currentPlan.maxActiveProducts) * 100);
  const campaignPct = Math.round((activeCampaignsCount / currentPlan.maxActiveCampaigns) * 100);
  const productsNearLimit = activeProductsCount >= currentPlan.maxActiveProducts - 1;
  const campaignsAtLimit = activeCampaignsCount >= currentPlan.maxActiveCampaigns;

  const handleUpgrade = () => {
    haptic('medium');
    setIsUpgrading(true);
    setTimeout(() => {
      setCurrentPlan(DEFAULT_SUBSCRIPTION_PLANS[1]); // Upgrade vers Premium
      setIsUpgrading(false);
      toast({
        title: 'Bienvenue dans le Plan Premium',
        description: 'Votre commission plateforme passe à 3 % et vos quotas sont débloqués.',
      });
    }, 1000);
  };

  return (
    <Page
      eyebrow="Votre formule"
      title="Abonnement & Capacités"
      description="Gérez votre formule, vos quotas de produits et campagnes, ainsi que votre taux de commission plateforme."
    >
      {/* ── Hero : plan actuel + taux de commission ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Plan actuel — carte profonde violette */}
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Formule actuelle</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                  <Icon glyph={CreditCardIcon} size={18} />
                </span>
                <strong className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] sm:text-3xl">
                  Plan {currentPlan.name}
                </strong>
              </div>
            </div>
            {currentPlan.name === 'Premium' ? (
              <Badge tone="mint" className="bg-white/15 text-white">
                <Icon glyph={SparklesIcon} size={12} /> Certifié
              </Badge>
            ) : (
              <Badge tone="slate" className="bg-white/15 text-white">Standard</Badge>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t border-white/15">
            <div>
              <p className="text-[10px] text-[#d0caff]">Tarif mensuel</p>
              <p className="mt-1 font-[Space_Grotesk] text-xl font-bold">
                {currentPlan.priceMonthly === 0 ? 'Gratuit' : `${money(currentPlan.priceMonthly).replace(' F', '')}`}
                {currentPlan.priceMonthly > 0 && <small className="ml-1 text-xs font-sans text-[#d0caff]">FCFA</small>}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#d0caff]">Commission plateforme</p>
              <p className="mt-1 font-[Space_Grotesk] text-xl font-bold">{currentPlan.platformFeeRate}%</p>
            </div>
          </div>
        </div>

        {/* Taux de commission — carte claire */}
        <Card>
          <div className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
              <Icon glyph={PercentIcon} size={18} />
            </span>
            <Badge tone={currentPlan.platformFeeRate <= 3 ? 'mint' : 'amber'}>
              {currentPlan.platformFeeRate <= 3 ? 'Réduit' : 'Standard'}
            </Badge>
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">Commission plateforme</p>
          <strong className="mt-1 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] text-[#292541]">
            {currentPlan.platformFeeRate}%
          </strong>
          <p className="mt-3 text-[11px] leading-5 text-[#77738a]">
            Prélevée sur chaque commande validée. Passez à Premium pour descendre à 3 %.
          </p>
        </Card>
      </div>

      {/* ── Jauges quotas ── */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* Jauge Produits */}
        <Card>
          <SectionTitle
            title="Produits actifs"
            subtitle={`${activeProductsCount} / ${currentPlan.maxActiveProducts} utilisés`}
            action={
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${productsNearLimit ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#e7faf2] text-[#278e69]'}`}>
                <Icon glyph={Store01Icon} size={18} />
              </span>
            }
          />
          <div className="mt-4">
            <ProgressBar value={productPct} tone={productsNearLimit ? 'amber' : 'mint'} />
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#9290a2]">
              <span>{activeProductsCount} en ligne</span>
              <span>{currentPlan.maxActiveProducts - activeProductsCount} restant(s)</span>
            </div>
          </div>
          {productsNearLimit && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[#ac741e]">
              <Icon glyph={AlertCircleIcon} size={14} /> Quota presque atteint — passez à Premium pour 50 produits.
            </p>
          )}
        </Card>

        {/* Jauge Campagnes */}
        <Card>
          <SectionTitle
            title="Campagnes actives"
            subtitle={`${activeCampaignsCount} / ${currentPlan.maxActiveCampaigns} utilisées`}
            action={
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${campaignsAtLimit ? 'bg-[#fff0f1] text-[#c45667]' : 'bg-[#e7faf2] text-[#278e69]'}`}>
                <Icon glyph={Chart02Icon} size={18} />
              </span>
            }
          />
          <div className="mt-4">
            <ProgressBar value={campaignPct} tone={campaignsAtLimit ? 'amber' : 'mint'} />
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#9290a2]">
              <span>{activeCampaignsCount} en cours</span>
              <span>{Math.max(0, currentPlan.maxActiveCampaigns - activeCampaignsCount)} restante(s)</span>
            </div>
          </div>
          {campaignsAtLimit && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[#c45667]">
              <Icon glyph={AlertCircleIcon} size={14} /> Limite atteinte — Premium débloque 10 campagnes.
            </p>
          )}
        </Card>
      </div>

      {/* ── Formules disponibles ── */}
      <div className="mt-6">
        <SectionTitle
          title="Formules disponibles"
          subtitle="Choisissez la formule adaptée à la taille de votre activité."
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {DEFAULT_SUBSCRIPTION_PLANS.map((plan) => {
            const isSelected = currentPlan.id === plan.id;
            const isPremium = plan.name === 'Premium';
            return (
              <div
                key={plan.id}
                className={`rounded-[22px] p-5 transition ${
                  isSelected
                    ? 'bg-[#fffefd] ring-2 ring-[#5b49e8]'
                    : 'bg-[#fffefd] ring-1 ring-[#f1eef7]'
                }`}
              >
                {/* En-tête formule */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${isPremium ? 'bg-[#efedff] text-[#5b49e8]' : 'bg-[#f0eff5] text-[#716d82]'}`}>
                      <Icon glyph={isPremium ? SparklesIcon : CreditCardIcon} size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#292541]">Plan {plan.name}</p>
                      <p className="text-[10px] text-[#9290a2]">
                        {isPremium ? 'Croissance' : 'Démarrage'}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge tone="violet">
                      <Icon glyph={CheckmarkCircle02Icon} size={12} /> Actif
                    </Badge>
                  )}
                </div>

                {/* Prix */}
                <div className="mt-5 flex items-end gap-1">
                  <strong className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] text-[#292541]">
                    {plan.priceMonthly === 0 ? 'Gratuit' : money(plan.priceMonthly).replace(' F', '')}
                  </strong>
                  {plan.priceMonthly > 0 && <span className="mb-1 text-xs text-[#9290a2]">FCFA / mois</span>}
                </div>

                {/* Features */}
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px] text-[#292541]">
                      <Icon glyph={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-[#278e69]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-6">
                  {isSelected ? (
                    <Button variant="soft" disabled className="w-full" testId={`plan-${plan.id}-current`}>
                      Formule actuelle
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                      testId={`plan-${plan.id}-upgrade`}
                    >
                      {isUpgrading ? 'Traitement…' : (
                        <>
                          Passer à Premium · {money(plan.priceMonthly).replace(' F', '')} FCFA
                          <Icon glyph={ArrowRight02Icon} size={15} />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
};
