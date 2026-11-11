/**
 * Capa de datos del rediseño 2026-11. Las pantallas nuevas hablan SOLO con `api`;
 * detrás hay Supabase (producción) o un modo demo en memoria (sin .env).
 */
import { isSupabaseConfigured } from './supabase';
import { Player } from '../types';
import {
  AvisoEnviado,
  Cargo,
  Deudor,
  DestinoAviso,
  ExcepcionCuota,
  Gasto,
  MetodoPago,
  NuevaPractica,
  NuevoCobro,
  PagoPendiente,
  Perfil,
  Practica,
  ResultadoAviso,
  ResultadoCrearPin,
  ResultadoPin,
  Rol,
} from './modelo';
import { apiSupabase } from './apiSupabase';
import { apiDemo } from './apiDemo';

export type ResultadoVinculo = 'ok' | 'cedula_incorrecta' | 'bloqueado';

export interface JugadorLista {
  id: string;
  nombre: string;
  apellido: string;
}

export interface NuevoJugador {
  nombre: string;
  apellido: string;
  documento: string;
  telefono: string;
  anioNacimiento: number | null;
}

export interface FichaMedicaNueva {
  vencimiento: string;
  fechaExamen?: string;
  clinica?: string;
  archivo?: File | null;
}

export interface CarneLudNuevo {
  idFederado: number | null;
  vencimiento: string | null;
  archivo?: File | null;
}

export interface EstudioNuevo {
  ultimoExamen: string | null;
  excepcion: 'recibido' | 'articulo' | null;
}

/** Pago confirmado, para el movimiento de la caja. */
export interface Ingreso {
  id: string;
  jugadorId: string;
  concepto: string;
  monto: number;
  metodo: MetodoPago;
  /** ISO */
  fecha: string;
}

export interface Api {
  modo: 'supabase' | 'demo';

  // ---- Sesión y perfil ----------------------------------------------------
  /** Hay sesión (anónima) abierta. */
  haySesion(): Promise<boolean>;
  entrar(): Promise<void>;
  salir(): Promise<void>;
  /** null = sesión sin jugador vinculado (hay que pedir cédula). */
  perfil(): Promise<Perfil | null>;
  plantelParaVincular(): Promise<JugadorLista[]>;
  vincular(jugadorId: string, cedula: string, celular: string): Promise<ResultadoVinculo>;
  crearPin(pin: string): Promise<ResultadoCrearPin>;
  verificarPin(pin: string): Promise<ResultadoPin>;
  salirModoStaff(): Promise<void>;
  resetearPin(jugadorId: string): Promise<void>;
  asignarRol(jugadorId: string, rol: Rol): Promise<void>;

  // ---- Plantel y documentos ----------------------------------------------
  /** Staff: todo el plantel. Jugador: solo su fila (RLS). */
  jugadores(): Promise<Player[]>;
  jugador(id: string): Promise<Player>;
  altaJugador(j: NuevoJugador): Promise<string>;
  guardarHabilitacion(jugadorId: string, override: Player['eligibilityOverride']): Promise<void>;
  cargarFichaMedica(jugadorId: string, f: FichaMedicaNueva): Promise<void>;
  guardarCarneLud(jugadorId: string, c: CarneLudNuevo): Promise<void>;
  guardarEstudio(jugadorId: string, e: EstudioNuevo): Promise<void>;
  urlDocumento(ruta: string): Promise<string>;

  // ---- Plata --------------------------------------------------------------
  /** Sin id: todos los que permita RLS (tesorero: todos; jugador: los suyos). */
  cargos(jugadorId?: string): Promise<Cargo[]>;
  informarPago(cargoId: string, monto: number, metodo: MetodoPago, foto?: File | null): Promise<void>;
  pagosPendientes(): Promise<PagoPendiente[]>;
  revisarPago(pagoId: string, confirmar: boolean, motivo?: string): Promise<void>;
  registrarPagoDirecto(cargoId: string, monto: number, metodo: MetodoPago): Promise<void>;
  crearCobro(c: NuevoCobro): Promise<string>;
  /** 'YYYY-MM-01'. Devuelve cuántos cargos generó. */
  generarCuotaMes(periodo: string): Promise<number>;
  deudores(): Promise<Deudor[]>;
  ingresos(desde?: string): Promise<Ingreso[]>;
  gastos(desde?: string): Promise<Gasto[]>;
  agregarGasto(g: Omit<Gasto, 'id'>): Promise<void>;
  borrarGasto(id: string): Promise<void>;
  excepciones(): Promise<ExcepcionCuota[]>;
  guardarExcepcion(e: ExcepcionCuota): Promise<void>;
  quitarExcepcion(jugadorId: string): Promise<void>;

  // ---- Prácticas ----------------------------------------------------------
  practicas(): Promise<Practica[]>;
  crearPractica(p: NuevaPractica): Promise<string>;
  borrarPractica(id: string): Promise<void>;

  // ---- Avisos -------------------------------------------------------------
  avisosEnviados(): Promise<AvisoEnviado[]>;
  jugadoresConPush(): Promise<Set<string>>;
  mandarAviso(titulo: string, cuerpo: string, destino: DestinoAviso, jugadorIds: string[]): Promise<ResultadoAviso>;

  // ---- Configuración ------------------------------------------------------
  textos(): Promise<Record<string, string>>;
  guardarTextos(t: Record<string, string>): Promise<void>;
}

export const api: Api = isSupabaseConfigured ? apiSupabase : apiDemo;

/** Mensaje legible para mostrar un error de la api. */
export function mensajeError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  if (e?.code === '42501') return e.message || 'No tenés permiso para hacer eso';
  if (e?.message?.includes('Failed to fetch')) return 'Sin conexión. Probá de nuevo.';
  return e?.message || 'Algo salió mal';
}
