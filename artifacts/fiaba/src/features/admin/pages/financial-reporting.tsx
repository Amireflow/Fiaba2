import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert01Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  Chart02Icon,
  ChartUpIcon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  CreditCardIcon,
  Download01Icon,
  FilterIcon,
  FlashIcon,
  Layers01Icon,
  Shield01Icon,
  SparklesIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminScrollTable,
  AdminSectionTitle,
  adminInputClass,
  adminSelectClass,
} from '../components/admin-ui';

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

const entryTypeConfig: Record<string, { label: string; tone: 'violet' | 'mint' | 'amber' | 'rose' | 'slate' }> = {
  PLATFORM_FEE: { label: 'Commission vente', tone: 'violet' },
  PLATFORM_FEE_REVERSAL: { label: 'Annulation commission', tone: 'rose' },
  COMMISSION: { label: 'Commission vendeur', tone: 'slate' },
  MARGIN: { label: 'Marge vendeur', tone: 'slate' },
  SUBSCRIPTION_FEE: { label: 'Abonnement', tone: 'violet' },
  SPONSORED_CAMPAIGN_FEE: { label: 'Sponsoring', tone: 'amber' },
  PAYOUT_FEE: { label: 'Frais de retrait', tone: 'mint' },
  PAYOUT: { label: 'Retrait vendeur', tone: 'mint' },
};

const tabs = [
  { id: 'ledger', label: 'Grand Livre' },
  { id: 'plans', label: 'Paliers Abonnements' },
  { id: 'rules', label: 'Commission Plateforme' },
  { id: 'payouts', label: 'Frais de Retrait' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export const FinancialReportingPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('ledger');
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
    haptic('light');
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
    toast({ title: 'Export généré', description: `${filteredEntries.length} écritures exportées.` });
  };

  async function savePlatformFeeRate() {
    if (!platformFeeRule) return;
    haptic('medium');
    setSavingRule(true);
    const { error } = await (supabase.from('platform_fee_rules') as any)
      .update({ rate_percent: platformFeeRule.rate_percent })
      .eq('id', platformFeeRule.id);
    setSavingRule(false);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Taux mis à jour', description: `Taux par défaut : ${platformFeeRule.rate_percent}%` });
    }
  }

  async function savePayoutRule() {
    if (!payoutRule) return;
    haptic('medium');
    setSavingRule(true);
    const { error } = await (supabase.from('payout_fee_rules') as any)
      .update({ fixed_fee: payoutRule.fixed_fee, free_threshold: payoutRule.free_threshold })
      .eq('id', payoutRule.id);
    setSavingRule(false);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Règle mise à jour', description: 'Frais de retrait mis à jour avec succès.' });
    }
  }

  if (loading) {
    return (
      <AdminPage eyebrow="Modèle économique" title="Finances">
        <div className="mt-10 flex items-center justify-center py-16">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow="Modèle économique"
      title="Finances"
      description="Supervision transversale des 4 sources de revenus et audit immuable du Grand Livre comptable."
      action={
        <Button variant="soft" onClick={handleExportCSV} testId="button-export-ledger">
          <Icon glyph={Download01Icon} size={15} /> Exporter le Grand Livre
        </Button>
      }
    >
      {/* ── Hero : revenu total + 4 sources ── */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_.85fr]">
        {/* Revenu total — carte violette profonde */}
        <div className="rounded-[22px] bg-[#5745df] p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d0caff]">Revenu total plateforme</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                  <Icon glyph={ChartUpIcon} size={18} />
                </span>
                <strong className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.08em] sm:text-4xl">
                  {money(grandTotalRevenue).replace(' F', '')}
                </strong>
                <span className="mb-1 text-sm text-[#d0caff]">FCFA</span>
              </div>
            </div>
            <AdminBadge tone="mint" className="bg-white/15 text-white">
              <Icon glyph={ArrowUpRight01Icon} size={12} /> Transverse
            </AdminBadge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-sm">
            <div>
              <p className="text-[#d0caff]">Écritures analysées</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">{ledgerEntries.length}</p>
            </div>
            <div>
              <p className="text-[#d0caff]">Sources actives</p>
              <p className="mt-1 font-[Space_Grotesk] font-bold">
                {[totalPlatformFees, totalSubscriptions, totalSponsored, totalPayoutFees].filter(v => v > 0).length} / 4
              </p>
            </div>
          </div>
        </div>

        {/* Détail des 4 sources — carte claire */}
        <Card>
          <p className="text-sm font-bold text-[#292541]">Les 4 sources de revenus</p>
          <div className="mt-4 space-y-3">
            <RevenueLine
              glyph={Layers01Icon}
              tone="violet"
              label="Commissions ventes"
              value={totalPlatformFees}
              hint={platformFeeRule ? `Taux ~ ${platformFeeRule.rate_percent}%` : 'Taux ~ 5%'}
            />
            <RevenueLine
              glyph={CreditCardIcon}
              tone="violet"
              label="Abonnements"
              value={totalSubscriptions}
              hint="Plan Premium · 25k FCFA"
            />
            <RevenueLine
              glyph={ZapIcon}
              tone="amber"
              label="Sponsoring"
              value={totalSponsored}
              hint="Boost Découvrir"
            />
            <RevenueLine
              glyph={Shield01Icon}
              tone="mint"
              label="Frais de retrait"
              value={totalPayoutFees}
              hint="Retraits < 25k FCFA"
            />
          </div>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-[#f1eef7]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { haptic('light'); setActiveTab(t.id); }}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === t.id
                ? 'border-[#5b49e8] text-[#5b49e8]'
                : 'border-transparent text-[#77738a] hover:text-[#292541]'
            }`}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1 : Grand Livre Comptable ── */}
      {activeTab === 'ledger' && (
        <div className="mt-5 space-y-4">
          {/* Filtres */}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Rechercher par description, marchand, vendeur…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={adminInputClass}
                data-testid="input-ledger-search"
              />
              <div className="flex items-center gap-2">
                <Icon glyph={FilterIcon} size={16} className="shrink-0 text-[#9290a2]" />
                <select
                  value={selectedTypeFilter}
                  onChange={e => setSelectedTypeFilter(e.target.value)}
                  className={adminSelectClass}
                  data-testid="select-ledger-type"
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
          </Card>

          {/* Table Grand Livre */}
          <Card className="p-0">
            <div className="px-5 py-4">
              <AdminSectionTitle
                title="Écritures comptables"
                subtitle={`${filteredEntries.length} écriture(s) — triées par date décroissante`}
              />
            </div>
            {filteredEntries.length === 0 ? (
              <AdminEmptyState
                glyph={Chart02Icon}
                title="Aucune écriture trouvée"
                description="Ajustez votre recherche ou votre filtre pour afficher des écritures comptables."
              />
            ) : (
              <AdminScrollTable minWidth={720} testId="scroll-ledger">
                <div className="divide-y divide-[#f1eef7]">
                  {filteredEntries.map(entry => {
                    const cfg = entryTypeConfig[entry.entry_type] ?? { label: entry.entry_type, tone: 'slate' as const };
                    const isNegative = entry.amount < 0;
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-5 py-4">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          cfg.tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' :
                          cfg.tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' :
                          cfg.tone === 'rose' ? 'bg-[#fff0f1] text-[#c45667]' :
                          cfg.tone === 'violet' ? 'bg-[#efedff] text-[#5b49e8]' :
                          'bg-[#f0eff5] text-[#716d82]'
                        }`}>
                          <Icon glyph={Coins01Icon} size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#292541]">{cfg.label}</p>
                            <span className="font-mono text-[10px] text-[#b8b4c8]">#{entry.id.slice(0, 8)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[#9290a2]">
                            {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {entry.merchant_name && ` · ${entry.merchant_name}`}
                            {entry.seller_name && ` · ${entry.seller_name}`}
                          </p>
                        </div>
                        <div className="hidden text-right text-[11px] text-[#9290a2] sm:block sm:max-w-[220px] sm:truncate">
                          {entry.description ?? '—'}
                        </div>
                        <strong className={`shrink-0 font-[Space_Grotesk] text-sm font-bold ${isNegative ? 'text-[#c45667]' : 'text-[#292541]'}`}>
                          {isNegative ? '' : '+'}{money(entry.amount).replace(' F', '')}
                          <span className="ml-1 text-[10px] font-sans font-normal text-[#9290a2]">F</span>
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </AdminScrollTable>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab 2 : Paliers Freemium ── */}
      {activeTab === 'plans' && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {plans.map(plan => {
            const features = plan.features ?? [];
            const isPremium = plan.name === 'Premium';
            return (
              <Card key={plan.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${isPremium ? 'bg-[#efedff] text-[#5b49e8]' : 'bg-[#f0eff5] text-[#716d82]'}`}>
                      <Icon glyph={isPremium ? SparklesIcon : CreditCardIcon} size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#292541]">Plan {plan.name}</p>
                      <p className="text-[10px] text-[#9290a2]">{isPremium ? 'Croissance' : 'Démarrage'}</p>
                    </div>
                  </div>
                  <AdminBadge tone={plan.is_active ? 'mint' : 'slate'}>
                    {plan.is_active ? 'Actif' : 'Inactif'}
                  </AdminBadge>
                </div>

                <div className="mt-5 flex items-end gap-1">
                  <strong className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] text-[#292541]">
                    {plan.price_monthly === 0 ? 'Gratuit' : money(plan.price_monthly).replace(' F', '')}
                  </strong>
                  {plan.price_monthly > 0 && <span className="mb-1 text-xs text-[#9290a2]">FCFA / mois</span>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-[#f4f3f8] p-3 text-center">
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Produits</p>
                    <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{plan.max_active_products}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Campagnes</p>
                    <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#292541]">{plan.max_active_campaigns}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9290a2]">Commission</p>
                    <p className="mt-1 font-[Space_Grotesk] text-base font-bold text-[#5b49e8]">{Number(plan.platform_fee_rate)}%</p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px] text-[#292541]">
                      <Icon glyph={CheckmarkCircle02Icon} size={16} className="mt-0.5 shrink-0 text-[#278e69]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Tab 3 : Règle Commission Plateforme ── */}
      {activeTab === 'rules' && platformFeeRule && (
        <Card className="mt-5">
          <AdminSectionTitle
            title="Règle générale par défaut"
            subtitle="Taux appliqué à toute commande sauf si le marchand bénéficie d'un plan Premium à taux préférentiel."
            action={
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                <Icon glyph={Chart02Icon} size={18} />
              </span>
            }
          />
          <div className="mt-5 max-w-md rounded-xl bg-[#f4f3f8] p-5">
            <AdminField label="Taux de commission par défaut (%)">
              <input
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={platformFeeRule.rate_percent}
                onChange={e => setPlatformFeeRule({ ...platformFeeRule, rate_percent: parseFloat(e.target.value) || 0 })}
                className={`${adminInputClass} text-center font-[Space_Grotesk] text-lg font-bold`}
                data-testid="input-platform-fee-rate"
              />
            </AdminField>
            <div className="mt-4">
              <Button onClick={savePlatformFeeRate} disabled={savingRule} testId="button-save-platform-fee">
                {savingRule ? 'Enregistrement…' : 'Enregistrer le taux'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 4 : Frais de Retrait Vendeurs ── */}
      {activeTab === 'payouts' && payoutRule && (
        <Card className="mt-5">
          <AdminSectionTitle
            title="Configuration des frais de retrait Mobile Money"
            subtitle="Couvre les coûts de transaction de nos partenaires Mobile Money (Wave, Orange Money)."
            action={
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e7faf2] text-[#278e69]">
                <Icon glyph={Shield01Icon} size={18} />
              </span>
            }
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <AdminField label="Frais fixe (< seuil)" hint="Montant prélevé sur les retraits sous le seuil de gratuité.">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={payoutRule.fixed_fee}
                  onChange={e => setPayoutRule({ ...payoutRule, fixed_fee: parseInt(e.target.value) || 0 })}
                  className={adminInputClass}
                  data-testid="input-payout-fixed-fee"
                />
                <span className="shrink-0 text-xs font-bold text-[#9290a2]">FCFA</span>
              </div>
            </AdminField>

            <AdminField label="Seuil de gratuité" hint="Au-delà de ce montant, le retrait est gratuit pour le vendeur.">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={payoutRule.free_threshold}
                  onChange={e => setPayoutRule({ ...payoutRule, free_threshold: parseInt(e.target.value) || 0 })}
                  className={adminInputClass}
                  data-testid="input-payout-threshold"
                />
                <span className="shrink-0 text-xs font-bold text-[#9290a2]">FCFA</span>
              </div>
            </AdminField>

            <div className="flex items-end">
              <Button onClick={savePayoutRule} disabled={savingRule} className="w-full" testId="button-save-payout-rule">
                {savingRule ? 'Enregistrement…' : 'Mettre à jour la règle'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </AdminPage>
  );
};

/* ── Ligne de revenu compacte (hero secondaire) ── */
function RevenueLine({
  glyph,
  tone,
  label,
  value,
  hint,
}: {
  glyph: typeof Chart02Icon;
  tone: 'violet' | 'mint' | 'amber';
  label: string;
  value: number;
  hint: string;
}) {
  const toneClass = tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#efedff] text-[#5b49e8]';
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon glyph={glyph} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[#292541]">{label}</p>
        <p className="text-[10px] text-[#9290a2]">{hint}</p>
      </div>
      <strong className="shrink-0 font-[Space_Grotesk] text-sm font-bold text-[#292541]">
        {money(value).replace(' F', '')} <span className="text-[10px] font-sans font-normal text-[#9290a2]">F</span>
      </strong>
    </div>
  );
}
