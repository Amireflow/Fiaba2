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
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#faf9fd]" data-testid={`row-campaign-${c.id}`}>
      <div className="min-w-0 flex-1">
        <span className="font-bold text-[#292541]">{c.name}</span>
        <p className="mt-0.5 text-[11px] text-[#9290a2]">Créée le {new Date(c.created_at).toLocaleDateString('fr-FR')} · {c.model} {commissionLabel}</p>
      </div>
      <div className="hidden sm:block w-32 text-[#77738a] text-sm">{merchantName}</div>
      <div className="hidden md:block"><AdminBadge tone={c.model === 'marge' ? 'amber' : 'violet'}>{c.model === 'marge' ? 'Marge' : 'Commission'}</AdminBadge></div>
      <div className="text-right font-bold text-[#292541] text-sm w-16">{sellerCount}</div>
      <div><AdminBadge tone={campaignStatusToneMap[c.status] ?? 'slate'}>{campaignStatusLabelMap[c.status] ?? c.status}</AdminBadge></div>
      <div className="text-right">
        {c.status !== 'terminee' && (
          <Button variant="ghost" onClick={() => onSuspend(c.id, c.name)} testId={`button-suspend-campaign-${c.id}`}>Suspendre</Button>
        )}
      </div>
    </div>
  );
}
