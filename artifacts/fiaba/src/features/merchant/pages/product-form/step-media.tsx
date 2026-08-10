import { ArrowLeft01Icon, Add01Icon, Delete01Icon, StarIcon, ImageUploadIcon, File01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { Field, MerchantButton as Button, inputClass, textareaClass } from '../../components/merchant-ui';
import type { FormState } from './types';

type Props = {
  form: FormState;
  saving: boolean;
  isEdit: boolean;
  imageUploadProgress: number | null;
  digitalUploadProgress: number | null;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDigitalFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setPrimaryImage: (index: number) => void;
  removeImage: (index: number) => void;
  getCleanFileName: (url: string) => string;
  setDigitalFileName: (name: string) => void;
  onPrev: () => void;
};

export function StepMedia({
  form, saving, isEdit, imageUploadProgress, digitalUploadProgress,
  setField, handleFileSelect, handleDigitalFileSelect, setPrimaryImage, removeImage,
  getCleanFileName, setDigitalFileName, onPrev,
}: Props) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div><h3 className="font-[Space_Grotesk] text-base sm:text-lg font-bold text-[#292541]">Photos & Fichiers</h3></div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#292541]">Photos ({form.images.length})</p>
          {form.images.length > 0 && (
            <label className="cursor-pointer text-xs font-bold text-[#5b49e8] hover:underline flex items-center gap-1">
              <Icon glyph={Add01Icon} size={14} /> Ajouter
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={imageUploadProgress !== null} />
            </label>
          )}
        </div>

        {imageUploadProgress !== null && (
          <div className="rounded-2xl bg-[#efedff] p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#5b49e8]">
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" /> Importation…
              </span>
              <span>{imageUploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#d8cdff]">
              <div className="h-full bg-[#5b49e8] transition-all duration-300 rounded-full" style={{ width: `${imageUploadProgress}%` }} />
            </div>
          </div>
        )}

        {form.images.length > 0 ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-[#f4f3f8]">
              <img src={form.images[0]} alt={form.name} className="h-40 sm:h-48 w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-xl bg-[#5b49e8] px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1">
                <Icon glyph={StarIcon} size={12} /> Principale
              </span>
              <button type="button" onClick={() => removeImage(0)}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-white/95 text-[#c45667] hover:bg-white transition" title="Supprimer">
                <Icon glyph={Delete01Icon} size={15} />
              </button>
            </div>

            {form.images.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {form.images.slice(1).map((imgUrl, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <div key={imgUrl + actualIdx} className="group relative overflow-hidden rounded-xl bg-[#f4f3f8]">
                      <img src={imgUrl} alt={`Photo ${actualIdx}`} className="h-16 sm:h-20 w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => setPrimaryImage(actualIdx)}
                          className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-lg bg-white text-[#5b49e8]" title="Principale">
                          <Icon glyph={StarIcon} size={12} />
                        </button>
                        <button type="button" onClick={() => removeImage(actualIdx)}
                          className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-lg bg-white text-[#c45667]" title="Supprimer">
                          <Icon glyph={Delete01Icon} size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <label className="flex h-36 sm:h-44 cursor-pointer flex-col items-center justify-center rounded-2xl bg-[#f8f7fc] p-4 text-center transition hover:bg-[#f5f3ff]">
            <div className="flex flex-col items-center gap-2 text-[#77738a]">
              <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]">
                <Icon glyph={ImageUploadIcon} size={22} />
              </span>
              <div><p className="text-xs font-bold text-[#292541]">Ajouter des photos</p><p className="text-[10px] text-[#9290a2] mt-0.5">PNG, JPG, WebP</p></div>
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={imageUploadProgress !== null} data-testid="input-image-file" />
          </label>
        )}
      </div>

      {form.type === 'digital' && (
        <DigitalFileSection
          form={form} digitalUploadProgress={digitalUploadProgress}
          setField={setField} handleDigitalFileSelect={handleDigitalFileSelect}
          getCleanFileName={getCleanFileName} setDigitalFileName={setDigitalFileName}
        />
      )}

      <div className="flex justify-between pt-3">
        <Button type="button" variant="ghost" onClick={onPrev}>
          <Icon glyph={ArrowLeft01Icon} size={15} /> Précédent
        </Button>
        <Button type="submit" disabled={saving} testId="button-save-product">
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Publier le produit'}
        </Button>
      </div>
    </div>
  );
}

function DigitalFileSection({ form, digitalUploadProgress, setField, handleDigitalFileSelect, getCleanFileName, setDigitalFileName }: {
  form: FormState;
  digitalUploadProgress: number | null;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleDigitalFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getCleanFileName: (url: string) => string;
  setDigitalFileName: (name: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#292541]">Fichier digital (PDF, ZIP, MP4)</p>
        {form.digital_file_url && (
          <button type="button" onClick={() => setField('digital_file_url', '')} className="text-xs font-bold text-[#c45667] hover:underline">Retirer</button>
        )}
      </div>

      {digitalUploadProgress !== null && (
        <div className="rounded-2xl bg-[#efedff] p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#5b49e8]">
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" /> Téléversement…
            </span>
            <span>{digitalUploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#d8cdff]">
            <div className="h-full bg-[#5b49e8] transition-all duration-300 rounded-full" style={{ width: `${digitalUploadProgress}%` }} />
          </div>
        </div>
      )}

      {form.digital_file_url ? (
        <div className="flex items-center justify-between rounded-2xl bg-[#f8f7fc] p-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5b49e8] text-white"><Icon glyph={File01Icon} size={20} /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#292541] truncate max-w-[200px] sm:max-w-[280px]" title={getCleanFileName(form.digital_file_url)}>{getCleanFileName(form.digital_file_url)}</p>
              <p className="text-[10px] text-[#278e69] font-bold">Fichier prêt pour livraison</p>
            </div>
          </div>
          <button type="button" onClick={() => { setField('digital_file_url', ''); setDigitalFileName(''); }}
            className="grid h-8 w-8 place-items-center rounded-xl bg-white text-[#c45667] hover:bg-[#fff0f1] transition" title="Supprimer">
            <Icon glyph={Delete01Icon} size={15} />
          </button>
        </div>
      ) : (
        <label className="flex h-36 sm:h-44 cursor-pointer flex-col items-center justify-center rounded-2xl bg-[#f8f7fc] p-4 text-center transition hover:bg-[#f5f3ff]">
          <div className="flex flex-col items-center gap-2 text-[#77738a]">
            <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-2xl bg-[#efedff] text-[#5b49e8]"><Icon glyph={File01Icon} size={22} /></span>
            <div><p className="text-xs font-bold text-[#292541]">Sélectionner un fichier digital</p><p className="text-[10px] text-[#9290a2] mt-0.5">PDF, EPUB, ZIP, MP3, MP4</p></div>
          </div>
          <input type="file" accept=".pdf,.epub,.zip,.rar,.mp3,.mp4,.doc,.docx" className="hidden" onChange={handleDigitalFileSelect} disabled={digitalUploadProgress !== null} />
        </label>
      )}

      {!form.digital_file_url && (
        <input type="text" value={form.digital_file_url} onChange={(e) => setField('digital_file_url', e.target.value)}
          placeholder="Ou lien direct (Drive, Telegram, Notion)…" className={inputClass} />
      )}

      <Field label="Instructions d'accès">
        <textarea value={form.digital_access_instructions} onChange={(e) => setField('digital_access_instructions', e.target.value)}
          placeholder="Informations transmises après paiement…" className={`${textareaClass} min-h-20`} />
      </Field>
    </div>
  );
}
