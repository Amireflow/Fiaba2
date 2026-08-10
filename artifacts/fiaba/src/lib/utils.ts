import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} F`;
}

/* ── Haptic feedback ── */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 30, 10],
  error: [40, 20, 40],
  warning: [20, 10, 20],
};

/**
 * Trigger haptic feedback on supported devices.
 * Silently no-ops on browsers without vibration API (desktop, iOS Safari).
 */
export function haptic(pattern: HapticPattern = 'light'): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  } catch {
    // no-op
  }
}

/**
 * Convert technical or database error messages into clean, friendly French text.
 * Prevents exposing stack traces, DB table names, or technical jargon to end users.
 */
export function friendlyErrorMessage(err: any): string {
  if (!err) return 'Une erreur est survenue. Veuillez réessayer.';
  const msg = typeof err === 'string' ? err : err.message || String(err);

  // Auth & Session errors
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('User already registered')) return 'Un compte existe déjà avec cette adresse email.';
  if (msg.includes('Password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (msg.includes('Email not confirmed')) return 'Veuillez vérifier votre adresse email.';

  // Storage / Upload
  if (msg.includes('storage') || msg.includes('bucket') || msg.includes('mime') || msg.includes('payload too large')) {
    return 'Impossible d\'importer la photo. Vérifiez la taille ou le format de votre fichier.';
  }

  // Row-Level Security / Database constraints
  if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('violates foreign key')) {
    return 'Action non autorisée. Veuillez vous reconnecter.';
  }
  if (msg.includes('unique constraint') || msg.includes('duplicate key')) {
    return 'Cet enregistrement existe déjà dans le système.';
  }

  // Network / Fetch
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
    return 'Problème de connexion. Vérifiez votre réseau internet.';
  }

  // If the message contains technical terms, return generic friendly message
  if (/postgres|sql|supabase|payload|jwt|relation|column|table|schema|constraint|code_block|plpgsql/i.test(msg)) {
    return 'Une erreur s\'est produite lors du traitement. Veuillez réessayer.';
  }

  return msg;
}

/**
 * Redimensionnement et compression client ultrarapide d'images via Canvas HTML5.
 * Transforme les photos lourdes (3 à 10 Mo) en WebP/JPEG léger (~100 Ko).
 * Accélère les temps d'envoi de formulaires de 95%.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size < 150 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context non disponible'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL('image/webp', quality);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Algorithme dynamique de Trust Score (0 à 100).
 * Démarre à 0 pour un compte vierge et augmente selon la complétude, la vérification et les ventes livrées.
 */
export function calculateTrustScore(profile?: {
  verification_status?: string | null;
  phone?: string | null;
  full_name?: string | null;
  created_at?: string | null;
  trust_score?: number | null;
} | null, salesCount: number = 0, disputesCount: number = 0): number {
  if (profile?.verification_status === 'suspended' || profile?.verification_status === 'refused') {
    return 0;
  }

  let score = 0;

  // 1. Complétude Identité & Vérification (max 30 pts)
  if (profile?.full_name && profile.full_name.trim().length > 3) score += 10;
  if (profile?.phone && profile.phone.trim().length > 5) score += 10;
  if (profile?.verification_status === 'verified') score += 10;

  // 2. Performance des ventes livrées (max 40 pts)
  if (salesCount >= 1) score += 10;
  if (salesCount >= 5) score += 15;
  if (salesCount >= 20) score += 15;

  // 3. Ancienneté du compte (max 10 pts)
  if (profile?.created_at) {
    const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 3600 * 24);
    if (ageDays >= 30) score += 10;
    else score += Math.min(10, Math.floor(ageDays / 3));
  }

  // 4. Pénalité de litiges (-25 pts par litige)
  score -= disputesCount * 25;

  return Math.max(0, Math.min(100, score));
}
