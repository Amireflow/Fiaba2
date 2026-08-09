import { useState } from 'react';
import { Link } from 'wouter';
import {
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  UserGroupIcon,
  Wallet01Icon,
  Store01Icon,
  ShieldKeyIcon,
} from '@hugeicons/core-free-icons';
import { Icon, type IconType } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminPage,
} from '../components/admin-ui';

type NotificationType = 'fraud' | 'dispute' | 'user' | 'payout' | 'order' | 'system';
type NotificationStatus = 'unread' | 'read';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  status: NotificationStatus;
  link?: string;
};

const seedAdminNotifications: Notification[] = [
  { id: 'an-1', type: 'fraud', title: 'Signal de fraude critique', description: 'Multi-comptes détectés sur l\'IP 41.82.x.x. 3 comptes concernés.', time: 'Il y a 8 min', status: 'unread', link: '/admin/fraud' },
  { id: 'an-2', type: 'dispute', title: 'Nouveau litige ouvert', description: 'CMD-2024-031 : retard de livraison signalé par le client.', time: 'Il y a 25 min', status: 'unread', link: '/admin/disputes' },
  { id: 'an-3', type: 'payout', title: 'Demande de retrait en attente', description: 'Maison Ndar demande 23 750 F vers Wave. Validation requise.', time: 'Il y a 1 h', status: 'unread', link: '/admin/payouts' },
  { id: 'an-4', type: 'user', title: 'Nouveau marchand inscrit', description: 'Boutique Téranga a rejoint la plateforme. Compte à valider.', time: 'Il y a 2 h', status: 'unread', link: '/admin/users' },
  { id: 'an-5', type: 'fraud', title: 'Volume anormal détecté', description: 'Vendeur Saliou Kane : +300% de ventes en 24h. Vérification recommandée.', time: 'Il y a 3 h', status: 'read', link: '/admin/fraud' },
  { id: 'an-6', type: 'order', title: 'Spike de commandes', description: '127 commandes dans la dernière heure. Pic de trafic normal.', time: 'Il y a 5 h', status: 'read', link: '/admin/orders' },
  { id: 'an-7', type: 'system', title: 'Sauvegarde automatique', description: 'La base de données a été sauvegardée avec succès.', time: 'Hier', status: 'read' },
  { id: 'an-8', type: 'payout', title: 'Versement traité', description: '48 800 F versés à Maison Ndar sur Wave · · · 38 42.', time: 'Hier', status: 'read', link: '/admin/payouts' },
];

const typeConfig: Record<NotificationType, { glyph: IconType; bg: string; color: string; label: string; tone: 'rose' | 'amber' | 'violet' | 'mint' }> = {
  fraud: { glyph: ShieldKeyIcon, bg: 'bg-[#fff0f1]', color: 'text-[#c45667]', label: 'Fraude', tone: 'rose' },
  dispute: { glyph: Alert01Icon, bg: 'bg-[#fff4de]', color: 'text-[#ac741e]', label: 'Litige', tone: 'amber' },
  user: { glyph: UserGroupIcon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Utilisateur', tone: 'violet' },
  payout: { glyph: Wallet01Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]', label: 'Paiement', tone: 'mint' },
  order: { glyph: Store01Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Commande', tone: 'violet' },
  system: { glyph: CheckmarkCircle02Icon, bg: 'bg-[#f0eff5]', color: 'text-[#67627b]', label: 'Système', tone: 'amber' },
};

const filters = ['Tous', 'Non lues', 'Lues'] as const;

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => read('admin-notifications', seedAdminNotifications));
  const [filter, setFilter] = useState<string>('Tous');

  const filtered = notifications.filter((n) => {
    if (filter === 'Non lues') return n.status === 'unread';
    if (filter === 'Lues') return n.status === 'read';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  function markAsRead(id: string) {
    const updated = notifications.map((n) => (n.id === id ? { ...n, status: 'read' as const } : n));
    setNotifications(updated);
    write('admin-notifications', updated);
  }

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, status: 'read' as const }));
    setNotifications(updated);
    write('admin-notifications', updated);
  }

  function deleteNotification(id: string) {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    write('admin-notifications', updated);
  }

  return (
    <AdminPage
      eyebrow="Console"
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} alerte${unreadCount > 1 ? 's' : ''} à examiner` : 'Tout est à jour'}
      action={unreadCount > 0 ? <Button variant="ghost" onClick={markAllRead} testId="button-mark-all-read">Tout marquer lu</Button> : undefined}
    >
      {/* Filters */}
      <div className="mt-6 flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`}
            data-testid={`filter-${f}`}
          >
            {f}
            {f === 'Non lues' && unreadCount > 0 && <span className="ml-1.5 rounded-full bg-[#ef6d78] px-1.5 py-0.5 text-[9px] text-white">{unreadCount}</span>}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f0eff5] text-[#9290a2]"><Icon glyph={CheckmarkCircle02Icon} size={28} /></span>
            <p className="mt-4 text-sm font-bold text-[#292541]">Aucune notification</p>
            <p className="mt-1 text-xs text-[#9290a2]">Les alertes système apparaîtront ici.</p>
          </Card>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type];
            return (
              <Card key={n.id} className={`flex items-start gap-4 transition ${n.status === 'unread' ? 'bg-[#f6f5ff]' : ''}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cfg.bg} ${cfg.color}`}>
                  <Icon glyph={cfg.glyph} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#292541]">{n.title}</p>
                    {n.status === 'unread' && <span className="h-2 w-2 shrink-0 rounded-full bg-[#ef6d78]" />}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#77738a]">{n.description}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[10px] text-[#9290a2]">{n.time}</span>
                    <AdminBadge tone={cfg.tone}>{cfg.label}</AdminBadge>
                    {n.link && <Link href={n.link}><span className="text-[10px] font-bold text-[#5b49e8] hover:underline" data-testid={`link-${n.id}`}>Voir →</span></Link>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {n.status === 'unread' && (
                    <button onClick={() => markAsRead(n.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]" data-testid={`read-${n.id}`} title="Marquer comme lu">
                      <Icon glyph={CheckmarkCircle02Icon} size={15} />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff0f1] text-[#c45667] hover:bg-[#ffe0e3]" data-testid={`delete-${n.id}`} title="Supprimer">
                    <Icon glyph={Cancel01Icon} size={15} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AdminPage>
  );
}

