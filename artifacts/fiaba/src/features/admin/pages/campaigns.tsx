import { useState, useMemo } from 'react';
import { Chart02Icon, Rocket01Icon, Search01Icon, Target01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import {
  AdminBadge,
  AdminCard as Card,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  AdminSectionTitle,
  adminInputClass,
  adminSelectClass,
} from '../components/admin-ui';
import { useAdminCampaigns } from './products/use-admin-campaigns';
import { AdminCampaignRow } from './products/admin-campaign-row';

type StatusFilter = 'all' | 'active' | 'en_pause' | 'terminee';
type ModelFilter = 'all' | 'commission' | 'marge';

export function AdminCampaigns() {
  const ctx = useAdminCampaigns();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all');

  // ── KPIs ──
  const activeCount = ctx.campaigns.filter((c) => c.status === 'active').length;
  const pausedCount = ctx.campaigns.filter((c) => c.status === 'en_pause').length;
  const finishedCount = ctx.campaigns.filter((c) => c.status === 'terminee').length;
  const totalSellers = Array.from(ctx.campaignSellerCounts.values()).reduce((s, v) => s + v, 0);
  const avgSellers = ctx.campaigns.length > 0 ? Math.round(totalSellers / ctx.campaigns.length) : 0;
  const commissionCampaigns = ctx.campaigns.filter((c) => c.model === 'commission').length;
  const marginCampaigns = ctx.campaigns.filter((c) => c.model === 'marge').length;

  // ── Filtered campaigns ──
  const filtered = useMemo(() => {
    return ctx.campaigns.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = q === '' ||
        c.name.toLowerCase().includes(q) ||
        (ctx.merchantNames.get(c.merchant_id) ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesModel = modelFilter === 'all' || c.model === modelFilter;
      return matchesSearch && matchesStatus && matchesModel;
    });
  }, [ctx.campaigns, ctx.merchantNames, search, statusFilter, modelFilter]);

  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Toutes', count: ctx.campaigns.length },
    { id: 'active', label: 'Actives', count: activeCount },
    { id: 'en_pause', label: 'En pause', count: pausedCount },
    { id: 'terminee', label: 'Terminées', count: finishedCount },
  ];

  return (
    <AdminPage
      eyebrow="Campagnes plateforme"
      title="Campagnes"
      description="Pilotez les campagnes de vos marchands, suivez l'adoption vendeurs et suspendez si besoin."
    >
      {/* ── KPIs ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total campagnes" value={String(ctx.campaigns.length)} glyph={Chart02Icon} tone="violet" />
        <KpiCard label="Actives" value={String(activeCount)} glyph={Rocket01Icon} tone="mint" sub={`${pausedCount} en pause`} />
        <KpiCard label="Vendeurs reliés" value={String(totalSellers)} glyph={UserGroupIcon} tone="amber" sub={`~${avgSellers} / campagne`} />
        <KpiCard label="Modèle marge" value={String(marginCampaigns)} glyph={Target01Icon} tone="violet" sub={`${commissionCampaigns} commission`} />
      </div>

      {/* ── Filters ── */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9290a2]">
            <Icon glyph={Search01Icon} size={16} />
          </span>
          <input
            type="text"
            placeholder="Rechercher par campagne, marchand…"
            value={search}
            onChange={(e) => { haptic('light'); setSearch(e.target.value); }}
            className={`${adminInputClass} pl-11`}
            data-testid="input-campaign-search"
          />
        </div>

        {/* Model filter */}
        <select
          value={modelFilter}
          onChange={(e) => { haptic('light'); setModelFilter(e.target.value as ModelFilter); }}
          className={`${adminSelectClass} lg:w-44`}
          data-testid="select-model-filter"
        >
          <option value="all">Tous modèles</option>
          <option value="commission">Commission</option>
          <option value="marge">Marge</option>
        </select>
      </div>

      {/* Status filter pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => { haptic('light'); setStatusFilter(f.id); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === f.id ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'
            }`}
            data-testid={`filter-campaign-status-${f.id}`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 text-[9px] ${statusFilter === f.id ? 'bg-white/20' : 'bg-white'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* ── Campaigns table ── */}
      {ctx.loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-5 p-0">
          <AdminEmptyState
            glyph={Chart02Icon}
            title={search || statusFilter !== 'all' || modelFilter !== 'all' ? 'Aucun résultat' : 'Aucune campagne'}
            description={search || statusFilter !== 'all' || modelFilter !== 'all' ? 'Ajustez vos filtres pour afficher des campagnes.' : 'Aucune campagne à afficher.'}
          />
        </Card>
      ) : (
        <Card className="mt-5 p-0">
          <div className="px-5 py-4">
            <AdminSectionTitle
              title="Campagnes"
              subtitle={`${filtered.length} campagne(s) affichée(s)`}
              action={<AdminBadge tone="violet">{ctx.campaigns.length} total</AdminBadge>}
            />
          </div>
          <AdminScrollTable minWidth={680} testId="scroll-admin-campaigns">
            <div className="divide-y divide-[#f1eef7]">
              {filtered.map((c) => (
                <AdminCampaignRow
                  key={c.id}
                  c={c}
                  merchantName={ctx.merchantNames.get(c.merchant_id) ?? '—'}
                  sellerCount={ctx.campaignSellerCounts.get(c.id) ?? 0}
                  onSuspend={(id, name) => ctx.setToSuspend({ id, name })}
                />
              ))}
            </div>
          </AdminScrollTable>
        </Card>
      )}

      <AdminConfirmDialog
        open={!!ctx.toSuspend}
        onClose={() => ctx.setToSuspend(null)}
        onConfirm={ctx.suspend}
        title="Suspendre cette campagne ?"
        message={ctx.toSuspend ? `${ctx.toSuspend.name} sera terminée. Action tracée dans le journal d'audit.` : ''}
        confirmLabel="Suspendre"
      />
    </AdminPage>
  );
}

/* ── KPI Card ── */
function KpiCard({
  label,
  value,
  glyph,
  tone,
  sub,
}: {
  label: string;
  value: string;
  glyph: typeof Chart02Icon;
  tone: 'violet' | 'mint' | 'amber';
  sub?: string;
}) {
  const toneClass = tone === 'mint' ? 'bg-[#e7faf2] text-[#278e69]' : tone === 'amber' ? 'bg-[#fff4de] text-[#ac741e]' : 'bg-[#efedff] text-[#5b49e8]';
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>
          <Icon glyph={glyph} size={18} />
        </span>
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">{label}</p>
      <strong className="mt-1 block font-[Space_Grotesk] text-2xl font-bold tracking-[-.06em] text-[#292541]">{value}</strong>
      {sub && <p className="mt-1 text-[10px] text-[#9290a2]">{sub}</p>}
    </Card>
  );
}
