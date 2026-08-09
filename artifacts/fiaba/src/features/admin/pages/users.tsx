import { useState } from 'react';
import { Search01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
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

const roleTone = (role: string) => (role === 'marchand' ? 'violet' : role === 'vendeur' ? 'mint' : 'amber');
const statusTone = (status: string) => (status === 'verified' ? 'mint' : status === 'pending' ? 'amber' : 'rose');
const getInitials = (name: string) => (name || 'U').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export function AdminUsers() {
  const { toast } = useToast();
  const { data: rawProfiles, loading, refetch } = useSupabaseQuery<ProfileRow>('profiles', {
    select: 'id, role, full_name, phone, email, city, verification_status, trust_score, created_at',
    order: { column: 'created_at', ascending: false },
  });

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const roles = ['Tous', 'marchand', 'vendeur', 'admin'] as const;

  const users: AdminUser[] = rawProfiles.map((p) => ({
    id: p.id,
    name: p.full_name || 'Utilisateur sans nom',
    role: p.role as any,
    phone: p.phone || 'Non renseigné',
    email: p.email || 'Non renseigné',
    city: p.city || 'Dakar',
    status: (p.verification_status === 'verified' ? 'Vérifié' : 'En attente') as VerificationStatus,
    trustScore: p.trust_score || 50,
    salesCount: 0,
    volume: 0,
    sales: 0,
    disputes: 0,
    joinedDate: new Date(p.created_at).toLocaleDateString('fr-FR'),
  }));

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
      refetch();
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
          <div className="p-8 text-center text-xs font-bold text-[#8b88a0]">Chargement des profils Supabase...</div>
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
