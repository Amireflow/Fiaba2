import { SparklesIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';
import type { AiPreview } from './types';

type Props = {
  aiGenerating: boolean;
  aiPreview: AiPreview;
  aiGenerationsLeft: number | null;
  onGenerate: () => void;
  onDismiss: () => void;
};

export function AiPreviewSection({ aiGenerating, aiPreview, aiGenerationsLeft, onGenerate, onDismiss }: Props) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onGenerate}
        disabled={aiGenerating || aiGenerationsLeft === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#5b49e8]/20 bg-[#f6f5ff] py-3 text-sm font-bold text-[#5b49e8] transition hover:bg-[#efedff] disabled:opacity-50"
        data-testid="button-generate-ai"
      >
        {aiGenerating ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" /> Génération en cours…</>
        ) : (
          <><Icon glyph={SparklesIcon} size={16} /> {aiPreview ? 'Régénérer le contenu IA' : "Générer ma page de vente avec l'IA"}</>
        )}
      </button>

      {aiGenerationsLeft !== null && aiGenerationsLeft < 3 && (
        <p className="text-center text-[10px] text-[#9290a2]">
          {aiGenerationsLeft > 0
            ? `${aiGenerationsLeft} génération${aiGenerationsLeft > 1 ? 's' : ''} restante${aiGenerationsLeft > 1 ? 's' : ''}`
            : 'Limite de générations atteinte'}
        </p>
      )}

      {aiPreview && (
        <div className="space-y-3 rounded-2xl border border-[#e4e1ff] bg-[#f8f7fc] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#5b49e8]">Aperçu du contenu IA</p>
            <button type="button" onClick={onDismiss} className="text-[10px] font-bold text-[#9290a2] hover:text-[#ef6d78]">Masquer</button>
          </div>

          {aiPreview.headline && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Accroche</p>
              <p className="mt-0.5 text-sm font-bold text-[#292541]">{aiPreview.headline}</p>
            </div>
          )}

          {aiPreview.benefits?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Bénéfices</p>
              <ul className="mt-1 space-y-1.5">
                {aiPreview.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#292541]">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#e7faf2] text-[#278e69]">
                      <Icon glyph={CheckmarkCircle02Icon} size={10} />
                    </span>
                    <span><strong>{b.title}</strong> — {b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiPreview.faq?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">FAQ</p>
              <ul className="mt-1 space-y-1.5">
                {aiPreview.faq.map((f, i) => (
                  <li key={i} className="text-xs text-[#292541]">
                    <strong>Q: {f.question}</strong><br />
                    <span className="text-[#686380]">R: {f.answer}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiPreview.cta_text && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">Bouton d'action</p>
              <p className="mt-0.5 text-sm font-bold text-[#292541]">{aiPreview.cta_text}</p>
            </div>
          )}

          <p className="rounded-xl bg-white p-2.5 text-[10px] text-[#9290a2]">
            ✅ Ce contenu est enregistré automatiquement sur votre produit et apparaîtra sur votre page de vente publique.
          </p>
        </div>
      )}
    </div>
  );
}
