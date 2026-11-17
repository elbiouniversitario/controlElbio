// Ayudas compartidas por las funciones de Mercado Pago (el "_" hace que Vercel
// no la publique como función).
//
// Variables en Vercel:
//   MP_ACCESS_TOKEN            (Secret: Access Token de la cuenta del CLUB en MP)
//   MP_WEBHOOK_SECRET          (Secret: "clave secreta" de Webhooks en el panel de MP)
//   APP_URL                    (opcional, ej. https://control-elbio.vercel.app)
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } });

export const MP_API = 'https://api.mercadopago.com';

export function appUrl(request: Request): string {
  const env = process.env.APP_URL?.replace(/\/+$/, '');
  if (env) return env;
  return new URL(request.url).origin;
}

/** Llamada a la API de Mercado Pago con el token del club. */
export async function mp<T = unknown>(
  ruta: string,
  init: { method?: string; body?: unknown; idempotencia?: string } = {}
): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN en Vercel');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.idempotencia) headers['X-Idempotency-Key'] = init.idempotencia;
  const res = await fetch(`${MP_API}${ruta}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const texto = await res.text();
  let datos: unknown = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  if (!res.ok) {
    const msg = (datos as { message?: string })?.message || `Mercado Pago respondió ${res.status}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return datos as T;
}

/** Cliente de Supabase con el login de quien llama (la base decide permisos). */
export function supabaseDelUsuario(request: Request): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anon || !token) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente con la clave de servicio: solo para registrar pagos y suscripciones. */
export function supabaseServicio(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel');
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Firma de los webhooks de MP (header x-signature: "ts=...,v1=...").
 * Plantilla firmada: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * Si no hay MP_WEBHOOK_SECRET configurado, no se valida (el webhook igual
 * vuelve a pedir el pago a la API, así que un aviso falso no registra nada).
 */
export function firmaValida(request: Request, dataId: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true;
  const firma = request.headers.get('x-signature') ?? '';
  const requestId = request.headers.get('x-request-id') ?? '';
  const partes = Object.fromEntries(
    firma.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;
  let plantilla = '';
  if (dataId) plantilla += `id:${dataId.toLowerCase()};`;
  if (requestId) plantilla += `request-id:${requestId};`;
  plantilla += `ts:${ts};`;
  const esperada = createHmac('sha256', secreto).update(plantilla).digest('hex');
  const a = Buffer.from(esperada);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
