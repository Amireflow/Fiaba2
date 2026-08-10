import { useState } from 'react';
import { Store01Icon } from '@hugeicons/core-free-icons';
import { AdminBadge, AdminButton as Button, AdminCard as Card, AdminConfirmDialog, AdminEmptyState, AdminPage, AdminScrollTable } from '../../components/admin-ui';
import { useAdminProducts } from './use-admin-products';
import { AdminProductRow } from './admin-product-row';
import { AdminCampaignRow } from './admin-campaign-row';

export function AdminProducts() {
  const ctx = useAdminProducts();
  const [tab, setTab] = useState<'products' | 'campaigns'>('products');

  const activeProducts = ctx.products.filter((p) => p.status === 'actif').length;
  const activeCampaigns = ctx.campaigns.filter((c) => c.status === 'active').length;

  return (
    <AdminPage eyebrow="Produits & campagnes" title="Catalogue plateforme"
      description="Surveillez le catalogue, traitez les signalements et suspendez les offres non conformes.">
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Produits actifs</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{activeProducts}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Campagnes actives</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{activeCampaigns}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Total produits</p><p className="mt-2 font-[Space_Grotesk] text-2xl font-bold text-[#292541]">{ctx.products.length}</p></Card>
      </div>

      <div className="mt-5 flex gap-2">
        {(['products', 'campaigns'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${tab === t ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`}
            data-testid={`tab-${t}`}>
            {t === 'products' ? 'Produits' : 'Campagnes'}
          </button>
        ))}
      </div>

      {ctx.loading ? (
        <Card className="mt-5"><div className="flex items-center justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" /></div></Card>
      ) : tab === 'products' ? (
        <Card className="mt-5 p-0">
          {ctx.products.length === 0 ? (
            <AdminEmptyState glyph={Store01Icon} title="Aucun produit" description="Le catalogue est vide." />
          ) : (
            <AdminScrollTable minWidth={860} testId="scroll-admin-products">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                  <tr className="border-b border-[#f1eef7]">
                    <th className="px-5 py-3">Produit</th><th className="px-5 py-3">Marchand</th>
                    <th className="px-5 py-3">Catégorie</th><th className="px-5 py-3 text-right">Prix</th>
                    <th className="px-5 py-3">Statut</th><th className="px-5 py-3">IA</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1eef7]">
                  {ctx.products.map((p) => (
                    <AdminProductRow key={p.id} p={p}
                      merchantName={ctx.merchantNames.get(p.merchant_id) ?? '—'}
                      nicheName={p.niche_id ? (ctx.nicheNames.get(p.niche_id) ?? '—') : '—'}
                      aiGeneratingId={ctx.aiGeneratingId}
                      onGenerate={ctx.generateAi}
                      onSuspend={(id, name) => ctx.setToSuspend({ id, name, kind: 'product' })}
                    />
                  ))}
                </tbody>
              </table>
            </AdminScrollTable>
          )}
        </Card>
      ) : (
        <Card className="mt-5 p-0">
          {ctx.campaigns.length === 0 ? (
            <AdminEmptyState glyph={Store01Icon} title="Aucune campagne" description="Aucune campagne à afficher." />
          ) : (
            <AdminScrollTable minWidth={760} testId="scroll-admin-campaigns">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                  <tr className="border-b border-[#f1eef7]">
                    <th className="px-5 py-3">Campagne</th><th className="px-5 py-3">Marchand</th>
                    <th className="px-5 py-3">Modèle</th><th className="px-5 py-3 text-right">Vendeurs</th>
                    <th className="px-5 py-3">Statut</th><th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1eef7]">
                  {ctx.campaigns.map((c) => (
                    <AdminCampaignRow key={c.id} c={c}
                      merchantName={ctx.merchantNames.get(c.merchant_id) ?? '—'}
                      sellerCount={ctx.campaignSellerCounts.get(c.id) ?? 0}
                      onSuspend={(id, name) => ctx.setToSuspend({ id, name, kind: 'campaign' })}
                    />
                  ))}
                </tbody>
              </table>
            </AdminScrollTable>
          )}
        </Card>
      )}

      <AdminConfirmDialog
        open={!!ctx.toSuspend} onClose={() => ctx.setToSuspend(null)} onConfirm={ctx.suspend}
        title={ctx.toSuspend?.kind === 'product' ? 'Suspendre ce produit ?' : 'Suspendre cette campagne ?'}
        message={ctx.toSuspend ? `${ctx.toSuspend.name} sera ${ctx.toSuspend.kind === 'product' ? 'retiré du catalogue' : 'terminée'}. Action tracée dans le journal d'audit.` : ''}
        confirmLabel="Suspendre"
      />
    </AdminPage>
  );
}
