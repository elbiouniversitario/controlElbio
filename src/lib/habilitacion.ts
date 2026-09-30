import { Player } from '../types';
import { diasHasta } from './fechas';

/** Días hasta el vencimiento del carné de la liga (null si no está cargado). */
export const diasCarneLud = (p: Player): number | null =>
  p.ludRegistration.cardExpiry ? diasHasta(p.ludRegistration.cardExpiry) : null;

export const carneLudVencido = (p: Player): boolean => (diasCarneLud(p) ?? 1) <= 0;

/** Días hasta lo primero que vence: la ficha médica o el carné LUD. */
export const diasProximoVencimiento = (p: Player): number =>
  Math.min(p.medicalCertificate.daysRemaining, diasCarneLud(p) ?? Infinity);
