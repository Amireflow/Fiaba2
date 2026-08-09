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
