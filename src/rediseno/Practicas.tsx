/** Staff: cargar la asistencia pegando la lista de WhatsApp, y ver el ranking. */
import { useMemo, useState } from 'react';
import { ClipboardPaste, Trash2 } from 'lucide-react';
import type { Player } from '../types';
import { api, mensajeError } from '../lib/api';
import type { Practica } from '../lib/modelo';
import { parsearLista, type LineaLista } from '../lib/listaWhatsapp';
import { diasHasta, fechaCorta, hoyISO } from '../lib/fechas';
import { AreaTexto, Boton, Campo, Card, Cargando, Chip, ErrorCaja, Hoja, Opciones, Pantalla, Titulo, Vacio, cx, nombreDe, useDatos, useToast } from './ui';

type Periodo = '30' | '90' | 'todo';

export default function Practicas() {
  const toast = useToast();
  const { datos, error, recargar } = useDatos(async () => {
    const [practicas, jugadores] = await Promise.all([api.practicas(), api.jugadores()]);
    return { practicas, jugadores: jugadores.filter((j) => j.activo !== false) };
  });
  const [cargar, setCargar] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [borrando, setBorrando] = useState<Practica | null>(null);

  const ranking = useMemo(() => {
    if (!datos) return { total: 0, filas: [] as { j: Player; n: number }[] };
    const dentro = datos.practicas.filter((p) => periodo === 'todo' || -diasHasta(p.fecha) <= Number(periodo));
    const cuenta = new Map<string, number>();
    for (const p of dentro) for (const id of p.jugadores) cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
    const filas = datos.jugadores
      .map((j) => ({ j, n: cuenta.get(j.id) ?? 0 }))
      .sort((a, b) => b.n - a.n || a.j.lastName.localeCompare(b.j.lastName));
    return { total: dentro.length, filas };
  }, [datos, periodo]);

  return (
    <Pantalla
      titulo="Prácticas"
      accion={
        <Boton icono={ClipboardPaste} onClick={() => setCargar(true)} disabled={!datos}>
          Pegar lista
        </Boton>
      }
    >
      {error ? (
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      ) : !datos ? (
        <Cargando />
      ) : (
        <>
          <section>
            <Titulo>Asistencia</Titulo>
            <Opciones
              label="Período"
              valor={periodo}
              onChange={setPeriodo}
              opciones={[
                { valor: '30', texto: '30 días' },
                { valor: '90', texto: '3 meses' },
                { valor: 'todo', texto: 'Todo' },
              ]}
            />
            {ranking.total === 0 ? (
              <Vacio>No hay prácticas en este período.</Vacio>
            ) : (
              <Card className="mt-3 p-0">
                <ul className="divide-y divide-borde">
                  {ranking.filas.map(({ j, n }) => {
                    const pct = Math.round((n / ranking.total) * 100);
                    return (
                      <li key={j.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                        <span className="min-w-0 flex-1 truncate">
                          {j.lastName}, {j.firstName}
                        </span>
                        <span className="h-2 w-16 overflow-hidden rounded-full bg-fondo" aria-hidden>
                          <span className={cx('block h-full', pct >= 60 ? 'bg-ok' : pct >= 30 ? 'bg-warn' : 'bg-bad')} style={{ width: `${pct}%` }} />
                        </span>
                        <span className="cifra w-14 text-right text-sm font-semibold">
                          {n} de {ranking.total}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <Titulo>Últimas prácticas</Titulo>
            {datos.practicas.length === 0 ? (
              <Vacio>Todavía no cargaste ninguna. Pegá la lista del grupo con el botón de arriba.</Vacio>
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-borde">
                  {datos.practicas.slice(0, 15).map((p) => (
                    <li key={p.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {fechaCorta(p.fecha)}
                          {p.hora && ` · ${p.hora}`}
                        </p>
                        <p className="truncate text-sm text-gris">
                          {p.lugar} · {p.jugadores.length} jugador{p.jugadores.length === 1 ? '' : 'es'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBorrando(p)}
                        aria-label={`Borrar práctica del ${fechaCorta(p.fecha)}`}
                        className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-gris hover:bg-red-50 hover:text-bad"
                      >
                        <Trash2 className="size-5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}

      {cargar && datos && (
        <HojaLista
          jugadores={datos.jugadores}
          ultima={datos.practicas[0] ?? null}
          onCerrar={() => setCargar(false)}
          onListo={() => {
            setCargar(false);
            recargar();
          }}
        />
      )}
      {borrando && (
        <Hoja
          titulo="¿Borrar práctica?"
          onCerrar={() => setBorrando(null)}
          pie={
            <div className="flex gap-2">
              <Boton
                variante="peligro"
                className="flex-1"
                onClick={async () => {
                  try {
                    await api.borrarPractica(borrando.id);
                    toast('Práctica borrada');
                    setBorrando(null);
                    recargar();
                  } catch (e) {
                    toast(mensajeError(e), 'error');
                  }
                }}
              >
                Borrar
              </Boton>
              <Boton variante="secundario" className="flex-1" onClick={() => setBorrando(null)}>
                Cancelar
              </Boton>
            </div>
          }
        >
          <p>
            La del {fechaCorta(borrando.fecha)} en {borrando.lugar}, con {borrando.jugadores.length} jugadores. Se descuenta de la asistencia de todos.
          </p>
        </Hoja>
      )}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
const ESTADO_LINEA = {
  seguro: { tono: 'ok', texto: 'OK' },
  duda: { tono: 'warn', texto: '¿Quién es?' },
  no_encontrado: { tono: 'bad', texto: 'No lo encuentro' },
  repetido: { tono: 'neutro', texto: 'Repetido' },
  ignorada: { tono: 'neutro', texto: 'Ignorada' },
} as const;

function HojaLista({
  jugadores,
  ultima,
  onCerrar,
  onListo,
}: {
  jugadores: Player[];
  ultima: Practica | null;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [lineas, setLineas] = useState<LineaLista[] | null>(null);
  /** Elección por índice de línea (pisa lo que dijo el parser). '' = no contar. */
  const [eleccion, setEleccion] = useState<Record<number, string>>({});
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState(ultima?.hora ?? '');
  const [lugar, setLugar] = useState(ultima?.lugar ?? '');
  const [cargando, setCargando] = useState(false);

  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const ordenados = useMemo(() => [...jugadores].sort((a, b) => a.lastName.localeCompare(b.lastName)), [jugadores]);

  const leer = () => {
    const r = parsearLista(
      texto,
      jugadores.map((j) => ({ id: j.id, nombre: j.firstName, apellido: j.lastName }))
    );
    setLineas(r);
    setEleccion({});
  };

  const elegidoDe = (l: LineaLista, i: number): string | null => (i in eleccion ? eleccion[i] || null : l.estado === 'seguro' ? l.jugadorId : null);
  const visibles = (lineas ?? []).map((l, i) => ({ l, i })).filter(({ l }) => l.estado !== 'ignorada');
  const ids = new Set(visibles.map(({ l, i }) => (l.estado === 'repetido' ? null : elegidoDe(l, i))).filter((x): x is string => !!x));
  const pendientes = visibles.filter(({ l, i }) => (l.estado === 'duda' || l.estado === 'no_encontrado') && !(i in eleccion)).length;

  const confirmar = async () => {
    if (!lugar.trim()) return toast('Poné el lugar.', 'error');
    setCargando(true);
    try {
      await api.crearPractica({ fecha, hora: hora || null, lugar: lugar.trim(), textoOriginal: texto, jugadores: [...ids] });
      toast(`Práctica cargada: ${ids.size} jugadores`);
      onListo();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  if (!lineas)
    return (
      <Hoja
        titulo="Pegar lista"
        onCerrar={onCerrar}
        pie={
          <Boton bloque disabled={!texto.trim()} onClick={leer}>
            Leer lista
          </Boton>
        }
      >
        <p className="text-gris">Copiá la lista de asistencia del grupo de WhatsApp y pegala acá, tal cual.</p>
        <AreaTexto label="Lista" value={texto} onChange={setTexto} filas={10} placeholder={'1. Juan Pérez\n2. Seba\n3. Rodríguez'} />
      </Hoja>
    );

  return (
    <Hoja
      titulo="Revisar lista"
      onCerrar={onCerrar}
      pie={
        <Boton bloque cargando={cargando} disabled={ids.size === 0} onClick={confirmar}>
          Confirmar práctica ({ids.size} jugador{ids.size === 1 ? '' : 'es'})
        </Boton>
      }
    >
      {pendientes > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-tinta ring-1 ring-warn/30">
          {pendientes} línea{pendientes === 1 ? '' : 's'} sin resolver: elegí quién es o dejala sin contar.
        </p>
      )}
      <ul className="space-y-2">
        {visibles.map(({ l, i }) => {
          const elegido = elegidoDe(l, i);
          const e = ESTADO_LINEA[l.estado];
          return (
            <li key={i} className="rounded-xl bg-fondo p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gris">{l.texto}</p>
                  <p className="font-semibold">{elegido ? nombreDe(porId.get(elegido)!) : l.estado === 'repetido' ? 'Ya está en la lista' : 'Sin contar'}</p>
                </div>
                <Chip tono={i in eleccion ? (elegido ? 'ok' : 'neutro') : e.tono}>{i in eleccion ? (elegido ? 'OK' : 'Sin contar') : e.texto}</Chip>
              </div>
              {l.estado === 'duda' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.candidatos.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEleccion({ ...eleccion, [i]: c.id })}
                      className={cx(
                        'min-h-11 cursor-pointer rounded-xl px-3 font-semibold ring-1',
                        elegido === c.id ? 'bg-navy text-white ring-navy' : 'bg-white text-navy ring-borde'
                      )}
                    >
                      {nombreDe(porId.get(c.id)!)}
                    </button>
                  ))}
                </div>
              )}
              {(l.estado === 'duda' || l.estado === 'no_encontrado' || l.estado === 'seguro') && (
                <div className="mt-2">
                  <label className="sr-only" htmlFor={`linea-${i}`}>
                    Elegir jugador para “{l.limpio}”
                  </label>
                  <select
                    id={`linea-${i}`}
                    value={i in eleccion ? eleccion[i] : (elegido ?? '__')}
                    onChange={(ev) => setEleccion({ ...eleccion, [i]: ev.target.value === '__' ? '' : ev.target.value })}
                    className="min-h-11 w-full rounded-xl bg-white px-3 text-base ring-1 ring-borde"
                  >
                    <option value="__">{l.estado === 'seguro' ? 'Cambiar…' : 'Elegir de la lista…'}</option>
                    <option value="">No contar esta línea</option>
                    {ordenados.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.lastName}, {j.firstName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Boton variante="texto" onClick={() => setLineas(null)}>
        Volver a pegar
      </Boton>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Campo label="Hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <Campo label="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />
    </Hoja>
  );
}
