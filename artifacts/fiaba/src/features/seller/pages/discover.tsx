import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  Add01Icon,
  ArrowUpRight01Icon,
  GridViewIcon,
  ListViewIcon,
  Search01Icon,
  SparklesIcon,
  Tick01Icon,
  FilterIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useSellerDiscovery, type DiscoveryCampaign } from '@/hooks/use-seller-discovery';
import { trackEvent } from '@/lib/analytics';
import { getFirstImageUrl } from '@/lib/storage-upload';
import {
  SellerButton as Button,
  SellerCard as Card,
  SellerEmptyState,
  SellerPage as Page,
  sellerInputClass,
  sellerSelectClass,
} from '../components/seller-ui';
import { SafeImage } from '@/components/shared/safe-image';

const potentialFromScore = (score: number): 'Fort' | 'Bon' | 'Moyen' =>
  score >= 80 ? 'Fort' : score >= 40 ? 'Bon' : 'Moyen';

// Net creator gain per sale
function getNetGain(c: DiscoveryCampaign): number {
  if (c.commission_type === 'fixed' || c.model === 'marge') {
    return c.commission;
  }
  return Math.round(((c.product_price ?? 0) * c.commission) / 100);
}

type SortOption = 'matching' | 'gain_desc' | 'price_asc' | 'price_desc';
type ModelFilter = 'tous' | 'commission' | 'marge';
type FormatFilter = 'tous' | 'physique' | 'digital';

export function Discover() {
  const { profile } = useAuth();
  const { campaigns, loading, joinCampaign, refetch } = useSellerDiscovery();

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');
  const [modelFilter, setModelFilter] = useState<ModelFilter>('tous');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('tous');
  const [sortBy, setSortBy] = useState<SortOption>('matching');
  const [joining, setJoining] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Categories list with counts
  const categories = useMemo(() => {
    const safeCampaigns = campaigns ?? [];
    const map = new Map<string, number>();
    safeCampaigns.forEach((c) => {
      if (c && c.product_category) {
        map.set(c.product_category, (map.get(c.product_category) ?? 0) + 1);
      }
    });
    return [
      { name: 'Tous', count: safeCampaigns.length },
      ...Array.from(map.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [campaigns]);

  // Filtering + Sorting
  const filteredAndSorted = useMemo(() => {
    const safeCampaigns = campaigns ?? [];
    const list = safeCampaigns.filter((c) => {
      if (!c) return false;
      const matchesCategory = categoryFilter === 'Tous' || c.product_category === categoryFilter;
      const matchesModel =
        modelFilter === 'tous' ||
        (modelFilter === 'commission' && c.model === 'commission') ||
        (modelFilter === 'marge' && c.model === 'marge');
      const matchesFormat =
        formatFilter === 'tous' ||
        (formatFilter === 'physique' && c.product_type !== 'digital') ||
        (formatFilter === 'digital' && c.product_type === 'digital');

      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === '' ||
        (c.product_name?.toLowerCase().includes(q) ?? false) ||
        (c.merchant_name?.toLowerCase().includes(q) ?? false) ||
        (c.product_category?.toLowerCase().includes(q) ?? false) ||
        (c.niche_name?.toLowerCase().includes(q) ?? false);

      return matchesCategory && matchesModel && matchesFormat && matchesQuery;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'gain_desc') return getNetGain(b) - getNetGain(a);
      if (sortBy === 'price_asc') return (a.product_price ?? 0) - (b.product_price ?? 0);
      if (sortBy === 'price_desc') return (b.product_price ?? 0) - (a.product_price ?? 0);
      return (b.match_score ?? 0) - (a.match_score ?? 0);
    });
  }, [campaigns, categoryFilter, modelFilter, formatFilter, query, sortBy]);

  const recommended = useMemo(() => filteredAndSorted.filter((c) => c.match_score >= 80), [filteredAndSorted]);

  // Le strip "Recommandés" n'apparaît qu'en navigation libre (pas de recherche ni filtre catégorie)
  const showRecommended = query.trim() === '' && categoryFilter === 'Tous' && recommended.length > 0;
  const gridCampaigns = useMemo(() => {
    if (!showRecommended) return filteredAndSorted;
    const recIds = new Set(recommended.map((r) => r.campaign_id));
    return filteredAndSorted.filter((c) => !recIds.has(c.campaign_id));
  }, [filteredAndSorted, recommended, showRecommended]);

  async function handleJoin(c: DiscoveryCampaign) {
    setJoining(c.campaign_id);
    haptic('medium');
    const { error } = await joinCampaign(c.campaign_id);
    setJoining(null);
    if (!error) {
      trackEvent('campaign_joined', {
        entityType: 'campaign',
        entityId: c.campaign_id,
        metadata: { match_score: c.match_score, product: c.product_name },
      });
      refetch();
    }
  }

  return (
    <Page
      eyebrow="Marché d'opportunités"
      title="Découvrir les produits"
      description="Trouvez les meilleures offres des boutiques au Sénégal. Partagez ce que vous aimez et recevez vos commissions directement."
    >
      {/* Barre de filtres simplifiée */}
      <div className="mt-5 space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9290a2]">
              <Icon glyph={Search01Icon} size={17} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit, une boutique…"
              className={`${sellerInputClass} pl-10`}
              data-testid="input-seller-search"
            />
          </div>
          <div className="flex items-center justify-between gap-2 lg:justify-start">
            {/* Toggle vue grille/liste */}
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[#f4f3f8] p-1">
              <button
                onClick={() => { haptic('light'); setViewMode('grid'); }}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#9290a2] hover:text-[#514b71]'}`}
                data-testid="button-view-grid"
                aria-label="Vue grille"
              >
                <Icon glyph={GridViewIcon} size={16} />
              </button>
              <button
                onClick={() => { haptic('light'); setViewMode('list'); }}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${viewMode === 'list' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#9290a2] hover:text-[#514b71]'}`}
                data-testid="button-view-list"
                aria-label="Vue liste"
              >
                <Icon glyph={ListViewIcon} size={16} />
              </button>
            </div>
            {/* Bouton filtres avancés */}
            <button
              onClick={() => { haptic('light'); setShowAdvanced(!showAdvanced); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition ${showAdvanced ? 'bg-[#5b49e8] text-white' : 'bg-[#f4f3f8] text-[#67627b] hover:bg-[#e4e1ff] hover:text-[#5b49e8]'}`}
              data-testid="button-advanced-filters"
            >
              <Icon glyph={FilterIcon} size={15} />
              Avancés
            </button>
          </div>
        </div>

        {/* Panneau filtres avancés (dépliable) */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f8f7fc] p-3">
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
              className={`${sellerSelectClass} mt-0 w-auto`}
              data-testid="select-format-filter"
            >
              <option value="tous">Tous les formats</option>
              <option value="physique">Physique</option>
              <option value="digital">Digital</option>
            </select>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value as ModelFilter)}
              className={`${sellerSelectClass} mt-0 w-auto`}
              data-testid="select-model-filter"
            >
              <option value="tous">Tous les modèles</option>
              <option value="commission">Commission %</option>
              <option value="marge">Marge</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`${sellerSelectClass} mt-0 w-auto`}
              data-testid="select-sort-by"
            >
              <option value="matching">Match idéal</option>
              <option value="gain_desc">Gain le plus élevé</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
            {(formatFilter !== 'tous' || modelFilter !== 'tous' || sortBy !== 'matching') && (
              <button
                onClick={() => { haptic('light'); setFormatFilter('tous'); setModelFilter('tous'); setSortBy('matching'); }}
                className="text-xs font-bold text-[#5b49e8] hover:underline"
                data-testid="button-reset-advanced"
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}

        {/* Category Chips with Horizontal Scroll */}
        <div className="merchant-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((c) => {
            const isActive = categoryFilter === c.name;
            return (
              <button
                key={c.name}
                onClick={() => {
                  haptic('light');
                  setCategoryFilter(c.name);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#5b49e8] text-white shadow-sm'
                    : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff] hover:text-[#5b49e8]'
                }`}
                data-testid={`filter-seller-${c.name}`}
              >
                <span>{c.name}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-[#807b98]'
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <SkeletonGrid />
      ) : filteredAndSorted.length === 0 ? (
        <Card className="mt-6 p-8">
          <SellerEmptyState
            glyph={Search01Icon}
            title="Aucun produit ne correspond à vos critères"
            description="Essayez de réinitialiser vos mots-clés ou de choisir une autre catégorie."
            action={
              <Button
                variant="soft"
                onClick={() => {
                  setQuery('');
                  setCategoryFilter('Tous');
                  setModelFilter('tous');
                  setFormatFilter('tous');
                  setSortBy('matching');
                  setShowAdvanced(false);
                }}
              >
                Réinitialiser les filtres
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Strip horizontal : Recommandés (navigation libre uniquement) */}
          {showRecommended && (
            <section className="mt-7">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#efedff] text-[#5b49e8]">
                  <Icon glyph={SparklesIcon} size={15} />
                </span>
                <h3 className="font-[Space_Grotesk] text-base font-bold text-[#292541]">Recommandés pour vous</h3>
              </div>
              <div className="merchant-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {recommended.slice(0, 10).map((c) => (
                  <RecommendedCard key={`rec-${c.campaign_id}`} c={c} joining={joining} onJoin={handleJoin} />
                ))}
              </div>
            </section>
          )}

          {/* Grille principale */}
          {gridCampaigns.length > 0 && (
            <section className="mt-7">
              <div className="flex items-baseline justify-between">
                <h3 className="font-[Space_Grotesk] text-base font-bold text-[#292541]">
                  {showRecommended ? 'Explorer tout' : 'Opportunités'}
                </h3>
                <span className="text-xs font-bold text-[#9290a2]">
                  {gridCampaigns.length} résultat{gridCampaigns.length > 1 ? 's' : ''}
                </span>
              </div>
              {viewMode === 'grid' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gridCampaigns.map((c) => (
                    <CampaignCard key={c.campaign_id} c={c} joining={joining} onJoin={handleJoin} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {gridCampaigns.map((c) => (
                    <CampaignListRow key={c.campaign_id} c={c} joining={joining} onJoin={handleJoin} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </Page>
  );
}

/* ── Carte produit principale ── */
function CampaignCard({
  c,
  joining,
  onJoin,
}: {
  c: DiscoveryCampaign;
  joining: string | null;
  onJoin: (c: DiscoveryCampaign) => void;
}) {
  const netGain = getNetGain(c);
  const imgUrl = getFirstImageUrl(c.product_image_url);
  const isTopMatch = potentialFromScore(c.match_score) === 'Fort';

  return (
    <Card className="flex flex-col overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/seller/product/${c.campaign_id}`} className="relative block aspect-[16/10] bg-[#f4f3f8]">
        <SafeImage
          src={imgUrl}
          alt={c.product_name ?? c.campaign_name}
          className="h-full w-full object-cover"
          iconSize={26}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isTopMatch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#5b49e8] shadow-sm">
              <Icon glyph={SparklesIcon} size={12} /> Top match
            </span>
          )}
          {c.product_type === 'digital' && (
            <span className="inline-flex items-center rounded-full bg-[#292541]/85 px-2.5 py-1 text-[10px] font-bold text-white">
              Digital
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="truncate font-[Space_Grotesk] text-sm font-bold text-[#292541]">
          {c.product_name ?? c.campaign_name}
        </p>
        <p className="mt-0.5 truncate text-xs text-[#9290a2]">
          {c.merchant_name} · {c.product_category ?? 'Divers'}
        </p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9290a2]">Prix</p>
            <p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#292541]">
              {c.product_price ? money(c.product_price) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-[#278e69]">Gain / vente</p>
            <p className="mt-0.5 font-[Space_Grotesk] text-sm font-bold text-[#278e69]">+{money(netGain)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {c.is_joined ? (
            <Link href={`/seller/share/${c.campaign_id}`} className="flex-1">
              <Button variant="success" className="w-full" testId={`share-${c.campaign_id}`}>
                Partager <Icon glyph={ArrowUpRight01Icon} size={13} />
              </Button>
            </Link>
          ) : (
            <Button
              className="flex-1"
              onClick={() => onJoin(c)}
              disabled={joining === c.campaign_id}
              testId={`join-${c.campaign_id}`}
            >
              {joining === c.campaign_id ? '…' : 'Rejoindre'}
            </Button>
          )}
          <Link href={`/seller/product/${c.campaign_id}`}>
            <Button variant="soft" testId={`view-${c.campaign_id}`}>Détails</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

/* ── Carte compacte du strip "Recommandés" ── */
function RecommendedCard({
  c,
  joining,
  onJoin,
}: {
  c: DiscoveryCampaign;
  joining: string | null;
  onJoin: (c: DiscoveryCampaign) => void;
}) {
  const netGain = getNetGain(c);
  const imgUrl = getFirstImageUrl(c.product_image_url);

  return (
    <div className="flex w-[260px] shrink-0 items-center gap-3 rounded-[18px] bg-[#fffefd] p-3 transition hover:shadow-md">
      <Link href={`/seller/product/${c.campaign_id}`} className="shrink-0">
        <SafeImage
          src={imgUrl}
          alt={c.product_name ?? c.campaign_name}
          className="h-14 w-14 rounded-xl object-cover"
          iconSize={20}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#292541]">{c.product_name ?? c.campaign_name}</p>
        <p className="truncate text-[11px] text-[#9290a2]">{c.merchant_name}</p>
        <p className="mt-0.5 text-[11px] font-bold text-[#278e69]">+{money(netGain)} / vente</p>
      </div>
      {c.is_joined ? (
        <Link
          href={`/seller/share/${c.campaign_id}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7faf2] text-[#278e69]"
          data-testid={`share-rec-${c.campaign_id}`}
        >
          <Icon glyph={Tick01Icon} size={15} />
        </Link>
      ) : (
        <button
          onClick={() => onJoin(c)}
          disabled={joining === c.campaign_id}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5b49e8] text-white transition hover:bg-[#4e3bd5] disabled:opacity-50"
          data-testid={`join-rec-${c.campaign_id}`}
          title="Rejoindre"
        >
          <Icon glyph={Add01Icon} size={15} />
        </button>
      )}
    </div>
  );
}

/* ── Squelettes de chargement ── */
function SkeletonGrid() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse overflow-hidden p-0">
          <div className="aspect-[16/10] bg-[#f0eff5]" />
          <div className="space-y-2.5 p-4">
            <div className="h-3.5 w-2/3 rounded-full bg-[#f0eff5]" />
            <div className="h-3 w-1/3 rounded-full bg-[#f0eff5]" />
            <div className="h-9 w-full rounded-xl bg-[#f0eff5]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── Ligne produit en vue liste ── */
function CampaignListRow({
  c,
  joining,
  onJoin,
}: {
  c: DiscoveryCampaign;
  joining: string | null;
  onJoin: (c: DiscoveryCampaign) => void;
}) {
  const netGain = getNetGain(c);
  const imgUrl = getFirstImageUrl(c.product_image_url);
  const isTopMatch = potentialFromScore(c.match_score) === 'Fort';

  return (
    <Card className="flex flex-col gap-3 p-3 transition hover:shadow-md sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <Link href={`/seller/product/${c.campaign_id}`} className="shrink-0">
        <SafeImage
          src={imgUrl}
          alt={c.product_name ?? c.campaign_name}
          className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20"
          iconSize={22}
        />
      </Link>

      <div className="min-w-0 flex-auto sm:flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-[Space_Grotesk] text-sm font-bold text-[#292541]">
            {c.product_name ?? c.campaign_name}
          </p>
          {isTopMatch && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#efedff] px-2 py-0.5 text-[9px] font-bold text-[#5b49e8]">
              <Icon glyph={SparklesIcon} size={10} /> Top
            </span>
          )}
          {c.product_type === 'digital' && (
            <span className="inline-flex shrink-0 rounded-full bg-[#292541] px-2 py-0.5 text-[9px] font-bold text-white">
              Digital
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[#9290a2]">
          {c.merchant_name} · {c.product_category ?? 'Divers'}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#9290a2]">Prix</p>
            <p className="text-xs font-bold text-[#292541]">{c.product_price ? money(c.product_price) : '—'}</p>
          </div>
          <div className="h-8 w-px bg-[#f0eff5]" />
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#278e69]">Gain / vente</p>
            <p className="text-xs font-bold text-[#278e69]">+{money(netGain)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
        {c.is_joined ? (
          <Link href={`/seller/share/${c.campaign_id}`} className="flex-1 sm:flex-none">
            <Button variant="success" className="w-full sm:w-auto" testId={`share-list-${c.campaign_id}`}>
              Partager <Icon glyph={ArrowUpRight01Icon} size={13} />
            </Button>
          </Link>
        ) : (
          <Button
            className="flex-1 sm:w-auto"
            onClick={() => onJoin(c)}
            disabled={joining === c.campaign_id}
            testId={`join-list-${c.campaign_id}`}
          >
            {joining === c.campaign_id ? '…' : 'Rejoindre'}
          </Button>
        )}
        <Link href={`/seller/product/${c.campaign_id}`} className="flex-1 sm:flex-none">
          <Button variant="soft" className="w-full sm:w-auto" testId={`view-list-${c.campaign_id}`}>Détails</Button>
        </Link>
      </div>
    </Card>
  );
}

