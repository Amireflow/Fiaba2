import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cancel01Icon,
  Image02Icon,
  RefreshIcon,
  Upload02Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { invalidateLogoCache } from '@/components/shared/logo-image';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminPage,
  AdminSectionTitle,
  adminInputClass,
} from '../components/admin-ui';

type AssetKey = 'logo_clair' | 'logo_sombre' | 'logo_icone';

type AssetRow = {
  key: string;
  label: string;
  url: string;
  file_name: string;
  mime_type: string;
  width: number;
  height: number;
  display_height: number;
  format: string;
  updated_at: string;
};

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

const SLOT_META: Record<AssetKey, { label: string; desc: string; bg: string }> = {
  logo_clair: {
    label: 'Logo clair',
    desc: 'Affiché sur les fonds clairs (pages publiques, auth, onboarding)',
    bg: 'bg-[#f8f8fc]',
  },
  logo_sombre: {
    label: 'Logo sombre',
    desc: 'Affiché sur les fonds sombres (sidebars admin/merchant/seller)',
    bg: 'bg-[#1c1838]',
  },
  logo_icone: {
    label: 'Icône / Favicon',
    desc: 'Icône seule utilisée pour le favicon et les notifications',
    bg: 'bg-[#5b49e8]',
  },
};

/* ── Helpers ── */

function getMimeType(file: File): string {
  return file.type || (file.name.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/png');
}

function getFormat(mime: string): string {
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

function isSvg(file: File): boolean {
  return getMimeType(file) === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

/** Lit les dimensions natives d'un fichier image (PNG/JPG/WebP via canvas, SVG via parse). */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (isSvg(file)) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const vbMatch = text.match(/viewBox=["']([^"']+)["']/i);
        if (vbMatch) {
          const [, , w, h] = vbMatch[1].split(/[\s,]+/).map(Number);
          if (w && h) return resolve({ width: w, height: h });
        }
        const wMatch = text.match(/<svg[^>]*\swidth=["'](\d+)/i);
        const hMatch = text.match(/<svg[^>]*\sheight=["'](\d+)/i);
        resolve({
          width: wMatch ? parseInt(wMatch[1], 10) : 0,
          height: hMatch ? parseInt(hMatch[1], 10) : 0,
        });
      };
      reader.onerror = () => resolve({ width: 0, height: 0 });
      reader.readAsText(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/** Redimensionne une image raster via canvas et retourne un Blob. */
async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  mime: string,
  quality = 0.92,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  URL.revokeObjectURL(url);
  const outMime = mime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Échec conversion'))),
      outMime,
      quality,
    );
  });
}

/* ── Slot d'upload ── */

type SlotState = {
  file: File | null;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  resizeW: number;
  resizeH: number;
  doResize: boolean;
  displayHeight: number;
  uploading: boolean;
  uploadProgress: number;
};

function LogoSlot({
  assetKey,
  asset,
  onChanged,
}: {
  assetKey: AssetKey;
  asset: AssetRow | null;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const meta = SLOT_META[assetKey];
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<SlotState>({
    file: null,
    previewUrl: asset?.url ?? '',
    originalWidth: asset?.width ?? 0,
    originalHeight: asset?.height ?? 0,
    resizeW: asset?.width ?? 0,
    resizeH: asset?.height ?? 0,
    doResize: false,
    displayHeight: asset?.display_height ?? (assetKey === 'logo_icone' ? 64 : 48),
    uploading: false,
    uploadProgress: 0,
  });

  // Sync quand l'asset change côté DB
  useEffect(() => {
    if (asset && !state.file) {
      setState((s) => ({
        ...s,
        previewUrl: asset.url,
        originalWidth: asset.width,
        originalHeight: asset.height,
        resizeW: asset.width,
        resizeH: asset.height,
        displayHeight: asset.display_height,
      }));
    }
  }, [asset]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFileSelected = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      haptic('error');
      toast({ title: 'Fichier trop volumineux', description: 'Maximum 5 Mo.' });
      return;
    }
    haptic('light');
    const dims = await getImageDimensions(file);
    const previewUrl = URL.createObjectURL(file);
    setState((s) => ({
      ...s,
      file,
      previewUrl,
      originalWidth: dims.width,
      originalHeight: dims.height,
      resizeW: dims.width,
      resizeH: dims.height,
      doResize: false,
    }));
  }, [toast]);

  const onResizeToggle = (doResize: boolean) => {
    haptic('light');
    setState((s) => ({
      ...s,
      doResize,
      resizeW: doResize ? s.originalWidth : s.resizeW,
      resizeH: doResize ? s.originalHeight : s.resizeH,
    }));
  };

  const onWidthChange = (w: number) => {
    setState((s) => {
      const ratio = s.originalHeight / s.originalWidth;
      return { ...s, resizeW: w, resizeH: Math.round(w * ratio) };
    });
  };

  const onHeightChange = (h: number) => {
    setState((s) => {
      const ratio = s.originalWidth / s.originalHeight;
      return { ...s, resizeH: h, resizeW: Math.round(h * ratio) };
    });
  };

  const onUpload = async () => {
    if (!state.file) return;
    haptic('medium');
    setState((s) => ({ ...s, uploading: true, uploadProgress: 5 }));

    try {
      const file = state.file;
      const mime = getMimeType(file);
      const format = getFormat(mime);
      const isSvgFile = isSvg(file);

      // Préparer le blob à uploader (redimensionné si demandé et raster)
      let blobToUpload: Blob = file;
      let uploadMime = mime;
      let finalWidth = state.originalWidth;
      let finalHeight = state.originalHeight;

      if (!isSvgFile && state.doResize && state.resizeW > 0 && state.resizeH > 0) {
        setState((s) => ({ ...s, uploadProgress: 30 }));
        blobToUpload = await resizeImage(file, state.resizeW, state.resizeH, mime);
        uploadMime = mime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        finalWidth = state.resizeW;
        finalHeight = state.resizeH;
      }

      // Chemin dans le bucket : logo_clair.png, logo_sombre.svg, etc.
      const ext = isSvgFile ? 'svg' : uploadMime === 'image/jpeg' ? 'jpg' : 'png';
      const filePath = `${assetKey}.${ext}`;

      setState((s) => ({ ...s, uploadProgress: 50 }));

      // Upload vers storage 'logos'
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(filePath, blobToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: uploadMime,
        });

      if (uploadErr) throw uploadErr;

      setState((s) => ({ ...s, uploadProgress: 75 }));

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('URL publique indisponible');

      // Mettre à jour platform_assets
      const { error: dbErr } = await (supabase.from('platform_assets') as any).upsert({
        key: assetKey,
        label: meta.label,
        url: publicUrl,
        file_name: file.name,
        mime_type: uploadMime,
        width: finalWidth,
        height: finalHeight,
        display_height: state.displayHeight,
        format,
      });

      if (dbErr) throw dbErr;

      setState((s) => ({ ...s, uploadProgress: 100, uploading: false, file: null }));
      invalidateLogoCache();
      onChanged();
      haptic('success');
      toast({
        title: `${meta.label} mis à jour`,
        description: isSvgFile
          ? 'SVG uploadé (format vectoriel, pas de redimensionnement).'
          : state.doResize
            ? `Image redimensionnée à ${finalWidth}×${finalHeight}px.`
            : `Image uploadée (${finalWidth}×${finalHeight}px).`,
      });
    } catch (err: any) {
      haptic('error');
      setState((s) => ({ ...s, uploading: false, uploadProgress: 0 }));
      toast({ title: 'Erreur upload', description: err?.message || 'Échec de l\'upload.' });
    }
  };

  const onSaveDisplayHeight = async () => {
    haptic('light');
    const { error } = await (supabase.from('platform_assets') as any)
      .update({ display_height: state.displayHeight } as never)
      .eq('key', assetKey);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
      return;
    }
    invalidateLogoCache();
    onChanged();
    toast({ title: 'Hauteur enregistrée', description: `${state.displayHeight}px` });
  };

  const onReset = () => {
    setState((s) => {
      if (s.previewUrl && s.file) URL.revokeObjectURL(s.previewUrl);
      return {
        ...s,
        file: null,
        previewUrl: asset?.url ?? '',
        originalWidth: asset?.width ?? 0,
        originalHeight: asset?.height ?? 0,
        resizeW: asset?.width ?? 0,
        resizeH: asset?.height ?? 0,
        doResize: false,
      };
    });
  };

  const isSvgAsset = state.file ? isSvg(state.file) : asset?.format === 'svg';
  const hasFile = !!state.file;
  const hasAsset = !!asset?.url;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#292541]">{meta.label}</p>
          <p className="mt-1 text-[11px] leading-5 text-[#77738a]">{meta.desc}</p>
        </div>
        {hasAsset && !hasFile && (
          <AdminBadge tone="mint">Actif</AdminBadge>
        )}
      </div>

      {/* Preview sur fond représentatif */}
      <div className={`mt-4 grid place-items-center rounded-2xl ${meta.bg} p-6 min-h-[120px]`}>
        {state.previewUrl ? (
          <img
            src={state.previewUrl}
            alt={meta.label}
            className="max-h-24 w-auto rounded-lg"
            draggable={false}
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-white/60">
            <Icon glyph={Image02Icon} size={28} />
          </span>
        )}
      </div>

      {/* Métadonnées actuelles */}
      {(state.originalWidth > 0 || hasAsset) && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
          {state.originalWidth > 0 && (
            <span className="rounded-full bg-[#f0eff5] px-2.5 py-1 text-[#716d82]">
              {state.originalWidth}×{state.originalHeight}px
            </span>
          )}
          {asset?.format && (
            <span className="rounded-full bg-[#efedff] px-2.5 py-1 text-[#5b49e8] uppercase">
              {asset.format}
            </span>
          )}
          {asset?.file_name && (
            <span className="rounded-full bg-[#f0eff5] px-2.5 py-1 text-[#716d82] truncate max-w-[180px]">
              {asset.file_name}
            </span>
          )}
        </div>
      )}

      {/* File input */}
      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
            e.target.value = '';
          }}
          data-testid={`input-logo-${assetKey}`}
        />
        <div className="flex gap-2">
          <Button
            variant="soft"
            onClick={() => fileRef.current?.click()}
            disabled={state.uploading}
            testId={`button-select-${assetKey}`}
          >
            <Icon glyph={Upload02Icon} size={15} /> Choisir un fichier
          </Button>
          {hasFile && (
            <Button variant="ghost" onClick={onReset} disabled={state.uploading}>
              <Icon glyph={Cancel01Icon} size={15} /> Annuler
            </Button>
          )}
        </div>
      </div>

      {/* Options de redimensionnement (raster uniquement) */}
      {hasFile && !isSvgAsset && state.originalWidth > 0 && (
        <div className="mt-4 rounded-xl bg-[#f8f7fc] p-4">
          <label className="flex items-center gap-2 text-xs font-bold text-[#514b71]">
            <input
              type="checkbox"
              checked={state.doResize}
              onChange={(e) => onResizeToggle(e.target.checked)}
              className="h-4 w-4 rounded accent-[#5b49e8]"
              data-testid={`checkbox-resize-${assetKey}`}
            />
            Redimensionner l'image
          </label>
          {state.doResize && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] font-bold text-[#716d82]">Largeur (px)</span>
                <input
                  type="number"
                  min={16}
                  max={4096}
                  value={state.resizeW}
                  onChange={(e) => onWidthChange(parseInt(e.target.value, 10) || 0)}
                  className={adminInputClass}
                  data-testid={`input-width-${assetKey}`}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-[#716d82]">Hauteur (px)</span>
                <input
                  type="number"
                  min={16}
                  max={4096}
                  value={state.resizeH}
                  onChange={(e) => onHeightChange(parseInt(e.target.value, 10) || 0)}
                  className={adminInputClass}
                  data-testid={`input-height-${assetKey}`}
                />
              </label>
              <p className="col-span-2 text-[10px] text-[#9290a2]">
                Ratio d'aspect conservé automatiquement. Format de sortie : PNG (ou JPEG si l'original est JPEG).
              </p>
            </div>
          )}
        </div>
      )}

      {hasFile && isSvgAsset && (
        <div className="mt-3 rounded-xl bg-[#e7faf2] px-4 py-3 text-[11px] font-bold text-[#278e69]">
          SVG détecté — format vectoriel, aucun redimensionnement nécessaire. L'image s'adapte à toutes les tailles.
        </div>
      )}

      {/* Hauteur d'affichage */}
      <div className="mt-4">
        <AdminSectionTitle
          title="Hauteur d'affichage"
          subtitle="Hauteur en px utilisée par le frontend pour rendred le logo"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={16}
            max={256}
            value={state.displayHeight}
            onChange={(e) => setState((s) => ({ ...s, displayHeight: parseInt(e.target.value, 10) || 0 }))}
            className={`${adminInputClass} w-24`}
            data-testid={`input-display-height-${assetKey}`}
          />
          <span className="text-xs font-bold text-[#716d82]">px</span>
          <Button
            variant="ghost"
            onClick={onSaveDisplayHeight}
            disabled={state.uploading || !hasAsset}
            testId={`button-save-height-${assetKey}`}
          >
            Appliquer
          </Button>
        </div>
      </div>

      {/* Upload button + progress */}
      {hasFile && (
        <div className="mt-4">
          {state.uploading ? (
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-[#efedf5]">
                <div
                  className="h-1.5 rounded-full bg-[#5b49e8] transition-all"
                  style={{ width: `${state.uploadProgress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-[#5b49e8]">{state.uploadProgress}%</span>
            </div>
          ) : (
            <Button onClick={onUpload} testId={`button-upload-${assetKey}`}>
              <Icon glyph={Upload02Icon} size={15} /> Uploader {meta.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Page ── */

export function AdminBranding() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Record<string, AssetRow>>({});
  const [loading, setLoading] = useState(true);

  const loadAssets = useCallback(async () => {
    const { data, error } = await supabase
      .from('platform_assets')
      .select('key, label, url, file_name, mime_type, width, height, display_height, format, updated_at')
      .limit(10);
    if (error) {
      toast({ title: 'Erreur', description: error.message });
      setLoading(false);
      return;
    }
    const map: Record<string, AssetRow> = {};
    for (const row of (data as AssetRow[] | null) ?? []) {
      map[row.key] = row;
    }
    setAssets(map);
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  return (
    <AdminPage
      eyebrow="Identité visuelle"
      title="Branding & Logos"
      description="Uploadez et gérez les logos de la plateforme. Supporte PNG, JPG, WebP et SVG. Les logos sont affichés partout sur l'app (header, sidebars, auth, favicon)."
      action={
        <Button variant="ghost" onClick={loadAssets} testId="button-refresh-branding">
          <Icon glyph={RefreshIcon} size={15} /> Rafraîchir
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {(['logo_clair', 'logo_sombre', 'logo_icone'] as AssetKey[]).map((key) => (
            <LogoSlot
              key={key}
              assetKey={key}
              asset={assets[key] ?? null}
              onChanged={loadAssets}
            />
          ))}
        </div>
      )}

      {/* Aperçu live */}
      <div className="mt-6">
        <AdminSectionTitle title="Aperçu live" subtitle="Rendu sur différents fonds" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card className="bg-[#f8f8fc]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9290a2]">Fond clair</p>
            <div className="grid min-h-[80px] place-items-center">
              <img
                src={assets.logo_clair?.url ?? ''}
                alt="Logo clair"
                className="max-h-20 w-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </Card>
          <Card className="bg-[#1c1838]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9791c5]">Fond sombre</p>
            <div className="grid min-h-[80px] place-items-center">
              <img
                src={assets.logo_sombre?.url ?? ''}
                alt="Logo sombre"
                className="max-h-20 w-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
