/** Staff: mandar una notificación al plantel (o a una parte) y ver lo enviado. */
import { useMemo, useState } from 'react';
import { BellOff, Send } from 'lucide-react';
import { api, mensajeError } from '../lib/api';
import type { DestinoAviso } from '../lib/modelo';
import { momentoRelativo } from '../lib/fechas';
import { diasAviso, resumenJugador, useSesion } from './comun';
import { ListaSeleccion } from './Caja';
import { AreaTexto, Boton, Campo, Card, Cargando, Chip, ErrorCaja, Opciones, Pantalla, Titulo, Vacio, useDatos, useToast } from './ui';

const NOMBRE_DESTINO: Record<DestinoAviso, string> = {
  todos: 'Todos',
  no_habilitados: 'No habilitados',
  deudores: 'Los que deben',
  seleccion: 'Algunos',
};

export default function Avisos() {
  const { perfil, textos } = useSesion();
  const tesorero = perfil.rol === 'tesorero';
  const { datos, error, recargar } = useDatos(async () => {
    const [jugadores, conPush, enviados, deudores] = await Promise.all([
      api.jugadores(),
      api.jugadoresConPush(),
      api.avisosEnviados(),
      tesorero ? api.deudores() : Promise.resolve([]),
    ]);
    return { jugadores: jugadores.filter((j) => j.activo !== false), conPush, enviados, deudores: new Set(deudores.map((d) => d.jugadorId)) };
  }, [tesorero]);
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [destino, setDestino] = useState<DestinoAviso>('todos');
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);

  const ordenados = useMemo(() => [...(datos?.jugadores ?? [])].sort((a, b) => a.lastName.localeCompare(b.lastName)), [datos]);
  const ids = useMemo(() => {
    if (!datos) return [];
    const aviso = diasAviso(textos);
    const lista =
      destino === 'todos'
        ? ordenados
        : destino === 'no_habilitados'
          ? ordenados.filter((j) => resumenJugador(j, aviso).tono === 'bad')
          : destino === 'deudores'
            ? ordenados.filter((j) => datos.deudores.has(j.id))
            : ordenados.filter((j) => elegidos.has(j.id));
    return lista.map((j) => j.id);
  }, [datos, destino, elegidos, ordenados, textos]);
  const conPush = datos ? ids.filter((id) => datos.conPush.has(id)).length : 0;

  const opciones: { valor: DestinoAviso; texto: string }[] = [
    { valor: 'todos', texto: 'Todos' },
    { valor: 'no_habilitados', texto: 'No habilitan' },
    ...(tesorero ? [{ valor: 'deudores' as const, texto: 'Deben' }] : []),
    { valor: 'seleccion', texto: 'Algunos' },
  ];

  const mandar = async () => {
    if (!titulo.trim()) return toast('Poné un título.', 'error');
    if (!cuerpo.trim()) return toast('Escribí el mensaje.', 'error');
    if (ids.length === 0) return toast('No hay nadie en ese destino.', 'error');
    setCargando(true);
    try {
      const r = await api.mandarAviso(titulo.trim(), cuerpo.trim(), destino, ids);
      toast(
        `Llegó a ${r.enviados}` +
          (r.sinNotificaciones ? ` · ${r.sinNotificaciones} sin notificaciones` : '') +
          (r.fallidos ? ` · ${r.fallidos} fallaron` : ''),
        r.enviados === 0 ? 'error' : 'ok'
      );
      setTitulo('');
      setCuerpo('');
      recargar();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla titulo="Avisos">
      {error ? (
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      ) : !datos ? (
        <Cargando />
      ) : (
        <>
          <Card className="space-y-4">
            <Campo label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Práctica suspendida" maxLength={60} />
            <AreaTexto label="Mensaje" value={cuerpo} onChange={setCuerpo} filas={4} placeholder="Ej. Hoy no hay práctica por lluvia." />
            <Opciones label="A quién" valor={destino} onChange={setDestino} opciones={opciones} />
            {destino === 'seleccion' && (
              <ListaSeleccion
                jugadores={ordenados}
                elegidos={elegidos}
                onChange={setElegidos}
                extra={(j) => !datos.conPush.has(j.id) && <BellOff className="size-4 text-gris" aria-label="Sin notificaciones" />}
              />
            )}
            <p className="text-sm text-gris">
              {ids.length === 0 ? (
                'Nadie en este destino.'
              ) : (
                <>
                  <span className="cifra font-semibold text-tinta">
                    {conPush} de {ids.length}
                  </span>{' '}
                  tienen las notificaciones activadas. A los demás no les llega: avisales por WhatsApp.
                </>
              )}
            </p>
            <Boton icono={Send} bloque cargando={cargando} disabled={ids.length === 0} onClick={mandar}>
              Mandar a {ids.length}
            </Boton>
          </Card>

          <section>
            <Titulo>Enviados</Titulo>
            {datos.enviados.length === 0 ? (
              <Vacio>Todavía no mandaste ningún aviso.</Vacio>
            ) : (
              <Card className="p-0">
                <ul className="divide-y divide-borde">
                  {datos.enviados.slice(0, 20).map((a) => (
                    <li key={a.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-semibold">{a.titulo}</p>
                        <Chip tono="neutro" icono={null}>
                          {NOMBRE_DESTINO[a.destino]}
                        </Chip>
                      </div>
                      <p className="line-clamp-2 text-sm text-gris">{a.cuerpo}</p>
                      <p className="mt-1 text-sm text-gris">
                        {momentoRelativo(a.enviadoEn)} · llegó a <span className="cifra">{a.cantidad}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}
    </Pantalla>
  );
}
