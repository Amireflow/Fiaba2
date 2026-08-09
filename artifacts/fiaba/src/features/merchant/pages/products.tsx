import { useState } from 'react';
import { Link } from 'wouter';
import { Delete02Icon, Edit02Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { money, haptic } from '@/lib/utils';
import { useMerchantId, useSupabaseQuery, supabaseDelete } from '@/hooks/use-supabase-query';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ScrollTable,
} from '../components/merchant-ui';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description: string | null;
  image_url: string | null;
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
    select: 'id, name, category, price, stock, status, description, image_url',
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
    const { error } = await supabaseDelete('products', toDelete.id);
    if (error) {
      toast({ title: 'Erreur', description: error });
    } else {
      toast({ title: 'Produit supprimé', description: `${toDelete.name} n'est plus dans votre catalogue.` });
      refetch();
    }
    setToDelete(null);
  }

  return (
    <Page
      eyebrow="Votre offre"
      title="Catalogue"
      description="Tout votre assortiment, au même endroit. Les vendeurs voient toujours les bonnes informations."
      action={<Link href="/merchant/products/new"><Button testId="button-add-product">Ajouter un produit +</Button></Link>}
    >
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filter === f ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`}
              data-testid={`filter-${f}`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs font-bold text-[#9290a2]">{list.length} produit{list.length > 1 ? 's' : ''}</p>
      </div>

      <Card className="mt-5 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            glyph={Store01Icon}
            title="Aucun produit dans ce filtre"
            description="Ajoutez un produit pour commencer à vendre."
            action={<Link href="/merchant/products/new"><Button>Ajouter un produit +</Button></Link>}
          />
        ) : (
          <ScrollTable minWidth={680} testId="scroll-products">
            <div className="grid grid-cols-[2fr_1fr_1fr_.8fr_1fr] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">
              <span>Produit</span><span>Catégorie</span><span>Prix</span><span>Stock</span><span className="text-right">Actions</span>
            </div>
            {list.map((p) => {
              const statusLabel = statusMap[p.status] ?? 'Brouillon';
              return (
                <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_.8fr_1fr] items-center gap-4 border-b border-[#f1eef7] px-5 py-4 last:border-b-0 transition hover:bg-[#faf9fd]">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={Store01Icon} size={20} /></span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#292541]">{p.name}</p>
                      <div className="mt-0.5"><Badge tone={statusLabel === 'Actif' ? 'mint' : statusLabel === 'Épuisé' ? 'rose' : 'slate'}>{statusLabel}</Badge></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[#292541]">{p.category}</span>
                  <span className="font-[Space_Grotesk] font-bold text-[#292541]">{money(p.price)}</span>
                  <span className="text-sm font-medium text-[#292541]">{p.stock}</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/merchant/products/${p.id}/edit`}><Button variant="ghost" testId={`edit-${p.id}`}><Icon glyph={Edit02Icon} size={15} /></Button></Link>
                    <Button variant="ghost" onClick={() => { haptic('light'); setToDelete(p); }} testId={`delete-${p.id}`}><Icon glyph={Delete02Icon} size={15} /></Button>
                  </div>
                </div>
              );
            })}
          </ScrollTable>
        )}
      </Card>

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
