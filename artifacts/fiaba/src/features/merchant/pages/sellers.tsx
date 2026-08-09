import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Copy01Icon, Search01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { money, haptic } from '@/lib/utils';
import {
  Badge,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ScrollTable,
  inputClass,
} from '../components/merchant-ui';

type SellerRow = {
  id: string;
  display_name: string;
  status: string;
  followers: number;
  phone: string | null;
  joined_at: string | null;
  invited_at: string;
  city: string | null;
  sales: number;
  revenue: number;
};

const statusLabel: Record<string, 'Actif' | 'Invité' | 'En attente'> = {
  actif: 'Actif',
  invite: 'Invité',
  suspendu: 'En attente',
};

const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k abonnés`;
  return `${n} abonnés`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Sellers() {
  const { toast } = useToast();
  const { merchantId } = useAuth();
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Tous');

  const filters = ['Tous', 'Actif', 'Invité', 'En attente'] as const;

  useEffect(() => {
    async function loadData() {
      if (!merchantId) {
        setLoading(false);
        return;
      }

      // Fetch sellers for this merchant
      const { data: sellerRows } = await supabase
        .from('sellers')
        .select('id, display_name, status, followers, phone, joined_at, invited_at, profile_id')
        .eq('merchant_id', merchantId);

      const rows = (sellerRows as { id: string; display_name: string; status: string; followers: number; phone: string | null; joined_at: string | null; invited_at: string; profile_id: string | null }[] | null) ?? [];
      if (rows.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      // Fetch profile cities
      const profileIds = rows.map((r) => r.profile_id).filter(Boolean) as string[];
      let cityMap = new Map<string, string>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, city')
          .in('id', profileIds);
        ((profiles as { id: string; city: string | null }[] | null) ?? []).forEach((p) => {
          cityMap.set(p.id, p.city ?? 'Dakar');
        });
      }

      // Fetch commissions aggregated per seller
      const sellerIds = rows.map((r) => r.id);
      const { data: commissions } = await supabase
        .from('commissions')
        .select('seller_id, amount')
        .in('seller_id', sellerIds);

      const commissionAgg = new Map<string, { sales: number; revenue: number }>();
      ((commissions as { seller_id: string; amount: number }[] | null) ?? []).forEach((c) => {
        const agg = commissionAgg.get(c.seller_id) ?? { sales: 0, revenue: 0 };
        agg.sales += 1;
        agg.revenue += c.amount;
        commissionAgg.set(c.seller_id, agg);
      });

      const enriched: SellerRow[] = rows.map((r) => {
        const agg = commissionAgg.get(r.id) ?? { sales: 0, revenue: 0 };
        return {
          id: r.id,
          display_name: r.display_name,
          status: r.status,
          followers: r.followers ?? 0,
          phone: r.phone,
          joined_at: r.joined_at,
          invited_at: r.invited_at,
          city: r.profile_id ? (cityMap.get(r.profile_id) ?? 'Dakar') : 'Dakar',
          sales: agg.sales,
          revenue: agg.revenue,
        };
      });

      setSellers(enriched);
      setLoading(false);
    }
    loadData();
  }, [merchantId]);

  const filtered = sellers.filter((s) => {
    const label = statusLabel[s.status] ?? 'En attente';
    const matchesFilter = filter === 'Tous' || label === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || s.display_name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  function copyInviteLink() {
    haptic('light');
    const link = `https://fiaba.sn/rejoindre/${merchantId ?? ''}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    toast({ title: "Lien d'invitation copié", description: 'Partagez-le avec vos vendeurs sur WhatsApp.' });
  }

  const activeCount = sellers.filter((s) => s.status === 'actif').length;
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
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState glyph={UserGroupIcon} title="Aucun vendeur trouvé" description="Modifiez votre recherche ou invitez de nouveaux vendeurs." action={<Button onClick={copyInviteLink}>Inviter un vendeur</Button>} />
        ) : (
          <ScrollTable minWidth={560} testId="scroll-sellers">
            <div className="divide-y divide-[#f1eef7]">
              {filtered.map((s) => {
                const label = statusLabel[s.status] ?? 'En attente';
                return (
                  <Link key={s.id} href={`/merchant/sellers/${s.id}`} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#faf9fd]" data-testid={`view-${s.id}`}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5140d4]">{getInitials(s.display_name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#292541]">{s.display_name}</p>
                      <p className="mt-0.5 truncate text-xs text-[#9290a2]">{s.city} · {formatFollowers(s.followers)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {s.status === 'actif' ? (
                        <>
                          <p className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">{s.sales} ventes</p>
                          <p className="text-[10px] text-[#9290a2]">{money(s.revenue)}</p>
                        </>
                      ) : (
                        <Badge tone={label === 'Invité' ? 'violet' : 'amber'}>{label}</Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollTable>
        )}
      </Card>
    </Page>
  );
}
