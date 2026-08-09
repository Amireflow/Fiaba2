import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  ShieldCheck,
  CreditCard,
  Zap,
  CheckCircle,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  Award
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type LedgerRow = {
  id: string;
  seller_id: string | null;
  merchant_id: string | null;
  order_id: string | null;
  entry_type: string;
  amount: number;
  description: string | null;
  created_at: string;
  seller_name: string | null;
  merchant_name: string | null;
};

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

type PayoutFeeRuleRow = {
  id: string;
  fee_percent: number;
  fixed_fee: number;
  free_threshold: number;
  is_active: boolean;
};

type PlatformFeeRuleRow = {
  id: string;
  category: string | null;
  rate_percent: number;
  fixed_amount: number;
  is_active: boolean;
};

export const FinancialReportingPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'ledger' | 'rules' | 'plans' | 'payouts'>('ledger');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [payoutRule, setPayoutRule] = useState<PayoutFeeRuleRow | null>(null);
  const [platformFeeRule, setPlatformFeeRule] = useState<PlatformFeeRuleRow | null>(null);
  const [savingRule, setSavingRule] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Fetch ledger entries with joined names
    const { data: ledger } = await supabase
      .from('ledger_entries')
      .select(`
        id, seller_id, merchant_id, order_id, entry_type, amount, description, created_at,
        sellers:seller_id (display_name),
        merchants:merchant_id (name)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    const ledgerRows = (ledger as any[] | null) ?? [];
    setLedgerEntries(ledgerRows.map((r) => ({
      id: r.id,
      seller_id: r.seller_id,
      merchant_id: r.merchant_id,
      order_id: r.order_id,
      entry_type: r.entry_type,
      amount: r.amount,
      description: r.description,
      created_at: r.created_at,
      seller_name: r.sellers?.display_name ?? null,
      merchant_name: r.merchants?.name ?? null,
    })));

    // Fetch subscription plans
    const { data: planRows } = await supabase
      .from('subscription_plans')
      .select('id, name, price_monthly, max_active_products, max_active_campaigns, platform_fee_rate, features, is_active')
      .order('price_monthly', { ascending: true });
    setPlans((planRows as PlanRow[] | null) ?? []);

    // Fetch payout fee rules (active)
    const { data: payoutRows } = await supabase
      .from('payout_fee_rules')
      .select('id, fee_percent, fixed_fee, free_threshold, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    setPayoutRule((payoutRows as PayoutFeeRuleRow[] | null)?.[0] ?? null);

    // Fetch platform fee rules (default = no category)
    const { data: pfrRows } = await supabase
      .from('platform_fee_rules')
      .select('id, category, rate_percent, fixed_amount, is_active')
      .is('category', null)
      .eq('is_active', true)
      .limit(1);
    setPlatformFeeRule((pfrRows as PlatformFeeRuleRow[] | null)?.[0] ?? null);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrage du Grand Livre (Ledger)
  const filteredEntries = ledgerEntries.filter(entry => {
    const desc = (entry.description ?? '').toLowerCase();
    const seller = (entry.seller_name ?? '').toLowerCase();
    const merchant = (entry.merchant_name ?? '').toLowerCase();
    const matchesSearch =
      desc.includes(searchTerm.toLowerCase()) ||
      seller.includes(searchTerm.toLowerCase()) ||
      merchant.includes(searchTerm.toLowerCase());

    const matchesType = selectedTypeFilter === 'ALL' || entry.entry_type === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  // Calcul des totaux par source de revenus
  const totalPlatformFees = ledgerEntries
    .filter(e => e.entry_type === 'PLATFORM_FEE' || e.entry_type === 'PLATFORM_FEE_REVERSAL')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSubscriptions = ledgerEntries
    .filter(e => e.entry_type === 'SUBSCRIPTION_FEE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSponsored = ledgerEntries
    .filter(e => e.entry_type === 'SPONSORED_CAMPAIGN_FEE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPayoutFees = ledgerEntries
    .filter(e => e.entry_type === 'PAYOUT_FEE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const grandTotalRevenue = totalPlatformFees + totalSubscriptions + totalSponsored + totalPayoutFees;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type Écriture', 'Montant (FCFA)', 'Description', 'Marchand', 'Vendeur'];
    const rows = filteredEntries.map(e => [
      e.id,
      new Date(e.created_at).toLocaleString('fr-FR'),
      e.entry_type,
      e.amount,
      `"${(e.description ?? '').replace(/"/g, '""')}"`,
      e.merchant_name || '',
      e.seller_name || ''
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

  async function savePlatformFeeRate() {
    if (!platformFeeRule) return;
    setSavingRule(true);
    const { error } = await (supabase.from('platform_fee_rules') as any)
      .update({ rate_percent: platformFeeRule.rate_percent })
      .eq('id', platformFeeRule.id);
    setSavingRule(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Taux mis à jour', description: `Taux par défaut : ${platformFeeRule.rate_percent}%` });
    }
  }

  async function savePayoutRule() {
    if (!payoutRule) return;
    setSavingRule(true);
    const { error } = await (supabase.from('payout_fee_rules') as any)
      .update({ fixed_fee: payoutRule.fixed_fee, free_threshold: payoutRule.free_threshold })
      .eq('id', payoutRule.id);
    setSavingRule(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Règle mise à jour', description: 'Frais de retrait mis à jour avec succès.' });
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center p-12">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

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
          <span className="text-xs text-slate-500 mt-1 block">Taux standard ~ {platformFeeRule ? `${platformFeeRule.rate_percent}%` : '5%'}</span>
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
      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Grand Livre Comptable (Ledger)
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'plans'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Paliers Abonnements Freemium
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rules'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Règles Commission Plateforme
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
                <option value="ALL">Tous les types d'écritures</option>
                <option value="PLATFORM_FEE">Commission Plateforme (Vente)</option>
                <option value="PLATFORM_FEE_REVERSAL">Annulation Commission Plateforme</option>
                <option value="COMMISSION">Commission Vendeur</option>
                <option value="MARGIN">Marge Vendeur</option>
                <option value="SUBSCRIPTION_FEE">Frais d'Abonnement</option>
                <option value="SPONSORED_CAMPAIGN_FEE">Sponsoring Campagne</option>
                <option value="PAYOUT_FEE">Frais de Retrait</option>
                <option value="PAYOUT">Retrait Vendeur</option>
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
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        Aucune écriture comptable trouvée.
                      </td>
                    </tr>
                  ) : filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-500 block">{entry.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString('fr-FR')}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          entry.entry_type === 'PLATFORM_FEE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                          entry.entry_type === 'SUBSCRIPTION_FEE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                          entry.entry_type === 'SPONSORED_CAMPAIGN_FEE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                          entry.entry_type === 'PAYOUT_FEE' || entry.entry_type === 'PAYOUT' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' :
                          entry.entry_type === 'PLATFORM_FEE_REVERSAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {entry.merchant_name && <div className="text-xs font-medium text-slate-900 dark:text-white">Marchand: {entry.merchant_name}</div>}
                        {entry.seller_name && <div className="text-xs text-slate-500">Vendeur: {entry.seller_name}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {entry.description ?? '—'}
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
          {plans.map(plan => {
            const features = plan.features ?? [];
            return (
              <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {plan.name === 'Premium' && <Award className="w-5 h-5 text-purple-500" />}
                      Plan {plan.name}
                    </h3>
                    <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">
                      Commission Plateforme : {Number(plan.platform_fee_rate)}%
                    </span>
                  </div>

                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
                    {plan.price_monthly === 0 ? 'Gratuit' : `${plan.price_monthly.toLocaleString('fr-FR')} FCFA / mois`}
                  </div>

                  <ul className="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Max produits actifs : <strong>{plan.max_active_products}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Max campagnes actives : <strong>{plan.max_active_campaigns}</strong></span>
                    </li>
                    {features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
                  <span>Statut : {plan.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3 : Règles Commission Plateforme */}
      {activeTab === 'rules' && platformFeeRule && (
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
                value={platformFeeRule.rate_percent}
                onChange={e => setPlatformFeeRule({ ...platformFeeRule, rate_percent: parseFloat(e.target.value) || 0 })}
                className="px-3 py-2 border rounded-lg w-24 text-center font-bold text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-700"
              />
              <button
                onClick={savePlatformFeeRate}
                disabled={savingRule}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow disabled:opacity-50"
              >
                {savingRule ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4 : Frais de Retrait Vendeurs */}
      {activeTab === 'payouts' && payoutRule && (
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
                    value={payoutRule.fixed_fee}
                    onChange={e => setPayoutRule({ ...payoutRule, fixed_fee: parseInt(e.target.value) || 0 })}
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
                    value={payoutRule.free_threshold}
                    onChange={e => setPayoutRule({ ...payoutRule, free_threshold: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border rounded-lg w-full text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">FCFA</span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={savePayoutRule}
                  disabled={savingRule}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow disabled:opacity-50"
                >
                  {savingRule ? 'Enregistrement…' : 'Mettre à jour Règle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
