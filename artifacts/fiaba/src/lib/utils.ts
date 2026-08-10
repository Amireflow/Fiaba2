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
