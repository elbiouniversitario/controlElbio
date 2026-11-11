/**
 * Parser de la lista de asistencia que se pega desde WhatsApp.
 *
 * SUPOSICIÓN (VERIFICAR con una lista real): una línea por jugador, con o sin
 * numeración ("1.", "2)", "3 -"), viñetas, emojis, paréntesis ("(arquero)") y
 * el prefijo de un export de chat ("[11/11/26, 20:01] Juan: ").
 * Cada línea se matchea contra el plantel por nombre, apellido o apodo,
 * tolerando tildes, mayúsculas, abreviaturas ("Seba") y un error de tipeo.
 *
 * Archivo sin imports a propósito: lo corre `node scripts/test-lista-whatsapp.ts`.
 */

export interface CandidatoLista {
  id: string;
  nombre: string;
  apellido: string;
  apodo?: string | null;
}

export type EstadoLinea = 'seguro' | 'duda' | 'no_encontrado' | 'repetido' | 'ignorada';

export interface LineaLista {
  /** Texto original de la línea. */
  texto: string;
  /** Lo que quedó después de limpiar numeración, emojis, etc. */
  limpio: string;
  estado: EstadoLinea;
  /** Jugador elegido (solo en 'seguro' y 'repetido'). */
  jugadorId: string | null;
  /** Mejores candidatos, de mayor a menor puntaje (para 'duda'). */
  candidatos: { id: string; puntaje: number }[];
}

/** minúsculas, sin tildes, solo letras y espacios. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-zñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NO_VIENE = /❌|🚫|\bno\s+(voy|puedo|va)\b|\bbaja\b/i;

/** Limpia una línea: prefijo de chat, numeración, viñetas, emojis, paréntesis. */
export function limpiarLinea(linea: string): string {
  let s = linea;
  // "[11/11/26, 20:01] Juan Pérez: texto"  o  "11/11/26 20:01 - Juan: texto"
  s = s.replace(/^\s*\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(:\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\]?\s*(-\s*)?[^:]{1,40}:\s*/i, '');
  // Emojis y modificadores.
  s = s.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}‍️]/gu, ' ');
  // Paréntesis y corchetes con su contenido.
  s = s.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
  // Numeración y viñetas al principio.
  s = s.replace(/^\s*(\d{1,3}\s*[.)\-–:]?|[-–•*·>])\s*/, '');
  return s.replace(/\s+/g, ' ').trim();
}

function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Parecido entre una palabra de la línea y una del jugador (0..1). */
function parecido(t: string, c: string): number {
  if (t === c) return 1;
  if (t.length === 1) return c.startsWith(t) ? 0.4 : 0; // inicial: "M."
  if (t.length >= 3 && c.startsWith(t)) return 0.85; // "seba" → "sebastian"
  if (t.length >= 4) {
    const d = distancia(t, c);
    if (d === 1) return 0.85;
    if (d === 2 && t.length >= 7) return 0.7;
  }
  return 0;
}

interface Partes {
  nombre: string[];
  apellido: string[];
  apodo: string[];
}

function partes(c: CandidatoLista): Partes {
  const tok = (s?: string | null) => (s ? normalizar(s).split(' ').filter(Boolean) : []);
  return { nombre: tok(c.nombre), apellido: tok(c.apellido), apodo: tok(c.apodo) };
}

/**
 * Puntaje 0..1 de una línea contra un jugador. Las palabras completas se
 * promedian; las iniciales ("V", "M.") solo confirman (+) o contradicen (−).
 */
export function puntaje(tokens: string[], p: Partes): number {
  const palabras = tokens.filter((t) => t.length > 1);
  const iniciales = tokens.filter((t) => t.length === 1);
  if (palabras.length === 0) return 0;
  const todos = [...p.nombre, ...p.apellido, ...p.apodo];
  const usados = new Set<number>();
  let suma = 0;
  let tocaNombre = false; // nombre o apodo
  let tocaApellido = false;
  for (const t of palabras) {
    let mejor = 0;
    let idx = -1;
    todos.forEach((c, i) => {
      if (usados.has(i)) return;
      const v = parecido(t, c);
      if (v > mejor) {
        mejor = v;
        idx = i;
      }
    });
    if (idx >= 0) {
      usados.add(idx);
      if (idx >= p.nombre.length && idx < p.nombre.length + p.apellido.length) tocaApellido = true;
      else tocaNombre = true;
    }
    suma += mejor;
  }
  let s = suma / palabras.length;
  if (tocaNombre && tocaApellido) s += 0.1;
  for (const i of iniciales) {
    const libre = todos.some((c, k) => !usados.has(k) && c.startsWith(i));
    s += libre ? 0.1 : -0.2;
  }
  return Math.round(Math.max(0, Math.min(1, s)) * 100) / 100;
}

const UMBRAL_SEGURO = 0.85;
const UMBRAL_DUDA = 0.5;
const MARGEN = 0.15;

/** Parsea el texto pegado y matchea cada línea contra el plantel. */
export function parsearLista(texto: string, plantel: CandidatoLista[]): LineaLista[] {
  const indice = plantel.map((c) => ({ id: c.id, p: partes(c) }));
  const vistos = new Set<string>();
  const salida: LineaLista[] = [];
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  const numerada = (l: string) => /^\s*\d{1,3}\s*[.)\-–:]/.test(l);
  // Lista numerada: una línea sin número que no matchea a nadie es encabezado ("Práctica jueves 20hs").
  const listaNumerada = lineas.filter(numerada).length * 2 > lineas.length;

  for (const linea of lineas) {
    if (!linea.trim()) continue;
    const limpio = limpiarLinea(linea);
    const tokens = normalizar(limpio).split(' ').filter((t) => t.length > 0);
    const base = { texto: linea.trim(), limpio, jugadorId: null, candidatos: [] };

    // Sin letras (separadores, "-----", solo emojis) o "no voy": se ignora.
    if (tokens.length === 0 || NO_VIENE.test(linea)) {
      salida.push({ ...base, estado: 'ignorada' });
      continue;
    }
    // Encabezados largos ("Práctica martes 20 hs en el Parque"): más de 4 palabras.
    const candidatos = indice
      .map(({ id, p }) => ({ id, puntaje: puntaje(tokens, p) }))
      .filter((c) => c.puntaje >= UMBRAL_DUDA)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 3);

    if (candidatos.length === 0) {
      const encabezado = tokens.length > 4 || (listaNumerada && !numerada(linea));
      salida.push({ ...base, estado: encabezado ? 'ignorada' : 'no_encontrado' });
      continue;
    }
    const [mejor, segundo] = candidatos;
    const claro = mejor.puntaje >= UMBRAL_SEGURO && (!segundo || mejor.puntaje - segundo.puntaje >= MARGEN);
    if (!claro) {
      salida.push({ ...base, estado: 'duda', candidatos });
      continue;
    }
    const repetido = vistos.has(mejor.id);
    vistos.add(mejor.id);
    salida.push({ ...base, estado: repetido ? 'repetido' : 'seguro', jugadorId: mejor.id, candidatos });
  }
  return salida;
}
