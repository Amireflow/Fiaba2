import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

type AssetRow = {
  key: string;
  url: string;
  display_height: number;
  format: string;
};

// Cache module-level : un seul fetch pour tous les LogoImage de l'app.
let _cache: Record<string, AssetRow> | null = null;
let _fetchPromise: Promise<Record<string, AssetRow>> | null = null;

async function fetchAssets(): Promise<Record<string, AssetRow>> {
  if (_cache) return _cache;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('platform_assets')
        .select('key, url, display_height, format')
        .limit(10);
      if (error) throw error;
      const map: Record<string, AssetRow> = {};
      for (const row of (data as AssetRow[] | null) ?? []) {
        if (row.url) map[row.key] = row;
      }
      _cache = map;
      return map;
    } catch {
      _cache = {};
      return {};
    } finally {
      _fetchPromise = null;
    }
  })();
  return _fetchPromise;
}

// Permet à la page admin de rafraîchir le cache après un upload
export function invalidateLogoCache() {
  _cache = null;
}

const STATIC_FALLBACK: Record<string, string> = {
  logo_clair: `${basePath}/logo/logo-clair.png`,
  logo_sombre: `${basePath}/logo/logo-sombre.png`,
  logo_icone: `${basePath}/logo/logo-icone.png`,
};

/**
 * Rend le logo Fiaba (wordmark + icône).
 * - `light=false` (fond clair)  → logo_clair
 * - `light=true`  (fond sombre) → logo_sombre
 * - `icon=true`                → logo_icone
 *
 * Récupère l'URL depuis platform_assets (DB) avec fallback sur les fichiers
 * statiques de /public/logo/.
 */
export function LogoImage({
  light = false,
  icon = false,
  className = 'h-12 w-auto',
  alt = 'Fiaba',
}: {
  light?: boolean;
  icon?: boolean;
  className?: string;
  alt?: string;
}) {
  const assetKey = icon ? 'logo_icone' : light ? 'logo_sombre' : 'logo_clair';
  const fallback = STATIC_FALLBACK[assetKey] ?? STATIC_FALLBACK.logo_clair;

  const [src, setSrc] = useState<string>(fallback);

  useEffect(() => {
    let cancelled = false;
    fetchAssets().then((map) => {
      if (cancelled) return;
      const row = map[assetKey];
      if (row?.url) setSrc(row.url);
    });
    return () => { cancelled = true; };
  }, [assetKey]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => { if (src !== fallback) setSrc(fallback); }}
    />
  );
}
