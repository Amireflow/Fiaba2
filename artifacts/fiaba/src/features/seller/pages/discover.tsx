import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight01Icon, Chart02Icon, Search01Icon, SparklesIcon, Store01Icon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
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
import { seedOpportunities, seedSellerCampaigns } from '@/config/seller-seeds';
import type { Opportunity, SellerNiche } from '@/types/entities';

const niches: (SellerNiche | 'Tous')[] = ['Tous', 'Beauté', 'Mode', 'Maison', 'Épicerie', 'Tech', 'Sport'];

const potentialTone = (p: Opportunity['potential']): 'mint' | 'violet' | 'amber' => (p === 'Fort' ? 'mint' : p === 'Bon' ? 'violet' : 'amber');

export function Discover() {
  const [opportunities] = useState<Opportunity[]>(() => read('opportunities', seedOpportunities));
  const [joined, setJoined] = useState<string[]>(() => read('seller-joined', seedSellerCampaigns.map((c) => c.campaignId)));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Tous');

  const filtered = opportunities.filter((o) => {
    const matchesFilter = filter === 'Tous' || o.category === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || o.productName.toLowerCase().includes(q) || o.merchantName.toLowerCase().includes(q) || o.category.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const recommended = filtered.filter((o) => o.potential === 'Fort');
  const others = filtered.filter((o) => o.potential !== 'Fort');

  function joinCampaign(op: Opportunity) {
    if (joined.includes(op.campaignId)) return;
    const updated = [...joined, op.campaignId];
    setJoined(updated);
    write('seller-joined', updated);
  }

  const totalEarnings = read('seller-earnings', { available: 20500, pending: 5775, cancelled: 4275, total: 30550 }).available;
  const activeCampaigns = joined.length;

  return (
    <Page
      eyebrow="Ce qui matche avec vous"
      title="Découvrir"
      description="Les produits et campagnes qui correspondent à vos niches. Rejoignez, partagez, gagnez."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SellerStat label="Revenus disponibles" value={money(totalEarnings)} change="+12%" glyph={Chart02Icon} tone="mint" />
        <SellerStat label="Campagnes actives" value={String(activeCampaigns)} change="+1" glyph={Store01Icon} tone="violet" />
        <SellerStat label="Réputation" value="82%" change="+4 cette semaine" glyph={UserGroupIcon} tone="amber" />
      </div>

      {/* Search + filter */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit ou une marque…" className={`${sellerInputClass} pl-10`} data-testid="input-seller-search" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {niches.map((n) => (
          <button key={n} onClick={() => setFilter(n)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === n ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-seller-${n}`}>{n}</button>
        ))}
      </div>

      {/* Recommended (Fort potentiel) */}
      {recommended.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-[#5b49e8]"><Icon glyph={SparklesIcon} size={18} /></span>
            <p className="text-sm font-bold text-[#292541]">Recommandés pour vous</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recommended.map((op) => {
              const isJoined = joined.includes(op.campaignId);
              return (
                <Card key={op.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-[Space_Grotesk] text-base font-bold text-[#292541]">{op.productName}</p>
                      <p className="mt-0.5 text-xs text-[#9290a2]">{op.merchantName} · {op.category}</p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={22} /></span>
                  </div>
                  <div className="mt-4"><PotentialBadge potential={op.potential} /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8f7fc] p-3 text-xs">
                    <div><p className="text-[10px] text-[#9290a2]">Prix client</p><p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#292541]">{money(op.price)}</p></div>
                    <div><p className="text-[10px] text-[#9290a2]">{op.model === 'Commission' ? 'Commission' : 'Marge suggérée'}</p><p className="mt-0.5 font-[Space_Grotesk] font-bold text-[#278e69]">{op.commission}%</p></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {op.zones.map((z) => <SellerBadge key={z} tone="slate">{z}</SellerBadge>)}
                  </div>
                  <div className="mt-5 flex items-center gap-2">
                    <Link href={`/seller/product/${op.id}`}>
                      <Button variant="soft" testId={`view-${op.id}`}>Voir le détail <Icon glyph={ArrowUpRight01Icon} size={14} /></Button>
                    </Link>
                    {isJoined ? (
                      <Link href="/seller/campaigns"><Button variant="success" testId={`joined-${op.id}`}>Rejointe <Icon glyph={Tick01Icon} size={14} /></Button></Link>
                    ) : (
                      <Button onClick={() => joinCampaign(op)} testId={`join-${op.id}`}>Rejoindre</Button>
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
            {others.map((op) => {
              const isJoined = joined.includes(op.campaignId);
              return (
                <Card key={op.id} className="flex flex-col">
                  <p className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">{op.productName}</p>
                  <p className="mt-0.5 text-xs text-[#9290a2]">{op.merchantName} · {op.category}</p>
                  <div className="mt-3"><PotentialBadge potential={op.potential} /></div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(op.price)}</span>
                    <span className="font-bold text-[#278e69]">{op.commission}%</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/seller/product/${op.id}`}>
                      <Button variant="ghost" testId={`view-other-${op.id}`}>Détail</Button>
                    </Link>
                    {isJoined ? (
                      <SellerBadge tone="mint">Rejointe <Icon glyph={Tick01Icon} size={12} /></SellerBadge>
                    ) : (
                      <Button variant="soft" onClick={() => joinCampaign(op)} testId={`join-other-${op.id}`}>Rejoindre</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <Card className="mt-6">
          <SellerEmptyState glyph={Search01Icon} title="Aucune opportunité trouvée" description="Modifiez votre recherche ou changez de catégorie pour découvrir de nouveaux produits." />
        </Card>
      )}
    </Page>
  );
}
