import { useState } from 'react';
import { Search01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminDrawer,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminScrollTable,
  TrustScore,
  adminInputClass,
} from '../components/admin-ui';
import { seedAdminUsers } from '@/config/admin-seeds';
import type { AdminUser, VerificationStatus } from '@/types/entities';

const roleTone = (role: AdminUser['role']) => (role === 'marchand' ? 'violet' : role === 'vendeur' ? 'mint' : 'amber');
const statusTone = (status: VerificationStatus) => (status === 'Vérifié' ? 'mint' : status === 'En attente' ? 'amber' : status === 'Refusé' ? 'slate' : 'rose');
const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>(() => read('admin-users', seedAdminUsers));
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const roles = ['Tous', 'marchand', 'vendeur', 'administrateur'] as const;
  const statuses = ['Tous', 'Vérifié', 'En attente', 'Suspendu', 'Refusé'] as const;

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'Tous' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'Tous' || u.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
    return matchesRole && matchesStatus && matchesQuery;
  });

  function updateStatus(user: AdminUser, status: VerificationStatus) {
    const updated = users.map((u) => (u.id === user.id ? { ...u, status } : u));
    setUsers(updated);
    write('admin-users', updated);
    setSelected({ ...user, status });
    toast({ title: `${user.name} · ${status}`, description: "Action enregistrée dans le journal d'audit." });
  }

  const selectedUser = selected ? users.find((u) => u.id === selected.id) ?? selected : null;
  const pending = users.filter((u) => u.status === 'En attente').length;
  const verified = users.filter((u) => u.status === 'Vérifié').length;
  const suspended = users.filter((u) => u.status === 'Suspendu').length;

  return (
    <AdminPage
      eyebrow="Utilisateurs et vérifications"
      title="Comptes"
      description="Vérifiez les identités, gérez les rôles et la confiance. Un compte porte un seul rôle, fixé à l'inscription."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Vérifiés</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{verified}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En attente de vérification</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{pending}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Suspendus</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{suspended}</p></Card>
      </div>

      {/* Search + filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9290a2]"><Icon glyph={Search01Icon} size={18} /></span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom, téléphone, email…" className={`${adminInputClass} pl-10`} data-testid="input-admin-search" />
        </div>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${roleFilter === r ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-role-${r}`}>{r === 'Tous' ? 'Tous rôles' : r}</button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === s ? 'bg-[#292541] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-status-${s}`}>{s}</button>
        ))}
      </div>

      {/* Users list */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <AdminEmptyState glyph={UserGroupIcon} title="Aucun compte trouvé" description="Modifiez vos filtres ou recherchez un autre terme." />
        ) : (
          <AdminScrollTable minWidth={620} testId="scroll-admin-users">
            <div className="divide-y divide-[#f1eef7]">
              {filtered.map((u) => (
                <button key={u.id} onClick={() => setSelected(u)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#faf9fd]" data-testid={`view-${u.id}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5040d4]">{getInitials(u.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#292541]">{u.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#9290a2]">{u.phone} · {u.city} · {u.joinedDate}</p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <AdminBadge tone={roleTone(u.role)}>{u.role}</AdminBadge>
                    <AdminBadge tone={statusTone(u.status)}>{u.status}</AdminBadge>
                    <TrustScore score={u.trustScore} />
                  </div>
                  <div className="shrink-0 text-right sm:hidden">
                    <AdminBadge tone={statusTone(u.status)}>{u.status}</AdminBadge>
                  </div>
                </button>
              ))}
            </div>
          </AdminScrollTable>
        )}
      </Card>

      {/* Detail drawer */}
      <AdminDrawer
        open={!!selectedUser}
        onClose={() => setSelected(null)}
        title={selectedUser?.name ?? ''}
        subtitle={selectedUser ? `${selectedUser.role} · ${selectedUser.city}` : ''}
        testId="drawer-user-detail"
        footer={
          selectedUser && (
            <div className="flex flex-wrap justify-end gap-2">
              {selectedUser.status !== 'Vérifié' && <Button variant="success" onClick={() => updateStatus(selectedUser, 'Vérifié')} testId="button-verify">Vérifier le compte</Button>}
              {selectedUser.status !== 'Suspendu' && <Button variant="danger" onClick={() => updateStatus(selectedUser, 'Suspendu')} testId="button-suspend">Suspendre</Button>}
              {selectedUser.status === 'Suspendu' && <Button variant="primary" onClick={() => updateStatus(selectedUser, 'Vérifié')} testId="button-reactivate">Réactiver</Button>}
            </div>
          )
        }
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dfdbff] text-base font-bold text-[#5040d4]">{getInitials(selectedUser.name)}</span>
              <div>
                <p className="text-sm font-bold text-[#292541]">{selectedUser.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <AdminBadge tone={roleTone(selectedUser.role)}>{selectedUser.role}</AdminBadge>
                  <AdminBadge tone={statusTone(selectedUser.status)}>{selectedUser.status}</AdminBadge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Téléphone</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedUser.phone}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Email</p><p className="mt-1 truncate text-sm font-bold text-[#292541]">{selectedUser.email}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Inscrit le</p><p className="mt-1 text-sm font-bold text-[#292541]">{selectedUser.joinedDate}</p></div>
              <div className="rounded-xl bg-[#f4f3f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Trust score</p><p className="mt-1"><TrustScore score={selectedUser.trustScore} /></p></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#efedff] p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-[#5b49e8]">Ventes</p><p className="mt-1 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{selectedUser.sales}</p></div>
              <div className="rounded-xl bg-[#fff0f1] p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-[#c45667]">Litiges</p><p className="mt-1 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{selectedUser.disputes}</p></div>
              <div className="rounded-xl bg-[#e7faf2] p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-[#278e69]">CA généré</p><p className="mt-1 font-[Space_Grotesk] text-xl font-bold text-[#292541]">{money(selectedUser.sales * 8500)}</p></div>
            </div>

            <AdminField label="Note interne (audit)">
              <textarea rows={3} className="mt-2 w-full resize-none rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm leading-5 text-[#292541] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" placeholder="Ajouter une note tracée dans le journal…" data-testid="input-audit-note" />
            </AdminField>
          </div>
        )}
      </AdminDrawer>
    </AdminPage>
  );
}
