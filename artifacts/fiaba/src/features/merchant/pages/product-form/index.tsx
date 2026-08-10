import { Link } from 'wouter';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, PackageIcon, SparklesIcon, Tag01Icon, ImageUploadIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { MerchantButton as Button, MerchantCard as Card, Page } from '../../components/merchant-ui';
import { useProductForm } from './use-product-form';
import { useAiGeneration } from './use-ai-generation';
import { StepInfo } from './step-info';
import { StepPricing } from './step-pricing';
import { StepMedia } from './step-media';
import { PreviewPanel } from './preview-panel';
import { type WizardStep } from './types';

const stepDefs = [
  { step: 1 as WizardStep, label: '1. Infos', icon: PackageIcon },
  { step: 2 as WizardStep, label: '2. Prix', icon: Tag01Icon },
  { step: 3 as WizardStep, label: '3. Visuels', icon: ImageUploadIcon },
];

export function ProductForm() {
  const ctx = useProductForm();
  const ai = useAiGeneration(ctx.id);

  if (ctx.loading) {
    return (
      <Page eyebrow="Chargement" title="…" description="">
        <div className="mt-6 flex items-center justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="Produits"
      title={ctx.isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      description="Définissez les caractéristiques de votre produit."
      action={<Link href="/merchant/products"><Button variant="ghost"><Icon glyph={ArrowLeft01Icon} size={15} /> Retour</Button></Link>}
    >
      <div className="mt-4 sm:mt-6 rounded-2xl bg-white p-1.5 sm:p-2">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {stepDefs.map((s) => {
            const isActive = ctx.activeStep === s.step;
            const isDone = ctx.activeStep > s.step;
            return (
              <button key={s.step} type="button" onClick={() => ctx.goToStep(s.step)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2.5 sm:py-3 px-2 text-xs font-bold transition ${
                  isActive ? 'bg-[#5b49e8] text-white' : isDone ? 'bg-[#efedff] text-[#5b49e8]' : 'bg-transparent text-[#807b98] hover:bg-[#f8f7fc]'
                }`}
                data-testid={`step-tab-${s.step}`}>
                <Icon glyph={isDone ? CheckmarkCircle02Icon : s.icon} size={15} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <Card className="p-4 sm:p-6">
          <form onSubmit={ctx.save} className="space-y-4 sm:space-y-6">
            {ctx.activeStep === 1 && (
              <StepInfo
                form={ctx.form} errors={ctx.errors} isEdit={ctx.isEdit} productId={ctx.id}
                setField={ctx.setField} onNext={() => ctx.goToStep(2)}
                aiGenerating={ai.aiGenerating} aiPreview={ai.aiPreview}
                aiGenerationsLeft={ai.aiGenerationsLeft}
                onGenerate={ai.generate} onDismissPreview={ai.dismissPreview}
              />
            )}
            {ctx.activeStep === 2 && (
              <StepPricing
                form={ctx.form} errors={ctx.errors} setField={ctx.setField}
                onPrev={() => ctx.goToStep(1)} onNext={() => ctx.goToStep(3)}
              />
            )}
            {ctx.activeStep === 3 && (
              <StepMedia
                form={ctx.form} saving={ctx.saving} isEdit={ctx.isEdit}
                imageUploadProgress={ctx.imageUploadProgress}
                digitalUploadProgress={ctx.digitalUploadProgress}
                setField={ctx.setField} handleFileSelect={ctx.handleFileSelect}
                handleDigitalFileSelect={ctx.handleDigitalFileSelect}
                setPrimaryImage={ctx.setPrimaryImage} removeImage={ctx.removeImage}
                getCleanFileName={ctx.getCleanFileName} setDigitalFileName={ctx.setDigitalFileName}
                onPrev={() => ctx.goToStep(2)}
              />
            )}
          </form>
        </Card>

        <PreviewPanel form={ctx.form} />
      </div>
    </Page>
  );
}
