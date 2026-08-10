import { SparklesIcon, ViewIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import { AdminBadge, AdminButton as Button } from '../../components/admin-ui';
import { productStatusToneMap, productStatusLabelMap, type ProductRow } from './types';

type Props = {
  p: ProductRow;
  merchantName: string;
  nicheName: string;
  aiGeneratingId: string | null;
  onGenerate: (id: string, name: string) => void;
  onSuspend: (id: string, name: string) => void;
};

export function AdminProductRow({ p, merchantName, nicheName, aiGeneratingId, onGenerate, onSuspend }: Props) {
  const isSuspended = p.status === 'epuise';
  return (
    <div className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#faf9fd]" data-testid={`row-product-${p.id}`}>
      {/* Product info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-[#292541]">{p.name}</p>
          {p.ai_headline && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e7faf2] px-2 py-0.5 text-[10px] font-bold text-[#278e69]" data-testid={`ai-badge-${p.id}`}>
              <Icon glyph={SparklesIcon} size={10} /> IA
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[#9290a2]">
          {merchantName} · {nicheName} · {new Date(p.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {/* Price (hidden on mobile) */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-[Space_Grotesk] text-sm font-bold text-[#292541]">{money(p.price).replace(' F', '')}</p>
        <p className="text-[10px] text-[#9290a2]">FCFA</p>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <AdminBadge tone={productStatusToneMap[p.status] ?? 'slate'}>{productStatusLabelMap[p.status] ?? p.status}</AdminBadge>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="soft" onClick={() => onGenerate(p.id, p.name)} disabled={aiGeneratingId === p.id} testId={`button-ai-${p.id}`}>
          {aiGeneratingId === p.id ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          ) : (
            <Icon glyph={SparklesIcon} size={14} />
          )}
          <span className="hidden sm:inline">IA</span>
        </Button>
        <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" testId={`button-view-${p.id}`}>
            <Icon glyph={ViewIcon} size={14} />
          </Button>
        </a>
        {!isSuspended && (
          <Button variant="ghost" onClick={() => onSuspend(p.id, p.name)} testId={`button-suspend-product-${p.id}`}>
            <span className="hidden sm:inline">Suspendre</span>
            <span className="sm:hidden">⚠</span>
          </Button>
        )}
      </div>
    </div>
  );
}
