// Función de Vercel (cron diario, ver vercel.json): avisos automáticos por notificación.
//
// Todos los días a la mañana revisa a cada jugador activo y le manda, si
// corresponde, un aviso por:
//   - ficha médica y carné LUD: cuando faltan N días (preventivo), M días
//     (urgente) y el día que vence;
//   - cuota del mes sin pagar: 3 días antes y el día que vence;
//   - cumpleaños: ese día.
// Y a los delegados (rol que asigna el admin en Club → Roles del plantel),
// un resumen de quién está por deber la cuota (3 días antes y el día que
// vence) y de quién la debe (todos los lunes y los días después del vencimiento).
// Cada aviso se manda una sola vez (tabla avisos_automaticos). Los avisos se
// prenden y apagan en Alertas → Avisos activos (tabla reglas_automatizacion).
//
// Variables en Vercel:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (Secret: la clave secreta de Supabase; solo acá)
//   VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
//   CRON_SECRET  (Secret: Vercel lo manda solo al llamar al cron)
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// ---------------------------------------------------------------------------
// Qué avisar (sin base de datos, para poder probarlo)
// ---------------------------------------------------------------------------

export interface JugadorAvisos {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string | null;
  /** Vencimiento más lejano de la ficha médica (la última cargada). */
  fichaMedica: string | null;
  carneLud: string | null;
  /** Cuotas sin pagar: periodo 'YYYY-MM-01' y monto. */
  cuotasImpagas: { periodo: string; monto: number }[];
}

export interface Ajustes {
  diasPreventivo: number;
  diasUrgente: number;
  diaVencimientoCuota: number;
  /** Reglas apagadas en Alertas → Avisos activos (las que no están, cuentan como prendidas). */
  apagadas: Set<string>;
  plantillaVencimiento: string;
  plantillaCuota: string;
  plantillaCumpleanios: string;
}

export interface Aviso {
  jugadorId: string;
  jugadorNombre: string;
  tipo: 'ficha_medica' | 'carne_lud' | 'cuota' | 'cumpleanios' | 'resumen_cuotas';
  referencia: string;
  hito: string;
  titulo: string;
  cuerpo: string;
  /** Tipo para el historial (mensajes_enviados). */
  tipoHistorial: 'carne' | 'cuota' | 'cumpleanios';
}

/** Lo vencido hace más de estos días no se avisa (lo maneja el staff desde Alertas). */
const TOLERANCIA_VENCIDO = 3;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const diasEntre = (desdeISO: string, hastaISO: string) =>
  Math.round((Date.parse(`${hastaISO}T00:00:00Z`) - Date.parse(`${desdeISO}T00:00:00Z`)) / 86_400_000);

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
};

const rellenar = (plantilla: string, valores: Record<string, string>) =>
  plantilla.replace(/\{(\w+)\}/g, (todo, clave: string) => (valores[clave] ? valores[clave] : todo));

/** Hoy en Uruguay, 'YYYY-MM-DD'. */
export const hoyUruguay = (ahora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' }).format(ahora);

/**
 * El hito que toca hoy: el más chico de los que ya se alcanzaron
 * (ej. con hitos 30/5/0 y faltando 3 días, toca el de 5).
 */
function hitoDeHoy(dias: number, hitos: number[]): number | null {
  if (dias < -TOLERANCIA_VENCIDO) return null;
  const alcanzados = hitos.filter((h) => dias <= h);
  return alcanzados.length ? Math.min(...alcanzados) : null;
}

/** Todos los avisos que corresponden hoy, sin mirar si ya se mandaron. */
export function calcularAvisos(jugadores: JugadorAvisos[], a: Ajustes, hoy: string): Aviso[] {
  const prendida = (clave: string) => !a.apagadas.has(clave);
  const avisos: Aviso[] = [];

  // Vencimientos: preventivo (regla carne_30_dias), urgente y el día (regla alerta_urgente).
  const hitosVenc = [
    ...(prendida('carne_30_dias') ? [a.diasPreventivo] : []),
    ...(prendida('alerta_urgente') ? [a.diasUrgente, 0] : []),
  ];
  const [anio, mes] = hoy.split('-').map(Number);
  const periodoActual = `${hoy.slice(0, 7)}-01`;
  const ultimoDiaMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const venceCuota = `${hoy.slice(0, 7)}-${String(Math.min(Math.max(a.diaVencimientoCuota, 1), ultimoDiaMes)).padStart(2, '0')}`;

  for (const j of jugadores) {
    const nombreCompleto = `${j.nombre} ${j.apellido}`;

    for (const [tipo, venc, documento] of [
      ['ficha_medica', j.fichaMedica, 'ficha médica'],
      ['carne_lud', j.carneLud, 'carné de la LUD'],
    ] as const) {
      if (!venc || hitosVenc.length === 0) continue;
      const dias = diasEntre(hoy, venc);
      const hito = hitoDeHoy(dias, hitosVenc);
      if (hito === null) continue;
      const titulo =
        dias > 0
          ? `Tu ${documento} vence en ${dias} ${dias === 1 ? 'día' : 'días'}`
          : dias === 0
          ? `Tu ${documento} vence hoy`
          : `Tu ${documento} está ${tipo === 'ficha_medica' ? 'vencida' : 'vencido'}`;
      avisos.push({
        jugadorId: j.id,
        jugadorNombre: nombreCompleto,
        tipo,
        referencia: venc,
        hito: String(hito),
        titulo,
        cuerpo: rellenar(a.plantillaVencimiento, { nombre: j.nombre, documento, vencimiento: fechaCorta(venc) }),
        tipoHistorial: 'carne',
      });
    }

    // Cuota del mes: 3 días antes y el día que vence, si sigue sin pagar.
    if (prendida('cuota_mensual') && j.cuotasImpagas.some((c) => c.periodo === periodoActual)) {
      const dias = diasEntre(hoy, venceCuota);
      const hito = hitoDeHoy(dias, [3, 0]);
      if (hito !== null) {
        const deuda = j.cuotasImpagas.reduce((s, c) => s + c.monto, 0);
        avisos.push({
          jugadorId: j.id,
          jugadorNombre: nombreCompleto,
          tipo: 'cuota',
          referencia: periodoActual,
          hito: String(hito),
          titulo: dias > 0 ? `La cuota vence en ${dias} ${dias === 1 ? 'día' : 'días'}` : dias === 0 ? 'La cuota vence hoy' : 'Tenés la cuota vencida',
          cuerpo: rellenar(a.plantillaCuota, { nombre: j.nombre, deuda: deuda.toLocaleString('es-UY') }),
          tipoHistorial: 'cuota',
        });
      }
    }

    // Cumpleaños.
    if (prendida('cumpleanios') && j.fechaNacimiento && j.fechaNacimiento.slice(5, 10) === hoy.slice(5, 10)) {
      avisos.push({
        jugadorId: j.id,
        jugadorNombre: nombreCompleto,
        tipo: 'cumpleanios',
        referencia: hoy.slice(0, 4),
        hito: 'dia',
        titulo: '¡Feliz cumpleaños! 🎉',
        cuerpo: rellenar(a.plantillaCumpleanios, { nombre: j.nombre }),
        tipoHistorial: 'cumpleanios',
      });
    }
  }
  return avisos;
}

const listaNombres = (js: JugadorAvisos[]) => {
  const nombres = js.map((j) => `${j.nombre} ${j.apellido}`);
  return nombres.length <= 4 ? nombres.join(', ') : `${nombres.slice(0, 4).join(', ')} y ${nombres.length - 4} más`;
};

/**
 * Resumen de cuotas para los delegados: quién está por deber (3 días antes
 * y el día del vencimiento) y quién debe (los lunes y del vencimiento en
 * adelante, un aviso por día como máximo).
 */
export function calcularResumenDelegados(
  jugadores: JugadorAvisos[],
  delegados: { id: string; nombre: string; apellido: string }[],
  a: Ajustes,
  hoy: string
): Aviso[] {
  if (a.apagadas.has('cuota_mensual') || delegados.length === 0) return [];
  const [anio, mes] = hoy.split('-').map(Number);
  const periodoActual = `${hoy.slice(0, 7)}-01`;
  const ultimoDiaMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const diaVence = Math.min(Math.max(a.diaVencimientoCuota, 1), ultimoDiaMes);
  const dias = diasEntre(hoy, `${hoy.slice(0, 7)}-${String(diaVence).padStart(2, '0')}`);
  const esLunes = new Date(`${hoy}T12:00:00Z`).getUTCDay() === 1;

  // Deben: cuotas de meses anteriores sin pagar, o la de este mes si ya venció.
  const deben = jugadores.filter((j) =>
    j.cuotasImpagas.some((c) => c.periodo < periodoActual || (c.periodo === periodoActual && dias < 0))
  );
  // Por deber: la de este mes sin pagar, todavía no vencida (y que no deban de antes).
  const porDeber = jugadores.filter(
    (j) => !deben.includes(j) && j.cuotasImpagas.some((c) => c.periodo === periodoActual) && dias >= 0
  );

  const partes: string[] = [];
  let titulo = '';
  if ((dias === 3 || dias === 0) && porDeber.length) {
    titulo = dias === 0 ? `Hoy vence la cuota: ${porDeber.length} sin pagar` : `En 3 días vence la cuota: ${porDeber.length} sin pagar`;
    partes.push(`Por deber: ${listaNombres(porDeber)}.`);
  }
  // Los que deben van los lunes, los días después del vencimiento y junto con el aviso de "por deber".
  if ((esLunes || (dias < 0 && dias >= -3) || titulo) && deben.length) {
    if (!titulo) titulo = `${deben.length} ${deben.length === 1 ? 'jugador debe' : 'jugadores deben'} la cuota`;
    partes.push(`Deben: ${listaNombres(deben)}.`);
  }
  if (!titulo) return [];
  const cuerpo = `${partes.join(' ')} Mirá el detalle en Alertas.`;
  return delegados.map((d) => ({
    jugadorId: d.id,
    jugadorNombre: `${d.nombre} ${d.apellido}`,
    tipo: 'resumen_cuotas' as const,
    referencia: hoy,
    hito: 'dia',
    titulo,
    cuerpo,
    tipoHistorial: 'cuota' as const,
  }));
}

// ---------------------------------------------------------------------------
// Cron
// ---------------------------------------------------------------------------

// Valores por defecto de src/lib/textos.tsx (si el admin no los cambió).
const POR_DEFECTO: Record<string, string> = {
  dias_aviso_preventivo: '30',
  dias_alerta_urgente: '5',
  cuota_dia_vencimiento: '10',
  plantilla_vencimiento:
    'Hola {nombre}, desde el Club Elbio Fernández te recordamos que tu {documento} vence el {vencimiento}. Para seguir habilitado en la Liga Universitaria, renovalo y avisale al delegado. ¡Arriba Elbio!',
  plantilla_cuota:
    'Hola {nombre}, te recordamos que tenés pendiente la cuota del club (${deuda}). Cualquier duda, escribinos. ¡Gracias!',
  plantilla_cumpleanios: '¡Feliz cumpleaños {nombre}! 🎉 Un abrazo grande de todo el Club Elbio Fernández.',
};

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } });

export async function GET(request: Request): Promise<Response> {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get('authorization') !== `Bearer ${secreto}`) {
    return json({ error: 'No autorizado.' }, 401);
  }
  const url = process.env.VITE_SUPABASE_URL;
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publica = process.env.VITE_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!url || !servicio || !publica || !privada) {
    return json({ error: 'Faltan variables en Vercel (SUPABASE_SERVICE_ROLE_KEY o las claves VAPID).' }, 500);
  }

  const db = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } });
  const hoy = hoyUruguay();

  const [textosR, reglasR, jugadoresR, subsR, enviadosR] = await Promise.all([
    db.from('textos_app').select('clave, valor'),
    db.from('reglas_automatizacion').select('clave, activa'),
    db
      .from('jugadores')
      .select('id, nombre, apellido, activo, fecha_nacimiento, carnes_salud(vencimiento), fichas_lud(vencimiento_carne), cuotas(periodo, monto, estado)'),
    db.from('push_suscripciones').select('jugador_id, endpoint, p256dh, auth').not('jugador_id', 'is', null),
    db.from('avisos_automaticos').select('jugador_id, tipo, referencia, hito'),
  ]);
  const error = textosR.error || reglasR.error || jugadoresR.error || subsR.error || enviadosR.error;
  if (error) return json({ error: error.message }, 500);

  const texto = (clave: string) =>
    (textosR.data ?? []).find((t) => t.clave === clave)?.valor?.trim() || POR_DEFECTO[clave];
  const ajustes: Ajustes = {
    diasPreventivo: Number(texto('dias_aviso_preventivo')) || 30,
    diasUrgente: Number(texto('dias_alerta_urgente')) || 5,
    diaVencimientoCuota: Number(texto('cuota_dia_vencimiento')) || 10,
    apagadas: new Set((reglasR.data ?? []).filter((r) => r.activa === false).map((r) => r.clave)),
    plantillaVencimiento: texto('plantilla_vencimiento'),
    plantillaCuota: texto('plantilla_cuota'),
    plantillaCumpleanios: texto('plantilla_cumpleanios'),
  };

  type FilaJugador = {
    id: string;
    nombre: string;
    apellido: string;
    activo: boolean | null;
    fecha_nacimiento: string | null;
    carnes_salud: { vencimiento: string }[] | null;
    fichas_lud: { vencimiento_carne: string | null } | { vencimiento_carne: string | null }[] | null;
    cuotas: { periodo: string; monto: number; estado: string }[] | null;
  };
  const jugadores: JugadorAvisos[] = ((jugadoresR.data ?? []) as FilaJugador[])
    .filter((j) => j.activo !== false)
    .map((j) => {
      const ficha = Array.isArray(j.fichas_lud) ? j.fichas_lud[0] : j.fichas_lud;
      const fichasMedicas = (j.carnes_salud ?? []).map((c) => c.vencimiento).sort();
      return {
        id: j.id,
        nombre: j.nombre,
        apellido: j.apellido,
        fechaNacimiento: j.fecha_nacimiento,
        fichaMedica: fichasMedicas[fichasMedicas.length - 1] ?? null,
        carneLud: ficha?.vencimiento_carne ?? null,
        cuotasImpagas: (j.cuotas ?? []).filter((c) => c.estado !== 'pagada').map((c) => ({ periodo: c.periodo, monto: c.monto })),
      };
    });

  const yaEnviado = new Set((enviadosR.data ?? []).map((e) => `${e.jugador_id}|${e.tipo}|${e.referencia}|${e.hito}`));
  // Delegados (columna rol_club de la migración 9; si todavía no se corrió, no hay resumen).
  const delegadosR = await db.from('jugadores').select('id, nombre, apellido, activo').eq('rol_club', 'delegado');
  const delegados = delegadosR.error ? [] : (delegadosR.data ?? []).filter((d) => d.activo !== false);

  const avisos = [...calcularAvisos(jugadores, ajustes, hoy), ...calcularResumenDelegados(jugadores, delegados, ajustes, hoy)].filter(
    (a) => !yaEnviado.has(`${a.jugadorId}|${a.tipo}|${a.referencia}|${a.hito}`)
  );

  const subsDe = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  for (const s of subsR.data ?? []) {
    const lista = subsDe.get(s.jugador_id) ?? [];
    lista.push(s);
    subsDe.set(s.jugador_id, lista);
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:elbiouniversitario@gmail.com', publica, privada);
  const vencidas: string[] = [];
  const mandados: Aviso[] = [];
  let sinNotificaciones = 0;

  for (const aviso of avisos) {
    const subs = subsDe.get(aviso.jugadorId) ?? [];
    if (subs.length === 0) {
      // Sin notificaciones activadas: no se marca, así le llega si las activa a tiempo.
      sinNotificaciones++;
      continue;
    }
    let llego = false;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: '/' }),
            { TTL: 60 * 60 * 24 }
          );
          llego = true;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) vencidas.push(s.endpoint);
        }
      })
    );
    if (llego) mandados.push(aviso);
  }

  if (mandados.length) {
    await db.from('avisos_automaticos').upsert(
      mandados.map((a) => ({ jugador_id: a.jugadorId, tipo: a.tipo, referencia: a.referencia, hito: a.hito })),
      { onConflict: 'jugador_id,tipo,referencia,hito', ignoreDuplicates: true }
    );
    await db.from('mensajes_enviados').insert(
      mandados.map((a) => ({
        jugador_id: a.jugadorId,
        jugador_nombre: a.jugadorNombre,
        tema: `Automático: ${a.titulo}`,
        tipo: a.tipoHistorial,
        estado: 'Enviado',
      }))
    );
  }
  if (vencidas.length) await db.from('push_suscripciones').delete().in('endpoint', vencidas);

  // Resumen en los logs de Vercel (Logs → Messages).
  console.log(
    `Avisos automáticos ${hoy}: ${mandados.length} enviados, ${sinNotificaciones} sin notificaciones activadas` +
      (mandados.length ? ` · ${mandados.map((a) => `${a.jugadorNombre}: ${a.titulo}`).join(' | ')}` : '')
  );
  return json({ fecha: hoy, enviados: mandados.length, sinNotificaciones, suscripcionesBorradas: vencidas.length });
}
