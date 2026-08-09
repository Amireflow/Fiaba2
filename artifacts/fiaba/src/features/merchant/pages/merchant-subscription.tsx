import React, { useState } from 'react';
import { CreditCard, CheckCircle, Award, ShieldAlert, ArrowRight, Clock, Zap, Check } from 'lucide-react';
import { SubscriptionPlan, MerchantSubscription } from '../../../types/entities';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../../../lib/monetization';

export const MerchantSubscriptionPage: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>(DEFAULT_SUBSCRIPTION_PLANS[0]); // Plan Free initial
  const [activeProductsCount] = useState(4); // 4 / 5 produits
  const [activeCampaignsCount] = useState(2); // 2 / 2 campagnes (limite atteinte)
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = () => {
    setIsUpgrading(true);
    setTimeout(() => {
      setCurrentPlan(DEFAULT_SUBSCRIPTION_PLANS[1]); // Upgrade vers Premium
      setIsUpgrading(false);
      alert('Bravo ! Vous êtes désormais abonné au Plan Premium. Votre taux de commission est réduit à 3% et vos quotas sont débloqués.');
    }, 1000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          Abonnement & Capacités Boutique
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Gérez votre formule, vos quotas de produits/campagnes et votre taux de commission plateforme.
        </p>
      </div>

      {/* Carte Plan Actuel & Jauges Quotas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-xs uppercase font-semibold text-purple-600 dark:text-purple-400 tracking-wider">
              Formule Actuelle
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              Plan {currentPlan.name}
              {currentPlan.name === 'Premium' && (
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full dark:bg-purple-900/50 dark:text-purple-300">
                  Certifié Premium
                </span>
              )}
            </h2>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-slate-500">Taux de Commission Plateforme</div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {currentPlan.platformFeeRate}%
            </div>
          </div>
        </div>

        {/* Quotas Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Jauge Produits */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-800">
            <div className="flex justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
              <span>Produits Actifs</span>
              <span>{activeProductsCount} / {currentPlan.maxActiveProducts}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  activeProductsCount >= currentPlan.maxActiveProducts ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (activeProductsCount / currentPlan.maxActiveProducts) * 100)}%` }}
              />
            </div>
            {activeProductsCount >= currentPlan.maxActiveProducts - 1 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium pt-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Quota presque atteint ({activeProductsCount}/{currentPlan.maxActiveProducts})
              </p>
            )}
          </div>

          {/* Jauge Campagnes */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-800">
            <div className="flex justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
              <span>Campagnes Actives</span>
              <span>{activeCampaignsCount} / {currentPlan.maxActiveCampaigns}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  activeCampaignsCount >= currentPlan.maxActiveCampaigns ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (activeCampaignsCount / currentPlan.maxActiveCampaigns) * 100)}%` }}
              />
            </div>
            {activeCampaignsCount >= currentPlan.maxActiveCampaigns && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium pt-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Limite atteinte ! Passez au plan Premium pour créer d'autres campagnes.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grille Comparative des Formules */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Formules Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DEFAULT_SUBSCRIPTION_PLANS.map(plan => {
            const isSelected = currentPlan.id === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                    {isSelected && (
                      <span className="px-2.5 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Actif
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-slate-900 dark:text-white my-3">
                    {plan.priceMonthly === 0 ? 'Gratuit' : `${plan.priceMonthly.toLocaleString('fr-FR')} FCFA / mois`}
                  </div>

                  <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 my-4">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  {isSelected ? (
                    <button disabled className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-400 font-semibold rounded-xl text-sm cursor-not-allowed">
                      Formule Actuelle
                    </button>
                  ) : (
                    <button
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow transition-colors flex items-center justify-center gap-2"
                    >
                      {isUpgrading ? 'Traitement...' : 'Passer à Premium (25 000 FCFA)'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
