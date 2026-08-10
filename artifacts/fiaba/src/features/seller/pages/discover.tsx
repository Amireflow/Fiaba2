import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight01Icon, Chart02Icon, Search01Icon, SparklesIcon, Store01Icon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money, haptic } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useSellerDiscovery, type DiscoveryCampaign } from '@/hooks/use-seller-discovery';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import { getFirstImageUrl } from '@/lib/storage-upload';
import {
  PotentialBadge,
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerEmptyState,
  SellerPage as Page,
  SellerStat,
  sellerInputClass,
} from '../components/seller-ui';

const potentialFromScore = (score: number): 'Fort' | 'Bon' | 'Moyen' =>
  score >= 80 ? 'Fort' : score >= 40 ? 'Bon' : 'Moyen';

export function Discover() {
  const { profile } = useAuth();
  const { campaigns, loading, sellerId, joinCampaign } = useSellerDiscovery();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Tous');
  const [joining, setJoining] = useState<string | null>(null);

  // Extract unique categories from campaigns
  const categories = useMemo(() => {
    const cats = new Set<string>();
    campaigns.forEach((c) => { if (c.product_category) cats.add(c.product_category); });
    return ['Tous', ...Array.from(cats)];
  }, [campaigns]);

  const filtered = campaigns.filter((c) => {
    const matchesFilter = filter === 'Tous' || c.product_category === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' ||
      (c.product_name?.toLowerCase().includes(q) ?? false) ||
      c.merchant_name.toLowerCase().includes(q) ||
      (c.product_category?.toLowerCase().includes(q) ?? false);
    return matchesFilter && matchesQuery;
  });

  const recommended = filtered.filter((c) => c.match_score >= 80);
  const others = filtered.filter((c) => c.match_score < 80);

  async function handleJoin(c: DiscoveryCampaign) {
    setJoining(c.campaign_id);
    const { error } = await joinCampaign(c.campaign_id);
    setJoining(null);
    if (error) {
      haptic('error');
    } else {
      // Analytics: campaign_joined (CDC §25)
      trackEvent('campaign_joined', {
        entityType: 'campaign',
        entityId: c.campaign_id,
        metadata: { match_score: c.match_score, product: c.product_name },
      });
    }
  }

  // Load seller stats
  const [stats, setStats] = useState({ available: 0, activeCampaigns: 0, reputation: 50 });

  useMemo(() => {
    async function loadStats() {
      if (!profile || !sellerId) return;
      // Count commissions
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount, status')
        .eq('seller_id', sellerId);
      const available = ((commissions as { amount: number; status: string }[] | null) ?? [])
        .filter((c) => c.status === 'available')
        .reduce((sum, c) => sum + c.amount, 0);

      // Count active campaigns
      const { count } = await supabase
        .from('campaign_sellers')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);

      // Get reputation from seller_profiles
      const { data: sp } = await supabase
        .from('seller_profiles')
        .select('reputation')
        .eq('profile_id', profile.id)
        .single();

      setStats({
        available,
        activeCampaigns: count ?? 0,
        reputation: (sp as { reputation: number } | null)?.reputation ?? 50,
      });
    }
    loadStats();
  }, [profile, sellerId]);

  return (
    <Page
      eyebrow="Ce qui matche avec vous"
      title="Découvrir"
      description="Les produits et campagnes qui correspondent à vos niches. Rejoignez, partagez, gagnez."
    >
      {/* Stats (2 par ligne sur mobile) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <SellerStat label="Revenus disponibles" value={money(stats.available)} change="" glyph={Chart02Icon} tone="mint" />
        <SellerStat label="Campagnes actives" value={String(stats.activeCampaigns)} change="" glyph={Store01Icon} tone="violet" />
        <div className="col-span-2 sm:col-span-1">
          <SellerStat label="Réputation" value={`${stats.reputation}%`} change="" glyph={UserGroupIcon} tone="amber" />
        </div>
      </div>

      {/* Search + filter */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit ou une marque…" className={`${sellerInputClass} pl-10`} data-testid="input-seller-search" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((n) => (
          <button key={n} onClick={() => { haptic('light'); setFilter(n); }} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === n ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-seller-${n}`}>{n}</button>
        ))}
      </div>

      {loading ? (
        <Card className="mt-6">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : (
        <>
          {/* Recommended (high match score) */}
          {recommended.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <span className="text-[#5b49e8]"><Icon glyph={SparklesIcon} size={18} /></span>
                <p className="text-sm font-bold text-[#292541]">Recommandés pour vous</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {recommended.map((c) => {
                  const potential = potentialFromScore(c.match_score);
                  return (
                    <Card key={c.campaign_id} className="flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{c.product_name ?? c.campaign_name}</p>
                          <p className="mt-0.5 text-xs text-[#9290a2]">{c.merchant_name} · {c.product_category ?? 'Divers'}</p>
                        </div>
                        {getFirstImageUrl(c.product_image_url) ? (
                          <img src={getFirstImageUrl(c.product_image_url)!} alt={c.product_name ?? ''} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={22} /></span>
                        )}
                      </div>
                      <div className="mt-4"><PotentialBadge potential={potential} /></div>
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8f7fc] p-3 text-xs">
                        <div><p className="text-[10px] text-[#9290a2]">Prix client</p><p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#292541]">{c.product_price ? money(c.product_price) : '—'}</p></div>
                        <div><p className="text-[10px] text-[#9290a2]">{c.model === 'commission' ? 'Commission' : 'Marge suggérée'}</p><p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#278e69]">{c.commission_type === 'fixed' ? money(c.commission) : `${c.commission}%`}</p></div>
                      </div>
                      {c.niche_name && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <SellerBadge tone="violet">{c.niche_name}</SellerBadge>
                        </div>
                      )}
                      <div className="mt-5 flex items-center gap-2">
                        <Link href={`/seller/product/${c.campaign_id}`}>
                          <Button variant="soft" testId={`view-${c.campaign_id}`}>Voir le détail <Icon glyph={ArrowUpRight01Icon} size={14} /></Button>
                        </Link>
                        {c.is_joined ? (
                          <Link href="/seller/campaigns"><Button variant="success" testId={`joined-${c.campaign_id}`}>Rejointe <Icon glyph={Tick01Icon} size={14} /></Button></Link>
                        ) : (
                          <Button onClick={() => handleJoin(c)} disabled={joining === c.campaign_id} testId={`join-${c.campaign_id}`}>
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

          {/* Others */}
          {others.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-bold text-[#292541]">Autres opportunités</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((c) => {
                  const potential = potentialFromScore(c.match_score);
                  return (
                    <Card key={c.campaign_id} className="flex flex-col">
                      <p className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">{c.product_name ?? c.campaign_name}</p>
                      <p className="mt-0.5 text-xs text-[#9290a2]">{c.merchant_name} · {c.product_category ?? 'Divers'}</p>
                      <div className="mt-3"><PotentialBadge potential={potential} /></div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-[Space_Grotesk] font-bold text-[#292541]">{c.product_price ? money(c.product_price) : '—'}</span>
                        <span className="font-bold text-[#278e69]">{c.commission_type === 'fixed' ? money(c.commission) : `${c.commission}%`}</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Link href={`/seller/product/${c.campaign_id}`}>
                          <Button variant="ghost" testId={`view-other-${c.campaign_id}`}>Détail</Button>
                        </Link>
                        {c.is_joined ? (
                          <SellerBadge tone="mint">Rejointe <Icon glyph={Tick01Icon} size={12} /></SellerBadge>
                        ) : (
                          <Button variant="soft" onClick={() => handleJoin(c)} disabled={joining === c.campaign_id} testId={`join-other-${c.campaign_id}`}>
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

          {filtered.length === 0 && !loading && (
            <Card className="mt-6">
              <SellerEmptyState glyph={Search01Icon} title="Aucune opportunité trouvée" description="Modifiez votre recherche ou changez de catégorie pour découvrir de nouveaux produits." />
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
