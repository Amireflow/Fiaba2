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
  return (
    <tr className="transition hover:bg-[#faf9fd]" data-testid={`row-product-${p.id}`}>
      <td className="px-5 py-4">
        <span className="font-bold text-[#292541]">{p.name}</span>
        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créé le {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
      </td>
      <td className="px-5 py-4 text-[#77738a]">{merchantName}</td>
      <td className="px-5 py-4"><AdminBadge tone="violet">{nicheName}</AdminBadge></td>
      <td className="px-5 py-4 text-right font-bold text-[#292541]">{money(p.price)}</td>
      <td className="px-5 py-4"><AdminBadge tone={productStatusToneMap[p.status] ?? 'slate'}>{productStatusLabelMap[p.status] ?? p.status}</AdminBadge></td>
      <td className="px-5 py-4">
        {p.ai_headline ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7faf2] px-2 py-0.5 text-[10px] font-bold text-[#278e69]" data-testid={`ai-badge-${p.id}`}>
            <Icon glyph={SparklesIcon} size={10} /> Généré
          </span>
        ) : (
          <span className="text-[10px] text-[#9290a2]">—</span>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="soft" onClick={() => onGenerate(p.id, p.name)} disabled={aiGeneratingId === p.id} testId={`button-ai-${p.id}`}>
            {aiGeneratingId === p.id ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
            ) : (
              <Icon glyph={SparklesIcon} size={14} />
            )}
            IA
          </Button>
          <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" testId={`button-view-${p.id}`}><Icon glyph={ViewIcon} size={14} /></Button>
          </a>
          {p.status !== 'epuise' && (
            <Button variant="ghost" onClick={() => onSuspend(p.id, p.name)} testId={`button-suspend-product-${p.id}`}>Suspendre</Button>
          )}
        </div>
      </td>
    </tr>
  );
}
