import { useState } from 'react';
import { Calendar03Icon, Chart02Icon, Download01Icon, UserGroupIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { money } from '@/lib/utils';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  ProgressBar,
  Stat,
  inputClass,
} from '../components/merchant-ui';

const periods = ['7 jours', '30 jours', '90 jours', 'Année', 'Personnalisé'] as const;

const dataByPeriod: Record<string, { bars: number[]; total: number; conversion: number; avg: number }> = {
  '7 jours': { bars: [35, 43, 38, 57, 50, 68, 61], total: 47200, conversion: 7.8, avg: 13160 },
  '30 jours': { bars: [35, 43, 38, 57, 50, 68, 61, 76, 69, 88, 81, 95, 89, 100, 72, 84, 91, 78, 86, 93, 67, 74, 82, 95, 88, 76, 81, 90, 85, 92], total: 184250, conversion: 7.8, avg: 13160 },
  '90 jours': { bars: [40, 52, 48, 61, 55, 72, 65, 80, 73, 92, 85, 100, 68, 75, 82, 95, 88, 70, 78, 85, 90, 82, 75, 88], total: 512400, conversion: 8.2, avg: 13480 },
  'Année': { bars: [30, 45, 52, 48, 61, 55, 72, 65, 80, 73, 92, 85], total: 1845200, conversion: 8.5, avg: 13920 },
  'Personnalisé': { bars: [35, 43, 38, 57, 50, 68, 61, 76, 69, 88, 81, 95, 89, 72], total: 128400, conversion: 7.5, avg: 12800 },
};

const topSellers = [
  { name: 'Marième Fall', amount: 42500, sales: 42, pct: 78 },
  { name: 'Ndeye Kébé', amount: 31200, sales: 31, pct: 61 },
  { name: 'Saliou Kane', amount: 24800, sales: 24, pct: 48 },
  { name: 'Aminata Seck', amount: 18600, sales: 18, pct: 35 },
];

const topProducts = [
  { name: 'Coffret Soin Karité', sales: 38, pct: 85 },
  { name: 'Boubou Ndar — Indigo', sales: 22, pct: 62 },
  { name: 'Huile de Baobab 100ml', sales: 18, pct: 48 },
  { name: 'Panier petit-déjeuner', sales: 12, pct: 30 },
];

export function Analytics() {
  const [period, setPeriod] = useState<string>('30 jours');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const data = dataByPeriod[period] ?? dataByPeriod['30 jours'];

  function exportCSV() {
    const rows = [
      ['Vendeur', 'Ventes', 'CA généré (FCFA)'],
      ...topSellers.map((s) => [s.name, String(s.sales), String(s.amount)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiaba-analytique-${period.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page
      eyebrow="Décider avec confiance"
      title="Analytique"
      description="Les chiffres utiles, sans bruit. Comprenez ce qui fait avancer vos ventes."
    >
      {/* Filters — below title, full width */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${period === p ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`}
              data-testid={`period-${p}`}
            >
              {p === 'Personnalisé' && <Icon glyph={Calendar03Icon} size={14} />}
              {p}
            </button>
          ))}
        </div>
        <Button variant="soft" onClick={exportCSV} testId="button-export" className="shrink-0">
          <Icon glyph={Download01Icon} size={15} /> Exporter
        </Button>
      </div>

      {/* Custom date range */}
      {period === 'Personnalisé' && (
        <div className="mt-4 flex flex-col gap-3 rounded-[22px] bg-[#fffefd] p-5 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-bold text-[#514b71]">Du</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={inputClass} data-testid="input-date-from" />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-bold text-[#514b71]">Au</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={inputClass} data-testid="input-date-to" />
          </label>
          <Button
            variant="primary"
            className="shrink-0"
            onClick={() => {
              if (customFrom && customTo) {
                setPeriod('Personnalisé');
              }
            }}
            testId="button-apply-date"
          >
            Appliquer
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Ventes générées" value={money(data.total)} change="+18,4%" glyph={Chart02Icon} />
        <Stat label="Taux de conversion" value={`${data.conversion}%`} change="+1,2 pt" glyph={UserGroupIcon} tone="mint" />
        <Stat label="Panier moyen" value={money(data.avg)} change="+640 F" glyph={Wallet01Icon} tone="amber" />
      </div>

      {/* Revenue chart — fixed card (no color conflict) */}
      <div className="mt-5 rounded-[22px] bg-[#5745df] p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold">Chiffre d'affaires</p>
            <p className="mt-1 text-[11px] text-white/70">Période : {period === 'Personnalisé' && customFrom && customTo ? `${customFrom} → ${customTo}` : period}</p>
          </div>
          <Badge tone="mint">+18,4%</Badge>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="font-[Space_Grotesk] text-3xl font-bold tracking-[-.06em] sm:text-4xl">{money(data.total).replace(' F', '')}</span>
          <span className="mb-1 text-sm text-white/70">FCFA</span>
        </div>
        <div className="mt-6 flex h-[200px] items-end gap-1 px-1 sm:gap-2">
          {data.bars.map((height, i) => (
            <div key={i} className="group relative flex flex-1 flex-col justify-end">
              <div className={`w-full rounded-t-md transition group-hover:bg-white/80 ${i > data.bars.length / 2 ? 'bg-white/80' : 'bg-white/30'}`} style={{ height: `${height}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Top sellers + products */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-bold text-[#292541]">Vos meilleurs relais</p>
          <div className="mt-5 space-y-5">
            {topSellers.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#292541]">{s.name}</span>
                  <span className="text-[#77738a]">{money(s.amount)}</span>
                </div>
                <div className="mt-2"><ProgressBar value={s.pct} tone="violet" /></div>
                <p className="mt-1 text-[10px] text-[#9290a2]">{s.sales} ventes</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-bold text-[#292541]">Produits les plus vendus</p>
          <div className="mt-5 space-y-5">
            {topProducts.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#292541]">{p.name}</span>
                  <span className="text-[#77738a]">{p.sales} ventes</span>
                </div>
                <div className="mt-2"><ProgressBar value={p.pct} tone="mint" /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
