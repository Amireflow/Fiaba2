import { supabase } from '@/lib/supabase';
import { compressImageFile } from '@/lib/utils';

/**
 * Upload an image file to Supabase Storage (bucket: 'products' or fallback 'product-images').
 * Automatically compresses heavy photos client-side before uploading.
 * Fallback to lightweight WebP Data URL (~100KB) if storage bucket is unavailable or RLS denies access.
 */
export async function uploadImageToSupabase(
  file: File,
  bucketName = 'products'
): Promise<{ url: string | null; error: string | null }> {
  try {
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `public/${fileName}`;

    // Attempt Supabase Storage Upload
    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      return uploadAsCompressedBase64(file);
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return { url: publicUrlData.publicUrl, error: null };
    }

    return uploadAsCompressedBase64(file);
  } catch (err: any) {
    return uploadAsCompressedBase64(file);
  }
}

/**
 * Upload multiple image files concurrently to Supabase Storage with client-side compression.
 */
export async function uploadMultipleImagesToSupabase(
  files: FileList | File[],
  bucketName = 'products'
): Promise<{ urls: string[]; errors: string[] }> {
  const fileArray = Array.from(files);
  const results = await Promise.all(
    fileArray.map((file) => uploadImageToSupabase(file, bucketName))
  );

  const urls: string[] = [];
  const errors: string[] = [];

  results.forEach((res) => {
    if (res.url) urls.push(res.url);
    if (res.error) errors.push(res.error);
  });

  return { urls, errors };
}

/**
 * Helper to parse image_url field into an array of image URLs.
 */
export function parseImageUrls(rawImageUrl: string | null | undefined): string[] {
  if (!rawImageUrl) return [];
  const trimmed = rawImageUrl.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === 'string' && u.length > 0);
    } catch (e) {
      // ignore
    }
  }

  return trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Extrait la première URL d'image valide en gérant le format JSON array ou chaîne simple.
 */
export function getFirstImageUrl(rawImageUrl: string | null | undefined): string | null {
  const urls = parseImageUrls(rawImageUrl);
  return urls.length > 0 ? urls[0] : null;
}

/**
 * Compression client-side ultra rapide via WebP/JPEG Data URL (~100-150KB).
 */
async function uploadAsCompressedBase64(file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    const compressedDataUrl = await compressImageFile(file, 1000, 1000, 0.82);
    return { url: compressedDataUrl, error: null };
  } catch (err) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ url: reader.result as string, error: null });
      reader.onerror = () => resolve({ url: null, error: 'Impossible de lire le fichier image' });
      reader.readAsDataURL(file);
    });
  }
}
