import { Player } from '../types';
import { diasHasta, fechaCorta, hoyISO } from './fechas';

/**
 * Regla de la LUD: para jugar hay que tener un examen aprobado posterior al
 * 25/10 del año anterior. Excepciones: recibido o con artículo.
 */

/** Corte automático: 25/10 del año anterior ('YYYY-MM-DD'). */
export const corteAutomatico = (hoy = hoyISO()) => `${Number(hoy.slice(0, 4)) - 1}-10-25`;

// Corte puesto a mano por el admin (Alertas → Estudio, o Textos de la app → Alertas), para dar margen.
let corteManual: string | null = null;

/** La app lo llama con el valor de Textos de la app ('' = automático). */
export function configurarCorteEstudio(valor: string) {
  const v = (valor ?? '').trim();
  corteManual = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export const corteEsManual = () => corteManual !== null;

/** Fecha de corte vigente: la puesta a mano o, si no hay, el 25/10 del año anterior. */
export const corteEstudio = (hoy = hoyISO()) => corteManual ?? corteAutomatico(hoy);

/**
 * Hasta cuándo sirve un examen: el último año en que vale es el siguiente si
 * se dio después del 25/10, o ese mismo año si fue antes. Vence el 31/12.
 */
export function venceExamen(examenISO: string): string {
  const anio = Number(examenISO.slice(0, 4));
  const ultimoAnio = examenISO.slice(5) >= '10-25' ? anio + 1 : anio;
  return `${ultimoAnio}-12-31`;
}

export type EstadoEstudio =
  | { estado: 'excepcion'; motivo: 'recibido' | 'articulo' }
  | { estado: 'sin_dato' }
  | { estado: 'vencido'; examen: string; corte: string }
  | { estado: 'vigente'; examen: string; vence: string; dias: number };

export function estadoEstudio(p: Player, hoy = hoyISO()): EstadoEstudio {
  const exc = p.study?.exception;
  if (exc) return { estado: 'excepcion', motivo: exc };
  const examen = p.study?.lastExam;
  if (!examen) return { estado: 'sin_dato' };
  const corte = corteEstudio(hoy);
  if (examen < corte) return { estado: 'vencido', examen, corte };
  const vence = venceExamen(examen);
  return { estado: 'vigente', examen, vence, dias: diasHasta(vence) };
}

/** Texto corto del corte, ej. '25/10/2025'. */
export const corteTexto = (hoy = hoyISO()) => {
  const [a, m, d] = corteEstudio(hoy).split('-');
  return `${d}/${m}/${a}`;
};

export const describirEstudio = (e: EstadoEstudio): string => {
  switch (e.estado) {
    case 'excepcion':
      return e.motivo === 'recibido' ? 'Recibido' : 'Con artículo';
    case 'sin_dato':
      return 'Sin último examen cargado';
    case 'vencido':
      return `Último examen ${fechaCorta(e.examen)}: anterior al ${corteTexto()}`;
    case 'vigente':
      return `Último examen ${fechaCorta(e.examen)} · sirve hasta ${fechaCorta(e.vence)}`;
  }
};
