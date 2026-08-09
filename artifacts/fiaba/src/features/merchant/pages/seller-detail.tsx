import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft01Icon, ArrowUpRightIcon, UserRemove01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  Badge,
  ConfirmDialog,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
} from '../components/merchant-ui';

type Seller = {
  id: string;
  name: string;
  city: string;
  followers: string;
  category: string;
  status: 'Actif' | 'Invité' | 'En attente';
  sales: number;
  revenue: number;
  joined: string;
};

const seedSellers: Seller[] = [
  { id: 's-1', name: 'Marième Fall', city: 'Dakar', followers: '12,4k abonnés', category: 'Beauté & soin', status: 'Actif', sales: 42, revenue: 42500, joined: '15 mars 2024' },
  { id: 's-2', name: 'Ndeye Kébé', city: 'Rufisque', followers: '8,2k abonnés', category: 'Maison & famille', status: 'Actif', sales: 31, revenue: 31200, joined: '22 mars 2024' },
  { id: 's-3', name: 'Saliou Kane', city: 'Thiès', followers: '5,8k abonnés', category: 'Mode locale', status: 'Actif', sales: 24, revenue: 24800, joined: '3 avril 2024' },
  { id: 's-4', name: 'Aminata Seck', city: 'Dakar', followers: '3,1k abonnés', category: 'Beauté & soin', status: 'Invité', sales: 0, revenue: 0, joined: '—' },
  { id: 's-5', name: 'Ousmane Diop', city: 'Pikine', followers: '6,5k abonnés', category: 'Épicerie', status: 'En attente', sales: 0, revenue: 0, joined: '—' },
];

const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export function SellerDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>(() => read('sellers', seedSellers));
  const [invited, setInvited] = useState<string[]>(() => read('invites', []));
  const [toRemove, setToRemove] = useState<Seller | null>(null);

  const seller = sellers.find((s) => s.id === id);

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

  function invite(s: Seller) {
    if (invited.includes(s.name)) return;
    const updatedInvited = [...invited, s.name];
    setInvited(updatedInvited);
    write('invites', updatedInvited);
    const updatedSellers = sellers.map((x) => (x.id === s.id ? { ...x, status: 'Invité' as const } : x));
    setSellers(updatedSellers);
    write('sellers', updatedSellers);
    toast({ title: `${s.name} invité`, description: 'Une notification lui a été envoyée.' });
  }

  function confirmRemove() {
    if (!toRemove) return;
    const updated = sellers.filter((s) => s.id !== toRemove.id);
    setSellers(updated);
    write('sellers', updated);
    toast({ title: 'Vendeur retiré', description: `${toRemove.name} ne fait plus partie de votre réseau.` });
    setToRemove(null);
  }

  return (
    <Page
      eyebrow="Vendeur"
      title={seller.name}
      description={`${seller.city} · ${seller.followers}`}
      action={
        <Link href="/merchant/sellers">
          <Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button>
        </Link>
      }
    >
      <div className="mt-6 space-y-5">
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#dfdbff] text-lg font-bold text-[#5140d4]">{getInitials(seller.name)}</span>
            <div>
              <p className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">{seller.name}</p>
              <p className="mt-0.5 text-xs text-[#77738a]">{seller.city}, Sénégal</p>
              <div className="mt-1.5"><Badge tone={seller.status === 'Actif' ? 'mint' : seller.status === 'Invité' ? 'violet' : 'amber'}>{seller.status}</Badge></div>
            </div>
          </div>
        </Card>

        {seller.status === 'Actif' && (
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
            <div className="flex justify-between"><span className="text-[#77738a]">Catégorie</span><span className="font-bold text-[#292541]">{seller.category}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Abonnés</span><span className="font-bold text-[#292541]">{seller.followers}</span></div>
            <div className="flex justify-between"><span className="text-[#77738a]">Rejoint le</span><span className="font-bold text-[#292541]">{seller.joined}</span></div>
          </div>
        </Card>

        <div className="flex flex-wrap justify-between gap-2">
          {seller.status === 'Actif' ? (
            <Button variant="danger" onClick={() => setToRemove(seller)} testId="button-remove-seller"><Icon glyph={UserRemove01Icon} size={15} /> Retirer du réseau</Button>
          ) : seller.status === 'Invité' ? (
            <Badge tone="violet">Invitation envoyée</Badge>
          ) : (
            <Button variant="primary" onClick={() => invite(seller)} testId="button-invite-seller">Inviter</Button>
          )}
          <Link href="/merchant/campaigns"><Button variant="ghost">Voir les campagnes <Icon glyph={ArrowUpRightIcon} size={14} /></Button></Link>
        </div>
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        title="Retirer ce vendeur ?"
        message={toRemove ? `${toRemove.name} ne fera plus partie de votre réseau. Il ne recevra plus vos campagnes.` : ''}
        confirmLabel="Retirer"
      />
    </Page>
  );
}
