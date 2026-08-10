import { ArrowLeft01Icon, ArrowRight01Icon, Store01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';

type Props = {
  images: string[];
  activeIndex: number;
  productName: string;
  isDigital: boolean;
  onSelect: (idx: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export function ProductHero({ images, activeIndex, productName, isDigital, onSelect, onPrev, onNext }: Props) {
  const current = images[activeIndex] ?? images[0];

  return (
    <div className="overflow-hidden rounded-[22px] bg-white">
      {images.length > 0 ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f4f3f8]">
          <img src={current} alt={productName} className="h-full w-full object-cover" />
          {images.length > 1 && (
            <>
              <button type="button" onClick={onPrev}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#292541] shadow-md backdrop-blur-md transition hover:bg-white"
                aria-label="Image précédente">
                <Icon glyph={ArrowLeft01Icon} size={18} />
              </button>
              <button type="button" onClick={onNext}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#292541] shadow-md backdrop-blur-md transition hover:bg-white"
                aria-label="Image suivante">
                <Icon glyph={ArrowRight01Icon} size={18} />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                {activeIndex + 1} / {images.length}
              </span>
            </>
          )}
          {isDigital && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#292541]/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <Icon glyph={SparklesIcon} size={12} /> Digital · Instantané
            </span>
          )}
        </div>
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center bg-[#f4f3f8]">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
            <Icon glyph={Store01Icon} size={30} />
          </span>
        </div>
      )}

      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto p-3">
          {images.map((img, idx) => (
            <button key={img + idx} type="button" onClick={() => { haptic('light'); onSelect(idx); }}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border p-0.5 transition ${
                idx === activeIndex ? 'border-[#5b49e8] ring-2 ring-[#5b49e8]/20' : 'border-[#e9e6f1] opacity-70 hover:opacity-100'
              }`}>
              <img src={img} alt={`Vignette ${idx + 1}`} className="h-full w-full rounded-md object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
