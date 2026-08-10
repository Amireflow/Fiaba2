import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  ArrowUpRight01Icon,
  FilterIcon,
  Search01Icon,
  SparklesIcon,
  Store01Icon,
  Tick01Icon,
  Wallet01Icon,
  Fire02Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useSellerDiscovery, type DiscoveryCampaign } from '@/hooks/use-seller-discovery';
import { trackEvent } from '@/lib/analytics';
import { getFirstImageUrl } from '@/lib/storage-upload';
import {
  PotentialBadge,
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerEmptyState,
  SellerPage as Page,
  sellerInputClass,
  sellerSelectClass,
} from '../components/seller-ui';

const potentialFromScore = (score: number): 'Fort' | 'Bon' | 'Moyen' =>
  score >= 80 ? 'Fort' : score >= 40 ? 'Bon' : 'Moyen';

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

  // Helper to compute net creator gain per sale
  const getNetGain = (c: DiscoveryCampaign) => {
    if (c.commission_type === 'fixed' || c.model === 'marge') {
      return c.commission;
    }
    return Math.round(((c.product_price ?? 0) * c.commission) / 100);
  };

  // Categories list with counts
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    campaigns.forEach((c) => {
      if (c.product_category) {
        map.set(c.product_category, (map.get(c.product_category) ?? 0) + 1);
      }
    });
    return [
      { name: 'Tous', count: campaigns.length },
      ...Array.from(map.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [campaigns]);

  // Filtering + Sorting
  const filteredAndSorted = useMemo(() => {
    let list = campaigns.filter((c) => {
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
        c.merchant_name.toLowerCase().includes(q) ||
        (c.product_category?.toLowerCase().includes(q) ?? false) ||
        (c.niche_name?.toLowerCase().includes(q) ?? false);

      return matchesCategory && matchesModel && matchesFormat && matchesQuery;
    });

    return list.sort((a, b) => {
      if (sortBy === 'gain_desc') return getNetGain(b) - getNetGain(a);
      if (sortBy === 'price_asc') return (a.product_price ?? 0) - (b.product_price ?? 0);
      if (sortBy === 'price_desc') return (b.product_price ?? 0) - (a.product_price ?? 0);
      return b.match_score - a.match_score;
    });
  }, [campaigns, categoryFilter, modelFilter, formatFilter, query, sortBy]);

  const recommended = useMemo(() => filteredAndSorted.filter((c) => c.match_score >= 80), [filteredAndSorted]);
  const topGains = useMemo(() => filteredAndSorted.filter((c) => getNetGain(c) >= 2000), [filteredAndSorted]);
  const remaining = useMemo(() => {
    const recIds = new Set(recommended.map((r) => r.campaign_id));
    return filteredAndSorted.filter((c) => !recIds.has(c.campaign_id));
  }, [filteredAndSorted, recommended]);

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
      {/* Banner / Value Proposition Header */}
      <Card className="mt-5 bg-gradient-to-r from-[#5b49e8] via-[#6d5cf0] to-[#8870f4] text-white shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wide text-white">
              <Icon glyph={SparklesIcon} size={14} /> Opportunités Vérifiées · Dakar & Régions
            </span>
            <h2 className="mt-3 font-[Space_Grotesk] text-xl font-bold tracking-[-.03em] sm:text-2xl">
              Trouvez des produits adaptés à votre audience
            </h2>
            <p className="mt-1 max-w-xl text-xs text-[#e0dbff] sm:text-sm">
              Rejoignez des campagnes en 1 clic, obtenez votre lien de suivi et recevez vos commissions sur Wave ou Orange Money dès la livraison.
            </p>
          </div>
          <div className="shrink-0">
            <Link href="/seller/campaigns">
              <Button variant="white" className="w-full sm:w-auto" testId="button-banner-my-campaigns">
                Mes campagnes rejointes <Icon glyph={ArrowUpRight01Icon} size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Search & Multi-filter Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9290a2]">
            <Icon glyph={Search01Icon} size={18} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par produit, marque ou mot-clé…"
            className={`${sellerInputClass} pl-10`}
            data-testid="input-seller-search"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Format filter */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
            className={sellerSelectClass}
            data-testid="select-format-filter"
          >
            <option value="tous">Tous les formats</option>
            <option value="physique">📦 Produits Physiques</option>
            <option value="digital">⚡ Produits Digitaux</option>
          </select>

          {/* Rémunération filter */}
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value as ModelFilter)}
            className={sellerSelectClass}
            data-testid="select-model-filter"
          >
            <option value="tous">Tous les modèles</option>
            <option value="commission">Commission %</option>
            <option value="marge">Marge Vendeur</option>
          </select>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={sellerSelectClass}
            data-testid="select-sort-by"
          >
            <option value="matching">Match idéal</option>
            <option value="gain_desc">Gain le plus élevé</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {/* Category Chips with Horizontal Scroll */}
      <div className="merchant-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
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
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white text-[#807b98]'
                }`}
              >
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {loading ? (
        <Card className="mt-6 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
            <p className="text-xs font-bold text-[#77738a]">Recherche des opportunités adaptées à vos niches…</p>
          </div>
        </Card>
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
                }}
              >
                Réinitialiser les filtres
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Section 1: Recommandés pour vous (High Match Score) */}
          {recommended.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#efedff] text-[#5b49e8]">
                    <Icon glyph={SparklesIcon} size={16} />
                  </span>
                  <div>
                    <h3 className="font-[Space_Grotesk] text-base font-bold text-[#292541]">Recommandés pour vous</h3>
                    <p className="text-xs text-[#8c889f]">Produits à fort potentiel alignés avec vos niches et votre audience.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {recommended.map((c) => {
                  const potential = potentialFromScore(c.match_score);
                  const netGain = getNetGain(c);
                  const imgUrl = getFirstImageUrl(c.product_image_url);

                  return (
                    <Card key={c.campaign_id} className="flex flex-col justify-between transition hover:shadow-md">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-[Space_Grotesk] text-base font-bold text-[#292541]">
                              {c.product_name ?? c.campaign_name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#9290a2]">
                              {c.merchant_name} · {c.product_category ?? 'Divers'}
                            </p>
                          </div>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={c.product_name ?? ''}
                              className="h-14 w-14 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                              <Icon glyph={Store01Icon} size={22} />
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <PotentialBadge potential={potential} />
                          {c.product_type === 'digital' && <SellerBadge tone="mint">⚡ Digital · Instantané</SellerBadge>}
                          {c.niche_name && <SellerBadge tone="violet">{c.niche_name}</SellerBadge>}
                        </div>

                        {/* Gains Highlight Box */}
                        <div className="mt-4 rounded-2xl bg-[#faf9fe] p-3">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#9290a2]">Prix public</p>
                              <p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#292541]">
                                {c.product_price ? money(c.product_price) : '—'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wider text-[#278e69]">Votre gain par vente</p>
                              <strong className="mt-0.5 block font-[Space_Grotesk] text-base font-bold text-[#278e69]">
                                +{money(netGain)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 flex items-center gap-2 pt-2">
                        <Link href={`/seller/product/${c.campaign_id}`} className="flex-1">
                          <Button variant="soft" className="w-full" testId={`view-${c.campaign_id}`}>
                            Détails <Icon glyph={ArrowUpRight01Icon} size={14} />
                          </Button>
                        </Link>
                        {c.is_joined ? (
                          <Link href={`/seller/share/${c.campaign_id}`} className="flex-1">
                            <Button variant="success" className="w-full" testId={`share-${c.campaign_id}`}>
                              Partager <Icon glyph={Tick01Icon} size={14} />
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="flex-1"
                            onClick={() => handleJoin(c)}
                            disabled={joining === c.campaign_id}
                            testId={`join-${c.campaign_id}`}
                          >
                            {joining === c.campaign_id ? '…' : 'Rejoindre'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Tops Commissions & Marges Elevées */}
          {topGains.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fff4de] text-[#ac741e]">
                  <Icon glyph={Fire02Icon} size={16} />
                </span>
                <div>
                  <h3 className="font-[Space_Grotesk] text-base font-bold text-[#292541]">Forts revenus par vente</h3>
                  <p className="text-xs text-[#8c889f]">Produits avec les commissions et marges les plus rentables.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topGains.slice(0, 3).map((c) => {
                  const netGain = getNetGain(c);
                  const imgUrl = getFirstImageUrl(c.product_image_url);

                  return (
                    <Card key={`top-${c.campaign_id}`} className="flex flex-col justify-between transition hover:shadow-md">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-[Space_Grotesk] text-sm font-bold text-[#292541]">
                              {c.product_name ?? c.campaign_name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#9290a2]">{c.merchant_name}</p>
                          </div>
                          {imgUrl ? (
                            <img src={imgUrl} alt={c.product_name ?? ''} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                          ) : (
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                              <Icon glyph={Store01Icon} size={18} />
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#e7faf2] px-3 py-2 text-xs text-[#278e69]">
                          <span className="font-bold">Gain créateur</span>
                          <strong className="font-[Space_Grotesk] text-sm font-bold">+{money(netGain)} / vente</strong>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Link href={`/seller/product/${c.campaign_id}`} className="flex-1">
                          <Button variant="ghost" className="w-full" testId={`view-top-${c.campaign_id}`}>
                            Aperçu
                          </Button>
                        </Link>
                        {c.is_joined ? (
                          <SellerBadge tone="mint" className="py-2 inline-flex items-center gap-1">Rejointe <Icon glyph={Tick01Icon} size={12} /></SellerBadge>
                        ) : (
                          <Button variant="soft" className="flex-1" onClick={() => handleJoin(c)} disabled={joining === c.campaign_id}>
                            {joining === c.campaign_id ? '…' : 'Rejoindre'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Toutes les Opportunités */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-[Space_Grotesk] text-base font-bold text-[#292541]">
                Toutes les opportunités ({filteredAndSorted.length})
              </h3>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSorted.map((c) => {
                const potential = potentialFromScore(c.match_score);
                const netGain = getNetGain(c);
                const imgUrl = getFirstImageUrl(c.product_image_url);

                return (
                  <Card key={`all-${c.campaign_id}`} className="flex flex-col justify-between transition hover:shadow-md">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-[Space_Grotesk] text-sm font-bold text-[#292541]">
                            {c.product_name ?? c.campaign_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#9290a2]">
                            {c.merchant_name} · {c.product_category ?? 'Divers'}
                          </p>
                        </div>
                        {imgUrl ? (
                          <img src={imgUrl} alt={c.product_name ?? ''} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                            <Icon glyph={Store01Icon} size={18} />
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[#9290a2]">Prix: <strong className="font-[Space_Grotesk] text-[#292541]">{c.product_price ? money(c.product_price) : '—'}</strong></span>
                        <span className="font-bold text-[#278e69]">+{money(netGain)} / vente</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 pt-2">
                      <Link href={`/seller/product/${c.campaign_id}`} className="flex-1">
                        <Button variant="ghost" className="w-full" testId={`view-all-${c.campaign_id}`}>
                          Détails
                        </Button>
                      </Link>
                      {c.is_joined ? (
                        <Link href={`/seller/share/${c.campaign_id}`} className="flex-1">
                          <Button variant="success" className="w-full" testId={`share-all-${c.campaign_id}`}>
                            Partager <Icon glyph={ArrowUpRight01Icon} size={13} />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="soft"
                          className="flex-1"
                          onClick={() => handleJoin(c)}
                          disabled={joining === c.campaign_id}
                          testId={`join-all-${c.campaign_id}`}
                        >
                          {joining === c.campaign_id ? '…' : 'Rejoindre'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

