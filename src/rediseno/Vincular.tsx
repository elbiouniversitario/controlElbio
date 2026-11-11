/** Primera vez: el jugador se busca en el plantel y confirma con su cédula. */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api, mensajeError, type JugadorLista } from '../lib/api';
import { normalizar } from '../lib/listaWhatsapp';
import { Boton, Campo, Card, Cargando, ErrorCaja, cx, useDatos } from './ui';

export default function Vincular({ onListo }: { onListo: () => Promise<void> }) {
  const { datos, error, recargar } = useDatos(() => api.plantelParaVincular());
  const [busca, setBusca] = useState('');
  const [elegido, setElegido] = useState<JugadorLista | null>(null);
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [msj, setMsj] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const lista = useMemo(() => {
    const q = normalizar(busca);
    return (datos ?? [])
      .filter((j) => !q || normalizar(`${j.nombre} ${j.apellido}`).includes(q))
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [datos, busca]);

  const confirmar = async () => {
    if (!elegido) return;
    if (cedula.replace(/\D/g, '').length < 6) return setMsj('Poné tu cédula completa, sin puntos ni guion.');
    setCargando(true);
    setMsj(null);
    try {
      const r = await api.vincular(elegido.id, cedula, celular);
      if (r === 'ok') return await onListo();
      setMsj(r === 'bloqueado' ? 'Demasiados intentos. Hablá con el delegado.' : 'La cédula no coincide con la que tiene el club. Revisala o hablá con el delegado.');
    } catch (e) {
      setMsj(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto max-w-[480px] space-y-4 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <img src="/escudo.png" alt="" width={56} height={56} className="size-14" />
        <div>
          <h1 className="font-cond text-[28px] font-extrabold uppercase leading-none text-navy">Control Elbio</h1>
          <p className="text-gris">Tu estado en el club, en un solo lugar.</p>
        </div>
      </div>

      {error ? (
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      ) : !datos ? (
        <Cargando />
      ) : !elegido ? (
        <Card>
          <h2 className="mb-3 font-cond text-xl font-bold uppercase text-navy">¿Quién sos?</h2>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gris" aria-hidden />
            <label htmlFor="busca-vincular" className="sr-only">
              Buscar tu nombre
            </label>
            <input
              id="busca-vincular"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscá tu nombre o apellido"
              className="min-h-11 w-full rounded-xl bg-white pl-10 pr-3 text-base ring-1 ring-borde focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <ul className="max-h-[55dvh] divide-y divide-borde overflow-y-auto">
            {lista.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setElegido(j)}
                  className="flex min-h-12 w-full cursor-pointer items-center px-1 text-left text-base hover:bg-fondo"
                >
                  <span className="font-semibold">{j.apellido}</span>,&nbsp;{j.nombre}
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="py-4 text-center text-gris">No aparece. Pedile al delegado que te agregue.</li>}
          </ul>
        </Card>
      ) : (
        <Card>
          <p className="text-gris">Sos</p>
          <p className="mb-4 font-cond text-2xl font-bold uppercase text-navy">
            {elegido.nombre} {elegido.apellido}
          </p>
          <div className="space-y-3">
            <Campo
              label="Tu cédula"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ej. 51234567"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              ayuda="Solo para confirmar que sos vos."
            />
            <Campo
              label="Tu celular (opcional)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09X XXX XXX"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
            {msj && (
              <p className={cx('text-bad')} role="alert">
                {msj}
              </p>
            )}
            <Boton bloque cargando={cargando} onClick={confirmar}>
              Entrar
            </Boton>
            <Boton
              bloque
              variante="texto"
              onClick={() => {
                setElegido(null);
                setMsj(null);
              }}
            >
              No soy yo
            </Boton>
          </div>
        </Card>
      )}
    </div>
  );
}
