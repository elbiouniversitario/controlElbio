/** Contexto de la sesión y reglas de presentación compartidas entre pantallas. */
import { createContext, useContext } from 'react';
import type { Player } from '../types';
import type { Perfil } from '../lib/modelo';
import type { Textos } from '../lib/textos';
import { estadoHabilitacion, diasCarneLud } from '../lib/habilitacion';
import { describirEstudio, estadoEstudio } from '../lib/estudio';
import { fechaCorta } from '../lib/fechas';
import type { Tono } from './ui';

export interface Sesion {
  perfil: Perfil;
  textos: Textos;
  recargarPerfil: () => Promise<void>;
  recargarTextos: () => Promise<void>;
}
export const SesionCtx = createContext<Sesion | null>(null);
export function useSesion(): Sesion {
  const s = useContext(SesionCtx);
  if (!s) throw new Error('useSesion fuera de SesionCtx');
  return s;
}

/** Días de anticipación para "vence pronto" (texto dias_aviso_preventivo, default 30). */
export const diasAviso = (t: Textos) => Number(t.dias_aviso_preventivo) || 30;

export interface Documento {
  clave: 'ficha' | 'lud' | 'estudio';
  nombre: string;
  tono: Tono;
  estado: string;
  detalle: string;
}

function porDias(dias: number | null, aviso: number): { tono: Tono; estado: string } {
  if (dias === null) return { tono: 'neutro', estado: 'Sin cargar' };
  if (dias <= 0) return { tono: 'bad', estado: 'Vencida' };
  if (dias <= aviso) return { tono: 'warn', estado: `Vence en ${dias} día${dias === 1 ? '' : 's'}` };
  return { tono: 'ok', estado: 'Vigente' };
}

/** Los tres documentos de un jugador, con su estado legible. */
export function documentos(p: Player, aviso: number): Documento[] {
  const fm = p.medicalCertificate;
  const tieneFicha = !!fm.expiryDate;
  const ficha = porDias(tieneFicha ? fm.daysRemaining : null, aviso);
  const dl = diasCarneLud(p);
  const lud = porDias(dl, aviso);
  const est = estadoEstudio(p);
  const estTono: Tono =
    est.estado === 'vencido' ? 'bad' : est.estado === 'sin_dato' ? 'neutro' : est.estado === 'vigente' && est.dias <= aviso ? 'warn' : 'ok';
  return [
    {
      clave: 'ficha',
      nombre: 'Ficha médica',
      ...ficha,
      detalle: tieneFicha ? `Vence el ${fechaCorta(fm.expiryDate)}${fm.clinic ? ` · ${fm.clinic}` : ''}` : 'No hay ficha cargada',
    },
    {
      clave: 'lud',
      nombre: 'Carné LUD',
      ...lud,
      estado: lud.estado.replace('Vencida', 'Vencido'),
      detalle: p.ludRegistration.cardExpiry ? `Vence el ${fechaCorta(p.ludRegistration.cardExpiry)}` : 'Sin vencimiento cargado',
    },
    {
      clave: 'estudio',
      nombre: 'Estudio',
      tono: estTono,
      estado: est.estado === 'vencido' ? 'No cumple' : est.estado === 'sin_dato' ? 'Sin cargar' : 'Cumple',
      detalle: describirEstudio(est),
    },
  ];
}

/** Resumen de habilitación para chips y listas. */
export function resumenJugador(p: Player, aviso: number): { tono: Tono; texto: string; motivo: string | null; vencePronto: boolean } {
  const h = estadoHabilitacion(p);
  const docs = documentos(p, aviso);
  const vencePronto = docs.some((d) => d.tono === 'warn');
  if (!h.habilitado) return { tono: 'bad', texto: 'No habilita', motivo: h.motivo, vencePronto };
  if (vencePronto) return { tono: 'warn', texto: 'Vence pronto', motivo: docs.find((d) => d.tono === 'warn')!.nombre, vencePronto };
  return { tono: 'ok', texto: 'Habilitado', motivo: h.manual ? h.motivo : null, vencePronto };
}
