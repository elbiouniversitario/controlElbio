/**
 * Modo demo: la misma `Api` sobre datos en memoria, para probar la app sin base.
 * Se activa solo cuando no hay VITE_SUPABASE_URL. Nada sale del navegador.
 *
 * - Cédula de cualquier jugador demo: la que figura en initialData (o "1234567").
 * - El rol asignado del jugador vinculado se elige con `localStorage['ce_demo_rol']`
 *   ('jugador' | 'delegado' | 'tesorero'); por defecto 'tesorero' para ver todo.
 */
import { INITIAL_PLAYERS } from '../data/initialData';
import { hoyISO, periodoActual } from './fechas';
import { TEXTOS_DEFAULT } from './textos';
import type { Api, Ingreso, JugadorLista } from './api';
import {
  AvisoEnviado,
  Cargo,
  Cobro,
  ExcepcionCuota,
  Gasto,
  Pago,
  Practica,
  Rol,
  saldoDe,
} from './modelo';
import { Player } from '../types';

const espera = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const copia = <T,>(x: T): T => structuredClone(x);

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* sin storage: queda en memoria */
  }
}

// ---- Estado inicial ---------------------------------------------------------
const jugadores: Player[] = copia(INITIAL_PLAYERS).map((p) => ({ ...p, activo: true }));
const mes = periodoActual(); // YYYY-MM
const mesAnterior = (() => {
  const [a, m] = mes.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
})();

const cobros: Cobro[] = [
  { id: 'c-cuota-ant', concepto: 'Cuota anterior', tipo: 'cuota', fecha: `${mesAnterior}-01`, vence: `${mesAnterior}-10` },
  { id: 'c-cuota', concepto: 'Cuota del mes', tipo: 'cuota', fecha: `${mes}-01`, vence: `${mes}-10` },
  { id: 'c-asado', concepto: 'Asado fin de año', tipo: 'extra', fecha: `${mes}-05`, vence: null },
];

let cargos: Cargo[] = [];
for (const p of jugadores) {
  cargos.push({ id: `k-ant-${p.id}`, cobro: cobros[0], jugadorId: p.id, monto: 1400, pagos: [] });
  cargos.push({ id: `k-cuota-${p.id}`, cobro: cobros[1], jugadorId: p.id, monto: 1400, pagos: [] });
}
for (const id of ['p1', 'p2', 'p3', 'p5', 'p8']) {
  cargos.push({ id: `k-asado-${id}`, cobro: cobros[2], jugadorId: id, monto: 500, pagos: [] });
}
const pago = (cargoId: string, jugadorId: string, monto: number, estado: Pago['estado'], dias = 3): Pago => ({
  id: uid(),
  cargoId,
  jugadorId,
  monto,
  metodo: 'transferencia',
  estado,
  fotoPath: null,
  motivoRechazo: null,
  creadoEn: new Date(Date.now() - dias * 86_400_000).toISOString(),
});
// Mes anterior: casi todos pagaron.
for (const p of jugadores.slice(0, 7)) {
  const c = cargos.find((x) => x.id === `k-ant-${p.id}`)!;
  c.pagos.push(pago(c.id, p.id, 1400, 'confirmado', 25));
}
// Este mes: algunos pagaron, dos informaron.
for (const id of ['p2', 'p3', 'p4']) {
  const c = cargos.find((x) => x.id === `k-cuota-${id}`)!;
  c.pagos.push(pago(c.id, id, 1400, 'confirmado', 2));
}
for (const id of ['p1', 'p6']) {
  const c = cargos.find((x) => x.id === `k-cuota-${id}`)!;
  c.pagos.push(pago(c.id, id, 1400, 'informado', 1));
}

let gastos: Gasto[] = [
  { id: uid(), fecha: `${mes}-03`, monto: 2500, descripcion: 'Alquiler cancha' },
  { id: uid(), fecha: `${mes}-07`, monto: 900, descripcion: 'Pelotas' },
];
let excepciones: ExcepcionCuota[] = [{ jugadorId: 'p9', monto: 700, motivo: 'Beca 50 %' }];

const diaPractica = (atras: number) => {
  const d = new Date(Date.now() - atras * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
let practicas: Practica[] = [
  { id: uid(), fecha: diaPractica(2), hora: '20:00', lugar: 'Parque Rodó', jugadores: ['p1', 'p2', 'p3', 'p4', 'p6', 'p8'] },
  { id: uid(), fecha: diaPractica(7), hora: '20:00', lugar: 'Parque Rodó', jugadores: ['p1', 'p2', 'p4', 'p5', 'p6', 'p7', 'p8'] },
  { id: uid(), fecha: diaPractica(9), hora: '19:30', lugar: 'Complejo Sur', jugadores: ['p2', 'p3', 'p4', 'p8', 'p9'] },
];
let avisos: AvisoEnviado[] = [
  {
    id: uid(),
    titulo: 'Ficha médica',
    cuerpo: 'Te vence la ficha médica en 5 días.',
    destino: 'no_habilitados',
    cantidad: 2,
    enviadoEn: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];
let textos: Record<string, string> = { ...TEXTOS_DEFAULT };
let pin: string | null = null;
let staffHasta: string | null = null;
let fallosPin = 0;

const rolAsignado = (): Rol => {
  const r = leer('ce_demo_rol');
  return r === 'jugador' || r === 'delegado' || r === 'tesorero' ? r : 'tesorero';
};
const vigente = () => !!staffHasta && new Date(staffHasta) > new Date();
const rolEfectivo = (): Rol => (rolAsignado() !== 'jugador' && vigente() ? rolAsignado() : 'jugador');
const yo = () => leer('ce_demo_jugador');

function exigir(rol: 'staff' | 'tesorero') {
  const r = rolEfectivo();
  if (rol === 'staff' ? r === 'jugador' : r !== 'tesorero')
    throw Object.assign(new Error('No tenés permiso para hacer eso'), { code: '42501' });
}

function abrirStaff() {
  staffHasta = new Date(Date.now() + 12 * 3_600_000).toISOString();
}

// ---- Api --------------------------------------------------------------------
export const apiDemo: Api = {
  modo: 'demo',

  async haySesion() {
    return leer('ce_demo_sesion') === '1';
  },
  async entrar() {
    escribir('ce_demo_sesion', '1');
  },
  async salir() {
    escribir('ce_demo_sesion', null);
    escribir('ce_demo_jugador', null);
    staffHasta = null;
  },
  async perfil() {
    await espera(80);
    const id = yo();
    if (!id) return null;
    return {
      jugadorId: id,
      rolAsignado: rolAsignado(),
      rol: rolEfectivo(),
      tienePin: pin !== null,
      staffHasta: vigente() ? staffHasta : null,
    };
  },
  async plantelParaVincular() {
    return jugadores
      .filter((p) => p.activo !== false)
      .map((p): JugadorLista => ({ id: p.id, nombre: p.firstName, apellido: p.lastName }));
  },
  async vincular(jugadorId, cedula) {
    await espera();
    const p = jugadores.find((x) => x.id === jugadorId);
    const digitos = (s: string) => s.replace(/\D/g, '');
    if (!p) return 'cedula_incorrecta';
    const ok = digitos(cedula) === digitos(p.documento ?? '') || digitos(cedula) === '1234567';
    if (!ok) return 'cedula_incorrecta';
    escribir('ce_demo_jugador', jugadorId);
    return 'ok';
  },
  async crearPin(nuevo) {
    if (rolAsignado() === 'jugador') return 'no_es_staff';
    if (!/^\d{4,6}$/.test(nuevo)) return 'pin_invalido';
    if (pin) return 'ya_tiene_pin';
    pin = nuevo;
    abrirStaff();
    return 'ok';
  },
  async verificarPin(intento) {
    await espera();
    if (rolAsignado() === 'jugador') return 'no_es_staff';
    if (!pin) return 'sin_pin';
    if (fallosPin >= 5) return 'bloqueado';
    if (intento !== pin) {
      fallosPin++;
      return fallosPin >= 5 ? 'bloqueado' : 'incorrecto';
    }
    fallosPin = 0;
    abrirStaff();
    return 'ok';
  },
  async salirModoStaff() {
    staffHasta = null;
  },
  async resetearPin() {
    exigir('tesorero');
    // En demo hay un solo PIN (el del usuario actual): no se toca.
  },
  async asignarRol(jugadorId, rol) {
    exigir('tesorero');
    const p = jugadores.find((x) => x.id === jugadorId);
    if (p) p.rolClub = rol;
  },

  // ---- Plantel ----
  async jugadores() {
    await espera();
    if (rolEfectivo() === 'jugador') return copia(jugadores.filter((p) => p.id === yo()));
    return copia(jugadores);
  },
  async jugador(id) {
    const p = jugadores.find((x) => x.id === id);
    if (!p) throw new Error('No existe ese jugador');
    return copia(p);
  },
  async altaJugador(j) {
    exigir('staff');
    const base = jugadores[0];
    const id = `p-${uid()}`;
    jugadores.push({
      ...copia(base),
      id,
      firstName: j.nombre.trim(),
      lastName: j.apellido.trim(),
      documento: j.documento.trim(),
      phone: j.telefono.trim(),
      birthYear: j.anioNacimiento ?? base.birthYear,
      rolClub: 'jugador',
      activo: true,
      eligibilityOverride: undefined,
      medicalCertificate: { ...base.medicalCertificate, expiryDate: '', daysRemaining: -1, filePath: undefined },
      study: {},
      ludRegistration: { ...base.ludRegistration, cardExpiry: undefined, cardFilePath: undefined, federatedId: 0 },
    });
    return id;
  },
  async guardarHabilitacion(jugadorId, override) {
    exigir('staff');
    const p = jugadores.find((x) => x.id === jugadorId);
    if (p) p.eligibilityOverride = override ?? undefined;
  },
  async cargarFichaMedica(jugadorId, f) {
    exigir('staff');
    const p = jugadores.find((x) => x.id === jugadorId);
    if (!p) return;
    p.medicalCertificate = {
      ...p.medicalCertificate,
      expiryDate: f.vencimiento,
      clinic: f.clinica ?? '',
      daysRemaining: Math.round((Date.parse(f.vencimiento) - Date.parse(hoyISO())) / 86_400_000),
    };
  },
  async guardarCarneLud(jugadorId, c) {
    exigir('staff');
    const p = jugadores.find((x) => x.id === jugadorId);
    if (!p) return;
    p.ludRegistration = {
      ...p.ludRegistration,
      federatedId: c.idFederado ?? 0,
      cardExpiry: c.vencimiento ?? undefined,
    };
  },
  async guardarEstudio(jugadorId, e) {
    exigir('staff');
    const p = jugadores.find((x) => x.id === jugadorId);
    if (p) p.study = { ...p.study, lastExam: e.ultimoExamen ?? undefined, exception: e.excepcion ?? undefined };
  },
  async urlDocumento() {
    return '/escudo.png';
  },

  // ---- Plata ----
  async cargos(jugadorId) {
    await espera();
    const r = rolEfectivo();
    let lista = cargos;
    if (r !== 'tesorero') lista = lista.filter((c) => c.jugadorId === yo());
    if (jugadorId) lista = lista.filter((c) => c.jugadorId === jugadorId);
    return copia(lista).sort((a, b) => b.cobro.fecha.localeCompare(a.cobro.fecha));
  },
  async informarPago(cargoId, monto, metodo, foto) {
    await espera();
    const c = cargos.find((x) => x.id === cargoId && x.jugadorId === yo());
    if (!c) throw new Error('Ese cobro no es tuyo');
    if (c.pagos.some((p) => p.estado === 'informado')) throw new Error('Ya informaste un pago de este cobro');
    c.pagos.push({ ...pago(c.id, c.jugadorId, monto, 'informado', 0), metodo, fotoPath: foto ? 'demo' : null });
  },
  async pagosPendientes() {
    exigir('tesorero');
    return cargos.flatMap((c) =>
      c.pagos
        .filter((p) => p.estado === 'informado')
        .map((p) => ({ ...copia(p), concepto: c.cobro.concepto, montoCargo: c.monto }))
    );
  },
  async revisarPago(pagoId, confirmar, motivo) {
    exigir('tesorero');
    if (!confirmar && !motivo?.trim()) throw new Error('Poné el motivo del rechazo');
    for (const c of cargos)
      for (const p of c.pagos)
        if (p.id === pagoId) {
          p.estado = confirmar ? 'confirmado' : 'rechazado';
          p.motivoRechazo = confirmar ? null : motivo!.trim();
          if (confirmar) p.creadoEn = new Date().toISOString();
        }
  },
  async registrarPagoDirecto(cargoId, monto, metodo) {
    exigir('tesorero');
    const c = cargos.find((x) => x.id === cargoId);
    if (c) c.pagos.push({ ...pago(c.id, c.jugadorId, monto, 'confirmado', 0), metodo });
  },
  async crearCobro(n) {
    exigir('tesorero');
    const cobro: Cobro = { id: uid(), concepto: n.concepto.trim(), tipo: 'extra', fecha: n.fecha, vence: n.vence };
    for (const x of n.cargos)
      cargos.push({ id: uid(), cobro, jugadorId: x.jugadorId, monto: x.monto, pagos: [] });
    return cobro.id;
  },
  async generarCuotaMes(periodo) {
    exigir('tesorero');
    if (cargos.some((c) => c.cobro.tipo === 'cuota' && c.cobro.fecha === periodo)) return 0;
    const monto = Number(textos.cuota_monto) || 1400;
    const dia = String(Number(textos.cuota_dia_vencimiento) || 10).padStart(2, '0');
    const cobro: Cobro = { id: uid(), concepto: 'Cuota', tipo: 'cuota', fecha: periodo, vence: `${periodo.slice(0, 8)}${dia}` };
    let n = 0;
    for (const p of jugadores.filter((x) => x.activo !== false)) {
      const ex = excepciones.find((e) => e.jugadorId === p.id);
      const m = ex ? ex.monto : monto;
      if (m === 0) continue;
      cargos.push({ id: uid(), cobro, jugadorId: p.id, monto: m, pagos: [] });
      n++;
    }
    return n;
  },
  async deudores() {
    exigir('staff');
    const porJugador = new Map<string, { deuda: number; n: number }>();
    for (const c of cargos) {
      const s = saldoDe(c);
      if (s <= 0) continue;
      const d = porJugador.get(c.jugadorId) ?? { deuda: 0, n: 0 };
      d.deuda += s;
      d.n++;
      porJugador.set(c.jugadorId, d);
    }
    return [...porJugador].map(([jugadorId, d]) => ({ jugadorId, deuda: d.deuda, cargosPendientes: d.n }));
  },
  async ingresos(desde) {
    exigir('tesorero');
    return cargos
      .flatMap((c) =>
        c.pagos
          .filter((p) => p.estado === 'confirmado' && (!desde || p.creadoEn >= desde))
          .map((p): Ingreso => ({ id: p.id, jugadorId: p.jugadorId, concepto: c.cobro.concepto, monto: p.monto, metodo: p.metodo, fecha: p.creadoEn }))
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
  async gastos(desde) {
    exigir('tesorero');
    return copia(gastos.filter((g) => !desde || g.fecha >= desde)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
  async agregarGasto(g) {
    exigir('tesorero');
    gastos = [...gastos, { ...g, id: uid() }];
  },
  async borrarGasto(id) {
    exigir('tesorero');
    gastos = gastos.filter((g) => g.id !== id);
  },
  async excepciones() {
    exigir('tesorero');
    return copia(excepciones);
  },
  async guardarExcepcion(e) {
    exigir('tesorero');
    excepciones = [...excepciones.filter((x) => x.jugadorId !== e.jugadorId), e];
  },
  async quitarExcepcion(jugadorId) {
    exigir('tesorero');
    excepciones = excepciones.filter((x) => x.jugadorId !== jugadorId);
  },

  // ---- Prácticas ----
  async practicas() {
    await espera();
    const lista = copia(practicas).sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (rolEfectivo() !== 'jugador') return lista;
    return lista.map((p) => ({ ...p, jugadores: p.jugadores.filter((j) => j === yo()) }));
  },
  async crearPractica(n) {
    exigir('staff');
    const id = uid();
    practicas = [...practicas, { id, fecha: n.fecha, hora: n.hora, lugar: n.lugar.trim(), jugadores: [...new Set(n.jugadores)] }];
    return id;
  },
  async borrarPractica(id) {
    exigir('staff');
    practicas = practicas.filter((p) => p.id !== id);
  },

  // ---- Avisos ----
  async avisosEnviados() {
    exigir('staff');
    return copia(avisos);
  },
  async jugadoresConPush() {
    return new Set(['p1', 'p2', 'p3', 'p4', 'p6', 'p8']);
  },
  async mandarAviso(titulo, cuerpo, destino, jugadorIds) {
    exigir('staff');
    await espera(300);
    const conPush = await apiDemo.jugadoresConPush();
    const enviados = jugadorIds.filter((id) => conPush.has(id)).length;
    avisos = [{ id: uid(), titulo, cuerpo, destino, cantidad: enviados, enviadoEn: new Date().toISOString() }, ...avisos];
    return { enviados, sinNotificaciones: jugadorIds.length - enviados, fallidos: 0 };
  },

  // ---- Configuración ----
  async textos() {
    return { ...textos };
  },
  async guardarTextos(t) {
    exigir('tesorero');
    textos = { ...textos, ...t };
  },
};
