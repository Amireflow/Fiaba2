import { useState } from 'react';
import { Alert01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import { money } from '@/lib/utils';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
} from '../components/admin-ui';
import { seedAdminCampaigns, seedAdminProducts } from '@/config/admin-seeds';
import type { AdminCampaign, AdminProduct } from '@/types/entities';

const productStatusTone = (s: AdminProduct['status']) => (s === 'Actif' ? 'mint' : s === 'Brouillon' ? 'slate' : s === 'Suspendu' ? 'rose' : 'amber');
const campaignStatusTone = (s: AdminCampaign['status']) => (s === 'Active' ? 'mint' : s === 'En pause' ? 'amber' : s === 'Suspendue' ? 'rose' : 'slate');

export function AdminProducts() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'products' | 'campaigns'>('products');
  const [products, setProducts] = useState<AdminProduct[]>(() => read('admin-products', seedAdminProducts));
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>(() => read('admin-campaigns', seedAdminCampaigns));
  const [toSuspend, setToSuspend] = useState<AdminProduct | AdminCampaign | null>(null);
  const [kind, setKind] = useState<'product' | 'campaign'>('product');

  function suspend(item: AdminProduct | AdminCampaign) {
    if (kind === 'product') {
      const updated = products.map((p) => (p.id === item.id ? { ...p, status: 'Suspendu' as const } : p));
      setProducts(updated);
      write('admin-products', updated);
      toast({ title: 'Produit suspendu', description: `${(item as AdminProduct).name} retiré de la diffusion. Journal mis à jour.` });
    } else {
      const updated = campaigns.map((c) => (c.id === item.id ? { ...c, status: 'Suspendue' as const } : c));
      setCampaigns(updated);
      write('admin-campaigns', updated);
      toast({ title: 'Campagne suspendue', description: `${(item as AdminCampaign).name} suspendue. Les vendeurs sont notifiés.` });
    }
  }

  const reportedProducts = products.filter((p) => p.reported);
  const activeProducts = products.filter((p) => p.status === 'Actif').length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active').length;

  return (
    <AdminPage
      eyebrow="Produits & campagnes"
      title="Catalogue plateforme"
      description="Surveillez le catalogue, traitez les signalements et suspendez les offres non conformes."
    >
      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Produits actifs</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{activeProducts}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Campagnes actives</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{activeCampaigns}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Produits signalés</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#c45667]">{reportedProducts.length}</p></Card>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2">
        {(['products', 'campaigns'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${tab === t ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`tab-${t}`}>
            {t === 'products' ? 'Produits' : 'Campagnes'}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <Card className="mt-5 p-0">
          {products.length === 0 ? (
            <AdminEmptyState glyph={Store01Icon} title="Aucun produit" description="Le catalogue est vide." />
          ) : (
            <AdminScrollTable minWidth={720} testId="scroll-admin-products">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                  <tr className="border-b border-[#f1eef7]">
                    <th className="px-5 py-3">Produit</th>
                    <th className="px-5 py-3">Marchand</th>
                    <th className="px-5 py-3">Catégorie</th>
                    <th className="px-5 py-3 text-right">Prix</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1eef7]">
                  {products.map((p) => (
                    <tr key={p.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-product-${p.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#292541]">{p.name}</span>
                          {p.reported && <AdminBadge tone="rose"><Icon glyph={Alert01Icon} size={11} /> Signalé</AdminBadge>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créé le {p.createdAt}</p>
                      </td>
                      <td className="px-5 py-4 text-[#77738a]">{p.merchant}</td>
                      <td className="px-5 py-4"><AdminBadge tone="violet">{p.category}</AdminBadge></td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(p.price)}</td>
                      <td className="px-5 py-4"><AdminBadge tone={productStatusTone(p.status)}>{p.status}</AdminBadge></td>
                      <td className="px-5 py-4 text-right">
                        {p.status !== 'Suspendu' && (
                          <Button variant="ghost" onClick={() => { setKind('product'); setToSuspend(p); }} testId={`button-suspend-product-${p.id}`}>Suspendre</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminScrollTable>
          )}
        </Card>
      ) : (
        <Card className="mt-5 p-0">
          {campaigns.length === 0 ? (
            <AdminEmptyState glyph={Store01Icon} title="Aucune campagne" description="Aucune campagne à afficher." />
          ) : (
            <AdminScrollTable minWidth={760} testId="scroll-admin-campaigns">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                  <tr className="border-b border-[#f1eef7]">
                    <th className="px-5 py-3">Campagne</th>
                    <th className="px-5 py-3">Marchand</th>
                    <th className="px-5 py-3">Modèle</th>
                    <th className="px-5 py-3 text-right">Vendeurs</th>
                    <th className="px-5 py-3 text-right">Ventes</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1eef7]">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-campaign-${c.id}`}>
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#292541]">{c.name}</span>
                        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créée le {c.createdAt} · {c.model} {c.commission}%</p>
                      </td>
                      <td className="px-5 py-4 text-[#77738a]">{c.merchant}</td>
                      <td className="px-5 py-4"><AdminBadge tone={c.model === 'Commission' ? 'violet' : 'amber'}>{c.model}</AdminBadge></td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{c.sellers}</td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{c.sales}</td>
                      <td className="px-5 py-4"><AdminBadge tone={campaignStatusTone(c.status)}>{c.status}</AdminBadge></td>
                      <td className="px-5 py-4 text-right">
                        {c.status !== 'Suspendue' && (
                          <Button variant="ghost" onClick={() => { setKind('campaign'); setToSuspend(c); }} testId={`button-suspend-campaign-${c.id}`}>Suspendre</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminScrollTable>
          )}
        </Card>
      )}

      <AdminConfirmDialog
        open={!!toSuspend}
        onClose={() => setToSuspend(null)}
        onConfirm={() => toSuspend && suspend(toSuspend)}
        title={kind === 'product' ? 'Suspendre ce produit ?' : 'Suspendre cette campagne ?'}
        message="L'offre sera retirée de la diffusion. L'action est tracée dans le journal d'audit et le marchand sera notifié."
        confirmLabel="Suspendre"
      />
    </AdminPage>
  );
}
