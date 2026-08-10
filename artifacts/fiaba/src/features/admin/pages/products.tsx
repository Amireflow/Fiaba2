import { useState, useEffect } from 'react';
import { Alert01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminPage,
  AdminScrollTable,
} from '../components/admin-ui';

type ProductRow = {
  id: string;
  name: string;
  merchant_id: string;
  niche_id: string | null;
  price: number;
  status: string;
  created_at: string;
};

type CampaignRow = {
  id: string;
  name: string;
  merchant_id: string;
  model: string;
  commission: number;
  commission_type: string | null;
  status: string;
  created_at: string;
};

type MerchantName = { id: string; name: string };
type NicheName = { id: string; name: string };
type CampaignSellerCount = { campaign_id: string; count: number };

const productStatusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'slate'> = {
  actif: 'mint',
  brouillon: 'slate',
  epuise: 'amber',
};

const productStatusLabelMap: Record<string, string> = {
  actif: 'Actif',
  brouillon: 'Brouillon',
  epuise: 'Épuisé',
};

const campaignStatusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'slate'> = {
  active: 'mint',
  en_pause: 'amber',
  terminee: 'slate',
};

const campaignStatusLabelMap: Record<string, string> = {
  active: 'Active',
  en_pause: 'En pause',
  terminee: 'Terminée',
};

export function AdminProducts() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'products' | 'campaigns'>('products');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map());
  const [nicheNames, setNicheNames] = useState<Map<string, string>>(new Map());
  const [campaignSellerCounts, setCampaignSellerCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toSuspend, setToSuspend] = useState<{ id: string; name: string; kind: 'product' | 'campaign' } | null>(null);
  const [suspending, setSuspending] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [prodRes, campRes] = await Promise.all([
        supabase.from('products').select('id, name, merchant_id, niche_id, price, status, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('campaigns').select('id, name, merchant_id, model, commission, commission_type, status, created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      const prodRows = (prodRes.data as ProductRow[] | null) ?? [];
      const campRows = (campRes.data as CampaignRow[] | null) ?? [];
      setProducts(prodRows);
      setCampaigns(campRows);

      // Fetch merchant names
      const merchantIds = [...new Set([...prodRows.map((p) => p.merchant_id), ...campRows.map((c) => c.merchant_id)])];
      if (merchantIds.length > 0) {
        const { data: mNames } = await supabase.from('merchants').select('id, name').in('id', merchantIds);
        setMerchantNames(new Map<string, string>(((mNames as MerchantName[] | null) ?? []).map((m) => [m.id, m.name])));
      }

      // Fetch niche names
      const nicheIds = [...new Set(prodRows.filter((p) => p.niche_id).map((p) => p.niche_id!))];
      if (nicheIds.length > 0) {
        const { data: nNames } = await supabase.from('niches').select('id, name').in('id', nicheIds);
        setNicheNames(new Map<string, string>(((nNames as NicheName[] | null) ?? []).map((n) => [n.id, n.name])));
      }

      // Fetch campaign seller counts
      const campaignIds = campRows.map((c) => c.id);
      if (campaignIds.length > 0) {
        const { data: csData } = await supabase.from('campaign_sellers').select('campaign_id').in('campaign_id', campaignIds);
        const counts = new Map<string, number>();
        ((csData as { campaign_id: string }[] | null) ?? []).forEach((cs) => {
          counts.set(cs.campaign_id, (counts.get(cs.campaign_id) ?? 0) + 1);
        });
        setCampaignSellerCounts(counts);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  async function suspend() {
    if (!toSuspend) return;
    haptic('medium');
    setSuspending(true);

    if (toSuspend.kind === 'product') {
      const { error } = await (supabase.from('products') as any).update({ status: 'epuise' }).eq('id', toSuspend.id);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error.message });
      } else {
        setProducts((prev) => prev.map((p) => (p.id === toSuspend.id ? { ...p, status: 'epuise' } : p)));
        toast({ title: 'Produit suspendu', description: `${toSuspend.name} retiré de la diffusion. Journal mis à jour.` });
      }
    } else {
      const { error } = await (supabase.from('campaigns') as any).update({ status: 'terminee' } as never).eq('id', toSuspend.id);
      if (error) {
        haptic('error');
        toast({ title: 'Erreur', description: error.message });
      } else {
        setCampaigns((prev) => prev.map((c) => (c.id === toSuspend.id ? { ...c, status: 'terminee' } : c)));
        toast({ title: 'Campagne suspendue', description: `${toSuspend.name} suspendue. Les vendeurs sont notifiés.` });
      }
    }

    setSuspending(false);
    setToSuspend(null);
  }

  const activeProducts = products.filter((p) => p.status === 'actif').length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

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
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total produits</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{products.length}</p></Card>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2">
        {(['products', 'campaigns'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${tab === t ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`} data-testid={`tab-${t}`}>
            {t === 'products' ? 'Produits' : 'Campagnes'}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="mt-5">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : tab === 'products' ? (
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
                        <span className="font-bold text-[#292541]">{p.name}</span>
                        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créé le {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                      </td>
                      <td className="px-5 py-4 text-[#77738a]">{merchantNames.get(p.merchant_id) ?? '—'}</td>
                      <td className="px-5 py-4"><AdminBadge tone="violet">{p.niche_id ? (nicheNames.get(p.niche_id) ?? '—') : '—'}</AdminBadge></td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(p.price)}</td>
                      <td className="px-5 py-4"><AdminBadge tone={productStatusToneMap[p.status] ?? 'slate'}>{productStatusLabelMap[p.status] ?? p.status}</AdminBadge></td>
                      <td className="px-5 py-4 text-right">
                        {p.status !== 'epuise' && (
                          <Button variant="ghost" onClick={() => setToSuspend({ id: p.id, name: p.name, kind: 'product' })} testId={`button-suspend-product-${p.id}`}>Suspendre</Button>
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
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1eef7]">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="transition hover:bg-[#faf9fd]" data-testid={`row-campaign-${c.id}`}>
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#292541]">{c.name}</span>
                        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créée le {new Date(c.created_at).toLocaleDateString('fr-FR')} · {c.model} {c.commission_type === 'fixed' || c.model === 'marge' || (!c.commission_type && c.commission >= 100) ? money(c.commission) : `${c.commission}%`}</p>
                      </td>
                      <td className="px-5 py-4 text-[#77738a]">{merchantNames.get(c.merchant_id) ?? '—'}</td>
                      <td className="px-5 py-4"><AdminBadge tone={c.model === 'marge' ? 'amber' : 'violet'}>{c.model === 'marge' ? 'Marge' : 'Commission'}</AdminBadge></td>
                      <td className="px-5 py-4 text-right font-bold text-[#292541]">{campaignSellerCounts.get(c.id) ?? 0}</td>
                      <td className="px-5 py-4"><AdminBadge tone={campaignStatusToneMap[c.status] ?? 'slate'}>{campaignStatusLabelMap[c.status] ?? c.status}</AdminBadge></td>
                      <td className="px-5 py-4 text-right">
                        {c.status !== 'terminee' && (
                          <Button variant="ghost" onClick={() => setToSuspend({ id: c.id, name: c.name, kind: 'campaign' })} testId={`button-suspend-campaign-${c.id}`}>Suspendre</Button>
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
        onConfirm={suspend}
        title={toSuspend?.kind === 'product' ? 'Suspendre ce produit ?' : 'Suspendre cette campagne ?'}
        message={toSuspend ? `${toSuspend.name} sera ${toSuspend.kind === 'product' ? 'retiré du catalogue' : 'terminée'}. Action tracée dans le journal d'audit.` : ''}
        confirmLabel="Suspendre"
      />
    </AdminPage>
  );
}
