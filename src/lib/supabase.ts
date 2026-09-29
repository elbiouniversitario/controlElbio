import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Cliente de Supabase, o `null` si faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * Sin cliente la app funciona en modo demo con los datos de `src/data/initialData.ts`.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        // Sin login por ahora: no hace falta guardar sesión en el navegador.
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
