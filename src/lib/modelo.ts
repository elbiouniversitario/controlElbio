/**
 * Modelo del rediseño 2026-11: roles (jugador ⊂ delegado ⊂ tesorero), plata
 * (cobros × cargos × pagos), prácticas y avisos. Los documentos del jugador
 * siguen en `Player` (src/types.ts).
 */

export type Rol = 'jugador' | 'delegado' | 'tesorero';

export const NOMBRE_ROL: Record<Rol, string> = {
  jugador: 'Jugador',
  delegado: 'Delegado',
  tesorero: 'Tesorero',
};

/** Quién está usando la app. */
export interface Perfil {
  jugadorId: string;
  /** Rol que le asignó el tesorero. */
  rolAsignado: Rol;
  /** Rol efectivo ahora: si es staff y no pasó el PIN, es 'jugador'. */
  rol: Rol;
  tienePin: boolean;
  /** ISO; hasta cuándo dura el modo staff (null = no está en modo staff). */
  staffHasta: string | null;
}

export const esStaff = (rol: Rol) => rol !== 'jugador';

export type ResultadoPin = 'ok' | 'incorrecto' | 'bloqueado' | 'sin_pin' | 'no_es_staff';
export type ResultadoCrearPin = 'ok' | 'no_es_staff' | 'ya_tiene_pin' | 'pin_invalido';

// ---------------------------------------------------------------------------
// Plata
// ---------------------------------------------------------------------------
export type MetodoPago = 'transferencia' | 'efectivo';
export type EstadoPago = 'informado' | 'confirmado' | 'rechazado';

export interface Pago {
  id: string;
  cargoId: string;
  jugadorId: string;
  monto: number;
  metodo: MetodoPago;
  estado: EstadoPago;
  /** Ruta en el bucket "documentos" (comprobantes/{jugador}/...). */
  fotoPath: string | null;
  motivoRechazo: string | null;
  /** ISO */
  creadoEn: string;
}

export interface Cobro {
  id: string;
  concepto: string;
  tipo: 'cuota' | 'extra';
  /** 'YYYY-MM-DD' */
  fecha: string;
  vence: string | null;
}

/** Lo que se le cobra a un jugador en un cobro, con sus pagos. */
export interface Cargo {
  id: string;
  cobro: Cobro;
  jugadorId: string;
  monto: number;
  pagos: Pago[];
}

/** Suma de pagos confirmados. */
export const pagadoDe = (c: Cargo) =>
  c.pagos.filter((p) => p.estado === 'confirmado').reduce((s, p) => s + p.monto, 0);
/** Lo que falta pagar (sin contar lo informado). */
export const saldoDe = (c: Cargo) => Math.max(0, c.monto - pagadoDe(c));
/** Informado y todavía sin revisar. */
export const informadoDe = (c: Cargo) =>
  c.pagos.filter((p) => p.estado === 'informado').reduce((s, p) => s + p.monto, 0);

export type EstadoCargo = 'pagado' | 'informado' | 'debe';
export function estadoCargo(c: Cargo): EstadoCargo {
  const saldo = saldoDe(c);
  if (saldo === 0) return 'pagado';
  return informadoDe(c) >= saldo ? 'informado' : 'debe';
}

export interface Deudor {
  jugadorId: string;
  deuda: number;
  cargosPendientes: number;
}

export interface Gasto {
  id: string;
  fecha: string;
  monto: number;
  descripcion: string;
}

export interface ExcepcionCuota {
  jugadorId: string;
  /** 0 = exonerado. */
  monto: number;
  motivo: string;
}

/** Para "Pagos por confirmar" del tesorero. */
export interface PagoPendiente extends Pago {
  concepto: string;
  montoCargo: number;
}

export interface NuevoCobro {
  concepto: string;
  fecha: string;
  vence: string | null;
  cargos: { jugadorId: string; monto: number }[];
}

// ---------------------------------------------------------------------------
// Prácticas
// ---------------------------------------------------------------------------
export interface Practica {
  id: string;
  fecha: string;
  /** 'HH:MM' o null */
  hora: string | null;
  lugar: string;
  jugadores: string[];
}

export interface NuevaPractica {
  fecha: string;
  hora: string | null;
  lugar: string;
  textoOriginal: string;
  jugadores: string[];
}

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------
export type DestinoAviso = 'todos' | 'no_habilitados' | 'deudores' | 'seleccion';

export interface AvisoEnviado {
  id: string;
  titulo: string;
  cuerpo: string;
  destino: DestinoAviso;
  cantidad: number;
  enviadoEn: string;
}

export interface ResultadoAviso {
  enviados: number;
  sinNotificaciones: number;
  fallidos: number;
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------
/** $ 1.400 */
export const pesos = (n: number) => `$ ${Math.round(n).toLocaleString('es-UY')}`;
