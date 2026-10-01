import { supabase } from './supabase';

/** Clave pública de las notificaciones (variable de Vercel). La privada está solo en el servidor. */
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? '';

export type EstadoPush =
  /** El navegador no las soporta (o la app corre sin service worker, como en desarrollo). */
  | 'no-soportado'
  /** Falta configurar las claves en Vercel. */
  | 'sin-configurar'
  /** iPhone: solo funcionan con la app agregada a la pantalla de inicio. */
  | 'instalar-primero'
  /** La persona las bloqueó: se reactivan desde los ajustes del celular. */
  | 'bloqueado'
  | 'activo'
  | 'inactivo';

export const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** La app está abierta como app instalada (no en una pestaña del navegador). */
export const estaInstalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const soporta = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function estadoPush(): Promise<EstadoPush> {
  if (!VAPID_PUBLIC_KEY) return 'sin-configurar';
  if (!soporta()) return esIOS() && !estaInstalada() ? 'instalar-primero' : 'no-soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'no-soportado';
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'activo' : 'inactivo';
}

function claveBinaria(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  const salida = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) salida[i] = crudo.charCodeAt(i);
  return salida;
}

/** Pide permiso y guarda la suscripción de este celular. Devuelve el estado final. */
export async function activarPush(): Promise<EstadoPush> {
  if (!supabase) throw new Error('La app no está conectada a la base de datos');
  const permiso = await Notification.requestPermission();
  if (permiso === 'denied') return 'bloqueado';
  if (permiso !== 'granted') return 'inactivo';
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBinaria(VAPID_PUBLIC_KEY) }));
  const datos = sub.toJSON();
  const { error } = await supabase.rpc('guardar_suscripcion_push', {
    p_endpoint: sub.endpoint,
    p_p256dh: datos.keys?.p256dh ?? '',
    p_auth: datos.keys?.auth ?? '',
    p_dispositivo: navigator.userAgent,
  });
  if (error) throw error;
  return 'activo';
}

export async function desactivarPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  if (supabase) await supabase.rpc('quitar_suscripcion_push', { p_endpoint: sub.endpoint });
  await sub.unsubscribe();
}

/** Staff: ids de los jugadores que tienen las notificaciones activas. */
export async function jugadoresConPush(): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase.rpc('jugadores_con_push');
  if (error) throw error;
  return new Set((data as string[] | null) ?? []);
}

export interface ResultadoNotificacion {
  enviados: string[];
  sinNotificaciones: string[];
  fallidos: number;
}

/** Staff: manda un aviso a cada jugador (el texto puede ser distinto para cada uno). */
export async function mandarNotificaciones(
  titulo: string,
  mensajes: { jugadorId: string; cuerpo: string }[],
  url = '/'
): Promise<ResultadoNotificacion> {
  if (!supabase) throw new Error('La app no está conectada a la base de datos');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Tu sesión venció: volvé a ingresar');
  const res = await fetch('/api/notificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ titulo, mensajes, url }),
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((cuerpo as { error?: string }).error || `Error ${res.status}`);
  return cuerpo as ResultadoNotificacion;
}
