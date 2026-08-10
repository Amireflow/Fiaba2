import { useState } from 'react';
import { Link } from 'wouter';
import { Delete02Icon, Edit02Icon, Store01Icon, SparklesIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { useMerchantId, useSupabaseQuery, supabaseDelete } from '@/hooks/use-supabase-query';
import { getFirstImageUrl } from '@/lib/storage-upload';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
} from '../components/merchant-ui';
import { SafeImage } from '@/components/shared/safe-image';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description: string | null;
  image_url: string | null;
  type?: string;
};

const statusMap: Record<string, 'Actif' | 'Brouillon' | 'Épuisé'> = {
  actif: 'Actif',
  brouillon: 'Brouillon',
  epuise: 'Épuisé',
};

const filters = ['Tous', 'Actif', 'Brouillon', 'Épuisé'] as const;

export function Products() {
  const { toast } = useToast();
  const { merchantId } = useMerchantId();
  const { data: products, loading, refetch } = useSupabaseQuery<ProductRow>('products', {
    select: 'id, name, category, price, stock, status, description, image_url, type',
    filter: { merchant_id: merchantId },
    order: { column: 'created_at', ascending: false },
    enabled: !!merchantId,
  });
  const [filter, setFilter] = useState<string>('Tous');
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);

  const list = filter === 'Tous' ? products : products.filter((p) => statusMap[p.status] === filter);

  async function confirmDelete() {
    if (!toDelete) return;
    haptic('warning');

    // 1. Supprimer les campagnes d'affiliation liées à ce produit
    await supabase.from('campaigns').delete().eq('product_id', toDelete.id);

    // 2. Supprimer le produit du catalogue
    const { error } = await supabaseDelete('products', toDelete.id);
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: 'Produit et campagnes supprimés', description: `« ${toDelete.name} » et ses offres ont été retirés de votre catalogue.` });
      refetch();
    }
    setToDelete(null);
  }

  return (
    <Page
      eyebrow="Catalogue"
      title="Vos produits"
      description="Assortiment de votre boutique et paramétrage des offres."
      action={
        <Link href="/merchant/products/new">
          <Button testId="button-add-product">
            <Icon glyph={Add01Icon} size={15} /> Nouveau produit
          </Button>
        </Link>
      }
    >
      {/* Category Filter Pills */}
      <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'
              }`}
              data-testid={`filter-${f}`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs font-bold text-[#9290a2]">{list.length} article{list.length > 1 ? 's' : ''}</p>
      </div>

      <div className="mt-4 sm:mt-5 space-y-3">
        {loading ? (
          <Card className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </Card>
        ) : list.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              glyph={Store01Icon}
              title="Aucun produit trouvé"
              description="Ajoutez un premier produit à votre catalogue."
              action={
                <Link href="/merchant/products/new">
                  <Button>Nouveau produit +</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            {/* MOBILE VIEW: Responsive Product Cards */}
            <div className="space-y-3 md:hidden">
              {list.map((p) => {
                const statusLabel = statusMap[p.status] ?? 'Brouillon';
                const imageUrl = getFirstImageUrl(p.image_url);
                return (
                  <Card key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <SafeImage src={imageUrl} alt={p.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover" iconSize={22} />

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#292541] text-sm truncate">{p.name}</p>
                        <p className="text-[11px] text-[#9290a2]">{p.category}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone={statusLabel === 'Actif' ? 'mint' : statusLabel === 'Épuisé' ? 'rose' : 'slate'}>
                            {statusLabel}
                          </Badge>
                          {p.type === 'digital' && (
                            <Badge tone="violet" className="flex items-center gap-1">
                              <Icon glyph={SparklesIcon} size={11} /> Digital
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[#f8f7fc] p-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#9290a2] block">Prix public</span>
                        <strong className="font-[Space_Grotesk] font-bold text-[#292541]">{money(p.price)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#9290a2] block">Stock</span>
                        <span className="font-bold text-[#292541]">{p.type === 'digital' ? 'Illimité' : `${p.stock} unité${p.stock > 1 ? 's' : ''}`}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Link href="/merchant/campaigns/new">
                        <Button variant="soft" className="px-3 py-1.5 text-[11px]" testId={`campaign-${p.id}`}>
                          + Campagne
                        </Button>
                      </Link>

                      <div className="flex items-center gap-1">
                        <Link href={`/merchant/products/${p.id}/edit`}>
                          <Button variant="ghost" className="p-2" testId={`edit-${p.id}`}>
                            <Icon glyph={Edit02Icon} size={16} />
                          </Button>
                        </Link>
                        <Button variant="ghost" className="p-2 text-[#c45667]" onClick={() => { haptic('light'); setToDelete(p); }} testId={`delete-${p.id}`}>
                          <Icon glyph={Delete02Icon} size={16} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* DESKTOP VIEW: Spacious Table */}
            <Card className="hidden md:block p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#f1eef7] text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">
                      <th className="px-6 py-4">Produit</th>
                      <th className="px-4 py-4">Catégorie</th>
                      <th className="px-4 py-4">Prix</th>
                      <th className="px-4 py-4">Stock</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1eef7]">
                    {list.map((p) => {
                      const statusLabel = statusMap[p.status] ?? 'Brouillon';
                      const imageUrl = getFirstImageUrl(p.image_url);
                      return (
                        <tr key={p.id} className="transition hover:bg-[#faf9fd]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <SafeImage src={imageUrl} alt={p.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" iconSize={18} />
                              <div className="min-w-0">
                                <p className="font-bold text-[#292541] truncate max-w-[220px]">{p.name}</p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <Badge tone={statusLabel === 'Actif' ? 'mint' : statusLabel === 'Épuisé' ? 'rose' : 'slate'}>
                                    {statusLabel}
                                  </Badge>
                                  {p.type === 'digital' && (
                                    <Badge tone="violet" className="flex items-center gap-1">
                                      <Icon glyph={SparklesIcon} size={10} /> Digital
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-medium text-[#292541]">{p.category}</td>
                          <td className="px-4 py-4 font-[Space_Grotesk] font-bold text-[#292541]">{money(p.price)}</td>
                          <td className="px-4 py-4 font-medium text-[#292541]">{p.type === 'digital' ? 'Illimité' : p.stock}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href="/merchant/campaigns/new">
                                <Button variant="soft" testId={`campaign-${p.id}`}>Campagne +</Button>
                              </Link>
                              <Link href={`/merchant/products/${p.id}/edit`}>
                                <Button variant="ghost" testId={`edit-${p.id}`}><Icon glyph={Edit02Icon} size={15} /></Button>
                              </Link>
                              <Button variant="ghost" onClick={() => { haptic('light'); setToDelete(p); }} testId={`delete-${p.id}`}>
                                <Icon glyph={Delete02Icon} size={15} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer ce produit ?"
        message={toDelete ? `« ${toDelete.name} » sera définitivement supprimé de votre catalogue.` : ''}
        confirmLabel="Supprimer"
      />
    </Page>
  );
}
