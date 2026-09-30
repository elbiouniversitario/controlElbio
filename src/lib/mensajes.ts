import { Player } from '../types';
import { Textos } from './textos';
import { fechaCorta } from './fechas';
import { diasCarneLud } from './habilitacion';

/** Valores para las plantillas de WhatsApp: los del partido y, si hay jugador, los suyos. */
export function variablesMensaje(t: Textos, p?: Player): Record<string, string> {
  const base: Record<string, string> = {
    fecha: t.fecha,
    rival: t.rival,
    dia: t.partido_dia,
    hora: t.partido_hora,
    citacion: t.citacion_hora,
    cancha: t.cancha,
  };
  if (!p) return base;
  // Lo que vence primero: ficha médica o carné LUD.
  const dLud = diasCarneLud(p);
  const venceCarne = dLud !== null && dLud < p.medicalCertificate.daysRemaining;
  return {
    ...base,
    nombre: p.firstName,
    documento: venceCarne ? 'carné de la LUD' : 'ficha médica',
    vencimiento: fechaCorta((venceCarne ? p.ludRegistration.cardExpiry : p.medicalCertificate.expiryDate) ?? '') || 'pronto',
    deuda: p.dues.debtAmount.toLocaleString('es-UY'),
  };
}
