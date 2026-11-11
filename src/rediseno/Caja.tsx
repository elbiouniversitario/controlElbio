/** Tesorero: saldo, pagos por confirmar, deudores, cobros y gastos. */
import { useMemo, useState, type ReactNode } from 'react';
import { CalendarPlus, Check, Plus, Receipt, Trash2, X } from 'lucide-react';
import type { Player } from '../types';
import { api, mensajeError } from '../lib/api';
import { pesos, type PagoPendiente } from '../lib/modelo';
import { fechaCorta, hoyISO, nombrePeriodo, periodoActual } from '../lib/fechas';
import { useSesion } from './comun';
import { Boton, Campo, Card, Cargando, Chip, ErrorCaja, Hoja, Opciones, Pantalla, Titulo, Vacio, cx, nombreDe, useDatos, useToast } from './ui';

export default function Caja() {
  const toast = useToast();
  const { textos } = useSesion();
  const periodo = periodoActual();
  const desde = `${periodo}-01`;
  const { datos, error, recargar } = useDatos(async () => {
    const [pendientes, deudores, ingresos, gastos, ingresosMes, gastosMes, jugadores] = await Promise.all([
      api.pagosPendientes(),
      api.deudores(),
      api.ingresos(),
      api.gastos(),
      api.ingresos(desde),
      api.gastos(desde),
      api.jugadores(),
    ]);
    return { pendientes, deudores, ingresos, gastos, ingresosMes, gastosMes, jugadores: jugadores.filter((j) => j.activo !== false) };
  });
  const [revisando, setRevisando] = useState<PagoPendiente | null>(null);
  const [hoja, setHoja] = useState<'cobro' | 'gasto' | 'cuota' | 'gastos' | 'deudores' | null>(null);

  const porId = useMemo(() => new Map((datos?.jugadores ?? []).map((j) => [j.id, j])), [datos]);
  const nombre = (id: string) => {
    const j = porId.get(id);
    return j ? nombreDe(j) : 'Jugador';
  };

  if (error)
    return (
      <Pantalla titulo="Caja">
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      </Pantalla>
    );
  if (!datos)
    return (
      <Pantalla titulo="Caja">
        <Cargando />
      </Pantalla>
    );

  const suma = (xs: { monto: number }[]) => xs.reduce((s, x) => s + x.monto, 0);
  const saldo = suma(datos.ingresos) - suma(datos.gastos);
  const deudaTotal = suma(datos.deudores.map((d) => ({ monto: d.deuda })));
  const cerrar = (recarga = true) => {
    setHoja(null);
    if (recarga) recargar();
  };

  return (
    <Pantalla
      titulo="Caja"
      accion={
        <Boton icono={Plus} onClick={() => setHoja('cobro')}>
          Cobro
        </Boton>
      }
    >
      <Card className="bg-navy text-white ring-0">
        <p className="text-sm text-white/80">Saldo en caja</p>
        <p className={cx('cifra font-cond text-4xl font-extrabold', saldo < 0 && 'text-red-300')}>{pesos(saldo)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-sm">
          <div>
            <p className="text-white/80">Entró en {nombrePeriodo(periodo).toLowerCase()}</p>
            <p className="cifra text-lg font-bold">{pesos(suma(datos.ingresosMes))}</p>
          </div>
          <div>
            <p className="text-white/80">Salió</p>
            <p className="cifra text-lg font-bold">{pesos(suma(datos.gastosMes))}</p>
          </div>
        </div>
      </Card>

      <section>
        <Titulo>Pagos por confirmar ({datos.pendientes.length})</Titulo>
        {datos.pendientes.length === 0 ? (
          <Vacio>No hay pagos esperando. Cuando un jugador informe una transferencia, aparece acá.</Vacio>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-borde">
              {datos.pendientes.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setRevisando(p)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left hover:bg-fondo">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{nombre(p.jugadorId)}</p>
                      <p className="truncate text-sm text-gris">
                        {p.concepto} · {fechaCorta(p.creadoEn.slice(0, 10))}
                      </p>
                    </div>
                    <span className="cifra font-bold">{pesos(p.monto)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <Titulo
          accion={
            datos.deudores.length > 0 && (
              <Boton variante="texto" onClick={() => setHoja('deudores')}>
                Ver todos
              </Boton>
            )
          }
        >
          Deben
        </Titulo>
        {datos.deudores.length === 0 ? (
          <Vacio>Nadie debe nada.</Vacio>
        ) : (
          <Card>
            <p>
              <span className="cifra font-cond text-3xl font-extrabold text-bad">{pesos(deudaTotal)}</span>
              <span className="text-gris">
                {' '}
                entre {datos.deudores.length} jugador{datos.deudores.length === 1 ? '' : 'es'}
              </span>
            </p>
            <ul className="mt-2 space-y-1">
              {[...datos.deudores]
                .sort((a, b) => b.deuda - a.deuda)
                .slice(0, 3)
                .map((d) => (
                  <li key={d.jugadorId} className="flex justify-between gap-2">
                    <span className="truncate">{nombre(d.jugadorId)}</span>
                    <span className="cifra font-semibold">{pesos(d.deuda)}</span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <Titulo>Herramientas</Titulo>
        <div className="grid grid-cols-1 gap-2">
          <Boton variante="secundario" icono={CalendarPlus} bloque onClick={() => setHoja('cuota')}>
            Generar cuota de {nombrePeriodo(periodo).toLowerCase()}
          </Boton>
          <Boton variante="secundario" icono={Receipt} bloque onClick={() => setHoja('gasto')}>
            Anotar un gasto
          </Boton>
          <Boton variante="texto" bloque onClick={() => setHoja('gastos')}>
            Ver gastos ({datos.gastos.length})
          </Boton>
        </div>
      </section>

      {revisando && (
        <HojaRevisar
          pago={revisando}
          nombre={nombre(revisando.jugadorId)}
          onCerrar={() => setRevisando(null)}
          onListo={() => {
            setRevisando(null);
            recargar();
          }}
        />
      )}
      {hoja === 'cobro' && <HojaCobro jugadores={datos.jugadores} onCerrar={() => cerrar(false)} onListo={() => cerrar()} />}
      {hoja === 'gasto' && <HojaGasto onCerrar={() => cerrar(false)} onListo={() => cerrar()} />}
      {hoja === 'cuota' && (
        <Hoja
          titulo={`Cuota de ${nombrePeriodo(periodo).toLowerCase()}`}
          onCerrar={() => cerrar(false)}
          pie={
            <Boton
              bloque
              onClick={async () => {
                try {
                  const n = await api.generarCuotaMes(desde);
                  toast(n === 0 ? 'La cuota de este mes ya estaba generada' : `Cuota generada a ${n} jugadores`);
                  cerrar();
                } catch (e) {
                  toast(mensajeError(e), 'error');
                }
              }}
            >
              Generar cuota
            </Boton>
          }
        >
          <p>
            Le carga la cuota de {pesos(Number(textos.cuota_monto) || 0)} a cada jugador activo, menos a los exonerados; a los que tienen excepción les carga su monto
            especial.
          </p>
          <p className="text-gris">Si ya la generaste este mes no se duplica. El monto se cambia en Más → Textos.</p>
        </Hoja>
      )}
      {hoja === 'deudores' && (
        <Hoja titulo="Deben" onCerrar={() => cerrar(false)}>
          <ul className="divide-y divide-borde">
            {[...datos.deudores]
              .sort((a, b) => b.deuda - a.deuda)
              .map((d) => (
                <li key={d.jugadorId} className="flex min-h-12 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{nombre(d.jugadorId)}</p>
                    <p className="text-sm text-gris">
                      {d.cargosPendientes} cobro{d.cargosPendientes === 1 ? '' : 's'} sin pagar
                    </p>
                  </div>
                  <span className="cifra font-bold text-bad">{pesos(d.deuda)}</span>
                </li>
              ))}
          </ul>
          <p className="text-sm text-gris">Para avisarles, andá a Avisos → destino “Los que deben”.</p>
        </Hoja>
      )}
      {hoja === 'gastos' && (
        <Hoja titulo="Gastos" onCerrar={() => cerrar(false)}>
          {datos.gastos.length === 0 ? (
            <Vacio>No hay gastos anotados.</Vacio>
          ) : (
            <ul className="divide-y divide-borde">
              {datos.gastos.map((g) => (
                <li key={g.id} className="flex min-h-12 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{g.descripcion}</p>
                    <p className="text-sm text-gris">{fechaCorta(g.fecha)}</p>
                  </div>
                  <span className="cifra font-semibold">{pesos(g.monto)}</span>
                  <button
                    type="button"
                    aria-label={`Borrar gasto ${g.descripcion}`}
                    onClick={async () => {
                      if (!window.confirm(`¿Borrar “${g.descripcion}” (${pesos(g.monto)})?`)) return;
                      try {
                        await api.borrarGasto(g.id);
                        toast('Gasto borrado');
                        recargar();
                      } catch (e) {
                        toast(mensajeError(e), 'error');
                      }
                    }}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-gris hover:bg-red-50 hover:text-bad"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Hoja>
      )}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
function HojaRevisar({ pago, nombre, onCerrar, onListo }: { pago: PagoPendiente; nombre: string; onCerrar: () => void; onListo: () => void }) {
  const toast = useToast();
  const { datos: foto, error } = useDatos(async () => (pago.fotoPath ? api.urlDocumento(pago.fotoPath) : null), [pago.id]);
  const [rechazar, setRechazar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);

  const decidir = async (confirmar: boolean) => {
    if (!confirmar && !motivo.trim()) return toast('Poné el motivo: el jugador lo va a ver.', 'error');
    setCargando(true);
    try {
      await api.revisarPago(pago.id, confirmar, confirmar ? undefined : motivo.trim());
      toast(confirmar ? 'Pago confirmado' : 'Pago rechazado');
      onListo();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Hoja
      titulo="Revisar pago"
      onCerrar={onCerrar}
      pie={
        rechazar ? (
          <div className="flex gap-2">
            <Boton variante="peligro" className="flex-1" cargando={cargando} onClick={() => decidir(false)}>
              Rechazar
            </Boton>
            <Boton variante="secundario" className="flex-1" onClick={() => setRechazar(false)}>
              Volver
            </Boton>
          </div>
        ) : (
          <div className="flex gap-2">
            <Boton icono={Check} className="flex-1" cargando={cargando} onClick={() => decidir(true)}>
              Confirmar
            </Boton>
            <Boton variante="secundario" icono={X} className="flex-1" onClick={() => setRechazar(true)}>
              Rechazar
            </Boton>
          </div>
        )
      }
    >
      <div>
        <p className="font-cond text-2xl font-bold uppercase text-navy">{nombre}</p>
        <p className="text-gris">{pago.concepto}</p>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-fondo p-3">
        <span>Informó</span>
        <span className="cifra text-xl font-bold">{pesos(pago.monto)}</span>
      </div>
      {pago.monto !== pago.montoCargo && (
        <p className="text-sm text-gris">
          El cobro era de <span className="cifra">{pesos(pago.montoCargo)}</span>: queda como pago parcial.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Chip tono="neutro" icono={null}>
          {pago.metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}
        </Chip>
        <Chip tono="warn">Por confirmar</Chip>
      </div>
      {pago.fotoPath &&
        (error ? (
          <p className="text-bad">No se pudo cargar el comprobante.</p>
        ) : !foto ? (
          <Cargando texto="Cargando comprobante…" />
        ) : /\.pdf($|\?)/i.test(pago.fotoPath) ? (
          <a href={foto} target="_blank" rel="noreferrer" className="font-semibold text-marca underline">
            Abrir comprobante (PDF)
          </a>
        ) : (
          <a href={foto} target="_blank" rel="noreferrer">
            <img src={foto} alt={`Comprobante de ${nombre}`} className="max-h-[50dvh] w-full rounded-xl object-contain ring-1 ring-borde" />
          </a>
        ))}
      {!pago.fotoPath && <p className="text-gris">Sin comprobante adjunto.</p>}
      {rechazar && (
        <Campo label="Motivo del rechazo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. no llegó la transferencia" ayuda="El jugador lo ve en su ficha." autoFocus />
      )}
    </Hoja>
  );
}

// ---------------------------------------------------------------------------
function HojaCobro({ jugadores, onCerrar, onListo }: { jugadores: Player[]; onCerrar: () => void; onListo: () => void }) {
  const toast = useToast();
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [vence, setVence] = useState('');
  const [monto, setMonto] = useState('');
  const [quienes, setQuienes] = useState<'todos' | 'seleccion'>('todos');
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);

  const ordenados = useMemo(() => [...jugadores].sort((a, b) => a.lastName.localeCompare(b.lastName)), [jugadores]);
  const destino = quienes === 'todos' ? ordenados : ordenados.filter((j) => elegidos.has(j.id));
  const n = Number(monto.replace(/\D/g, ''));

  const crear = async () => {
    if (!concepto.trim()) return toast('Poné el concepto.', 'error');
    if (!(n > 0)) return toast('Poné un monto mayor a cero.', 'error');
    if (destino.length === 0) return toast('Elegí al menos un jugador.', 'error');
    setCargando(true);
    try {
      await api.crearCobro({ concepto: concepto.trim(), fecha, vence: vence || null, cargos: destino.map((j) => ({ jugadorId: j.id, monto: n })) });
      toast(`Cobro creado a ${destino.length} jugador${destino.length === 1 ? '' : 'es'}`);
      onListo();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Hoja
      titulo="Nuevo cobro"
      onCerrar={onCerrar}
      pie={
        <Boton bloque cargando={cargando} onClick={crear}>
          Cobrar {n > 0 ? pesos(n) : ''} a {destino.length} jugador{destino.length === 1 ? '' : 'es'}
        </Boton>
      }
    >
      <p className="text-gris">Para algo que no es la cuota: camiseta, viaje, inscripción, multa.</p>
      <Campo label="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Camiseta 2027" />
      <Campo label="Monto por jugador" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej. 900" />
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Campo label="Vence (opcional)" type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
      </div>
      <Opciones
        label="A quién"
        valor={quienes}
        onChange={setQuienes}
        opciones={[
          { valor: 'todos', texto: `Todos (${jugadores.length})` },
          { valor: 'seleccion', texto: 'Algunos' },
        ]}
      />
      {quienes === 'seleccion' && (
        <ListaSeleccion jugadores={ordenados} elegidos={elegidos} onChange={setElegidos} />
      )}
    </Hoja>
  );
}

/** Lista de casilleros de jugadores; se reusa en Avisos. */
export function ListaSeleccion({
  jugadores,
  elegidos,
  onChange,
  extra,
}: {
  jugadores: Player[];
  elegidos: Set<string>;
  onChange: (s: Set<string>) => void;
  extra?: (j: Player) => ReactNode;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Jugadores</legend>
      <div className="mb-1 flex gap-2">
        <Boton variante="texto" onClick={() => onChange(new Set(jugadores.map((j) => j.id)))}>
          Todos
        </Boton>
        <Boton variante="texto" onClick={() => onChange(new Set())}>
          Ninguno
        </Boton>
      </div>
      <ul className="divide-y divide-borde rounded-xl ring-1 ring-borde">
        {jugadores.map((j) => (
          <li key={j.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3">
              <input
                type="checkbox"
                className="size-5 accent-[var(--color-navy)]"
                checked={elegidos.has(j.id)}
                onChange={(e) => {
                  const s = new Set(elegidos);
                  if (e.target.checked) s.add(j.id);
                  else s.delete(j.id);
                  onChange(s);
                }}
              />
              <span className="flex-1">
                {j.lastName}, {j.firstName}
              </span>
              {extra?.(j)}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function HojaGasto({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const toast = useToast();
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);
  const n = Number(monto.replace(/\D/g, ''));

  return (
    <Hoja
      titulo="Anotar gasto"
      onCerrar={onCerrar}
      pie={
        <Boton
          bloque
          cargando={cargando}
          onClick={async () => {
            if (!descripcion.trim()) return toast('Poné en qué se gastó.', 'error');
            if (!(n > 0)) return toast('Poné un monto mayor a cero.', 'error');
            setCargando(true);
            try {
              await api.agregarGasto({ descripcion: descripcion.trim(), monto: n, fecha });
              toast('Gasto anotado');
              onListo();
            } catch (e) {
              toast(mensajeError(e), 'error');
            } finally {
              setCargando(false);
            }
          }}
        >
          Guardar gasto
        </Boton>
      }
    >
      <Campo label="En qué" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Pelotas, alquiler de cancha" />
      <Campo label="Monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <Campo label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
    </Hoja>
  );
}
