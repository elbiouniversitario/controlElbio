/**
 * App del rediseño 2026-11. Navegación por rol efectivo:
 *  - jugador:  una sola pantalla (MiFicha), sin barra.
 *  - delegado: Plantel · Prácticas · Avisos · Mi ficha.
 *  - tesorero: Plantel · Prácticas · Caja · Avisos · Más.
 * El staff entra como jugador y pasa a su rol con el PIN (dura 12 h).
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, CalendarDays, Ellipsis, IdCard, ShieldCheck, Users, Wallet, type LucideIcon } from 'lucide-react';
import { api, mensajeError } from '../lib/api';
import { esStaff, NOMBRE_ROL, type Perfil, type Rol } from '../lib/modelo';
import { combinarTextos, type Textos } from '../lib/textos';
import { configurarCorteEstudio } from '../lib/estudio';
import { SesionCtx, useSesion } from './comun';
import { Boton, Campo, Cargando, ErrorCaja, Hoja, ToastProvider, cx, useToast } from './ui';
import MiFicha from './MiFicha';
import Vincular from './Vincular';
import Plantel from './Plantel';
import Practicas from './Practicas';
import Caja from './Caja';
import Avisos from './Avisos';
import Mas from './Mas';

type Pestania = 'plantel' | 'practicas' | 'caja' | 'avisos' | 'mas' | 'ficha';
const PESTANIAS: Record<Pestania, { texto: string; icono: LucideIcon }> = {
  plantel: { texto: 'Plantel', icono: Users },
  practicas: { texto: 'Prácticas', icono: CalendarDays },
  caja: { texto: 'Caja', icono: Wallet },
  avisos: { texto: 'Avisos', icono: Bell },
  mas: { texto: 'Más', icono: Ellipsis },
  ficha: { texto: 'Mi ficha', icono: IdCard },
};
const NAV: Record<Rol, Pestania[]> = {
  jugador: [],
  delegado: ['plantel', 'practicas', 'avisos', 'ficha'],
  tesorero: ['plantel', 'practicas', 'caja', 'avisos', 'mas'],
};

export default function AppNueva() {
  return (
    <ToastProvider>
      <Raiz />
    </ToastProvider>
  );
}

function Raiz() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined);
  const [textos, setTextos] = useState<Textos | null>(null);
  const [error, setError] = useState<unknown>(null);

  const recargarPerfil = useCallback(async () => {
    setPerfil(await api.perfil());
  }, []);
  const recargarTextos = useCallback(async () => {
    const t = combinarTextos(await api.textos());
    configurarCorteEstudio(t.estudio_corte);
    setTextos(t);
  }, []);

  const arrancar = useCallback(async () => {
    setError(null);
    try {
      if (!(await api.haySesion())) await api.entrar();
      await Promise.all([recargarPerfil(), recargarTextos()]);
    } catch (e) {
      setError(e);
    }
  }, [recargarPerfil, recargarTextos]);

  useEffect(() => {
    arrancar();
  }, [arrancar]);

  return (
    <div className="app-nueva min-h-dvh bg-fondo font-barlow text-base text-tinta">
      {error ? (
        <div className="mx-auto max-w-[480px] p-4">
          <ErrorCaja reintentar={arrancar}>{mensajeError(error)}</ErrorCaja>
        </div>
      ) : perfil === undefined || !textos ? (
        <Cargando />
      ) : perfil === null ? (
        <Vincular onListo={recargarPerfil} />
      ) : (
        <SesionCtx.Provider value={{ perfil, textos, recargarPerfil, recargarTextos }}>
          <Principal />
        </SesionCtx.Provider>
      )}
    </div>
  );
}

function Principal() {
  const { perfil } = useSesion();
  const nav = NAV[perfil.rol];
  const [pestania, setPestania] = useState<Pestania>(nav[0] ?? 'ficha');
  // Si cambia el rol (entró o salió del modo staff), volver a la primera pestaña.
  useEffect(() => {
    setPestania(nav[0] ?? 'ficha');
  }, [perfil.rol]); // eslint-disable-line react-hooks/exhaustive-deps

  const actual = nav.includes(pestania) ? pestania : (nav[0] ?? 'ficha');
  return (
    <>
      <Encabezado />
      <main className={cx('mx-auto max-w-[480px] px-4 pt-3', nav.length ? 'pb-28' : 'pb-10')}>
        {actual === 'ficha' && <MiFicha />}
        {actual === 'plantel' && <Plantel />}
        {actual === 'practicas' && <Practicas />}
        {actual === 'caja' && <Caja />}
        {actual === 'avisos' && <Avisos />}
        {actual === 'mas' && <Mas />}
      </main>
      {nav.length > 0 && (
        <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-white pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto flex max-w-[480px]">
            {nav.map((p) => {
              const { texto, icono: Icono } = PESTANIAS[p];
              const activa = p === actual;
              return (
                <li key={p} className="flex-1">
                  <button
                    type="button"
                    aria-current={activa ? 'page' : undefined}
                    onClick={() => {
                      setPestania(p);
                      window.scrollTo(0, 0);
                    }}
                    className={cx(
                      'flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-[13px] font-semibold',
                      activa ? 'text-marca' : 'text-gris hover:text-navy'
                    )}
                  >
                    <Icono className="size-6" strokeWidth={activa ? 2.5 : 2} aria-hidden />
                    {texto}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}

function Encabezado() {
  const { perfil, recargarPerfil } = useSesion();
  const [pin, setPin] = useState(false);
  const toast = useToast();
  const staff = esStaff(perfil.rolAsignado);
  const enModo = esStaff(perfil.rol);

  return (
    <header className="sticky top-0 z-30 bg-navy text-white">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/escudo.png" alt="" width={36} height={36} className="size-9 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="font-cond text-xl font-bold uppercase tracking-wide">Control Elbio</p>
            {enModo && <p className="text-sm text-oro">Modo {NOMBRE_ROL[perfil.rol].toLowerCase()}</p>}
          </div>
        </div>
        {staff && (
          <button
            type="button"
            onClick={async () => {
              if (!enModo) return setPin(true);
              try {
                await api.salirModoStaff();
                await recargarPerfil();
                toast('Volviste a la vista de jugador');
              } catch (e) {
                toast(mensajeError(e), 'error');
              }
            }}
            className={cx(
              'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold',
              enModo ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-oro text-navy hover:bg-[#f5ad2a]'
            )}
          >
            <ShieldCheck className="size-5" aria-hidden />
            {enModo ? 'Salir' : `Modo ${NOMBRE_ROL[perfil.rolAsignado].toLowerCase()}`}
          </button>
        )}
      </div>
      {api.modo === 'demo' && <BarraDemo />}
      {pin && <HojaPin onCerrar={() => setPin(false)} />}
    </header>
  );
}

/** Solo en modo demo: cambiar el rol asignado para probar las tres vistas. */
function BarraDemo() {
  const { perfil, recargarPerfil } = useSesion();
  return (
    <div className="bg-oro text-navy">
      <div className="mx-auto flex max-w-[480px] items-center gap-2 px-4 py-1 text-sm">
        <span className="font-semibold">Demo · rol:</span>
        {(['jugador', 'delegado', 'tesorero'] as Rol[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={async () => {
              try {
                localStorage.setItem('ce_demo_rol', r);
              } catch {
                /* sin storage */
              }
              await api.salirModoStaff();
              await recargarPerfil();
            }}
            className={cx('min-h-8 cursor-pointer rounded-md px-2 font-semibold', perfil.rolAsignado === r ? 'bg-navy text-white' : 'hover:bg-white/50')}
          >
            {NOMBRE_ROL[r]}
          </button>
        ))}
      </div>
    </div>
  );
}

function HojaPin({ onCerrar }: { onCerrar: () => void }) {
  const { perfil, recargarPerfil } = useSesion();
  const toast = useToast();
  const crear = !perfil.tienePin;
  const [pin, setPin] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const rol = NOMBRE_ROL[perfil.rolAsignado].toLowerCase();

  const listo = async () => {
    await recargarPerfil();
    toast(`Modo ${rol} por 12 horas`);
    onCerrar();
  };

  const enviar = async () => {
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) return setError('El PIN son 4 a 6 números.');
    if (crear && pin !== repetir) return setError('Los dos PIN no coinciden.');
    setCargando(true);
    try {
      if (crear) {
        const r = await api.crearPin(pin);
        if (r === 'ok') return await listo();
        setError(
          r === 'ya_tiene_pin' ? 'Ya tenés un PIN. Cerrá y volvé a entrar.' : r === 'pin_invalido' ? 'El PIN son 4 a 6 números.' : 'Tu usuario no es del cuerpo técnico.'
        );
      } else {
        const r = await api.verificarPin(pin);
        if (r === 'ok') return await listo();
        setError(
          r === 'incorrecto'
            ? 'PIN incorrecto.'
            : r === 'bloqueado'
              ? 'Demasiados intentos. Pedile al tesorero que te resetee el PIN.'
              : r === 'sin_pin'
                ? 'Todavía no tenés PIN.'
                : 'Tu usuario no es del cuerpo técnico.'
        );
        setPin('');
      }
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="text-tinta">
      <Hoja
        titulo={crear ? 'Creá tu PIN' : `Modo ${rol}`}
        onCerrar={onCerrar}
        pie={
          <Boton bloque cargando={cargando} onClick={enviar}>
            {crear ? 'Crear PIN y entrar' : 'Entrar'}
          </Boton>
        }
      >
        <p className="text-gris">
          {crear
            ? `Es la primera vez que entrás como ${rol}. Elegí un PIN de 4 a 6 números: te lo vamos a pedir cada 12 horas.`
            : `Poné tu PIN para ver las herramientas de ${rol}.`}
        </p>
        <Campo
          label="PIN"
          type="password"
          inputMode="numeric"
          autoComplete={crear ? 'new-password' : 'current-password'}
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && !crear && enviar()}
          autoFocus
        />
        {crear && (
          <Campo
            label="Repetí el PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value.replace(/\D/g, ''))}
          />
        )}
        {error && (
          <p className="text-bad" role="alert">
            {error}
          </p>
        )}
      </Hoja>
    </div>
  );
}
