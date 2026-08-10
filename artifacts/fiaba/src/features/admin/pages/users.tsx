import { useState, useEffect } from 'react';
import { Search01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
  TrustScore,
  adminInputClass,
} from '../components/admin-ui';
import type { AdminUser, VerificationStatus } from '@/types/entities';

type ProfileRow = {
  id: string;
  role: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  verification_status: string;
  trust_score: number;
  created_at: string;
};

type UserStats = {
  salesCount: number;
  volume: number;
  disputes: number;
};

const roleTone = (role: string) => (role === 'marchand' ? 'violet' : role === 'vendeur' ? 'mint' : 'amber');
const statusTone = (status: string) => (status === 'verified' ? 'mint' : status === 'pending' ? 'amber' : 'rose');
const getInitials = (name: string) => (name || 'U').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export function AdminUsers() {
  const { toast } = useToast();
  const [rawProfiles, setRawProfiles] = useState<ProfileRow[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const roles = ['Tous', 'marchand', 'vendeur', 'admin'] as const;

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. Fetch profiles, sellers, merchants, orders, disputes in parallel
      const [profRes, sellerRes, merchRes, orderRes, disputeRes] = await Promise.all([
        supabase.from('profiles').select('id, role, full_name, phone, email, city, verification_status, trust_score, created_at').order('created_at', { ascending: false }),
        supabase.from('sellers').select('id, profile_id, display_name, phone, status'),
        supabase.from('merchants').select('id, owner_id, name, phone, email'),
        supabase.from('orders').select('seller_id, merchant_id, total_amount'),
        supabase.from('disputes').select('opened_by'),
      ]);

      const profileRows = (profRes.data as ProfileRow[] | null) ?? [];
      const profileMap = new Map<string, ProfileRow>(profileRows.map((p) => [p.id, p]));

      // Auto-synthesize profile for sellers lacking explicit profile entry
      ((sellerRes.data as any[]) ?? []).forEach((s) => {
        if (s.profile_id && !profileMap.has(s.profile_id)) {
          profileMap.set(s.profile_id, {
            id: s.profile_id,
            role: 'vendeur',
            full_name: s.display_name || 'Vendeur',
            phone: s.phone || null,
            email: null,
            city: 'Dakar',
            verification_status: s.status === 'actif' ? 'verified' : 'pending',
            trust_score: 80,
            created_at: new Date().toISOString(),
          });
        }
      });

      // Auto-synthesize profile for merchants lacking explicit profile entry
      ((merchRes.data as any[]) ?? []).forEach((m) => {
        if (m.owner_id && !profileMap.has(m.owner_id)) {
          profileMap.set(m.owner_id, {
            id: m.owner_id,
            role: 'marchand',
            full_name: m.name || 'Commerçant',
            phone: m.phone || null,
            email: m.email || null,
            city: 'Dakar',
            verification_status: 'verified',
            trust_score: 90,
            created_at: new Date().toISOString(),
          });
        }
      });

      const combinedProfiles = Array.from(profileMap.values());
      setRawProfiles(combinedProfiles);

      const profileToSeller: Record<string, string> = {};
      ((sellerRes.data as any[]) ?? []).forEach((s) => {
        if (s.profile_id) profileToSeller[s.profile_id] = s.id;
      });

      const profileToMerchant: Record<string, string> = {};
      ((merchRes.data as any[]) ?? []).forEach((m) => {
        if (m.owner_id) profileToMerchant[m.owner_id] = m.id;
      });

      const orders = (orderRes.data as { seller_id: string | null; merchant_id: string | null; total_amount: number }[] | null) ?? [];
      const disputes = (disputeRes.data as { opened_by: string | null }[] | null) ?? [];

      // 6. Build stats per profile
      const newStatsMap: Record<string, UserStats> = {};

      // Pre-aggregate order stats by seller_id and merchant_id
      const sellerOrderStats: Record<string, { count: number; volume: number }> = {};
      const merchantOrderStats: Record<string, { count: number; volume: number }> = {};
      orders.forEach((o) => {
        if (o.seller_id) {
          if (!sellerOrderStats[o.seller_id]) sellerOrderStats[o.seller_id] = { count: 0, volume: 0 };
          sellerOrderStats[o.seller_id].count++;
          sellerOrderStats[o.seller_id].volume += o.total_amount;
        }
        if (o.merchant_id) {
          if (!merchantOrderStats[o.merchant_id]) merchantOrderStats[o.merchant_id] = { count: 0, volume: 0 };
          merchantOrderStats[o.merchant_id].count++;
          merchantOrderStats[o.merchant_id].volume += o.total_amount;
        }
      });

      // Pre-aggregate dispute counts by opened_by
      const disputeCounts: Record<string, number> = {};
      disputes.forEach((d) => {
        if (d.opened_by) disputeCounts[d.opened_by] = (disputeCounts[d.opened_by] ?? 0) + 1;
      });

      // Compute stats for each profile
      profileRows.forEach((p) => {
        let salesCount = 0;
        let volume = 0;

        if (p.role === 'vendeur') {
          const sellerId = profileToSeller[p.id];
          if (sellerId && sellerOrderStats[sellerId]) {
            salesCount = sellerOrderStats[sellerId].count;
            volume = sellerOrderStats[sellerId].volume;
          }
        } else if (p.role === 'marchand') {
          const merchantId = profileToMerchant[p.id];
          if (merchantId && merchantOrderStats[merchantId]) {
            salesCount = merchantOrderStats[merchantId].count;
            volume = merchantOrderStats[merchantId].volume;
          }
        }

        newStatsMap[p.id] = {
          salesCount,
          volume,
          disputes: disputeCounts[p.id] ?? 0,
        };
      });

      setStatsMap(newStatsMap);
      setLoading(false);
    }
    loadData();
  }, []);

  const users: AdminUser[] = rawProfiles.map((p) => {
    const stats = statsMap[p.id] ?? { salesCount: 0, volume: 0, disputes: 0 };
    return {
      id: p.id,
      name: p.full_name || 'Utilisateur sans nom',
      role: p.role as any,
      phone: p.phone || 'Non renseigné',
      email: p.email || 'Non renseigné',
      city: p.city || 'Dakar',
      status: (p.verification_status === 'verified' ? 'Vérifié' : 'En attente') as VerificationStatus,
      trustScore: p.trust_score || 50,
      salesCount: stats.salesCount,
      volume: stats.volume,
      sales: stats.salesCount,
      disputes: stats.disputes,
      joinedDate: new Date(p.created_at).toLocaleDateString('fr-FR'),
    };
  });

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'Tous' || u.role === roleFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.email.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  async function updateVerification(userId: string, newStatus: 'verified' | 'suspended' | 'refused') {
    const { error } = await (supabase.from('profiles') as any)
      .update({ verification_status: newStatus })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Statut mis à jour', description: `Vérification passée à ${newStatus}.` });
      // Update local state
      setRawProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, verification_status: newStatus } : p))
      );
      if (selected && selected.id === userId) {
        setSelected({ ...selected, status: newStatus === 'verified' ? 'Vérifié' : 'En attente' });
      }
    }
    setSelected(null);
  }

  return (
    <AdminPage
      eyebrow="Gouvernance & Utilisateurs"
      title="Utilisateurs"
      description="Gestion centralisée des profils Marchands, Vendeurs et Administrateurs."
    >
      <Card className="mt-6 p-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#efedf4]">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={adminInputClass}
            />
          </div>
          <div className="flex gap-2">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition capitalize ${
                  roleFilter === r ? 'bg-[#5e4be7] text-white' : 'bg-[#f4f3f8] text-[#757185] hover:bg-[#e9e7f2]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-[#8b88a0]">Chargement des utilisateurs en cours...</div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState glyph={UserGroupIcon} title="Aucun utilisateur trouvé" description="Aucun profil ne correspond à vos filtres actuels." />
        ) : (
          <AdminScrollTable minWidth={700}>
            <div className="divide-y divide-[#f1eef7]">
              {filtered.map((u) => (
                <div key={u.id} onClick={() => setSelected(u)} className="flex items-center justify-between px-5 py-4 text-xs cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#efedff] font-bold text-[#5e4be7]">
                      {getInitials(u.name)}
                    </span>
                    <div>
                      <p className="font-bold text-[#292541]">{u.name}</p>
                      <p className="text-[10px] text-[#9290a2]">{u.email} · {u.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <AdminBadge tone={roleTone(u.role)}>{u.role}</AdminBadge>
                    <TrustScore score={u.trustScore} />
                    <AdminBadge tone={statusTone(u.status)}>{u.status}</AdminBadge>
                  </div>
                </div>
              ))}
            </div>
          </AdminScrollTable>
        )}
      </Card>

      {/* User Details Drawer */}
      {selected && (
        <AdminDrawer open={!!selected} onClose={() => setSelected(null)} title={selected.name} subtitle={`Rôle : ${selected.role}`}>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-xs font-bold text-slate-500">Contact</p>
              <p className="text-sm font-semibold">{selected.email}</p>
              <p className="text-sm">{selected.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Trust Score</p>
              <TrustScore score={selected.trustScore} />
            </div>
            {/* Real stats from Supabase */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl bg-[#f4f3f8] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ventes</p>
                <p className="mt-1 font-bold text-[#292541]">{selected.salesCount}</p>
              </div>
              <div className="rounded-xl bg-[#f4f3f8] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Volume</p>
                <p className="mt-1 font-bold text-[#292541]">{(selected.volume ?? 0).toLocaleString('fr-FR')}</p>
              </div>
              <div className="rounded-xl bg-[#f4f3f8] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Litiges</p>
                <p className="mt-1 font-bold text-[#292541]">{selected.disputes}</p>
              </div>
            </div>
            <div className="pt-4 border-t space-y-2">
              <Button variant="primary" className="w-full" onClick={() => updateVerification(selected.id, 'verified')}>
                Valider le profil (Vérifié)
              </Button>
              <Button variant="ghost" className="w-full text-rose-600" onClick={() => updateVerification(selected.id, 'suspended')}>
                Suspendre le profil
              </Button>
            </div>
          </div>
        </AdminDrawer>
      )}
    </AdminPage>
  );
}
