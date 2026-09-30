import { Player } from '../types';
import { diasHasta } from './fechas';

/** Días hasta el vencimiento del carné de la liga (null si no está cargado). */
export const diasCarneLud = (p: Player): number | null =>
  p.ludRegistration.cardExpiry ? diasHasta(p.ludRegistration.cardExpiry) : null;

export const carneLudVencido = (p: Player): boolean => (diasCarneLud(p) ?? 1) <= 0;

/** Días hasta lo primero que vence: la ficha médica o el carné LUD. */
export const diasProximoVencimiento = (p: Player): number =>
  Math.min(p.medicalCertificate.daysRemaining, diasCarneLud(p) ?? Infinity);

export interface EstadoHabilitacion {
  habilitado: boolean;
  /** Por qué no está habilitado (o el motivo cargado si se forzó). */
  motivo: string | null;
  /** true si lo decidió el staff a mano (no por vencimientos). */
  manual: boolean;
}

/**
 * Si el staff forzó la habilitación, manda eso. Si no, se calcula: ficha
 * médica vigente y no estar de baja (y, si está activado, sin cuota vencida).
 * El carné LUD vencido NO inhabilita: solo genera alertas.
 */
export function estadoHabilitacion(p: Player, opciones: { bloquearPorDeuda?: boolean } = {}): EstadoHabilitacion {
  const o = p.eligibilityOverride;
  if (o) {
    return {
      habilitado: o.status === 'habilitado',
      motivo: o.reason || (o.status === 'habilitado' ? 'Habilitado por el cuerpo técnico' : 'Inhabilitado por el cuerpo técnico'),
      manual: true,
    };
  }
  if (p.medicalCertificate.daysRemaining <= 0) return { habilitado: false, motivo: 'Ficha médica vencida', manual: false };
  if (p.matchStatus.lineupRole === 'BAJA') return { habilitado: false, motivo: 'Dado de baja', manual: false };
  if (opciones.bloquearPorDeuda && p.dues.status === 'overdue')
    return { habilitado: false, motivo: 'Cuota vencida', manual: false };
  return { habilitado: true, motivo: null, manual: false };
}

/** El admin lo activa en Textos de la app ("Inhabilitar por cuota vencida": si / no). */
export const bloquearPorDeuda = (valor: string) => valor.trim().toLowerCase().startsWith('s');
