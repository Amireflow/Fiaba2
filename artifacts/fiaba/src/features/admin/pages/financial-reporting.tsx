import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  ShieldCheck,
  CreditCard,
  Zap,
  CheckCircle,
  Clock,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  Award
} from 'lucide-react';
import { FinancialLedgerEntry, LedgerEntryType, SubscriptionPlan, PayoutFeeRule } from '../../../types/entities';
import { DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_PAYOUT_FEE_RULE } from '../../../lib/monetization';

// Mock Ledger Entries pour la vue Admin initial
const MOCK_LEDGER_ENTRIES: FinancialLedgerEntry[] = [
  {
    id: 'led-001',
    orderId: 'ord-84920',
    entryType: 'PLATFORM_FEE',
    amount: 1425,
    description: 'Commission plateforme (5%) sur commande #ord-84920 (Coffret Soin Karité)',
    createdAt: '2026-08-09T14:32:00Z',
    merchantName: 'Maison Ndar'
  },
  {
    id: 'led-002',
    orderId: 'ord-84920',
    entryType: 'COMMISSION',
    amount: 3420,
    sellerId: 'sel-101',
    sellerName: 'Marième Fall',
    description: 'Commission vendeur sur commande #ord-84920',
    createdAt: '2026-08-09T14:32:00Z',
    merchantName: 'Maison Ndar'
  },
  {
    id: 'led-003',
    entryType: 'SUBSCRIPTION_FEE',
    amount: 25000,
    merchantId: 'mer-202',
    merchantName: 'Sunu Shop Dakar',
    description: 'Abonnement Mensuel Plan Premium — Août 2026',
    createdAt: '2026-08-08T09:15:00Z'
  },
  {
    id: 'led-004',
    entryType: 'SPONSORED_CAMPAIGN_FEE',
    amount: 15000,
    merchantId: 'mer-101',
    merchantName: 'Maison Ndar',
    description: 'Forfait Campagne Sponsorisée "Rentrée Douce"',
    createdAt: '2026-08-05T11:20:00Z'
  },
  {
    id: 'led-005',
    entryType: 'PAYOUT_FEE',
    amount: 500,
    sellerId: 'sel-102',
    sellerName: 'Ndeye Kébé',
    description: 'Frais de retrait Wave (Retrait < 25 000 FCFA)',
    createdAt: '2026-08-04T16:45:00Z'
  },
  {
    id: 'led-006',
    orderId: 'ord-77120',
    entryType: 'PLATFORM_FEE_REVERSAL',
    amount: -1425,
    description: 'Annulation frais plateforme — commande #ord-77120 retournée',
    createdAt: '2026-08-03T10:00:00Z',
    merchantName: 'Boutique Touba'
  }
];

export const FinancialReportingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'rules' | 'plans' | 'payouts'>('ledger');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Config state
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  const [payoutRule, setPayoutRule] = useState<PayoutFeeRule>(DEFAULT_PAYOUT_FEE_RULE);
  const [defaultPlatformFeeRate, setDefaultPlatformFeeRate] = useState<number>(5.0);

  // Filtrage du Grand Livre (Ledger)
  const filteredEntries = MOCK_LEDGER_ENTRIES.filter(entry => {
    const matchesSearch =
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.sellerName && entry.sellerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.merchantName && entry.merchantName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedTypeFilter === 'ALL' || entry.entryType === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  // Calcul des totaux par source de revenus
  const totalPlatformFees = MOCK_LEDGER_ENTRIES
    .filter(e => e.entryType === 'PLATFORM_FEE' || e.entryType === 'PLATFORM_FEE_REVERSAL')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSubscriptions = MOCK_LEDGER_ENTRIES
    .filter(e => e.entryType === 'SUBSCRIPTION_FEE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSponsored = MOCK_LEDGER_ENTRIES
    .filter(e => e.entryType === 'SPONSORED_CAMPAIGN_FEE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPayoutFees = MOCK_LEDGER_ENTRIES
    .filter(e => e.entryType === 'PAYOUT_FEE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const grandTotalRevenue = totalPlatformFees + totalSubscriptions + totalSponsored + totalPayoutFees;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type Écriture', 'Montant (FCFA)', 'Description', 'Marchand', 'Vendeur'];
    const rows = filteredEntries.map(e => [
      e.id,
      new Date(e.createdAt).toLocaleString('fr-FR'),
      e.entryType,
      e.amount,
      `"${e.description.replace(/"/g, '""')}"`,
      e.merchantName || '',
      e.sellerName || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fiaba_grand_livre_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Finances & Modèle Économique
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Supervision transversale des 4 sources de revenus & audit immuable du Grand Livre
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter le Grand Livre (CSV)
        </button>
      </div>

      {/* KPI Cards — Synthese des 4 sources de revenus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Revenu Total</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {grandTotalRevenue.toLocaleString('fr-FR')} FCFA
          </p>
          <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> Transverse tous modules
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">1. Commissions Ventes</span>
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {totalPlatformFees.toLocaleString('fr-FR')} FCFA
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Taux standard ~ 5%</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">2. Abonnements</span>
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {totalSubscriptions.toLocaleString('fr-FR')} FCFA
          </p>
          <span className="text-xs text-purple-600 mt-1 block font-medium">Plan Premium (25k)</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">3. Sponsoring</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {totalSponsored.toLocaleString('fr-FR')} FCFA
          </p>
          <span className="text-xs text-amber-600 mt-1 block font-medium">Boost Découvrir</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">4. Frais Retrait</span>
            <ShieldCheck className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {totalPayoutFees.toLocaleString('fr-FR')} FCFA
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Retraits &lt; 25k FCFA</span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-4">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Grand Livre Comptable (Ledger)
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'plans'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Paliers Abonnements Freemium
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Règles Commission Plateforme
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'payouts'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Frais de Retrait Vendeurs
        </button>
      </div>

      {/* Tab 1 : Grand Livre Comptable */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="Rechercher par description, marchand, vendeur..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white w-full sm:w-80"
            />

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              >
                <option value="ALL">Tous les types d’écritures</option>
                <option value="PLATFORM_FEE">Commission Plateforme (Vente)</option>
                <option value="PLATFORM_FEE_REVERSAL">Annulation Commission Plateforme</option>
                <option value="COMMISSION">Commission Vendeur</option>
                <option value="SUBSCRIPTION_FEE">Frais d’Abonnement</option>
                <option value="SPONSORED_CAMPAIGN_FEE">Sponsoring Campagne</option>
                <option value="PAYOUT_FEE">Frais de Retrait</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">ID / Date</th>
                    <th className="py-3.5 px-4 font-semibold">Type Écriture</th>
                    <th className="py-3.5 px-4 font-semibold">Acteurs</th>
                    <th className="py-3.5 px-4 font-semibold">Description</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-500 block">{entry.id}</span>
                        <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString('fr-FR')}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          entry.entryType === 'PLATFORM_FEE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                          entry.entryType === 'SUBSCRIPTION_FEE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                          entry.entryType === 'SPONSORED_CAMPAIGN_FEE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                          entry.entryType === 'PAYOUT_FEE' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' :
                          entry.entryType === 'PLATFORM_FEE_REVERSAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {entry.entryType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {entry.merchantName && <div className="text-xs font-medium text-slate-900 dark:text-white">Marchand: {entry.merchantName}</div>}
                        {entry.sellerName && <div className="text-xs text-slate-500">Vendeur: {entry.sellerName}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {entry.description}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold ${entry.amount < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {entry.amount > 0 ? `+${entry.amount.toLocaleString('fr-FR')}` : entry.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2 : Paliers Freemium */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {plan.name === 'Premium' && <Award className="w-5 h-5 text-purple-500" />}
                    Plan {plan.name}
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">
                    Commission Plateforme : {plan.platformFeeRate}%
                  </span>
                </div>

                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
                  {plan.priceMonthly === 0 ? 'Gratuit' : `${plan.priceMonthly.toLocaleString('fr-FR')} FCFA / mois`}
                </div>

                <ul className="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Max produits actifs : <strong>{plan.maxActiveProducts}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Max campagnes actives : <strong>{plan.maxActiveCampaigns}</strong></span>
                  </li>
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
                <span>Statut : Active</span>
                <button
                  onClick={() => alert(`Édition du plan ${plan.name}`)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Configurer Quotas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3 : Règles Commission Plateforme */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Règle Générale par Défaut
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Ce taux est appliqué à toute commande sauf si le marchand bénéficie d'un plan Premium à taux préférentiel.
            </p>

            <div className="flex items-center gap-4 max-w-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Taux de commission par défaut (%) :
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={defaultPlatformFeeRate}
                onChange={e => setDefaultPlatformFeeRate(parseFloat(e.target.value))}
                className="px-3 py-2 border rounded-lg w-24 text-center font-bold text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-700"
              />
              <button
                onClick={() => alert('Taux par défaut mis à jour à ' + defaultPlatformFeeRate + '%')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4 : Frais de Retrait Vendeurs */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Configuration des Frais de Retrait Mobile Money
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Couvre les coûts de transaction de nos partenaires Mobile Money (Wave, Orange Money).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Frais Fixe (&lt; Seuil)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={payoutRule.fixedFee}
                    onChange={e => setPayoutRule({ ...payoutRule, fixedFee: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border rounded-lg w-full text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">FCFA</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Seuil de Gratuité</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={payoutRule.freeThreshold}
                    onChange={e => setPayoutRule({ ...payoutRule, freeThreshold: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border rounded-lg w-full text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">FCFA</span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => alert('Règle de retrait mise à jour !')}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow"
                >
                  Mettre à jour Règle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
