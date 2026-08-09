import { useState } from 'react';
import { Link } from 'wouter';
import { Copy01Icon, Search01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Badge,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ScrollTable,
  inputClass,
} from '../components/merchant-ui';

type Seller = {
  id: string;
  name: string;
  city: string;
  followers: string;
  category: string;
  status: 'Actif' | 'Invité' | 'En attente';
  sales: number;
  revenue: number;
  joined: string;
};

const seedSellers: Seller[] = [
  { id: 's-1', name: 'Marième Fall', city: 'Dakar', followers: '12,4k abonnés', category: 'Beauté & soin', status: 'Actif', sales: 42, revenue: 42500, joined: '15 mars 2024' },
  { id: 's-2', name: 'Ndeye Kébé', city: 'Rufisque', followers: '8,2k abonnés', category: 'Maison & famille', status: 'Actif', sales: 31, revenue: 31200, joined: '22 mars 2024' },
  { id: 's-3', name: 'Saliou Kane', city: 'Thiès', followers: '5,8k abonnés', category: 'Mode locale', status: 'Actif', sales: 24, revenue: 24800, joined: '3 avril 2024' },
  { id: 's-4', name: 'Aminata Seck', city: 'Dakar', followers: '3,1k abonnés', category: 'Beauté & soin', status: 'Invité', sales: 0, revenue: 0, joined: '—' },
  { id: 's-5', name: 'Ousmane Diop', city: 'Pikine', followers: '6,5k abonnés', category: 'Épicerie', status: 'En attente', sales: 0, revenue: 0, joined: '—' },
];

const recommended: Seller[] = [
  { id: 'r-1', name: 'Fatima Sow', city: 'Dakar', followers: '15,2k abonnés', category: 'Beauté & soin', status: 'Invité', sales: 0, revenue: 0, joined: '—' },
  { id: 'r-2', name: 'Cheikh Ndiaye', city: 'Mbour', followers: '9,7k abonnés', category: 'Mode locale', status: 'Invité', sales: 0, revenue: 0, joined: '—' },
];

const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export function Sellers() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>(() => read('sellers', seedSellers));
  const [invited, setInvited] = useState<string[]>(() => read('invites', []));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Tous');

  const filters = ['Tous', 'Actif', 'Invité', 'En attente'] as const;

  const filtered = sellers.filter((s) => {
    const matchesFilter = filter === 'Tous' || s.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  function invite(seller: Seller) {
    if (invited.includes(seller.name)) return;
    const updated = [...invited, seller.name];
    setInvited(updated);
    write('invites', updated);
    const updatedSellers = sellers.map((s) => (s.id === seller.id ? { ...s, status: 'Invité' as const } : s));
    setSellers(updatedSellers);
    write('sellers', updatedSellers);
    toast({ title: `${seller.name} invité`, description: 'Une notification lui a été envoyée.' });
  }

  function copyInviteLink() {
    const link = 'https://fiaba.sn/rejoindre/maison-ndar';
    navigator.clipboard?.writeText(link).catch(() => {});
    toast({ title: "Lien d'invitation copié", description: 'Partagez-le avec vos vendeurs sur WhatsApp.' });
  }

  const activeCount = sellers.filter((s) => s.status === 'Actif').length;
  const totalSales = sellers.reduce((sum, s) => sum + s.sales, 0);
  const totalRevenue = sellers.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <Page
      eyebrow="Votre force de vente"
      title="Vendeurs"
      description="Les bonnes personnes ne sont pas toujours les plus visibles. Retrouvez ici celles qui savent créer de la confiance."
      action={<Button onClick={copyInviteLink} testId="button-invite-link">Inviter un vendeur <Icon glyph={Copy01Icon} size={15} /></Button>}
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vendeurs actifs</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{activeCount}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ventes générées</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{totalSales}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">CA réseau</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(totalRevenue)}</p></Card>
      </div>

      {/* Search + filter */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un vendeur…" className={`${inputClass} pl-10`} data-testid="input-search" />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-${f}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Sellers list */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <EmptyState glyph={UserGroupIcon} title="Aucun vendeur trouvé" description="Modifiez votre recherche ou invitez de nouveaux vendeurs." action={<Button onClick={copyInviteLink}>Inviter un vendeur</Button>} />
        ) : (
          <ScrollTable minWidth={560} testId="scroll-sellers">
            <div className="divide-y divide-[#f1eef7]">
              {filtered.map((s) => (
                <Link key={s.id} href={`/merchant/sellers/${s.id}`} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#faf9fd]" data-testid={`view-${s.id}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5140d4]">{getInitials(s.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#292541]">{s.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#9290a2]">{s.city} · {s.followers} · {s.category}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {s.status === 'Actif' ? (
                      <>
                        <p className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">{s.sales} ventes</p>
                        <p className="text-[10px] text-[#9290a2]">{money(s.revenue)}</p>
                      </>
                    ) : (
                      <Badge tone={s.status === 'Invité' ? 'violet' : 'amber'}>{s.status}</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </ScrollTable>
        )}
      </Card>

      {/* Recommended */}
      <Card className="mt-5">
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-bold text-[#292541]">Profils recommandés</p><p className="mt-1 text-[11px] text-[#9290a2]">Choisis pour la qualité de leur communauté.</p></div>
          <Badge>{recommended.length} nouveaux</Badge>
        </div>
        <div className="mt-4 divide-y divide-[#f1eef7]">
          {recommended.map((s) => {
            const isInvited = invited.includes(s.name);
            return (
              <div key={s.id} className="flex items-center gap-3 py-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5140d4]">{getInitials(s.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#292541]">{s.name}</p>
                  <p className="mt-0.5 text-xs text-[#9290a2]">{s.city} · {s.followers} · {s.category}</p>
                </div>
                {isInvited ? <Badge tone="mint">Invité</Badge> : <Button variant="soft" onClick={() => invite(s)} testId={`invite-${s.id}`}>Inviter</Button>}
              </div>
            );
          })}
        </div>
      </Card>
    </Page>
  );
}
