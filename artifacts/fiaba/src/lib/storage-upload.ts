import { supabase } from '@/lib/supabase';

/**
 * Upload an image file to Supabase Storage (bucket: 'products' or fallback 'product-images').
 * Fallback to Base64 Data URL if storage bucket is unavailable or RLS denies access.
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
    const { data, error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.warn(`Supabase Storage upload to '${bucketName}' failed, falling back to base64:`, uploadErr.message);
      return uploadAsBase64(file);
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return { url: publicUrlData.publicUrl, error: null };
    }

    return uploadAsBase64(file);
  } catch (err: any) {
    console.warn('Storage upload error, using base64 fallback:', err);
    return uploadAsBase64(file);
  }
}

/**
 * Fallback helper to convert an image file to a data URL string.
 */
function uploadAsBase64(file: File): Promise<{ url: string | null; error: string | null }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string, error: null });
    };
    reader.onerror = () => {
      resolve({ url: null, error: 'Impossible de lire le fichier image' });
    };
    reader.readAsDataURL(file);
  });
}
