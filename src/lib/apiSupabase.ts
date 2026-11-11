/** Implementación de `Api` contra Supabase (migración 20261111000000_rediseno_roles.sql). */
import { supabase } from './supabase';
import { JUGADOR_SELECT_DOCS, JugadorRow, mapJugador } from './db';
import { jugadoresConPush, mandarNotificaciones } from './push';
import type { Api, Ingreso, JugadorLista, ResultadoVinculo } from './api';
import type {
  AvisoEnviado,
  Cargo,
  DestinoAviso,
  EstadoPago,
  MetodoPago,
  Pago,
  PagoPendiente,
  Perfil,
  Practica,
  ResultadoCrearPin,
  ResultadoPin,
  Rol,
} from './modelo';

const BUCKET = 'documentos';

function db() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

function sinPermiso(): Error {
  return Object.assign(new Error('No tenés permiso para hacer eso'), { code: '42501' });
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

function extension(f: File) {
  return (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

async function subir(ruta: string, f: File): Promise<string> {
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(ruta, f, { contentType: f.type || undefined, upsert: false });
  if (error) throw error;
  return ruta;
}

// ---- Filas ----------------------------------------------------------------
interface PagoRow {
  id: string;
  cargo_id: string;
  jugador_id: string;
  monto: number;
  metodo: string;
  estado: EstadoPago;
  foto_path: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  pagado_en?: string;
}

const metodo = (m: string): MetodoPago => (m === 'efectivo' ? 'efectivo' : 'transferencia');

const mapPago = (r: PagoRow): Pago => ({
  id: r.id,
  cargoId: r.cargo_id,
  jugadorId: r.jugador_id,
  monto: r.monto,
  metodo: metodo(r.metodo),
  estado: r.estado,
  fotoPath: r.foto_path,
  motivoRechazo: r.motivo_rechazo,
  creadoEn: r.created_at,
});

interface CargoRow {
  id: string;
  jugador_id: string;
  monto: number;
  cobros: { id: string; concepto: string; tipo: 'cuota' | 'extra'; fecha: string; vence: string | null };
  pagos: PagoRow[] | null;
}

const mapCargo = (r: CargoRow): Cargo => ({
  id: r.id,
  jugadorId: r.jugador_id,
  monto: r.monto,
  cobro: r.cobros,
  pagos: (r.pagos ?? []).map(mapPago),
});

// ---- Implementación -------------------------------------------------------
export const apiSupabase: Api = {
  modo: 'supabase',

  async haySesion() {
    const { data } = await db().auth.getSession();
    return !!data.session;
  },
  async entrar() {
    const { error } = await db().auth.signInAnonymously();
    if (error) throw error;
  },
  async salir() {
    // Si la sesión es anónima se pierde para siempre: primero se desvincula.
    await db().rpc('desvincularme').then(() => undefined, () => undefined);
    await db().auth.signOut();
  },
  async perfil() {
    const p = await rpc<{
      jugador_id: string | null;
      rol_asignado: Rol;
      rol: Rol;
      tiene_pin: boolean;
      staff_hasta: string | null;
    }>('mi_perfil');
    if (!p?.jugador_id) return null;
    const perfil: Perfil = {
      jugadorId: p.jugador_id,
      rolAsignado: p.rol_asignado,
      rol: p.rol,
      tienePin: p.tiene_pin,
      staffHasta: p.staff_hasta,
    };
    return perfil;
  },
  plantelParaVincular: () => rpc<JugadorLista[]>('plantel_para_vincular'),
  vincular: (jugadorId, cedula, celular) =>
    rpc<ResultadoVinculo>('vincular_jugador', { p_jugador_id: jugadorId, p_documento: cedula, p_telefono: celular }),
  crearPin: (pin) => rpc<ResultadoCrearPin>('crear_pin', { p_pin: pin }),
  verificarPin: (pin) => rpc<ResultadoPin>('verificar_pin', { p_pin: pin }),
  salirModoStaff: () => rpc<void>('salir_modo_staff'),
  resetearPin: (jugadorId) => rpc<void>('resetear_pin', { p_jugador_id: jugadorId }),
  asignarRol: (jugadorId, rol) => rpc<void>('asignar_rol_jugador', { p_jugador_id: jugadorId, p_rol: rol }),

  // ---- Plantel ----
  async jugadores() {
    const { data, error } = await db()
      .from('jugadores')
      .select(JUGADOR_SELECT_DOCS)
      .order('apellido')
      .order('nombre');
    if (error) throw error;
    return (data as unknown as JugadorRow[]).map(mapJugador);
  },
  async jugador(id) {
    const { data, error } = await db().from('jugadores').select(JUGADOR_SELECT_DOCS).eq('id', id).single();
    if (error) throw error;
    return mapJugador(data as unknown as JugadorRow);
  },
  altaJugador: (j) =>
    rpc<string>('alta_jugador', {
      datos: {
        nombre: j.nombre.trim(),
        apellido: j.apellido.trim(),
        documento: j.documento.trim(),
        telefono: j.telefono.trim(),
        anio_nacimiento: j.anioNacimiento,
      },
    }),
  guardarHabilitacion: (jugadorId, override) =>
    rpc<void>('guardar_habilitacion', {
      p_jugador_id: jugadorId,
      p_estado: override?.status ?? null,
      p_motivo: override?.reason?.trim() || null,
    }),
  async cargarFichaMedica(jugadorId, f) {
    const ruta = f.archivo ? await subir(`${jugadorId}/ficha-medica-${Date.now()}.${extension(f.archivo)}`, f.archivo) : null;
    const { error } = await db()
      .from('carnes_salud')
      .insert({
        jugador_id: jugadorId,
        vencimiento: f.vencimiento,
        fecha_examen: f.fechaExamen || null,
        clinica: f.clinica?.trim() ?? '',
        verificado: true,
        archivo_path: ruta,
        archivo_nombre: ruta ? ruta.split('/').pop() : null,
      });
    if (error) throw error;
  },
  async guardarCarneLud(jugadorId, c) {
    const cambios: Record<string, unknown> = {
      jugador_id: jugadorId,
      id_federado: c.idFederado,
      vencimiento_carne: c.vencimiento,
    };
    if (c.archivo) cambios.archivo_carne_path = await subir(`${jugadorId}/carne-lud-${Date.now()}.${extension(c.archivo)}`, c.archivo);
    const { error } = await db().from('fichas_lud').upsert(cambios, { onConflict: 'jugador_id' });
    if (error) throw error;
  },
  async guardarEstudio(jugadorId, e) {
    const { data, error } = await db()
      .from('jugadores')
      .update({ fecha_ultimo_examen: e.ultimoExamen, excepcion_estudio: e.excepcion })
      .eq('id', jugadorId)
      .select('id');
    if (error) throw error;
    if (!data?.length) throw sinPermiso();
  },
  async urlDocumento(ruta) {
    const { data, error } = await db().storage.from(BUCKET).createSignedUrl(ruta, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  // ---- Plata ----
  async cargos(jugadorId) {
    let q = db()
      .from('cargos')
      .select('id, jugador_id, monto, cobros!inner(id, concepto, tipo, fecha, vence), pagos(*)');
    if (jugadorId) q = q.eq('jugador_id', jugadorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as unknown as CargoRow[])
      .map(mapCargo)
      .sort((a, b) => b.cobro.fecha.localeCompare(a.cobro.fecha));
  },
  async informarPago(cargoId, monto, metodoPago, foto) {
    let ruta: string | null = null;
    if (foto) {
      const p = await apiSupabase.perfil();
      if (!p) throw sinPermiso();
      ruta = await subir(`comprobantes/${p.jugadorId}/${Date.now()}.${extension(foto)}`, foto);
    }
    await rpc('informar_pago', { p_cargo_id: cargoId, p_monto: monto, p_metodo: metodoPago, p_foto_path: ruta });
  },
  async pagosPendientes() {
    const { data, error } = await db()
      .from('pagos')
      .select('*, cargos!inner(monto, cobros!inner(concepto))')
      .eq('estado', 'informado')
      .order('created_at');
    if (error) throw error;
    return (data as unknown as (PagoRow & { cargos: { monto: number; cobros: { concepto: string } } })[]).map(
      (r): PagoPendiente => ({ ...mapPago(r), concepto: r.cargos.cobros.concepto, montoCargo: r.cargos.monto })
    );
  },
  revisarPago: (pagoId, confirmar, motivo) =>
    rpc<void>('revisar_pago', { p_pago_id: pagoId, p_confirmar: confirmar, p_motivo: motivo?.trim() || null }),
  registrarPagoDirecto: (cargoId, monto, metodoPago) =>
    rpc<void>('registrar_pago_directo', { p_cargo_id: cargoId, p_monto: monto, p_metodo: metodoPago }),
  crearCobro: (c) =>
    rpc<string>('crear_cobro', {
      p: {
        concepto: c.concepto.trim(),
        fecha: c.fecha,
        vence: c.vence,
        cargos: c.cargos.map((x) => ({ jugador_id: x.jugadorId, monto: x.monto })),
      },
    }),
  generarCuotaMes: (periodo) => rpc<number>('generar_cuota_mes', { p_periodo: periodo }),
  async deudores() {
    const filas = await rpc<{ jugador_id: string; deuda: number; cargos_pendientes: number }[]>('deudores');
    return (filas ?? []).map((r) => ({ jugadorId: r.jugador_id, deuda: r.deuda, cargosPendientes: r.cargos_pendientes }));
  },
  async ingresos(desde) {
    let q = db()
      .from('pagos')
      .select('id, jugador_id, monto, metodo, created_at, pagado_en, cargos(cobros(concepto))')
      .eq('estado', 'confirmado');
    if (desde) q = q.gte('pagado_en', desde);
    const { data, error } = await q.order('pagado_en', { ascending: false });
    if (error) throw error;
    return (data as unknown as (PagoRow & { cargos: { cobros: { concepto: string } } | null })[]).map(
      (r): Ingreso => ({
        id: r.id,
        jugadorId: r.jugador_id,
        concepto: r.cargos?.cobros.concepto ?? 'Pago',
        monto: r.monto,
        metodo: metodo(r.metodo),
        fecha: r.pagado_en ?? r.created_at,
      })
    );
  },
  async gastos(desde) {
    let q = db().from('gastos').select('id, fecha, monto, descripcion');
    if (desde) q = q.gte('fecha', desde);
    const { data, error } = await q.order('fecha', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async agregarGasto(g) {
    const { error } = await db().from('gastos').insert({ fecha: g.fecha, monto: g.monto, descripcion: g.descripcion.trim() });
    if (error) throw error;
  },
  async borrarGasto(id) {
    const { data, error } = await db().from('gastos').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw sinPermiso();
  },
  async excepciones() {
    const { data, error } = await db().from('excepciones_cuota').select('jugador_id, monto, motivo');
    if (error) throw error;
    return (data ?? []).map((r) => ({ jugadorId: r.jugador_id as string, monto: r.monto as number, motivo: r.motivo as string }));
  },
  async guardarExcepcion(e) {
    const { error } = await db()
      .from('excepciones_cuota')
      .upsert({ jugador_id: e.jugadorId, monto: e.monto, motivo: e.motivo.trim(), updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  async quitarExcepcion(jugadorId) {
    const { error } = await db().from('excepciones_cuota').delete().eq('jugador_id', jugadorId);
    if (error) throw error;
  },

  // ---- Prácticas ----
  async practicas() {
    const { data, error } = await db()
      .from('practicas')
      .select('id, fecha, hora, lugar, asistencias(jugador_id)')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return (data as unknown as { id: string; fecha: string; hora: string | null; lugar: string; asistencias: { jugador_id: string }[] }[]).map(
      (r): Practica => ({
        id: r.id,
        fecha: r.fecha,
        hora: r.hora ? r.hora.slice(0, 5) : null,
        lugar: r.lugar,
        jugadores: r.asistencias.map((a) => a.jugador_id),
      })
    );
  },
  crearPractica: (p) =>
    rpc<string>('crear_practica', {
      p: { fecha: p.fecha, hora: p.hora, lugar: p.lugar.trim(), texto_original: p.textoOriginal, jugadores: p.jugadores },
    }),
  async borrarPractica(id) {
    const { data, error } = await db().from('practicas').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw sinPermiso();
  },

  // ---- Avisos ----
  async avisosEnviados() {
    const { data, error } = await db()
      .from('avisos_enviados')
      .select('id, titulo, cuerpo, destino, cantidad, enviado_en')
      .order('enviado_en', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(
      (r): AvisoEnviado => ({
        id: r.id as string,
        titulo: r.titulo as string,
        cuerpo: r.cuerpo as string,
        destino: r.destino as DestinoAviso,
        cantidad: r.cantidad as number,
        enviadoEn: r.enviado_en as string,
      })
    );
  },
  jugadoresConPush,
  async mandarAviso(titulo, cuerpo, destino, jugadorIds) {
    const r = await mandarNotificaciones(
      titulo,
      jugadorIds.map((jugadorId) => ({ jugadorId, cuerpo }))
    );
    const resultado = { enviados: r.enviados.length, sinNotificaciones: r.sinNotificaciones.length, fallidos: r.fallidos };
    const { error } = await db()
      .from('avisos_enviados')
      .insert({ titulo, cuerpo, destino, cantidad: resultado.enviados });
    // El push ya salió: si falla el historial, no se lo hacemos repetir.
    if (error) console.warn('No se guardó el aviso en el historial', error);
    return resultado;
  },

  // ---- Configuración ----
  async textos() {
    const { data, error } = await db().from('textos_app').select('clave, valor');
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.clave as string, r.valor as string]));
  },
  async guardarTextos(t) {
    const filas = Object.entries(t).map(([clave, valor]) => ({ clave, valor }));
    const { error } = await db().from('textos_app').upsert(filas, { onConflict: 'clave' });
    if (error) throw error;
  },
};
