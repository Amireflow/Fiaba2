import { useState } from 'react';
import { Link } from 'wouter';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Chart02Icon,
  Wallet01Icon,
  Share02Icon,
  Store01Icon,
  GiftIcon,
} from '@hugeicons/core-free-icons';
import { Icon, type IconType } from '@/components/shared/icon';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerPage as Page,
} from '../components/seller-ui';

type NotificationType = 'sale' | 'payout' | 'campaign' | 'share' | 'reward' | 'system';
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

const seedSellerNotifications: Notification[] = [
  { id: 'sn-1', type: 'sale', title: 'Vente validée !', description: 'Coffret Soin Karité · Commission de 4 500 F créditée.', time: 'Il y a 20 min', status: 'unread', link: '/seller/sales' },
  { id: 'sn-2', type: 'campaign', title: 'Nouvelle campagne recommandée', description: '« Rentrée douce » cherche des vendeurs dans votre catégorie.', time: 'Il y a 1 h', status: 'unread', link: '/seller/campaigns' },
  { id: 'sn-3', type: 'payout', title: 'Retrait en cours', description: '12 500 F vers Wave · · · 38 42. Disponible sous 24h.', time: 'Il y a 4 h', status: 'unread', link: '/seller/earnings' },
  { id: 'sn-4', type: 'sale', title: 'Commande livrée', description: 'Huile de Baobub 100ml livrée à Saint-Louis. +2 100 F.', time: 'Il y a 6 h', status: 'read', link: '/seller/sales' },
  { id: 'sn-5', type: 'reward', title: 'Bonus de performance', description: 'Vous avez atteint 20 ventes ce mois. +5 000 F de bonus !', time: 'Hier', status: 'read' },
  { id: 'sn-6', type: 'share', title: 'Lien partagé 30 fois', description: 'Votre lien Boubou Ndar a généré 12 clics aujourd\'hui.', time: 'Hier', status: 'read', link: '/seller/sales' },
  { id: 'sn-7', type: 'system', title: 'Vos gains sont disponibles', description: '8 200 F sont prêts à être retirés de votre portefeuille.', time: 'Il y a 2 jours', status: 'read', link: '/seller/earnings' },
];

const typeConfig: Record<NotificationType, { glyph: IconType; bg: string; color: string; label: string; tone: 'mint' | 'amber' | 'violet' | 'rose' }> = {
  sale: { glyph: Store01Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]', label: 'Vente', tone: 'mint' },
  payout: { glyph: Wallet01Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]', label: 'Paiement', tone: 'mint' },
  campaign: { glyph: Chart02Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Campagne', tone: 'violet' },
  share: { glyph: Share02Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Partage', tone: 'violet' },
  reward: { glyph: GiftIcon, bg: 'bg-[#fff4de]', color: 'text-[#ac741e]', label: 'Récompense', tone: 'amber' },
  system: { glyph: CheckmarkCircle02Icon, bg: 'bg-[#f0eff5]', color: 'text-[#67627b]', label: 'Système', tone: 'amber' },
};

const filters = ['Tous', 'Non lues', 'Lues'] as const;

export function SellerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => read('seller-notifications', seedSellerNotifications));
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
    write('seller-notifications', updated);
  }

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, status: 'read' as const }));
    setNotifications(updated);
    write('seller-notifications', updated);
  }

  function deleteNotification(id: string) {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    write('seller-notifications', updated);
  }

  return (
    <Page
      eyebrow="Restez informé"
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Vous êtes à jour'}
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
            <p className="mt-1 text-xs text-[#9290a2]">Vos ventes et gains apparaîtront ici.</p>
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
                    <SellerBadge tone={cfg.tone}>{cfg.label}</SellerBadge>
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
