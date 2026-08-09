import {
  SubscriptionPlan,
  MerchantSubscription,
  Order,
  FinancialLedgerEntry,
  SponsoredCampaign,
  PayoutFeeRule
} from '../types/entities';

// Paliers d'abonnement par défaut (utilisés aussi comme fallback hors-ligne)
export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'Free',
    priceMonthly: 0,
    maxActiveProducts: 5,
    maxActiveCampaigns: 2,
    platformFeeRate: 5.0, // 5% par défaut
    features: [
      'Jusqu’à 5 produits actifs',
      'Jusqu’à 2 campagnes actives',
      'Taux commission plateforme 5%',
      'Support standard'
    ],
    isActive: true
  },
  {
    id: 'plan-premium',
    name: 'Premium',
    priceMonthly: 25000, // 25 000 FCFA / mois
    maxActiveProducts: 50,
    maxActiveCampaigns: 10,
    platformFeeRate: 3.0, // 3% commission réduite
    features: [
      'Jusqu’à 50 produits actifs',
      'Jusqu’à 10 campagnes actives',
      'Taux commission plateforme réduit (3%)',
      'Badge Commerçant Certifié',
      'Support prioritaire 24/7'
    ],
    isActive: true
  }
];

export const DEFAULT_PAYOUT_FEE_RULE: PayoutFeeRule = {
  id: 'rule-payout-default',
  feePercent: 0,
  fixedFee: 500, // 500 FCFA fixe sous le seuil
  freeThreshold: 25000, // Gratuit dès 25 000 FCFA
  isActive: true
};

/**
 * 1. Calcul du snapshot financier immuable de la commande
 * Tous les montants sont calculés et scellés côté serveur.
 */
export interface FinancialSnapshotInput {
  totalAmount: number;
  sellerCommissionRate: number; // % commission ou montant fixe marge
  model: 'Commission' | 'Marge';
  sellerPrice?: number; // pour modèle Marge
  merchantSubscriptionPlan?: SubscriptionPlan;
  customPlatformFeeRate?: number;
}

export interface FinancialSnapshotResult {
  totalAmount: number;
  sellerCommissionAmount: number;
  merchantNetAmount: number;
  platformFeeAmount: number;
  platformFeeRate: number;
}

export function calculateOrderFinancialSnapshot(input: FinancialSnapshotInput): FinancialSnapshotResult {
  const {
    totalAmount,
    sellerCommissionRate,
    model,
    sellerPrice,
    merchantSubscriptionPlan,
    customPlatformFeeRate
  } = input;

  // Résolution du taux de commission plateforme
  // Priorité : Taux spécifique plan d'abonnement > Taux personnalisé règle > 5.0% par défaut
  let platformFeeRate = 5.0;
  if (merchantSubscriptionPlan) {
    platformFeeRate = merchantSubscriptionPlan.platformFeeRate;
  } else if (typeof customPlatformFeeRate === 'number') {
    platformFeeRate = customPlatformFeeRate;
  }

  // Calcul du montant de la commission plateforme (arrondi au nombre entier FCFA)
  const platformFeeAmount = Math.round((totalAmount * platformFeeRate) / 100);

  // Calcul du gain vendeur
  let sellerCommissionAmount = 0;
  if (model === 'Marge' && sellerPrice !== undefined) {
    // En modèle Marge : Vendeur définit son prix de vente (sellerPrice) > Prix catalogue (totalAmount)
    sellerCommissionAmount = Math.max(0, sellerPrice - totalAmount);
  } else {
    // En modèle Commission %
    sellerCommissionAmount = Math.round((totalAmount * sellerCommissionRate) / 100);
  }

  // Recette nette commerçant = Montant total brut - Commission Vendeur - Commission Plateforme
  const merchantNetAmount = Math.max(0, totalAmount - sellerCommissionAmount - platformFeeAmount);

  return {
    totalAmount,
    sellerCommissionAmount,
    merchantNetAmount,
    platformFeeAmount,
    platformFeeRate
  };
}

/**
 * 2. Vérification des quotas du plan d'abonnement Commerçant
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxLimit: number;
}

export function checkMerchantProductQuota(
  activeProductsCount: number,
  plan: SubscriptionPlan = DEFAULT_SUBSCRIPTION_PLANS[0]
): QuotaCheckResult {
  if (activeProductsCount >= plan.maxActiveProducts) {
    return {
      allowed: false,
      reason: `Limite de produits actifs atteinte pour le plan ${plan.name} (${activeProductsCount}/${plan.maxActiveProducts}). Passez au plan Premium pour ajouter plus de produits.`,
      currentCount: activeProductsCount,
      maxLimit: plan.maxActiveProducts
    };
  }
  return {
    allowed: true,
    currentCount: activeProductsCount,
    maxLimit: plan.maxActiveProducts
  };
}

export function checkMerchantCampaignQuota(
  activeCampaignsCount: number,
  plan: SubscriptionPlan = DEFAULT_SUBSCRIPTION_PLANS[0]
): QuotaCheckResult {
  if (activeCampaignsCount >= plan.maxActiveCampaigns) {
    return {
      allowed: false,
      reason: `Limite de campagnes actives atteinte pour le plan ${plan.name} (${activeCampaignsCount}/${plan.maxActiveCampaigns}). Passez au plan Premium pour créer de nouvelles campagnes.`,
      currentCount: activeCampaignsCount,
      maxLimit: plan.maxActiveCampaigns
    };
  }
  return {
    allowed: true,
    currentCount: activeCampaignsCount,
    maxLimit: plan.maxActiveCampaigns
  };
}

/**
 * 3. Calcul des frais sur retrait Vendeur (Mobile Money / Wave / OM)
 */
export interface PayoutFeeCalculation {
  requestedAmount: number;
  feeAmount: number;
  netAmount: number;
  isFree: boolean;
  thresholdRemaining: number;
}

export function calculatePayoutFee(
  requestedAmount: number,
  rule: PayoutFeeRule = DEFAULT_PAYOUT_FEE_RULE
): PayoutFeeCalculation {
  if (!rule.isActive) {
    return {
      requestedAmount,
      feeAmount: 0,
      netAmount: requestedAmount,
      isFree: true,
      thresholdRemaining: 0
    };
  }

  // Si le montant demandé est supérieur ou égal au seuil de gratuité
  if (requestedAmount >= rule.freeThreshold) {
    return {
      requestedAmount,
      feeAmount: 0,
      netAmount: requestedAmount,
      isFree: true,
      thresholdRemaining: 0
    };
  }

  // Calcul du frais (fixe + % optionnel)
  const percentFee = Math.round((requestedAmount * rule.feePercent) / 100);
  const feeAmount = rule.fixedFee + percentFee;
  const netAmount = Math.max(0, requestedAmount - feeAmount);
  const thresholdRemaining = Math.max(0, rule.freeThreshold - requestedAmount);

  return {
    requestedAmount,
    feeAmount,
    netAmount,
    isFree: false,
    thresholdRemaining
  };
}

/**
 * 4. Calcul du boost de matching pour les campagnes sponsorisées
 * Règle strict : Ne surpasse JAMAIS l'incompatibilité de niche/zone.
 */
export interface MatchingScoreInput {
  baseScore: number; // 0 - 100 basé sur les niches & zones communes
  isNicheCompatible: boolean;
  isZoneCompatible: boolean;
  sponsoredCampaign?: SponsoredCampaign;
}

export function calculateSponsoredMatchingScore(input: MatchingScoreInput): number {
  const { baseScore, isNicheCompatible, isZoneCompatible, sponsoredCampaign } = input;

  // Règle non négociable (§3 prompt) : si incompatible niche ou zone, score = 0
  if (!isNicheCompatible || !isZoneCompatible) {
    return 0;
  }

  // Si la campagne n'est pas sponsorisée ou si elle est épuisée/suspendue
  if (!sponsoredCampaign || sponsoredCampaign.status !== 'active') {
    return baseScore;
  }

  // Vérification budget
  if (sponsoredCampaign.spentBudget >= sponsoredCampaign.totalBudget) {
    return baseScore;
  }

  // Application du multiplicateur de boost
  const boostedScore = Math.round(baseScore * sponsoredCampaign.matchingBoostWeight);
  return Math.min(100, boostedScore); // Plafonné à 100
}

/**
 * 5. Génération d'écritures du Grand Livre (Ledger Entries immuables)
 */
export function buildLedgerEntryForValidatedSale(order: Order): FinancialLedgerEntry[] {
  const entries: FinancialLedgerEntry[] = [];
  const dateStr = new Date().toISOString();

  // Écriture 1 : Commission Vendeur
  if (order.commissionAmount && order.commissionAmount > 0) {
    entries.push({
      id: `led-${order.id}-seller`,
      sellerId: order.sellerId || null,
      merchantId: null,
      orderId: order.id,
      entryType: 'COMMISSION',
      amount: order.commissionAmount,
      description: `Commission vendeur sur commande #${order.id.slice(0, 8)} (${order.customer})`,
      createdAt: dateStr,
      sellerName: order.sellerName
    });
  }

  // Écriture 2 : Commission Plateforme
  if (order.platformFeeAmount && order.platformFeeAmount > 0) {
    entries.push({
      id: `led-${order.id}-platform`,
      sellerId: null,
      merchantId: null,
      orderId: order.id,
      entryType: 'PLATFORM_FEE',
      amount: order.platformFeeAmount,
      description: `Frais plateforme (${order.platformFeeRate || 5}%) sur commande #${order.id.slice(0, 8)}`,
      createdAt: dateStr
    });
  }

  return entries;
}

export function buildLedgerEntryForOrderCancellation(order: Order, reason: string): FinancialLedgerEntry[] {
  const entries: FinancialLedgerEntry[] = [];
  const dateStr = new Date().toISOString();

  if (order.commissionAmount && order.commissionAmount > 0) {
    entries.push({
      id: `led-${order.id}-seller-rev`,
      sellerId: order.sellerId || null,
      merchantId: null,
      orderId: order.id,
      entryType: 'COMMISSION',
      amount: -order.commissionAmount, // Écriture négative compensatoire
      description: `Annulation commission sur commande #${order.id.slice(0, 8)} : ${reason}`,
      createdAt: dateStr,
      sellerName: order.sellerName
    });
  }

  if (order.platformFeeAmount && order.platformFeeAmount > 0) {
    entries.push({
      id: `led-${order.id}-platform-rev`,
      sellerId: null,
      merchantId: null,
      orderId: order.id,
      entryType: 'PLATFORM_FEE_REVERSAL',
      amount: -order.platformFeeAmount,
      description: `Annulation frais plateforme sur commande #${order.id.slice(0, 8)} : ${reason}`,
      createdAt: dateStr
    });
  }

  return entries;
}
