/** Tesorero: configuración (textos), roles del staff, su propia ficha y salir. */
import { useState } from 'react';
import { ChevronRight, IdCard, KeyRound, LogOut, Settings, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { Player } from '../types';
import { api, mensajeError } from '../lib/api';
import { NOMBRE_ROL, type Rol } from '../lib/modelo';
import { TEXTOS, type ClaveTexto } from '../lib/textos';
import { useSesion } from './comun';
import MiFicha from './MiFicha';
import { AreaTexto, Boton, Campo, Card, Cargando, ErrorCaja, Hoja, Opciones, Pantalla, Vacio, cx, nombreDe, useDatos, useToast } from './ui';

type Seccion = 'textos' | 'roles' | 'ficha' | null;

export default function Mas() {
  const { perfil } = useSesion();
  const toast = useToast();
  const [seccion, setSeccion] = useState<Seccion>(null);

  return (
    <Pantalla titulo="Más">
      <Card className="p-0">
        <ul className="divide-y divide-borde">
          <Fila icono={Settings} titulo="Textos y montos" detalle="Cuota, cómo pagar, delegado, plantillas" onClick={() => setSeccion('textos')} />
          <Fila icono={ShieldCheck} titulo="Roles y PIN" detalle="Quién es delegado o tesorero" onClick={() => setSeccion('roles')} />
          <Fila icono={IdCard} titulo="Mi ficha" detalle="Tus papeles y tu cuota" onClick={() => setSeccion('ficha')} />
        </ul>
      </Card>
      <Boton
        variante="texto"
        icono={LogOut}
        bloque
        onClick={async () => {
          if (!window.confirm('¿Cerrar sesión en este teléfono? Para volver a entrar vas a necesitar tu cédula.')) return;
          try {
            await api.salir();
            window.location.reload();
          } catch (e) {
            toast(mensajeError(e), 'error');
          }
        }}
      >
        Cerrar sesión
      </Boton>
      <p className="text-center text-sm text-gris">Entraste como {NOMBRE_ROL[perfil.rolAsignado].toLowerCase()}.</p>

      {seccion === 'textos' && <HojaTextos onCerrar={() => setSeccion(null)} />}
      {seccion === 'roles' && <HojaRoles onCerrar={() => setSeccion(null)} />}
      {seccion === 'ficha' && (
        <Hoja titulo="Mi ficha" onCerrar={() => setSeccion(null)}>
          <MiFicha />
        </Hoja>
      )}
    </Pantalla>
  );
}

function Fila({ icono: Icono, titulo, detalle, onClick }: { icono: LucideIcon; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 text-left hover:bg-fondo">
        <Icono className="size-6 shrink-0 text-navy" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{titulo}</span>
          <span className="block truncate text-sm text-gris">{detalle}</span>
        </span>
        <ChevronRight className="size-5 text-gris" aria-hidden />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
/** Grupos que se editan desde acá (los del partido son de la app vieja). */
const GRUPOS = ['Tesorería', 'Contactos', 'Tablón del equipo', 'Alertas', 'Plantillas de avisos', 'Club'];

function HojaTextos({ onCerrar }: { onCerrar: () => void }) {
  const { textos, recargarTextos } = useSesion();
  const toast = useToast();
  const [valores, setValores] = useState<Record<string, string>>({ ...textos });
  const [cargando, setCargando] = useState(false);
  const claves = Object.keys(TEXTOS) as ClaveTexto[];
  const cambiadas = claves.filter((c) => (valores[c] ?? '') !== (textos[c] ?? ''));

  const guardar = async () => {
    setCargando(true);
    try {
      await api.guardarTextos(Object.fromEntries(cambiadas.map((c) => [c, valores[c] ?? ''])));
      await recargarTextos();
      toast('Guardado');
      onCerrar();
    } catch (e) {
      toast(mensajeError(e), 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Hoja
      titulo="Textos y montos"
      onCerrar={onCerrar}
      pie={
        <Boton bloque cargando={cargando} disabled={cambiadas.length === 0} onClick={guardar}>
          {cambiadas.length === 0 ? 'Sin cambios' : `Guardar ${cambiadas.length} cambio${cambiadas.length === 1 ? '' : 's'}`}
        </Boton>
      }
    >
      {GRUPOS.map((g) => (
        <fieldset key={g} className="space-y-3">
          <legend className="mb-2 font-cond text-lg font-bold uppercase text-navy">{g}</legend>
          {claves
            .filter((c) => TEXTOS[c].grupo === g)
            .map((c) => {
              const def = TEXTOS[c] as { label: string; multilinea?: boolean };
              return def.multilinea ? (
                <AreaTexto key={c} label={def.label} value={valores[c] ?? ''} onChange={(v) => setValores({ ...valores, [c]: v })} filas={3} />
              ) : (
                <Campo key={c} label={def.label} value={valores[c] ?? ''} onChange={(e) => setValores({ ...valores, [c]: e.target.value })} />
              );
            })}
        </fieldset>
      ))}
      <p className="text-sm text-gris">En las plantillas, lo que va entre llaves ({'{nombre}'}, {'{deuda}'}…) se completa solo con los datos de cada jugador.</p>
    </Hoja>
  );
}

// ---------------------------------------------------------------------------
const rolDe = (p: Player): Rol => (p.rolClub === 'delegado' || p.rolClub === 'tesorero' ? p.rolClub : 'jugador');

function HojaRoles({ onCerrar }: { onCerrar: () => void }) {
  const { perfil } = useSesion();
  const toast = useToast();
  const { datos, error, recargar } = useDatos(async () => (await api.jugadores()).filter((j) => j.activo !== false));
  const [elegido, setElegido] = useState<Player | null>(null);
  const [rol, setRol] = useState<Rol>('jugador');
  const [cargando, setCargando] = useState(false);

  const ordenados = [...(datos ?? [])].sort((a, b) => {
    const orden = { tesorero: 0, delegado: 1, jugador: 2 } as const;
    return orden[rolDe(a)] - orden[rolDe(b)] || a.lastName.localeCompare(b.lastName);
  });
  const esYo = elegido?.id === perfil.jugadorId;

  return (
    <Hoja titulo={elegido ? nombreDe(elegido) : 'Roles y PIN'} onCerrar={elegido ? () => setElegido(null) : onCerrar}>
      {error ? (
        <ErrorCaja reintentar={recargar}>{mensajeError(error)}</ErrorCaja>
      ) : !datos ? (
        <Cargando />
      ) : !elegido ? (
        <>
          <p className="text-gris">El delegado ve el plantel, carga prácticas y manda avisos. El tesorero, además, maneja la plata y esta configuración.</p>
          {ordenados.length === 0 ? (
            <Vacio>No hay jugadores.</Vacio>
          ) : (
            <ul className="divide-y divide-borde">
              {ordenados.map((j) => (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setElegido(j);
                      setRol(rolDe(j));
                    }}
                    className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 text-left hover:bg-fondo"
                  >
                    <span className="truncate">
                      {j.lastName}, {j.firstName}
                    </span>
                    <span className={cx('shrink-0 text-sm font-semibold', rolDe(j) === 'jugador' ? 'text-gris' : 'text-navy')}>{NOMBRE_ROL[rolDe(j)]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <Opciones
            label="Rol"
            valor={rol}
            onChange={setRol}
            opciones={(['jugador', 'delegado', 'tesorero'] as Rol[]).map((r) => ({ valor: r, texto: NOMBRE_ROL[r] }))}
          />
          {esYo && rol !== 'tesorero' && <p className="text-bad">Ojo: te estás sacando el rol de tesorero a vos mismo. Asegurate de que quede otro tesorero.</p>}
          <Boton
            bloque
            cargando={cargando}
            disabled={rol === rolDe(elegido)}
            onClick={async () => {
              setCargando(true);
              try {
                await api.asignarRol(elegido.id, rol);
                toast(`${nombreDe(elegido)} ahora es ${NOMBRE_ROL[rol].toLowerCase()}`);
                setElegido(null);
                recargar();
              } catch (e) {
                toast(mensajeError(e), 'error');
              } finally {
                setCargando(false);
              }
            }}
          >
            Guardar rol
          </Boton>
          {rolDe(elegido) !== 'jugador' && (
            <div className="space-y-2 border-t border-borde pt-4">
              <p className="text-gris">Si se olvidó el PIN o quedó bloqueado, reseteálo: la próxima vez que entre en modo staff va a crear uno nuevo.</p>
              <Boton
                variante="secundario"
                icono={KeyRound}
                bloque
                onClick={async () => {
                  if (!window.confirm(`¿Resetear el PIN de ${nombreDe(elegido)}?`)) return;
                  try {
                    await api.resetearPin(elegido.id);
                    toast('PIN reseteado');
                  } catch (e) {
                    toast(mensajeError(e), 'error');
                  }
                }}
              >
                Resetear PIN
              </Boton>
            </div>
          )}
          <Boton variante="texto" bloque onClick={() => setElegido(null)}>
            Volver a la lista
          </Boton>
        </>
      )}
    </Hoja>
  );
}
