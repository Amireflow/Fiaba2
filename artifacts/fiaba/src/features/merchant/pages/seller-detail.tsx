import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, ArrowUpRightIcon, UserRemove01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { money, haptic } from '@/lib/utils';
import {
  Badge,
  ConfirmDialog,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
} from '../components/merchant-ui';

type SellerDetail = {
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k abonnés`;
  return `${n} abonnés`;
}

export function SellerDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { merchantId } = useAuth();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toRemove, setToRemove] = useState<SellerDetail | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id || !merchantId) {
        setLoading(false);
        return;
      }

      // Fetch seller (verify it belongs to this merchant via RLS)
      const { data: sellerRow } = await supabase
        .from('sellers')
        .select('id, display_name, status, followers, phone, joined_at, invited_at, profile_id, merchant_id')
        .eq('id', id)
        .maybeSingle();

      const row = sellerRow as { id: string; display_name: string; status: string; followers: number; phone: string | null; joined_at: string | null; invited_at: string; profile_id: string | null; merchant_id: string } | null;

      if (!row || row.merchant_id !== merchantId) {
        setSeller(null);
        setLoading(false);
        return;
      }

      // Fetch city from profile
      let city: string | null = null;
      if (row.profile_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('city')
          .eq('id', row.profile_id)
          .maybeSingle();
        city = (profile as { city: string | null } | null)?.city ?? null;
      }

      // Fetch commissions aggregated
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount')
        .eq('seller_id', id);

      const commissionRows = (commissions as { amount: number }[] | null) ?? [];
      const sales = commissionRows.length;
      const revenue = commissionRows.reduce((sum, c) => sum + c.amount, 0);

      setSeller({
        id: row.id,
        display_name: row.display_name,
        status: row.status,
        followers: row.followers ?? 0,
        phone: row.phone,
        joined_at: row.joined_at,
        invited_at: row.invited_at,
        city: city ?? 'Dakar',
        sales,
        revenue,
      });
      setLoading(false);
    }
    loadData();
  }, [id, merchantId]);

  async function confirmRemove() {
    if (!toRemove) return;
    haptic('warning');
    const { error } = await supabase.from('sellers').delete().eq('id', toRemove.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Vendeur retiré', description: `${toRemove.display_name} ne fait plus partie de votre réseau.` });
    }
    setToRemove(null);
    setSeller(null);
  }

  if (loading) {
    return (
      <Page eyebrow="Vendeur" title="Chargement…" description="">
        <Card className="mt-6 p-12">
          <div className="flex items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      </Page>
    );
  }

  if (!seller) {
    return (
      <Page eyebrow="Vendeur" title="Introuvable" description="Ce vendeur n'existe pas.">
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm text-[#77738a]">Le vendeur {id} est introuvable.</p>
          <Link href="/merchant/sellers" className="mt-4 inline-block"><Button variant="soft">Retour aux vendeurs</Button></Link>
        </Card>
      </Page>
    );
  }

  const label = statusLabel[seller.status] ?? 'En attente';

  return (
    <Page
      eyebrow="Vendeur"
      title={seller.display_name}
      description={`${seller.city} · ${formatFollowers(seller.followers)}`}
      action={
        <Link href="/merchant/sellers">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-5">
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#dfdbff] text-lg font-bold text-[#5140d4]">{getInitials(seller.display_name)}</span>
            <div>
              <p className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">{seller.display_name}</p>
              <p className="mt-0.5 text-xs text-[#77738a]">{seller.city}, Sénégal</p>
              <div className="mt-1.5"><Badge tone={seller.status === 'actif' ? 'mint' : seller.status === 'invite' ? 'violet' : 'amber'}>{label}</Badge></div>
            </div>
          </div>
        </Card>

        {seller.status === 'actif' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Ventes</p>
                <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{seller.sales}</p>
              </Card>
              <Card>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">CA généré</p>
                <p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{money(seller.revenue)}</p>
              </Card>
            </div>
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Performance</p>
              <div className="mt-3"><ProgressBar value={(seller.sales / 50) * 100} tone="violet" /></div>
              <p className="mt-2 text-xs text-[#77738a]">{seller.sales} ventes sur objectif 50</p>
            </Card>
          </>
        )}

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Informations</p>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#77738a]">Téléphone</span><span className="font-bold text-[#292541]">{seller.phone ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Abonnés</span><span className="font-bold text-[#292541]">{formatFollowers(seller.followers)}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Rejoint le</span><span className="font-bold text-[#292541]">{formatDate(seller.joined_at)}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Invité le</span><span className="font-bold text-[#292541]">{formatDate(seller.invited_at)}</span></div>
          </div>
        </Card>

        <div className="flex flex-wrap justify-between gap-2">
          {seller.status === 'actif' ? (
            <Button variant="danger" onClick={() => setToRemove(seller)} testId="button-remove-seller"><Icon glyph={UserRemove01Icon} size={15} /> Retirer du réseau</Button>
          ) : seller.status === 'invite' ? (
            <Badge tone="violet">Invitation envoyée</Badge>
          ) : (
            <Badge tone="amber">Suspendu</Badge>
          )}
          <Link href="/merchant/campaigns"><Button variant="ghost">Voir les campagnes <Icon glyph={ArrowUpRightIcon} size={14} /></Button></Link>
        </div>
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        title="Retirer ce vendeur ?"
        message={toRemove ? `${toRemove.display_name} ne fera plus partie de votre réseau. Il ne recevra plus vos campagnes.` : ''}
        confirmLabel="Retirer"
      />
    </Page>
  );
}
