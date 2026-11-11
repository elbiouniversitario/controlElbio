/** Staff: lista del plantel con filtros y la ficha de cada jugador. */
import { useMemo, useState } from 'react';
import { ChevronRight, ExternalLink, Plus, Search } from 'lucide-react';
import type { Player } from '../types';
import { api, mensajeError } from '../lib/api';
import { estadoCargo, pesos, saldoDe, type Cargo, type MetodoPago } from '../lib/modelo';
import { normalizar } from '../lib/listaWhatsapp';
import { diasAviso, documentos, resumenJugador, useSesion, type Documento } from './comun';
import { Boton, Campo, Card, Cargando, Chip, ErrorCaja, Hoja, Opciones, Pantalla, Titulo, Vacio, cx, nombreDe, useDatos, useToast } from './ui';

type Filtro = 'todos' | 'no_habilita' | 'vence' | 'debe';

export default function Plantel() {
  const { perfil, textos } = useSesion();
  const tesorero = perfil.rol === 'tesorero';
  const aviso = diasAviso(textos);
  const { datos, error, recargar } = useDatos(async () => {
    const [jugadores, deudores] = await Promise.all([api.jugadores(), tesorero ? api.deudores() : Promise.resolve([])]);
    return { jugadores: jugadores.filter((j) => j.activo !== false), deuda: new Map(deudores.map((d) => [d.jugadorId, d.deuda])) };
  }, [tesorero]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [alta, setAlta] = useState(false);

  const filas = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busca);
    return datos.jugadores
      .map((j) => ({ j, r: resumenJugador(j, aviso), deuda: datos.deuda.get(j.id) ?? 0 }))
      .filter(({ j, r, deuda }) => {
        if (q && !normalizar(nombreDe(j)).includes(q)) return false;
        if (filtro === 'no_habilita') return r.tono === 'bad';
        if (filtro === 'vence') return r.vencePronto;
        if (filtro === 'debe') return deuda > 0;
        return true;
      })
      .sort((a, b) => a.j.lastName.localeCompare(b.j.lastName));
  }, [datos, busca, filtro, aviso]);

  const cuenta = (f: Filtro) => {
    if (!datos) return 0;
    return datos.jugadores.filter((j) => {
      const r = resumenJugador(j, aviso);
      return f === 'no_habilita' ? r.tono === 'bad' : f === 'vence' ? r.vencePronto : f === 'debe' ? (datos.deuda.get(j.id) ?? 0) > 0 : true;
    }).length;
  };

  const filtros: { f: Filtro; texto: string }[] = [
    { f: 'todos', texto: 'Todos' },
    { f: 'no_habilita', texto: 'No habilita' },
    { f: 'vence', texto: 'Vence pronto' },
    ...(tesorero ? [{ f: 'debe' as Filtro, texto: 'Debe' }] : []),
  ];

  return (
    <Pantalla
      titulo="Plantel"
      accion={
        <Boton variante="secundario" icono={Plus} onClick={() => setAlta(true)}>
          Jugador
        </Boton>
      }
    >
      {error ? (
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      ) : !datos ? (
        <Cargando />
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gris" aria-hidden />
            <label htmlFor="busca-plantel" className="sr-only">
              Buscar jugador
            </label>
            <input
              id="busca-plantel"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar jugador"
              className="min-h-11 w-full rounded-xl bg-white pl-10 pr-3 text-base ring-1 ring-borde focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <div className="-mx-1 flex flex-wrap gap-2 px-1" role="group" aria-label="Filtrar">
            {filtros.map(({ f, texto }) => (
              <button
                key={f}
                type="button"
                aria-pressed={filtro === f}
                onClick={() => setFiltro(f)}
                className={cx(
                  'min-h-10 cursor-pointer rounded-full px-3 text-sm font-semibold ring-1',
                  filtro === f ? 'bg-navy text-white ring-navy' : 'bg-white text-navy ring-borde hover:bg-fondo'
                )}
              >
                {texto} <span className="cifra opacity-80">{cuenta(f)}</span>
              </button>
            ))}
          </div>
          {filas.length === 0 ? (
            <Vacio>Nadie en este filtro.</Vacio>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-borde">
                {filas.map(({ j, r, deuda }) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => setAbierto(j.id)}
                      className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left hover:bg-fondo"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {j.lastName}, {j.firstName}
                        </p>
                        {(r.motivo || deuda > 0) && (
                          <p className="truncate text-sm text-gris">
                            {[r.motivo, deuda > 0 && `Debe ${pesos(deuda)}`].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <Chip tono={r.tono}>{r.texto}</Chip>
                      <ChevronRight className="size-5 shrink-0 text-gris" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
      {abierto && (
        <FichaJugador
          id={abierto}
          onCerrar={() => setAbierto(null)}
          onCambio={recargar}
        />
      )}
      {alta && (
        <HojaAlta
          onCerrar={() => setAlta(false)}
          onListo={(id) => {
            setAlta(false);
            recargar();
            setAbierto(id);
          }}
        />
      )}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
function HojaAlta({ onCerrar, onListo }: { onCerrar: () => void; onListo: (id: string) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ nombre: '', apellido: '', documento: '', telefono: '', anio: '' });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const guardar = async () => {
    if (!f.nombre.trim() || !f.apellido.trim()) return setError('Nombre y apellido son obligatorios.');
    if (f.documento.replace(/\D/g, '').length < 6) return setError('La cédula hace falta: es con lo que el jugador entra a la app.');
    setError(null);
    setCargando(true);
    try {
      const id = await api.altaJugador({
        nombre: f.nombre.trim(),
        apellido: f.apellido.trim(),
        documento: f.documento.replace(/\D/g, ''),
        telefono: f.telefono.trim(),
        anioNacimiento: Number(f.anio) || null,
      });
      toast(`${f.nombre} agregado al plantel`);
      onListo(id);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <Hoja
      titulo="Nuevo jugador"
      onCerrar={onCerrar}
      pie={
        <Boton bloque cargando={cargando} onClick={guardar}>
          Agregar al plantel
        </Boton>
      }
    >
      <Campo label="Nombre" autoComplete="off" value={f.nombre} onChange={set('nombre')} />
      <Campo label="Apellido" autoComplete="off" value={f.apellido} onChange={set('apellido')} />
      <Campo label="Cédula" inputMode="numeric" autoComplete="off" value={f.documento} onChange={set('documento')} ayuda="Sin puntos ni guion." />
      <Campo label="Celular (opcional)" type="tel" inputMode="tel" value={f.telefono} onChange={set('telefono')} />
      <Campo label="Año de nacimiento (opcional)" inputMode="numeric" maxLength={4} value={f.anio} onChange={set('anio')} />
      {error && (
        <p className="text-bad" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}

// ---------------------------------------------------------------------------
function FichaJugador({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio: () => void }) {
  const { perfil, textos } = useSesion();
  const tesorero = perfil.rol === 'tesorero';
  const { datos: j, error, recargar } = useDatos(() => api.jugador(id), [id]);
  const [editando, setEditando] = useState<Documento['clave'] | 'habilitacion' | null>(null);

  const cambio = () => {
    setEditando(null);
    recargar();
    onCambio();
  };

  return (
    <Hoja titulo={j ? nombreDe(j) : 'Jugador'} onCerrar={onCerrar}>
      {error ? (
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      ) : !j ? (
        <Cargando />
      ) : (
        <>
          <EstadoHabilitacion j={j} editando={editando === 'habilitacion'} onEditar={() => setEditando('habilitacion')} onListo={cambio} onCancelar={() => setEditando(null)} />
          <section>
            <Titulo>Papeles</Titulo>
            <ul className="space-y-2">
              {documentos(j, diasAviso(textos)).map((d) => (
                <li key={d.clave} className="rounded-xl bg-fondo p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{d.nombre}</p>
                      <p className="text-sm text-gris">{d.detalle}</p>
                    </div>
                    <Chip tono={d.tono}>{d.estado}</Chip>
                  </div>
                  {editando === d.clave ? (
                    <FormDocumento clave={d.clave} j={j} onListo={cambio} onCancelar={() => setEditando(null)} />
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Boton variante="secundario" onClick={() => setEditando(d.clave)}>
                        Actualizar
                      </Boton>
                      <VerDocumento ruta={d.clave === 'ficha' ? j.medicalCertificate.filePath : d.clave === 'lud' ? j.ludRegistration.cardFilePath : undefined} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
          {tesorero && <PlataJugador jugadorId={j.id} onCambio={onCambio} />}
          {(j.phone || j.documento) && (
            <section className="text-sm text-gris">
              {j.documento && <p>Cédula {j.documento}</p>}
              {j.phone && <p>Celular {j.phone}</p>}
            </section>
          )}
        </>
      )}
    </Hoja>
  );
}

function VerDocumento({ ruta }: { ruta?: string }) {
  const toast = useToast();
  if (!ruta) return null;
  return (
    <Boton
      variante="texto"
      icono={ExternalLink}
      onClick={async () => {
        try {
          window.open(await api.urlDocumento(ruta), '_blank', 'noopener');
        } catch (e) {
          toast(mensajeError(e), 'error');
        }
      }}
    >
      Ver documento
    </Boton>
  );
}

function EstadoHabilitacion({
  j,
  editando,
  onEditar,
  onListo,
  onCancelar,
}: {
  j: Player;
  editando: boolean;
  onEditar: () => void;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const { textos } = useSesion();
  const toast = useToast();
  const r = resumenJugador(j, diasAviso(textos));
  const [modo, setModo] = useState<'auto' | 'habilitado' | 'inhabilitado'>(j.eligibilityOverride?.status ?? 'auto');
  const [motivo, setMotivo] = useState(j.eligibilityOverride?.reason ?? '');
  const [cargando, setCargando] = useState(false);

  const guardar = async () => {
    if (modo !== 'auto' && !motivo.trim()) return toast('Poné el motivo: lo ven los demás staff.', 'error');
    setCargando(true);
    try {
      await api.guardarHabilitacion(j.id, modo === 'auto' ? undefined : { status: modo, reason: motivo.trim() });
      toast('Habilitación guardada');
      onListo();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className={cx('rounded-xl p-3 ring-1', r.tono === 'bad' ? 'bg-red-50 ring-bad/30' : r.tono === 'warn' ? 'bg-amber-50 ring-warn/30' : 'bg-green-50 ring-ok/30')}>
      <div className="flex items-center justify-between gap-2">
        <Chip tono={r.tono}>{r.texto}</Chip>
        {!editando && (
          <Boton variante="texto" onClick={onEditar}>
            Cambiar a mano
          </Boton>
        )}
      </div>
      {r.motivo && <p className="mt-1 text-sm text-tinta">{r.motivo}</p>}
      {editando && (
        <div className="mt-3 space-y-3">
          <Opciones
            label="Habilitación"
            valor={modo}
            onChange={setModo}
            opciones={[
              { valor: 'auto', texto: 'Automática' },
              { valor: 'habilitado', texto: 'Habilitar' },
              { valor: 'inhabilitado', texto: 'Inhabilitar' },
            ]}
          />
          {modo !== 'auto' && <Campo label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          <div className="flex gap-2">
            <Boton cargando={cargando} onClick={guardar}>
              Guardar
            </Boton>
            <Boton variante="secundario" onClick={onCancelar}>
              Cancelar
            </Boton>
          </div>
        </div>
      )}
    </section>
  );
}

function FormDocumento({ clave, j, onListo, onCancelar }: { clave: Documento['clave']; j: Player; onListo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const [venc, setVenc] = useState(clave === 'ficha' ? j.medicalCertificate.expiryDate || '' : clave === 'lud' ? j.ludRegistration.cardExpiry || '' : j.study?.lastExam || '');
  const [examen, setExamen] = useState(j.medicalCertificate.examDate || '');
  const [clinica, setClinica] = useState(j.medicalCertificate.clinic || '');
  const [idFed, setIdFed] = useState(j.ludRegistration.federatedId ? String(j.ludRegistration.federatedId) : '');
  const [excepcion, setExcepcion] = useState<'ninguna' | 'recibido' | 'articulo'>(j.study?.exception ?? 'ninguna');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);

  const guardar = async () => {
    setCargando(true);
    try {
      if (clave === 'ficha') {
        if (!venc) throw new Error('Poné la fecha de vencimiento.');
        await api.cargarFichaMedica(j.id, { vencimiento: venc, fechaExamen: examen || undefined, clinica: clinica || undefined, archivo });
      } else if (clave === 'lud') {
        await api.guardarCarneLud(j.id, { idFederado: Number(idFed) || null, vencimiento: venc || null, archivo });
      } else {
        await api.guardarEstudio(j.id, { ultimoExamen: venc || null, excepcion: excepcion === 'ninguna' ? null : excepcion });
      }
      toast('Guardado');
      onListo();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {clave === 'estudio' ? (
        <>
          <Campo label="Último examen aprobado" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
          <Opciones
            label="Excepción"
            valor={excepcion}
            onChange={setExcepcion}
            opciones={[
              { valor: 'ninguna', texto: 'Ninguna' },
              { valor: 'recibido', texto: 'Recibido' },
              { valor: 'articulo', texto: 'Por artículo' },
            ]}
          />
        </>
      ) : (
        <>
          {clave === 'lud' && <Campo label="Número de federado" inputMode="numeric" value={idFed} onChange={(e) => setIdFed(e.target.value)} />}
          <Campo label="Vence el" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
          {clave === 'ficha' && (
            <>
              <Campo label="Fecha del examen (opcional)" type="date" value={examen} onChange={(e) => setExamen(e.target.value)} />
              <Campo label="Clínica (opcional)" value={clinica} onChange={(e) => setClinica(e.target.value)} />
            </>
          )}
          <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-borde bg-white px-3 text-center text-navy">
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            {archivo ? archivo.name : 'Subir foto o PDF (opcional)'}
          </label>
        </>
      )}
      <div className="flex gap-2">
        <Boton cargando={cargando} onClick={guardar}>
          Guardar
        </Boton>
        <Boton variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const TONO_CARGO = { pagado: 'ok', informado: 'warn', debe: 'bad' } as const;
const TEXTO_CARGO = { pagado: 'Pagado', informado: 'Por confirmar', debe: 'Debe' } as const;

function PlataJugador({ jugadorId, onCambio }: { jugadorId: string; onCambio: () => void }) {
  const toast = useToast();
  const { datos, error, recargar } = useDatos(async () => {
    const [cargos, excepciones] = await Promise.all([api.cargos(jugadorId), api.excepciones()]);
    return { cargos, excepcion: excepciones.find((e) => e.jugadorId === jugadorId) ?? null };
  }, [jugadorId]);
  const [cobrando, setCobrando] = useState<Cargo | null>(null);
  const [exc, setExc] = useState(false);

  if (error) return <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>;
  if (!datos) return <Cargando />;
  const ordenados = [...datos.cargos].sort((a, b) => b.cobro.fecha.localeCompare(a.cobro.fecha));
  const deuda = ordenados.reduce((s, c) => s + saldoDe(c), 0);
  const cambio = () => {
    setCobrando(null);
    setExc(false);
    recargar();
    onCambio();
  };

  return (
    <section>
      <Titulo>Plata · {deuda > 0 ? `debe ${pesos(deuda)}` : 'al día'}</Titulo>
      {ordenados.length === 0 ? (
        <p className="text-gris">Sin cobros.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.slice(0, 8).map((c) => {
            const est = estadoCargo(c);
            return (
              <li key={c.id} className="rounded-xl bg-fondo p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.cobro.concepto}</p>
                    <p className="cifra text-sm text-gris">
                      {pesos(c.monto)}
                      {est !== 'pagado' && saldoDe(c) !== c.monto && ` · faltan ${pesos(saldoDe(c))}`}
                    </p>
                  </div>
                  <Chip tono={TONO_CARGO[est]}>{TEXTO_CARGO[est]}</Chip>
                </div>
                {est !== 'pagado' &&
                  (cobrando?.id === c.id ? (
                    <FormPagoDirecto cargo={c} onListo={cambio} onCancelar={() => setCobrando(null)} />
                  ) : (
                    <Boton variante="secundario" className="mt-2" onClick={() => setCobrando(c)}>
                      Registrar pago
                    </Boton>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 rounded-xl bg-fondo p-3">
        <p className="font-semibold">Excepción de cuota</p>
        <p className="text-sm text-gris">
          {datos.excepcion
            ? `${datos.excepcion.monto === 0 ? 'Exonerado' : `Paga ${pesos(datos.excepcion.monto)}`} · ${datos.excepcion.motivo}`
            : 'Paga la cuota normal.'}
        </p>
        {exc ? (
          <FormExcepcion jugadorId={jugadorId} actual={datos.excepcion} onListo={cambio} onCancelar={() => setExc(false)} />
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <Boton variante="secundario" onClick={() => setExc(true)}>
              {datos.excepcion ? 'Cambiar' : 'Poner excepción'}
            </Boton>
            {datos.excepcion && (
              <Boton
                variante="texto"
                onClick={async () => {
                  try {
                    await api.quitarExcepcion(jugadorId);
                    toast('Excepción quitada');
                    cambio();
                  } catch (e) {
                    toast(mensajeError(e), 'error');
                  }
                }}
              >
                Quitar
              </Boton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function FormPagoDirecto({ cargo, onListo, onCancelar }: { cargo: Cargo; onListo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const [monto, setMonto] = useState(String(saldoDe(cargo)));
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [cargando, setCargando] = useState(false);
  return (
    <div className="mt-3 space-y-3">
      <Campo label="Monto ($)" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))} />
      <Opciones
        label="Cómo pagó"
        valor={metodo}
        onChange={setMetodo}
        opciones={[
          { valor: 'efectivo', texto: 'Efectivo' },
          { valor: 'transferencia', texto: 'Transferencia' },
        ]}
      />
      <div className="flex gap-2">
        <Boton
          cargando={cargando}
          onClick={async () => {
            const n = Number(monto);
            if (!n) return toast('Poné el monto.', 'error');
            setCargando(true);
            try {
              await api.registrarPagoDirecto(cargo.id, n, metodo);
              toast(`Pago de ${pesos(n)} registrado`);
              onListo();
            } catch (e) {
              toast(mensajeError(e), 'error');
            } finally {
              setCargando(false);
            }
          }}
        >
          Registrar
        </Boton>
        <Boton variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}

function FormExcepcion({
  jugadorId,
  actual,
  onListo,
  onCancelar,
}: {
  jugadorId: string;
  actual: { monto: number; motivo: string } | null;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const toast = useToast();
  const [monto, setMonto] = useState(actual ? String(actual.monto) : '0');
  const [motivo, setMotivo] = useState(actual?.motivo ?? '');
  const [cargando, setCargando] = useState(false);
  return (
    <div className="mt-3 space-y-3">
      <Campo label="Cuota que paga ($)" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))} ayuda="0 = exonerado." />
      <Campo label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <div className="flex gap-2">
        <Boton
          cargando={cargando}
          onClick={async () => {
            if (!motivo.trim()) return toast('Poné el motivo.', 'error');
            setCargando(true);
            try {
              await api.guardarExcepcion({ jugadorId, monto: Number(monto) || 0, motivo: motivo.trim() });
              toast('Excepción guardada');
              onListo();
            } catch (e) {
              toast(mensajeError(e), 'error');
            } finally {
              setCargando(false);
            }
          }}
        >
          Guardar
        </Boton>
        <Boton variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
