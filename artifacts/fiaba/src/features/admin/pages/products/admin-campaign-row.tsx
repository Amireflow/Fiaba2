import { money } from '@/lib/utils';
import { AdminBadge, AdminButton as Button } from '../../components/admin-ui';
import { campaignStatusToneMap, campaignStatusLabelMap, type CampaignRow } from './types';

type Props = {
  c: CampaignRow;
  merchantName: string;
  sellerCount: number;
  onSuspend: (id: string, name: string) => void;
};

export function AdminCampaignRow({ c, merchantName, sellerCount, onSuspend }: Props) {
  const commissionLabel = c.commission_type === 'fixed' || c.model === 'marge' || (!c.commission_type && c.commission >= 100)
    ? money(c.commission) : `${c.commission}%`;

  return (
    <tr className="transition hover:bg-[#faf9fd]" data-testid={`row-campaign-${c.id}`}>
      <td className="px-5 py-4">
        <span className="font-bold text-[#292541]">{c.name}</span>
        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créée le {new Date(c.created_at).toLocaleDateString('fr-FR')} · {c.model} {commissionLabel}</p>
      </td>
      <td className="px-5 py-4 text-[#77738a]">{merchantName}</td>
      <td className="px-5 py-4"><AdminBadge tone={c.model === 'marge' ? 'amber' : 'violet'}>{c.model === 'marge' ? 'Marge' : 'Commission'}</AdminBadge></td>
      <td className="px-5 py-4 text-right font-bold text-[#292541]">{sellerCount}</td>
      <td className="px-5 py-4"><AdminBadge tone={campaignStatusToneMap[c.status] ?? 'slate'}>{campaignStatusLabelMap[c.status] ?? c.status}</AdminBadge></td>
      <td className="px-5 py-4 text-right">
        {c.status !== 'terminee' && (
          <Button variant="ghost" onClick={() => onSuspend(c.id, c.name)} testId={`button-suspend-campaign-${c.id}`}>Suspendre</Button>
        )}
      </td>
    </tr>
  );
}
