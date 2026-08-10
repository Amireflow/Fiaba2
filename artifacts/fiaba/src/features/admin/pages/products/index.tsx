import { useState, useMemo } from 'react';
import { PackageIcon, Search01Icon, SparklesIcon, Store01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';
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
} from '../../components/admin-ui';
import { useAdminProducts } from './use-admin-products';
import { AdminProductRow } from './admin-product-row';

type StatusFilter = 'all' | 'actif' | 'brouillon' | 'epuise';

export function AdminProducts() {
  const ctx = useAdminProducts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [aiFilter, setAiFilter] = useState<'all' | 'generated' | 'none'>('all');

  // ── KPIs ──
  const activeCount = ctx.products.filter((p) => p.status === 'actif').length;
  const draftCount = ctx.products.filter((p) => p.status === 'brouillon').length;
  const suspendedCount = ctx.products.filter((p) => p.status === 'epuise').length;
  const aiGeneratedCount = ctx.products.filter((p) => p.ai_headline).length;
  const aiCoverage = ctx.products.length > 0 ? Math.round((aiGeneratedCount / ctx.products.length) * 100) : 0;

  // ── Filtered products ──
  const filtered = useMemo(() => {
    return ctx.products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = q === '' ||
        p.name.toLowerCase().includes(q) ||
        (ctx.merchantNames.get(p.merchant_id) ?? '').toLowerCase().includes(q) ||
        (p.niche_id ? (ctx.nicheNames.get(p.niche_id) ?? '') : '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesAi = aiFilter === 'all' ||
        (aiFilter === 'generated' && p.ai_headline) ||
        (aiFilter === 'none' && !p.ai_headline);
      return matchesSearch && matchesStatus && matchesAi;
    });
  }, [ctx.products, ctx.merchantNames, ctx.nicheNames, search, statusFilter, aiFilter]);

  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Tous', count: ctx.products.length },
    { id: 'actif', label: 'Actifs', count: activeCount },
    { id: 'brouillon', label: 'Brouillons', count: draftCount },
    { id: 'epuise', label: 'Suspendus', count: suspendedCount },
  ];

  return (
    <AdminPage
      eyebrow="Catalogue plateforme"
      title="Produits"
      description="Surveillez le catalogue, générez du contenu IA et suspendez les offres non conformes."
    >
      {/* ── KPIs ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total produits" value={String(ctx.products.length)} glyph={PackageIcon} tone="violet" />
        <KpiCard label="Actifs" value={String(activeCount)} glyph={Store01Icon} tone="mint" sub={`${draftCount} brouillons`} />
        <KpiCard label="Suspendus" value={String(suspendedCount)} glyph={PackageIcon} tone="amber" />
        <KpiCard label="Couverture IA" value={`${aiCoverage}%`} glyph={SparklesIcon} tone="violet" sub={`${aiGeneratedCount} / ${ctx.products.length}`} />
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
            placeholder="Rechercher par produit, marchand, niche…"
            value={search}
            onChange={(e) => { haptic('light'); setSearch(e.target.value); }}
            className={`${adminInputClass} pl-11`}
            data-testid="input-product-search"
          />
        </div>

        {/* AI filter */}
        <select
          value={aiFilter}
          onChange={(e) => { haptic('light'); setAiFilter(e.target.value as typeof aiFilter); }}
          className={`${adminSelectClass} lg:w-48`}
          data-testid="select-ai-filter"
        >
          <option value="all">Tous (IA)</option>
          <option value="generated">Avec contenu IA</option>
          <option value="none">Sans contenu IA</option>
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
            data-testid={`filter-status-${f.id}`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 text-[9px] ${statusFilter === f.id ? 'bg-white/20' : 'bg-white'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* ── Products table ── */}
      {ctx.loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-5 p-0">
          <AdminEmptyState
            glyph={PackageIcon}
            title={search || statusFilter !== 'all' || aiFilter !== 'all' ? 'Aucun résultat' : 'Aucun produit'}
            description={search || statusFilter !== 'all' || aiFilter !== 'all' ? 'Ajustez vos filtres pour afficher des produits.' : 'Le catalogue est vide.'}
          />
        </Card>
      ) : (
        <Card className="mt-5 p-0">
          <div className="px-5 py-4">
            <AdminSectionTitle
              title="Catalogue produits"
              subtitle={`${filtered.length} produit(s) affiché(s)`}
              action={<AdminBadge tone="violet">{ctx.products.length} total</AdminBadge>}
            />
          </div>
          <AdminScrollTable minWidth={680} testId="scroll-admin-products">
            <div className="divide-y divide-[#f1eef7]">
              {filtered.map((p) => (
                <AdminProductRow
                  key={p.id}
                  p={p}
                  merchantName={ctx.merchantNames.get(p.merchant_id) ?? '—'}
                  nicheName={p.niche_id ? (ctx.nicheNames.get(p.niche_id) ?? '—') : '—'}
                  aiGeneratingId={ctx.aiGeneratingId}
                  onGenerate={ctx.generateAi}
                  onSuspend={(id, name) => ctx.setToSuspend({ id, name, kind: 'product' })}
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
        title="Suspendre ce produit ?"
        message={ctx.toSuspend ? `${ctx.toSuspend.name} sera retiré du catalogue. Action tracée dans le journal d'audit.` : ''}
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
  glyph: typeof PackageIcon;
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
