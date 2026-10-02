import { esIOS, estaInstalada } from './push';

/**
 * Instalar la app en la pantalla de inicio.
 * - Android / Chrome: el navegador avisa que se puede instalar (evento
 *   beforeinstallprompt) y la app puede abrir el cartel nativo con un botón.
 * - iPhone: Apple no lo permite desde una página; solo se puede guiar
 *   (Safari → Compartir → Agregar a inicio).
 */

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let evento: EventoInstalar | null = null;
let recienInstalada = false;
const avisar = new Set<() => void>();

/** Se llama una vez al arrancar: el aviso de Android llega apenas carga la página. */
export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e as EventoInstalar;
    avisar.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    recienInstalada = true;
    avisar.forEach((f) => f());
  });
}

export function alCambiarInstalacion(f: () => void): () => void {
  avisar.add(f);
  return () => avisar.delete(f);
}

export const esAndroid = () => /android/i.test(navigator.userAgent);

/** Safari "de verdad" en iPhone (no Chrome, ni el navegador de WhatsApp o Instagram). */
export const esSafariIOS = () => {
  const ua = navigator.userAgent;
  return esIOS() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|WhatsApp/i.test(ua);
};

export type ModoInstalar =
  /** Ya está instalada (o no es un celular): no hay nada que hacer. */
  | 'listo'
  /** Android con el cartel nativo disponible: un botón lo abre. */
  | 'nativo'
  /** Android sin el cartel (ya instalada en otro lado, otro navegador…): pasos del menú. */
  | 'android-manual'
  /** iPhone en Safari: pasos de Compartir → Agregar a inicio. */
  | 'ios-safari'
  /** iPhone en otro navegador: hay que abrirla en Safari. */
  | 'ios-otro';

export function modoInstalar(): ModoInstalar {
  if (estaInstalada() || recienInstalada) return 'listo';
  if (esIOS()) return esSafariIOS() ? 'ios-safari' : 'ios-otro';
  if (evento) return 'nativo';
  if (esAndroid()) return 'android-manual';
  return 'listo';
}

/** Abre el cartel nativo de instalación. Devuelve true si la persona aceptó. */
export async function instalarNativo(): Promise<boolean> {
  if (!evento) return false;
  const e = evento;
  await e.prompt();
  const { outcome } = await e.userChoice;
  evento = null;
  if (outcome === 'accepted') recienInstalada = true;
  avisar.forEach((f) => f());
  return outcome === 'accepted';
}
