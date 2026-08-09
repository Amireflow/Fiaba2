import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!anonKey) {
  console.warn('[Fiaba] VITE_SUPABASE_ANON_KEY n\'est pas défini. Auth et DB seront indisponibles.');
}

// Supabase SDK throws if the key is empty. Use a placeholder so the app
// can still load (auth/DB calls will fail gracefully downstream).
const safeKey = anonKey || 'placeholder-anon-key-for-local-dev';

export const supabase = createClient<Database>(url, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
