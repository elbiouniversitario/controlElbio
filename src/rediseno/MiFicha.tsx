/**
 * Pantalla única del jugador (y "Mi ficha" del staff): estado, plata,
 * prácticas y notificaciones. Una sola acción principal: informar un pago.
 */
import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck, CheckCircle2, Copy, Receipt, Upload, XCircle } from 'lucide-react';
import { api, mensajeError } from '../lib/api';
import { estadoCargo, informadoDe, pesos, saldoDe, type Cargo, type MetodoPago } from '../lib/modelo';
import { estadoHabilitacion } from '../lib/habilitacion';
import { fechaCorta, hoyISO } from '../lib/fechas';
import { activarPush, estadoPush, type EstadoPush } from '../lib/push';
import { documentos, diasAviso, useSesion } from './comun';
import { Boton, Campo, Card, Cargando, Chip, ErrorCaja, Hoja, Opciones, Titulo, Vacio, cx, nombreDe, useDatos, useToast } from './ui';

const ESTADO_CARGO = {
  pagado: { tono: 'ok', texto: 'Pagado' },
  informado: { tono: 'warn', texto: 'Por confirmar' },
  debe: { tono: 'bad', texto: 'Debe' },
} as const;

export default function MiFicha() {
  const { perfil, textos } = useSesion();
  const id = perfil.jugadorId;
  const { datos, error, recargar } = useDatos(
    () => Promise.all([api.jugador(id), api.cargos(id), api.practicas()]),
    [id]
  );
  const [informar, setInformar] = useState(false);

  if (error) return <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>;
  if (!datos) return <Cargando />;
  const [yo, cargos, practicas] = datos;

  const h = estadoHabilitacion(yo);
  const docs = documentos(yo, diasAviso(textos));
  // Solo lo que todavía falta informar: un cargo "Por confirmar" ya no se vuelve a ofrecer.
  const pendientes = cargos.filter((c) => estadoCargo(c) !== 'pagado' && saldoDe(c) - informadoDe(c) > 0);
  const debe = cargos.reduce((s, c) => s + Math.max(0, saldoDe(c) - informadoDe(c)), 0);

  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recientes = practicas.filter((p) => p.fecha >= desde && p.fecha <= hoyISO());
  const fui = recientes.filter((p) => p.jugadores.includes(id)).length;

  return (
    <div className="space-y-4">
      <p className="pt-1 text-gris">
        Hola, <span className="font-semibold text-tinta">{yo.firstName}</span>
      </p>

      {/* Estado: lo primero que se ve. */}
      <section
        className={cx('rounded-2xl p-5 text-white', h.habilitado ? 'bg-ok' : 'bg-bad')}
        aria-label="Estado de habilitación"
      >
        <div className="flex items-center gap-3">
          {h.habilitado ? <CheckCircle2 className="size-10 shrink-0" aria-hidden /> : <XCircle className="size-10 shrink-0" aria-hidden />}
          <div>
            <p className="font-cond text-[32px] font-extrabold uppercase leading-none">{h.habilitado ? 'Habilitado' : 'No habilitado'}</p>
            {h.motivo && <p className="mt-1 text-base text-white/90">{h.motivo}</p>}
          </div>
        </div>
      </section>

      <Card>
        <Titulo>Mis papeles</Titulo>
        <ul className="divide-y divide-borde">
          {docs.map((d) => (
            <li key={d.clave} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-semibold text-tinta">{d.nombre}</p>
                <p className="text-sm text-gris">{d.detalle}</p>
              </div>
              <Chip tono={d.tono}>{d.estado}</Chip>
            </li>
          ))}
        </ul>
        {docs.some((d) => d.tono !== 'ok') && (
          <p className="mt-3 rounded-xl bg-fondo p-3 text-sm text-gris">
            Los papeles los carga el delegado. Si ya hiciste el trámite, mandale la foto{textos.delegado_nombre ? ` a ${textos.delegado_nombre}` : ''}.
          </p>
        )}
      </Card>

      <Card>
        <Titulo>Mi plata</Titulo>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-gris">{debe > 0 ? 'Debés' : 'Estás al día'}</span>
          <span className={cx('cifra font-cond text-[32px] font-extrabold', debe > 0 ? 'text-bad' : 'text-ok')}>{pesos(debe)}</span>
        </div>
        {cargos.length === 0 ? (
          <Vacio>Todavía no hay cobros.</Vacio>
        ) : (
          <ul className="divide-y divide-borde">
            {cargos.slice(0, 6).map((c) => {
              const e = ESTADO_CARGO[estadoCargo(c)];
              const rechazado = c.pagos.find((p) => p.estado === 'rechazado' && p.motivoRechazo);
              return (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-tinta">{c.cobro.concepto}</p>
                      <p className="cifra text-sm text-gris">
                        {pesos(c.monto)}
                        {c.cobro.vence ? ` · vence ${fechaCorta(c.cobro.vence)}` : ''}
                      </p>
                    </div>
                    <Chip tono={e.tono}>{e.texto}</Chip>
                  </div>
                  {rechazado && estadoCargo(c) === 'debe' && (
                    <p className="mt-1 text-sm text-bad">Pago rechazado: {rechazado.motivoRechazo}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {pendientes.length > 0 && (
          <Boton bloque icono={Receipt} className="mt-4" onClick={() => setInformar(true)}>
            Informar un pago
          </Boton>
        )}
      </Card>

      <Card>
        <Titulo>Prácticas</Titulo>
        <div className="flex items-center gap-3">
          <CalendarCheck className="size-8 shrink-0 text-navy" aria-hidden />
          {recientes.length === 0 ? (
            <p className="text-gris">No hubo prácticas en los últimos 30 días.</p>
          ) : (
            <p className="text-tinta">
              Fuiste a <span className="cifra font-bold">{fui}</span> de <span className="cifra font-bold">{recientes.length}</span> en los últimos 30 días.
            </p>
          )}
        </div>
      </Card>

      <AvisoNotificaciones />

      {informar && (
        <InformarPago
          cargos={pendientes}
          datosPago={textos.datos_pago}
          onCerrar={() => setInformar(false)}
          onListo={() => {
            setInformar(false);
            recargar();
          }}
        />
      )}
      <span className="sr-only">{nombreDe(yo)}</span>
    </div>
  );
}

function InformarPago({
  cargos,
  datosPago,
  onCerrar,
  onListo,
}: {
  cargos: Cargo[];
  datosPago: string;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const toast = useToast();
  const [cargoId, setCargoId] = useState(cargos.find((c) => estadoCargo(c) === 'debe')?.id ?? cargos[0]?.id ?? '');
  const cargo = cargos.find((c) => c.id === cargoId);
  const [monto, setMonto] = useState(() => String(cargo ? saldoDe(cargo) : ''));
  const [metodo, setMetodo] = useState<MetodoPago>('transferencia');
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cargo) setMonto(String(saldoDe(cargo)));
  }, [cargoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = async () => {
    const n = Number(monto);
    if (!cargo || !(n > 0)) return setError('Poné cuánto pagaste.');
    setEnviando(true);
    setError(null);
    try {
      await api.informarPago(cargo.id, n, metodo, foto);
      toast('Listo. El tesorero lo va a confirmar.');
      onListo();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja
      titulo="Informar un pago"
      onCerrar={onCerrar}
      pie={
        <Boton bloque cargando={enviando} onClick={enviar}>
          Enviar al tesorero
        </Boton>
      }
    >
      {metodo === 'transferencia' && datosPago && <DatosPago texto={datosPago} />}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-tinta">¿Qué pagaste?</legend>
        {cargos.map((c) => (
          <label
            key={c.id}
            className={cx(
              'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1',
              cargoId === c.id ? 'bg-navy/5 ring-2 ring-navy' : 'ring-borde'
            )}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name="cargo" checked={cargoId === c.id} onChange={() => setCargoId(c.id)} className="size-5 accent-navy" />
              <span className="font-semibold">{c.cobro.concepto}</span>
            </span>
            <span className="cifra text-gris">{pesos(saldoDe(c))}</span>
          </label>
        ))}
      </fieldset>
      <Campo label="Monto ($)" type="number" inputMode="numeric" min={1} value={monto} onChange={(e) => setMonto(e.target.value)} />
      <Opciones
        label="¿Cómo pagaste?"
        valor={metodo}
        onChange={setMetodo}
        opciones={[
          { valor: 'transferencia', texto: 'Transferencia' },
          { valor: 'efectivo', texto: 'Efectivo' },
        ]}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-tinta">Foto del comprobante {metodo === 'efectivo' && '(opcional)'}</span>
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-fondo px-3 py-3 text-navy border-2 border-dashed border-borde">
          <Upload className="size-5" aria-hidden />
          <span className="truncate font-semibold">{foto ? foto.name : 'Elegir foto'}</span>
          <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {error && (
        <p className="text-bad" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}

function DatosPago({ texto }: { texto: string }) {
  const toast = useToast();
  return (
    <div className="rounded-xl bg-fondo p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-tinta">Datos para transferir</p>
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-navy hover:bg-white"
          onClick={() =>
            navigator.clipboard?.writeText(texto).then(
              () => toast('Copiado'),
              () => toast('No se pudo copiar', 'error')
            )
          }
        >
          <Copy className="size-4" aria-hidden /> Copiar
        </button>
      </div>
      <p className="whitespace-pre-line text-sm text-gris">{texto}</p>
    </div>
  );
}

/** Solo aparece si las notificaciones están apagadas y se pueden prender. */
function AvisoNotificaciones() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [cargando, setCargando] = useState(false);
  const toast = useToast();
  useEffect(() => {
    estadoPush().then(setEstado, () => setEstado('no-soportado'));
  }, []);
  const texto = useMemo(() => {
    switch (estado) {
      case 'inactivo':
        return 'Activá las notificaciones para enterarte cuando te vence un papel o hay un cobro nuevo.';
      case 'instalar-primero':
        return 'En iPhone, primero agregá la app a la pantalla de inicio (Compartir → Agregar a inicio) y después activá las notificaciones.';
      case 'bloqueado':
        return 'Bloqueaste las notificaciones. Se prenden desde los ajustes del celular.';
      default:
        return null;
    }
  }, [estado]);
  if (!texto) return null;
  return (
    <Card className="bg-oro/15 ring-oro">
      <div className="flex gap-3">
        <Bell className="mt-0.5 size-6 shrink-0 text-navy" aria-hidden />
        <div className="flex-1 space-y-3">
          <p className="text-tinta">{texto}</p>
          {estado === 'inactivo' && (
            <Boton
              variante="secundario"
              cargando={cargando}
              onClick={async () => {
                setCargando(true);
                try {
                  const nuevo = await activarPush();
                  setEstado(nuevo);
                  if (nuevo === 'activo') toast('Notificaciones activadas');
                } catch (e) {
                  toast(mensajeError(e), 'error');
                } finally {
                  setCargando(false);
                }
              }}
            >
              Activar notificaciones
            </Boton>
          )}
        </div>
      </div>
    </Card>
  );
}
