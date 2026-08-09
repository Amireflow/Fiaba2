import { useState } from 'react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { money } from '@/lib/utils';
import {
  AdminBadge,
  AdminCard as Card,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
} from '../components/admin-ui';
import { seedAdminCommissions } from '@/config/admin-seeds';
import type { AdminCommission } from '@/types/entities';

const statusTone = (s: AdminCommission['status']) => (s === 'Disponible' ? 'mint' : s === 'Versée' ? 'violet' : s === 'En attente' ? 'amber' : 'rose');

const filters = ['Tous', 'En attente', 'Disponible', 'Versée', 'Reprise'] as const;

export function AdminCommissions() {
  const [commissions] = useState<AdminCommission[]>(seedAdminCommissions);
  const [filter, setFilter] = useState('Tous');

  const filtered = commissions.filter((c) => filter === 'Tous' || c.status === filter);

  const total = commissions.reduce((sum, c) => sum + (c.status === 'Reprise' ? 0 : c.amount), 0);
  const pending = commissions.filter((c) => c.status === 'En attente').reduce((sum, c) => sum + c.amount, 0);
  const available = commissions.filter((c) => c.status === 'Disponible').reduce((sum, c) => sum + c.amount, 0);
  const reversed = commissions.filter((c) => c.status === 'Reprise').reduce((sum, c) => sum + c.amount, 0);

  return (
    <AdminPage
      eyebrow="Commissions & marges"
      title="Registre financier"
      description="Chaque vente validée génère une écriture. Les reprises créent une écriture compensatoire traçable."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total généré</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(total)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">En attente (sécurité)</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#ac741e]">{money(pending)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Disponible</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#278e69]">{money(available)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Reprises</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{money(reversed)}</p></Card>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`filter-commission-${f}`}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <Card className="mt-5 p-0">
        {filtered.length === 0 ? (
          <AdminEmptyState glyph={Wallet01Icon} title="Aucune écriture" description="Aucune commission ne correspond à ce filtre." />
        ) : (
          <AdminScrollTable minWidth={720} testId="scroll-admin-commissions">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                <tr className="border-b border-[#f1eef7]">
                  <th className="px-5 py-3">Réf</th>
                  <th className="px-5 py-3">Commande</th>
                  <th className="px-5 py-3">Vendeur</th>
                  <th className="px-5 py-3">Marchand</th>
                  <th className="px-5 py-3">Modèle</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eef7]">
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-commission-${c.id}`}>
                    <td className="px-5 py-4 text-[11px] text-[#9290a2]">{c.id}</td>
                    <td className="px-5 py-4 font-bold text-[#292541]">{c.orderId}</td>
                    <td className="px-5 py-4 text-[#77738a]">{c.seller}</td>
                    <td className="px-5 py-4 text-[#77738a]">{c.merchant}</td>
                    <td className="px-5 py-4"><AdminBadge tone={c.model === 'Commission' ? 'violet' : 'amber'}>{c.model}</AdminBadge></td>
                    <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(c.amount)}</td>
                    <td className="px-5 py-4"><AdminBadge tone={statusTone(c.status)}>{c.status}</AdminBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTable>
        )}
      </Card>
    </AdminPage>
  );
}
