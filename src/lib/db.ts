import { supabase } from './supabase';
import { initialsAvatar } from './avatar';
import { diaMes, diasHasta, momentoRelativo, periodoActual } from './fechas';
import { AutomationRule, ClubRole, DuesStatus, Player, SentMessage } from '../types';

// ---------------------------------------------------------------------------
// Filas tal como vienen de Supabase (ver supabase/migrations/)
// ---------------------------------------------------------------------------
interface PagoRow {
  monto?: number;
  metodo: string;
  recibo: string;
  pagado_en: string;
}

interface CuotaRow {
  periodo: string; // YYYY-MM-DD (primer día del mes)
  monto: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  pagos: PagoRow[] | null;
}

interface CarneRow {
  vencimiento: string;
  clinica: string;
  archivo_nombre: string | null;
  archivo_tamanio: string | null;
  verificado: boolean;
  notas: string | null;
  fecha_examen: string | null;
  archivo_path: string | null;
}

interface FichaLudRow {
  carne_en_mano: Player['ludRegistration']['cardInHand'];
  id_federado: number | null;
  categoria: string;
  consentimiento_firmado: boolean;
  vencimiento_carne: string | null;
  archivo_carne_path: string | null;
}

interface EstadoPlanillaRow {
  rol: Player['matchStatus']['lineupRole'];
  asistencia_confirmada: boolean | null;
  motivo_baja: string | null;
}

interface JugadorRow {
  id: string;
  numero: number | null;
  documento: string | null;
  fecha_nacimiento: string | null;
  habilitacion_manual: 'habilitado' | 'inhabilitado' | null;
  rol_club?: Player['rolClub'] | null;
  fecha_ultimo_examen?: string | null;
  excepcion_estudio?: 'recibido' | 'articulo' | null;
  motivo_habilitacion: string | null;
  nombre: string;
  apellido: string;
  posicion: string;
  categoria: string;
  anio_nacimiento: number | null;
  avatar_url: string | null;
  telefono: string;
  email: string;
  direccion: string;
  es_capitan: boolean;
  emergencia_nombre: string;
  emergencia_telefono: string;
  emergencia_relacion: Player['emergencyContact']['relation'];
  prestador_salud: string;
  emergencia_movil: Player['mobileEmergency'];
  numero_socio: string | null;
  // Las relaciones 1 a 1 pueden llegar como objeto o como array según PostgREST.
  carnes_salud: CarneRow[] | null;
  fichas_lud: FichaLudRow | FichaLudRow[] | null;
  estado_planilla: EstadoPlanillaRow | EstadoPlanillaRow[] | null;
  cuotas: CuotaRow[] | null;
}

interface ReglaRow {
  id: string;
  clave: string;
  titulo: string;
  etiqueta: string;
  descripcion: string;
  activa: boolean;
  icono: string;
  clase_etiqueta: string | null;
  clase_icono_fondo: string;
  clase_icono_color: string;
}

type TipoMensaje = 'general' | 'cuota' | 'carne' | 'cumpleanios' | 'citacion';

interface MensajeRow {
  id: string;
  jugador_id: string | null;
  jugador_nombre: string;
  tema: string;
  tipo: TipoMensaje;
  estado: SentMessage['status'];
  enviado_en: string;
}

interface RolRow {
  id: string;
  clave: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  etiqueta: string;
  icono: string;
  clase_icono: string;
  cantidad_activos: number;
}

const JUGADOR_SELECT =
  '*, carnes_salud(*), fichas_lud(*), estado_planilla(*), cuotas(periodo, monto, estado, pagos(monto, metodo, recibo, pagado_en))';

// ---------------------------------------------------------------------------
// Mapeos fila → tipos de la app
// ---------------------------------------------------------------------------
const uno = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const ESTADO_CUOTA: Record<CuotaRow['estado'], DuesStatus> = {
  pagada: 'paid',
  pendiente: 'pending',
  vencida: 'overdue',
};

function mapJugador(r: JugadorRow): Player {
  const carne = [...(r.carnes_salud ?? [])].sort((a, b) => b.vencimiento.localeCompare(a.vencimiento))[0];
  const ficha = uno(r.fichas_lud);
  const planilla = uno(r.estado_planilla);
  const cuotas = [...(r.cuotas ?? [])].sort((a, b) => b.periodo.localeCompare(a.periodo));
  const ultimaCuota = cuotas[0];
  const ultimoPago = cuotas
    .flatMap((c) => c.pagos ?? [])
    .sort((a, b) => b.pagado_en.localeCompare(a.pagado_en))[0];

  return {
    id: r.id,
    number: r.numero,
    firstName: r.nombre,
    lastName: r.apellido,
    position: r.posicion,
    category: r.categoria,
    birthYear: r.anio_nacimiento ?? (r.fecha_nacimiento ? Number(r.fecha_nacimiento.slice(0, 4)) : 0),
    birthDate: r.fecha_nacimiento ?? undefined,
    documento: r.documento ?? undefined,
    avatarUrl: r.avatar_url || initialsAvatar(r.nombre, r.apellido),
    phone: r.telefono,
    email: r.email,
    address: r.direccion,
    isCaptain: r.es_capitan,
    emergencyContact: {
      name: r.emergencia_nombre,
      phone: r.emergencia_telefono,
      relation: r.emergencia_relacion,
    },
    healthProvider: r.prestador_salud,
    mobileEmergency: r.emergencia_movil,
    memberNumber: r.numero_socio ?? undefined,
    medicalCertificate: {
      expiryDate: carne?.vencimiento ?? '',
      daysRemaining: carne ? diasHasta(carne.vencimiento) : 0,
      clinic: carne?.clinica ?? '',
      fileName: carne?.archivo_nombre ?? undefined,
      fileSize: carne?.archivo_tamanio ?? undefined,
      verified: carne?.verificado ?? false,
      notes: carne?.notas ?? undefined,
      examDate: carne?.fecha_examen ?? undefined,
      filePath: carne?.archivo_path ?? undefined,
    },
    ludRegistration: {
      cardInHand: ficha?.carne_en_mano ?? 'En trámite secretaría',
      federatedId: ficha?.id_federado ?? 0,
      category: ficha?.categoria ?? '',
      signedConsent: ficha?.consentimiento_firmado ?? false,
      cardExpiry: ficha?.vencimiento_carne ?? undefined,
      cardFilePath: ficha?.archivo_carne_path ?? undefined,
    },
    rolClub: r.rol_club ?? 'jugador',
    // Si todavía no se corrió la migración 11, el último examen sigue en la ficha médica.
    study: {
      lastExam: r.fecha_ultimo_examen ?? carne?.fecha_examen ?? undefined,
      exception: r.excepcion_estudio ?? undefined,
    },
    eligibilityOverride: r.habilitacion_manual
      ? { status: r.habilitacion_manual, reason: r.motivo_habilitacion ?? undefined }
      : undefined,
    matchStatus: {
      lineupRole: planilla?.rol ?? 'SUPLENTE',
      attendanceConfirmed: planilla?.asistencia_confirmada ?? undefined,
      declineReason: planilla?.motivo_baja ?? undefined,
    },
    dues: {
      period: ultimaCuota ? ultimaCuota.periodo.slice(0, 7) : periodoActual(),
      status: ultimaCuota ? ESTADO_CUOTA[ultimaCuota.estado] : 'pending',
      debtAmount: cuotas.filter((c) => c.estado !== 'pagada').reduce((s, c) => s + c.monto, 0),
      paymentMethod: ultimoPago?.metodo,
      receiptNumber: ultimoPago?.recibo,
      paidDate: ultimoPago ? diaMes(ultimoPago.pagado_en) : undefined,
      paidAmount: ultimoPago
        ? cuotas.flatMap((c) => c.pagos ?? []).filter((x) => x.recibo === ultimoPago.recibo).reduce((s, x) => s + (x.monto ?? 0), 0)
        : undefined,
      history: cuotas.map((c) => ({ period: c.periodo.slice(0, 7), status: ESTADO_CUOTA[c.estado], amount: c.monto })),
    },
  };
}

function mapRegla(r: ReglaRow): AutomationRule {
  return {
    id: r.id,
    key: r.clave,
    title: r.titulo,
    categoryTag: r.etiqueta,
    tagClass: r.clase_etiqueta ?? undefined,
    description: r.descripcion,
    active: r.activa,
    icon: r.icono,
    iconBgClass: r.clase_icono_fondo,
    iconColorClass: r.clase_icono_color,
  };
}

const COLOR_TIPO: Record<TipoMensaje, string> = {
  general: 'bg-[#445e8d]',
  cuota: 'bg-surface-tint',
  carne: 'bg-secondary',
  cumpleanios: 'bg-tertiary-fixed-dim',
  citacion: 'bg-[#445e8d]',
};

function mapMensaje(r: MensajeRow, players: Player[]): SentMessage {
  const player = players.find((p) => p.id === r.jugador_id);
  const [nombre = '', ...resto] = r.jugador_nombre.split(' ');
  const momento = momentoRelativo(r.enviado_en);
  return {
    id: r.id,
    playerName: r.jugador_nombre,
    playerAvatar: player?.avatarUrl ?? initialsAvatar(nombre, resto.join(' ')),
    topic: `${r.tema} • ${momento}`,
    timestamp: momento,
    status: r.estado,
    statusColor: 'text-surface-tint',
    avatarIndicatorColor: COLOR_TIPO[r.tipo] ?? COLOR_TIPO.general,
  };
}

function mapRol(r: RolRow): ClubRole {
  return {
    id: r.id,
    key: r.clave,
    title: r.titulo,
    subtitle: r.subtitulo,
    activeCount: r.cantidad_activos,
    description: r.descripcion,
    badgeLabel: r.etiqueta,
    icon: r.icono,
    iconBg: r.clase_icono,
  };
}

/** Deduce el tipo de mensaje a partir del tema, para el color del indicador. */
export function tipoDeTema(tema: string): TipoMensaje {
  const t = tema.toLowerCase();
  if (t.includes('cuota') || t.includes('pago')) return 'cuota';
  if (t.includes('carné') || t.includes('carne') || t.includes('salud')) return 'carne';
  if (t.includes('cumple')) return 'cumpleanios';
  if (t.includes('citación') || t.includes('citacion')) return 'citacion';
  return 'general';
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------
function cliente() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

export interface DatosClub {
  players: Player[];
  rules: AutomationRule[];
  sentMessages: SentMessage[];
  roles: ClubRole[];
  textos: Record<string, string>;
}

export async function cargarDatos(): Promise<DatosClub> {
  const db = cliente();
  const [jugadores, reglas, mensajes, roles, textos] = await Promise.all([
    // Los jugadores marcados como inactivos en el padrón no se muestran.
    db.from('jugadores').select(JUGADOR_SELECT).eq('activo', true).order('apellido').order('nombre'),
    db.from('reglas_automatizacion').select('*').order('orden'),
    db.from('mensajes_enviados').select('*').order('enviado_en', { ascending: false }).limit(50),
    db.from('roles_club').select('*').order('orden'),
    db.from('textos_app').select('clave, valor'),
  ]);
  const error = jugadores.error ?? reglas.error ?? mensajes.error ?? roles.error ?? textos.error;
  if (error) throw error;

  const players = (jugadores.data as JugadorRow[]).map(mapJugador);
  return {
    players,
    rules: (reglas.data as ReglaRow[]).map(mapRegla),
    sentMessages: (mensajes.data as MensajeRow[]).map((m) => mapMensaje(m, players)),
    roles: (roles.data as RolRow[]).map(mapRol),
    textos: Object.fromEntries(
      (textos.data as { clave: string; valor: string }[]).map((r) => [r.clave, r.valor])
    ),
  };
}

async function cargarJugador(id: string): Promise<Player> {
  const { data, error } = await cliente().from('jugadores').select(JUGADOR_SELECT).eq('id', id).single();
  if (error) throw error;
  return mapJugador(data as JugadorRow);
}

/** Alta de jugador (con carné, ficha LUD, planilla y cuota del mes). Devuelve el jugador guardado. */
export async function crearJugador(p: Player): Promise<Player> {
  const datos = {
    numero: p.number,
    nombre: p.firstName,
    apellido: p.lastName,
    posicion: p.position,
    categoria: p.category,
    anio_nacimiento: p.birthYear || null,
    documento: p.documento || null,
    fecha_nacimiento: p.birthDate || null,
    // Solo se guardan URLs reales; los avatares generados (data:) no.
    avatar_url: p.avatarUrl.startsWith('http') ? p.avatarUrl : null,
    telefono: p.phone,
    email: p.email,
    direccion: p.address,
    es_capitan: p.isCaptain ?? false,
    emergencia_nombre: p.emergencyContact.name,
    emergencia_telefono: p.emergencyContact.phone,
    emergencia_relacion: p.emergencyContact.relation,
    prestador_salud: p.healthProvider,
    emergencia_movil: p.mobileEmergency,
    numero_socio: p.memberNumber,
    carne_vencimiento: p.medicalCertificate.expiryDate,
    carne_clinica: p.medicalCertificate.clinic,
    carne_archivo_nombre: p.medicalCertificate.fileName,
    carne_archivo_tamanio: p.medicalCertificate.fileSize,
    carne_verificado: p.medicalCertificate.verified,
    carne_notas: p.medicalCertificate.notes,
    lud_carne_en_mano: p.ludRegistration.cardInHand,
    lud_id_federado: p.ludRegistration.federatedId || null,
    lud_categoria: p.ludRegistration.category,
    lud_consentimiento: p.ludRegistration.signedConsent,
    lud_vencimiento_carne: p.ludRegistration.cardExpiry || null,
    planilla_rol: p.matchStatus.lineupRole,
    cuota_estado: p.dues.status === 'paid' ? 'pagada' : p.dues.status === 'overdue' ? 'vencida' : 'pendiente',
    pago_metodo: p.dues.paymentMethod,
  };
  const { data, error } = await cliente().rpc('alta_jugador', { datos });
  if (error) throw error;
  return cargarJugador(data as string);
}

/**
 * Guarda los datos editables de un jugador (ficha, contacto, emergencia,
 * cobertura, planilla y carné en mano). Devuelve el jugador actualizado.
 */
export async function actualizarJugador(p: Player): Promise<Player> {
  const db = cliente();
  const jugador = await db
    .from('jugadores')
    .update({
      nombre: p.firstName.trim(),
      apellido: p.lastName.trim(),
      numero: p.number,
      posicion: p.position,
      es_capitan: p.isCaptain ?? false,
      telefono: p.phone.trim(),
      email: p.email.trim().toLowerCase(),
      direccion: p.address.trim(),
      emergencia_nombre: p.emergencyContact.name.trim(),
      emergencia_telefono: p.emergencyContact.phone.trim(),
      emergencia_relacion: p.emergencyContact.relation,
      prestador_salud: p.healthProvider,
      emergencia_movil: p.mobileEmergency,
      numero_socio: p.memberNumber?.trim() || null,
    })
    .eq('id', p.id)
    .select('id');
  if (jugador.error) throw jugador.error;
  // RLS no da error al actualizar sin permiso: simplemente no toca ninguna fila.
  if (!jugador.data?.length) throw sinPermiso();

  const planilla = await db
    .from('estado_planilla')
    .upsert({ jugador_id: p.id, rol: p.matchStatus.lineupRole }, { onConflict: 'jugador_id' });
  if (planilla.error) throw planilla.error;

  const ficha = await db
    .from('fichas_lud')
    .upsert({ jugador_id: p.id, carne_en_mano: p.ludRegistration.cardInHand }, { onConflict: 'jugador_id' });
  if (ficha.error) throw ficha.error;

  return cargarJugador(p.id);
}

/** Crea la cuota del mes actual para cada jugador activo que no la tenga. Devuelve cuántas creó. */
export async function generarCuotasDelMes(monto: number): Promise<number> {
  const { data, error } = await cliente().rpc('generar_cuotas_del_mes', { p_monto: monto });
  if (error) throw error;
  return data as number;
}

/** Cambia el rol en la planilla (titular, suplente, reserva, baja) de varios jugadores. */
export async function actualizarRolesPlanilla(cambios: Record<string, Player['matchStatus']['lineupRole']>): Promise<void> {
  const filas = Object.entries(cambios).map(([jugador_id, rol]) => ({ jugador_id, rol }));
  if (filas.length === 0) return;
  const { error } = await cliente().from('estado_planilla').upsert(filas, { onConflict: 'jugador_id' });
  if (error) throw error;
}

/** Asocia un email a la ficha de un jugador (p. ej. el admin que también juega). */
export async function asociarEmailJugador(jugadorId: string, email: string): Promise<void> {
  const { data, error } = await cliente()
    .from('jugadores')
    .update({ email: email.trim().toLowerCase() })
    .eq('id', jugadorId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw sinPermiso();
}

/** Registra el cobro de todas las cuotas impagas del jugador. Devuelve el jugador actualizado. */
export async function registrarPago(jugadorId: string, metodo: string): Promise<Player> {
  const { error } = await cliente().rpc('registrar_pago', { p_jugador_id: jugadorId, p_metodo: metodo });
  if (error) throw error;
  return cargarJugador(jugadorId);
}

/** El jugador logueado confirma asistencia o avisa ausencia (solo en su propia fila). */
export async function confirmarAsistencia(confirmada: boolean, motivo?: string): Promise<void> {
  const { error } = await cliente().rpc('confirmar_asistencia', {
    p_confirmada: confirmada,
    p_motivo: motivo ?? null,
  });
  if (error) throw error;
}

/** Error con el mismo código que usa Postgres cuando falta permiso. */
function sinPermiso(): Error {
  return Object.assign(new Error('Sin permiso'), { code: '42501' });
}

export async function actualizarRegla(id: string, activa: boolean): Promise<void> {
  const { data, error } = await cliente()
    .from('reglas_automatizacion')
    .update({ activa })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  // RLS no da error al actualizar sin permiso: simplemente no toca ninguna fila.
  if (!data?.length) throw sinPermiso();
}

/** Guarda en el historial un mensaje mandado al grupo del plantel. */
export async function registrarMensajeGrupo(tema: string): Promise<SentMessage> {
  const { data, error } = await cliente()
    .from('mensajes_enviados')
    .insert({ jugador_id: null, jugador_nombre: 'Grupo del plantel', tema, tipo: tipoDeTema(tema), estado: 'Enviado' })
    .select()
    .single();
  if (error) throw error;
  return mapMensaje(data as MensajeRow, []);
}

/** Guarda un aviso enviado a varios jugadores. Devuelve los mensajes guardados (más nuevo primero). */
export async function registrarMensajes(players: Player[], tema: string): Promise<SentMessage[]> {
  if (players.length === 0) return [];
  const tipo = tipoDeTema(tema);
  const { data, error } = await cliente()
    .from('mensajes_enviados')
    .insert(
      players.map((p) => ({
        jugador_id: p.id,
        jugador_nombre: `${p.firstName} ${p.lastName}`,
        tema,
        tipo,
        estado: 'Enviado',
      }))
    )
    .select();
  if (error) throw error;
  return (data as MensajeRow[]).map((m) => mapMensaje(m, players));
}

// ---------------------------------------------------------------------------
// Textos editables por el admin
// ---------------------------------------------------------------------------
export async function guardarTextos(textos: Record<string, string>): Promise<void> {
  const filas = Object.entries(textos).map(([clave, valor]) => ({ clave, valor }));
  if (filas.length === 0) return;
  const { error } = await cliente().from('textos_app').upsert(filas, { onConflict: 'clave' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Accesos del staff (solo admin)
// ---------------------------------------------------------------------------
export type RolStaff = 'admin' | 'dt' | 'tesorero';

export interface Miembro {
  email: string;
  rol: RolStaff;
  nombre: string | null;
}

export async function listarMiembros(): Promise<Miembro[]> {
  const { data, error } = await cliente().from('miembros_club').select('email, rol, nombre').order('rol').order('email');
  if (error) throw error;
  return data as Miembro[];
}

export async function guardarMiembro(m: Miembro): Promise<void> {
  const { error } = await cliente()
    .from('miembros_club')
    .upsert({ email: m.email.trim().toLowerCase(), rol: m.rol, nombre: m.nombre?.trim() || null }, { onConflict: 'email' });
  if (error) throw error;
}

export async function quitarMiembro(email: string): Promise<void> {
  const { data, error } = await cliente().from('miembros_club').delete().eq('email', email).select('email');
  if (error) throw error;
  if (!data?.length) throw sinPermiso();
}

// ---------------------------------------------------------------------------
// Habilitación y documentos (admin / DT)
// ---------------------------------------------------------------------------
const BUCKET_DOCUMENTOS = 'documentos';

/** Sube una foto o PDF a la carpeta del jugador. Devuelve la ruta guardada. */
export async function subirDocumento(jugadorId: string, tipo: 'carne-lud', archivo: File): Promise<string> {
  const ext = (archivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const ruta = `${jugadorId}/${tipo}-${Date.now()}.${ext}`;
  const { error } = await cliente()
    .storage.from(BUCKET_DOCUMENTOS)
    .upload(ruta, archivo, { contentType: archivo.type || undefined, upsert: false });
  if (error) throw error;
  return ruta;
}

/** Link temporal (1 hora) para ver un documento privado. */
export async function urlDocumento(ruta: string): Promise<string> {
  const { data, error } = await cliente().storage.from(BUCKET_DOCUMENTOS).createSignedUrl(ruta, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function guardarHabilitacion(
  jugadorId: string,
  override: Player['eligibilityOverride']
): Promise<void> {
  // Por función: el delegado puede cambiar la habilitación sin editar el resto de la ficha.
  const { error } = await cliente().rpc('guardar_habilitacion', {
    p_jugador_id: jugadorId,
    p_estado: override?.status ?? null,
    p_motivo: override?.reason?.trim() || null,
  });
  if (error) throw error;
}

/** Último examen aprobado y excepción (recibido / artículo). */
export async function guardarEstudio(
  jugadorId: string,
  e: { ultimoExamen: string | null; excepcion: 'recibido' | 'articulo' | null }
): Promise<void> {
  const { data, error } = await cliente()
    .from('jugadores')
    .update({ fecha_ultimo_examen: e.ultimoExamen, excepcion_estudio: e.excepcion })
    .eq('id', jugadorId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw sinPermiso();
}

/** Admin: rol del jugador en el club (jugador, delegado o cuerpo técnico). */
export async function asignarRolJugador(jugadorId: string, rol: NonNullable<Player['rolClub']>): Promise<void> {
  const { error } = await cliente().rpc('asignar_rol_jugador', { p_jugador_id: jugadorId, p_rol: rol });
  if (error) throw error;
}

export interface NuevaFichaMedica {
  vencimiento: string;
  fechaExamen?: string;
  clinica?: string;
  archivoPath?: string;
}

/** Agrega una ficha médica (queda como la vigente si vence después que la anterior). */
export async function cargarFichaMedica(jugadorId: string, f: NuevaFichaMedica): Promise<void> {
  const { error } = await cliente()
    .from('carnes_salud')
    .insert({
      jugador_id: jugadorId,
      vencimiento: f.vencimiento,
      fecha_examen: f.fechaExamen || null,
      clinica: f.clinica?.trim() ?? '',
      verificado: true,
      archivo_path: f.archivoPath ?? null,
      archivo_nombre: f.archivoPath ? f.archivoPath.split('/').pop() : null,
    });
  if (error) throw error;
}

export interface DatosCarneLud {
  idFederado: number | null;
  vencimiento: string | null;
  archivoPath?: string;
}

export async function guardarCarneLud(jugadorId: string, c: DatosCarneLud): Promise<void> {
  const cambios: Record<string, unknown> = {
    jugador_id: jugadorId,
    id_federado: c.idFederado,
    vencimiento_carne: c.vencimiento,
  };
  if (c.archivoPath) cambios.archivo_carne_path = c.archivoPath;
  const { error } = await cliente().from('fichas_lud').upsert(cambios, { onConflict: 'jugador_id' });
  if (error) throw error;
}

/** Vuelve a leer un jugador (después de cargar documentos). */
export { cargarJugador };
