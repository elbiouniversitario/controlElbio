/**
 * Envíos por WhatsApp sin integración paga: se abre el WhatsApp de quien usa
 * la app con el mensaje ya escrito (links wa.me), para un número o para
 * elegir el chat / grupo.
 */

/** Celular uruguayo → formato internacional sin "+" (ej. "099 123 456" → "59899123456"). */
export function normalizarCelular(celular: string | undefined | null): string | null {
  if (!celular) return null;
  let d = celular.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `598${d.slice(1)}`;
  else if (d.length === 8 && d.startsWith('9')) d = `598${d}`;
  d = d.replace(/\D/g, '');
  return d.length >= 10 ? d : null;
}

/** Link para abrir WhatsApp. Sin número: WhatsApp pide elegir el chat o grupo. */
export function linkWhatsApp(celular: string | null, texto: string): string {
  const num = normalizarCelular(celular);
  return `https://wa.me/${num ?? ''}?text=${encodeURIComponent(texto)}`;
}

/** Reemplaza {clave} por su valor (las claves sin valor quedan como están). */
export function rellenarPlantilla(plantilla: string, valores: Record<string, string | number | undefined>): string {
  return plantilla.replace(/\{(\w+)\}/g, (todo, clave: string) => {
    const v = valores[clave];
    return v === undefined || v === '' ? todo : String(v);
  });
}

/** Abre WhatsApp en una pestaña/app nueva. */
export function abrirWhatsApp(celular: string | null, texto: string) {
  window.open(linkWhatsApp(celular, texto), '_blank', 'noopener');
}
