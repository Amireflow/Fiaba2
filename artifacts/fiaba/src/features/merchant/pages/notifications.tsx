import { useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  DeliveryTruck01Icon,
  Store01Icon,
  UserGroupIcon,
  Wallet01Icon,
  Chart02Icon,
  Alert01Icon,
} from '@hugeicons/core-free-icons';
import { Icon, type IconType } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
} from '../components/merchant-ui';

type NotificationType = 'order' | 'seller' | 'payout' | 'campaign' | 'alert' | 'system';
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

const seedNotifications: Notification[] = [
  { id: 'n-1', type: 'order', title: 'Nouvelle commande', description: 'CMD-2024-042 · 18 500 F · Aminata Ndiaye', time: 'Il y a 12 min', status: 'unread', link: '/merchant/orders/cmd-2024-042' },
  { id: 'n-2', type: 'seller', title: 'Nouveau vendeur invité', description: 'Fatima Sow a accepté votre invitation. Elle est maintenant active.', time: 'Il y a 1 h', status: 'unread', link: '/merchant/sellers/s-4' },
  { id: 'n-3', type: 'order', title: 'Commande livrée', description: 'CMD-2024-039 a été livrée à Thiès. Commission de 1 850 F versée.', time: 'Il y a 3 h', status: 'unread', link: '/merchant/orders' },
  { id: 'n-4', type: 'payout', title: 'Versement en cours', description: '23 750 F sont en route vers Wave · · · 38 42. Délai estimé : 24h.', time: 'Il y a 5 h', status: 'read', link: '/merchant/payments' },
  { id: 'n-5', type: 'campaign', title: 'Objectif atteint à 80%', description: 'La campagne « Rentrée douce » est à 40 ventes sur 50. Continuez !', time: 'Hier', status: 'read', link: '/merchant/campaigns' },
  { id: 'n-6', type: 'seller', title: 'Vendeur en attente', description: 'Ousmane Diop attend votre validation pour rejoindre le réseau.', time: 'Hier', status: 'read', link: '/merchant/sellers/s-5' },
  { id: 'n-7', type: 'alert', title: 'Litige ouvert', description: 'CMD-2024-031 : un client a signalé un retard de livraison.', time: 'Il y a 2 jours', status: 'read' },
  { id: 'n-8', type: 'system', title: 'Nouvelle fonctionnalité', description: 'Les analytics avancées sont maintenant disponibles dans votre espace.', time: 'Il y a 3 jours', status: 'read', link: '/merchant/analytics' },
];

const typeConfig: Record<NotificationType, { glyph: IconType; bg: string; color: string; label: string }> = {
  order: { glyph: Store01Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Commande' },
  seller: { glyph: UserGroupIcon, bg: 'bg-[#fff4de]', color: 'text-[#ac741e]', label: 'Vendeur' },
  payout: { glyph: Wallet01Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]', label: 'Paiement' },
  campaign: { glyph: Chart02Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Campagne' },
  alert: { glyph: Alert01Icon, bg: 'bg-[#fff0f1]', color: 'text-[#c45667]', label: 'Alerte' },
  system: { glyph: CheckmarkCircle02Icon, bg: 'bg-[#f0eff5]', color: 'text-[#67627b]', label: 'Système' },
};

const filters = ['Tous', 'Non lues', 'Lues'] as const;

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => read('merchant-notifications', seedNotifications));
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
    write('merchant-notifications', updated);
  }

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, status: 'read' as const }));
    setNotifications(updated);
    write('merchant-notifications', updated);
  }

  function deleteNotification(id: string) {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    write('merchant-notifications', updated);
  }

  return (
    <Page
      eyebrow="Restez informé"
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Vous êtes à jour'}
      action={
        <div className="flex gap-2">
          {unreadCount > 0 && <Button variant="ghost" onClick={markAllRead} testId="button-mark-all-read">Tout marquer lu</Button>}
        </div>
      }
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
            <p className="mt-1 text-xs text-[#9290a2]">Vous serez prévenu des nouveautés ici.</p>
          </Card>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type];
            return (
              <Card
                key={n.id}
                className={`flex items-start gap-4 transition ${n.status === 'unread' ? 'bg-[#f6f5ff]' : ''}`}
              >
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
                    <Badge tone={n.type === 'alert' ? 'rose' : n.type === 'payout' ? 'mint' : n.type === 'seller' ? 'amber' : 'violet'}>{cfg.label}</Badge>
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
    </Page>
  );
}
