import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { haptic } from '@/lib/utils';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  inputClass,
} from '../components/merchant-ui';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const typeConfig: Record<string, { glyph: IconType; bg: string; color: string; label: string }> = {
  commande: { glyph: Store01Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Commande' },
  vendeur: { glyph: UserGroupIcon, bg: 'bg-[#fff4de]', color: 'text-[#ac741e]', label: 'Vendeur' },
  paiement: { glyph: Wallet01Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]', label: 'Paiement' },
  campagne: { glyph: Chart02Icon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]', label: 'Campagne' },
  fraude: { glyph: Alert01Icon, bg: 'bg-[#fff0f1]', color: 'text-[#c45667]', label: 'Alerte' },
  systeme: { glyph: CheckmarkCircle02Icon, bg: 'bg-[#f0eff5]', color: 'text-[#67627b]', label: 'Système' },
};

const filters = ['Tous', 'Non lues', 'Lues'] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'À l\'instant';
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Hier';
  return `Il y a ${d} jours`;
}

export function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Tous');

  useEffect(() => {
    async function loadData() {
      if (!profile) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, body, link, is_read, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications((data as NotificationRow[] | null) ?? []);
      setLoading(false);
    }
    loadData();
  }, [profile]);

  const filtered = notifications.filter((n) => {
    if (filter === 'Non lues') return !n.is_read;
    if (filter === 'Lues') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAsRead(id: string) {
    haptic('light');
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllRead() {
    haptic('medium');
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await (supabase.from('notifications') as any).update({ is_read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id: string) {
    haptic('light');
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
        {loading ? (
          <Card className="p-12">
            <div className="flex items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f0eff5] text-[#9290a2]"><Icon glyph={CheckmarkCircle02Icon} size={28} /></span>
            <p className="mt-4 text-sm font-bold text-[#292541]">Aucune notification</p>
            <p className="mt-1 text-xs text-[#9290a2]">Vous serez prévenu des nouveautés ici.</p>
          </Card>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type] ?? typeConfig.systeme;
            return (
              <Card
                key={n.id}
                className={`flex items-start gap-4 transition ${!n.is_read ? 'bg-[#f6f5ff]' : ''}`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cfg.bg} ${cfg.color}`}>
                  <Icon glyph={cfg.glyph} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#292541]">{n.title}</p>
                    {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#ef6d78]" />}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#77738a]">{n.body ?? ''}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[10px] text-[#9290a2]">{timeAgo(n.created_at)}</span>
                    <Badge tone={n.type === 'fraude' ? 'rose' : n.type === 'paiement' ? 'mint' : n.type === 'vendeur' ? 'amber' : 'violet'}>{cfg.label}</Badge>
                    {n.link && <Link href={n.link}><span className="text-[10px] font-bold text-[#5b49e8] hover:underline" data-testid={`link-${n.id}`}>Voir →</span></Link>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {!n.is_read && (
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
