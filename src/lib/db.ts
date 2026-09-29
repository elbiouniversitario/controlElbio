import { supabase } from './supabase';
import { initialsAvatar } from './avatar';
import { diaMes, diasHasta, momentoRelativo, periodoActual } from './fechas';
import { AutomationRule, ClubRole, DuesStatus, Player, SentMessage } from '../types';

// ---------------------------------------------------------------------------
// Filas tal como vienen de Supabase (ver supabase/migrations/)
// ---------------------------------------------------------------------------
interface PagoRow {
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
}

interface FichaLudRow {
  carne_en_mano: Player['ludRegistration']['cardInHand'];
  id_federado: number | null;
  categoria: string;
  consentimiento_firmado: boolean;
}

interface EstadoPlanillaRow {
  rol: Player['matchStatus']['lineupRole'];
  asistencia_confirmada: boolean | null;
  motivo_baja: string | null;
}

interface JugadorRow {
  id: string;
  numero: number;
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
  titulo: string;
  subtitulo: string;
  descripcion: string;
  etiqueta: string;
  icono: string;
  clase_icono: string;
  cantidad_activos: number;
}

const JUGADOR_SELECT =
  '*, carnes_salud(*), fichas_lud(*), estado_planilla(*), cuotas(periodo, monto, estado, pagos(metodo, recibo, pagado_en))';

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
    birthYear: r.anio_nacimiento ?? 0,
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
    },
    ludRegistration: {
      cardInHand: ficha?.carne_en_mano ?? 'En trámite secretaría',
      federatedId: ficha?.id_federado ?? 0,
      category: ficha?.categoria ?? '',
      signedConsent: ficha?.consentimiento_firmado ?? false,
    },
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
    },
  };
}

function mapRegla(r: ReglaRow): AutomationRule {
  return {
    id: r.id,
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
}

export async function cargarDatos(): Promise<DatosClub> {
  const db = cliente();
  const [jugadores, reglas, mensajes, roles] = await Promise.all([
    db.from('jugadores').select(JUGADOR_SELECT).order('created_at'),
    db.from('reglas_automatizacion').select('*').order('orden'),
    db.from('mensajes_enviados').select('*').order('enviado_en', { ascending: false }).limit(50),
    db.from('roles_club').select('*').order('orden'),
  ]);
  const error = jugadores.error ?? reglas.error ?? mensajes.error ?? roles.error;
  if (error) throw error;

  const players = (jugadores.data as JugadorRow[]).map(mapJugador);
  return {
    players,
    rules: (reglas.data as ReglaRow[]).map(mapRegla),
    sentMessages: (mensajes.data as MensajeRow[]).map((m) => mapMensaje(m, players)),
    roles: (roles.data as RolRow[]).map(mapRol),
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
    anio_nacimiento: p.birthYear,
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
    lud_id_federado: p.ludRegistration.federatedId,
    lud_categoria: p.ludRegistration.category,
    lud_consentimiento: p.ludRegistration.signedConsent,
    planilla_rol: p.matchStatus.lineupRole,
    cuota_estado: p.dues.status === 'paid' ? 'pagada' : p.dues.status === 'overdue' ? 'vencida' : 'pendiente',
    pago_metodo: p.dues.paymentMethod,
  };
  const { data, error } = await cliente().rpc('alta_jugador', { datos });
  if (error) throw error;
  return cargarJugador(data as string);
}

/** Registra el cobro de todas las cuotas impagas del jugador. Devuelve el jugador actualizado. */
export async function registrarPago(jugadorId: string, metodo: string): Promise<Player> {
  const { error } = await cliente().rpc('registrar_pago', { p_jugador_id: jugadorId, p_metodo: metodo });
  if (error) throw error;
  return cargarJugador(jugadorId);
}

export async function actualizarAsistencia(
  jugadorId: string,
  confirmada: boolean,
  motivo?: string
): Promise<void> {
  const { error } = await cliente()
    .from('estado_planilla')
    .upsert(
      { jugador_id: jugadorId, asistencia_confirmada: confirmada, motivo_baja: motivo ?? null },
      { onConflict: 'jugador_id' }
    );
  if (error) throw error;
}

export async function actualizarRegla(id: string, activa: boolean): Promise<void> {
  const { error } = await cliente().from('reglas_automatizacion').update({ activa }).eq('id', id);
  if (error) throw error;
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
        // Todavía no hay integración real con WhatsApp: queda como 'Enviado'.
        estado: 'Enviado',
      }))
    )
    .select();
  if (error) throw error;
  return (data as MensajeRow[]).map((m) => mapMensaje(m, players));
}
