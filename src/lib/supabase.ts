import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Cliente de Supabase, o `null` si faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * Sin cliente la app funciona en modo demo (sin login) con los datos de `src/data/initialData.ts`.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        // La sesión queda guardada en el dispositivo (también en la app instalada en el iPhone).
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
