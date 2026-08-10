import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
  SectionTitle,
} from '../components/merchant-ui';

import { getOrCreateMerchantId } from '@/hooks/use-supabase-query';

type PlanRow = {
  id: string;
  name: string;
  price_monthly: number;
  max_active_products: number;
  max_active_campaigns: number;
  platform_fee_rate: number;
  features: string[] | null;
  is_active: boolean;
};

type SubscriptionRow = {
  id: string;
  plan_id: string;
  status: string;
};

const defaultPlans: PlanRow[] = [
  {
    id: 'plan-free',
    name: 'Free',
    price_monthly: 0,
    max_active_products: 5,
    max_active_campaigns: 2,
    platform_fee_rate: 5.0,
    features: ['5 produits actifs', '2 campagnes d\'affiliation', 'Frais plateforme 5%'],
    is_active: true,
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    price_monthly: 9900,
    max_active_products: 20,
    max_active_campaigns: 10,
    platform_fee_rate: 4.0,
    features: ['20 produits actifs', '10 campagnes d\'affiliation', 'Frais plateforme 4%', 'Support prioritaire'],
    is_active: true,
  },
  {
    id: 'plan-premium',
    name: 'Premium',
    price_monthly: 24900,
    max_active_products: 50,
    max_active_campaigns: 25,
    platform_fee_rate: 3.0,
    features: ['50 produits actifs', '25 campagnes d\'affiliation', 'Frais plateforme réduits 3%', 'Accès API & Badges'],
    is_active: true,
  },
];

export const MerchantSubscriptionPage: React.FC = () => {
  const { toast } = useToast();
  const { merchantId, profile } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>(defaultPlans);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [activeProductsCount, setActiveProductsCount] = useState(0);
  const [activeCampaignsCount, setActiveCampaignsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [resolvedMerchantId, setResolvedMerchantId] = useState<string | null>(merchantId);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      let targetMerchantId = merchantId;
      if (!targetMerchantId && profile?.id) {
        targetMerchantId = await getOrCreateMerchantId();
      }
      setResolvedMerchantId(targetMerchantId);

      // Fetch all active subscription plans
      const { data: planRows } = await supabase
        .from('subscription_plans')
        .select('id, name, price_monthly, max_active_products, max_active_campaigns, platform_fee_rate, features, is_active')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      const fetchedPlans = (planRows as PlanRow[] | null) ?? [];
      setPlans(fetchedPlans.length > 0 ? fetchedPlans : defaultPlans);

      if (targetMerchantId) {
        // Fetch merchant's current subscription
        const { data: subRow } = await supabase
          .from('merchant_subscriptions')
          .select('id, plan_id, status')
          .eq('merchant_id', targetMerchantId)
          .maybeSingle();
        setSubscription((subRow as SubscriptionRow | null) ?? null);

        // Count active products
        const { count: productCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', targetMerchantId)
          .in('status', ['actif', 'active']);
        setActiveProductsCount(productCount ?? 0);

        // Count active campaigns
        const { count: campaignCount } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', targetMerchantId)
          .eq('status', 'active');
        setActiveCampaignsCount(campaignCount ?? 0);
      }

      setLoading(false);
    }

    loadData().catch(() => setLoading(false));
  }, [merchantId, profile]);

  const currentPlan = plans.find((p) => p.id === subscription?.plan_id) ?? plans[0] ?? null;

  const productPct = currentPlan ? Math.round((activeProductsCount / currentPlan.max_active_products) * 100) : 0;
  const campaignPct = currentPlan ? Math.round((activeCampaignsCount / currentPlan.max_active_campaigns) * 100) : 0;
  const productsNearLimit = currentPlan ? activeProductsCount >= currentPlan.max_active_products - 1 : false;
  const campaignsAtLimit = currentPlan ? activeCampaignsCount >= currentPlan.max_active_campaigns : false;

  async function handleUpgrade(plan: PlanRow) {
    let targetMerchantId = resolvedMerchantId || merchantId;
    if (!targetMerchantId && profile?.id) {
      targetMerchantId = await getOrCreateMerchantId();
    }
    if (!targetMerchantId || !currentPlan || plan.id === currentPlan.id) return;
    haptic('medium');
    setIsUpgrading(true);

    try {
      if (subscription) {
        // Update existing subscription
        const { error } = await (supabase.from('merchant_subscriptions') as any)
          .update({ plan_id: plan.id, status: 'active', current_period_start: new Date().toISOString() })
          .eq('id', subscription.id);
        if (error) throw error;
      } else {
        // Insert new subscription
        const { error } = await (supabase.from('merchant_subscriptions') as any)
          .insert({
            merchant_id: targetMerchantId,
            plan_id: plan.id,
            status: 'active',
            current_period_start: new Date().toISOString(),
            auto_renew: true,
          });
        if (error) throw error;
      }

      setSubscription((prev) => prev ? { ...prev, plan_id: plan.id, status: 'active' } : { id: 'new', plan_id: plan.id, status: 'active' });
      toast({
        title: `Bienvenue dans le Plan ${plan.name}`,
        description: `Votre commission plateforme passe à ${plan.platform_fee_rate}% et vos quotas sont débloqués.`,
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message ?? 'Échec de la mise à niveau.' });
    } finally {
      setIsUpgrading(false);
    }
  }

  if (loading || !currentPlan) {
    return (
      <Page eyebrow="Votre formule" title="Abonnement & Capacités" description="">
        <Card className="mt-6 p-12">
          <div className="flex items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      </Page>
    );
  }

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
                {currentPlan.price_monthly === 0 ? 'Gratuit' : `${money(currentPlan.price_monthly).replace(' F', '')}`}
                {currentPlan.price_monthly > 0 && <small className="ml-1 text-xs font-sans text-[#d0caff]">FCFA</small>}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#d0caff]">Commission plateforme</p>
              <p className="mt-1 font-[Space_Grotesk] text-xl font-bold">{Number(currentPlan.platform_fee_rate)}%</p>
            </div>
          </div>
        </div>

        {/* Taux de commission — carte claire */}
        <Card>
          <div className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
              <Icon glyph={PercentIcon} size={18} />
            </span>
            <Badge tone={Number(currentPlan.platform_fee_rate) <= 3 ? 'mint' : 'amber'}>
              {Number(currentPlan.platform_fee_rate) <= 3 ? 'Réduit' : 'Standard'}
            </Badge>
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">Commission plateforme</p>
          <strong className="mt-1 block font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] text-[#292541]">
            {Number(currentPlan.platform_fee_rate)}%
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
            subtitle={`${activeProductsCount} / ${currentPlan.max_active_products} utilisés`}
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
              <span>{Math.max(0, currentPlan.max_active_products - activeProductsCount)} restant(s)</span>
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
            subtitle={`${activeCampaignsCount} / ${currentPlan.max_active_campaigns} utilisées`}
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
              <span>{Math.max(0, currentPlan.max_active_campaigns - activeCampaignsCount)} restante(s)</span>
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
          {plans.map((plan) => {
            const isSelected = currentPlan.id === plan.id;
            const isPremium = plan.name === 'Premium';
            const features = plan.features ?? [];
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
                    {plan.price_monthly === 0 ? 'Gratuit' : money(plan.price_monthly).replace(' F', '')}
                  </strong>
                  {plan.price_monthly > 0 && <span className="mb-1 text-xs text-[#9290a2]">FCFA / mois</span>}
                </div>

                {/* Features */}
                <ul className="mt-5 space-y-2.5">
                  {features.map((feat, idx) => (
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
                      onClick={() => handleUpgrade(plan)}
                      disabled={isUpgrading}
                      testId={`plan-${plan.id}-upgrade`}
                    >
                      {isUpgrading ? 'Traitement…' : (
                        <>
                          Passer à {plan.name} · {money(plan.price_monthly).replace(' F', '')} FCFA
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
