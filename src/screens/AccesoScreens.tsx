import React, { useEffect, useMemo, useState } from 'react';
import {
  anotarme,
  cambiarContrasena,
  cargarPlantelParaVincular,
  crearCuenta,
  entrarComoJugador,
  enviarRecuperacion,
  iniciarSesion,
  JugadorLista,
  mensajeErrorAuth,
  vincularJugador,
} from '../lib/auth';

const inputClass =
  'h-12 px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] text-[#191c1e] outline-none focus:bg-white focus:border-[#00183a] select-text';
const labelClass = 'font-heading text-[11px] font-bold text-[#00183a] uppercase tracking-wide';
const primaryBtn =
  'h-12 rounded-lg bg-[#00183a] text-white font-heading text-[13px] font-bold uppercase tracking-wider disabled:opacity-60 active:scale-[0.98] transition-transform';
const linkBtn = 'font-heading text-[12px] font-bold text-[#445e8d] underline underline-offset-2';

/** Marco común: fondo azul del club, logo y tarjeta blanca. */
const Marco: React.FC<{ titulo: string; subtitulo?: string; children: React.ReactNode }> = ({
  titulo,
  subtitulo,
  children,
}) => (
  <div className="min-h-screen bg-[#00183a] flex flex-col items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
    <img src="/escudo.png" alt="Escudo Club Elbio Fernández" className="h-28 w-auto drop-shadow-lg mb-4" />
    <p className="font-heading font-extrabold text-[11px] uppercase tracking-[0.2em] text-[#fabc4d]">
      Club Elbio Fernández
    </p>
    <h1 className="font-heading font-bold text-[22px] text-white mb-6">Gestión LUD</h1>
    <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
      <div>
        <h2 className="font-heading font-bold text-[18px] text-[#00183a]">{titulo}</h2>
        {subtitulo && <p className="font-sans text-[13px] text-[#44474f] mt-1 leading-snug">{subtitulo}</p>}
      </div>
      {children}
    </div>
  </div>
);

const Aviso: React.FC<{ tipo: 'error' | 'ok'; children: React.ReactNode }> = ({ tipo, children }) => (
  <p
    role={tipo === 'error' ? 'alert' : 'status'}
    className={`rounded-lg px-3 py-2 font-sans text-[13px] leading-snug ${
      tipo === 'error' ? 'bg-[#ffdad6] text-[#410002]' : 'bg-emerald-50 text-emerald-900'
    }`}
  >
    {children}
  </p>
);

type Modo = 'ingresar' | 'registrarse' | 'recuperar';

export const LoginScreen: React.FC = () => {
  const [modo, setModo] = useState<Modo>('ingresar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setError(null);
    setOk(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!email.includes('@')) {
      setError('Ingresá un email válido.');
      return;
    }
    if (modo !== 'recuperar' && password.length < 8) {
      setError('La contraseña tiene que tener al menos 8 caracteres.');
      return;
    }
    if (modo === 'registrarse' && password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      if (modo === 'ingresar') {
        await iniciarSesion(email, password);
        // La sesión nueva la detecta AuthGate.
      } else if (modo === 'registrarse') {
        const lista = await crearCuenta(email, password);
        if (!lista) {
          setOk(
            'Te mandamos un email para confirmar la cuenta. Tocá el link y después volvé acá a ingresar con tu email y contraseña.'
          );
          setModo('ingresar');
          setPassword('');
          setPassword2('');
        }
      } else {
        await enviarRecuperacion(email);
        setOk('Si hay una cuenta con ese email, te llegó un link para elegir una contraseña nueva.');
      }
    } catch (err) {
      setError(mensajeErrorAuth(err));
    } finally {
      setCargando(false);
    }
  };

  const [entrandoJugador, setEntrandoJugador] = useState(false);
  const handleSoyJugador = async () => {
    setError(null);
    setEntrandoJugador(true);
    try {
      await entrarComoJugador();
      // AuthGate detecta la sesión y muestra la pantalla para elegirse.
    } catch (err) {
      setError(mensajeErrorAuth(err));
      setEntrandoJugador(false);
    }
  };

  const titulos: Record<Modo, [string, string]> = {
    ingresar: ['Ingresar', ''],
    registrarse: [
      'Crear cuenta',
      'Para el staff del club: usá el email que te habilitó el administrador. Los jugadores entran con el botón "Soy jugador".',
    ],
    recuperar: ['Recuperar contraseña', 'Te mandamos un link por email para elegir una nueva.'],
  };

  return (
    <Marco titulo={titulos[modo][0]} subtitulo={titulos[modo][1] || undefined}>
      {modo === 'ingresar' && (
        <>
          <button
            type="button"
            onClick={handleSoyJugador}
            disabled={entrandoJugador}
            className="h-14 rounded-xl bg-[#b51a1b] text-white font-heading text-[14px] font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">sports_soccer</span>
            {entrandoJugador ? 'Un momento…' : 'Soy jugador: entrar con mi celular'}
          </button>
          <div className="flex items-center gap-2 text-[#747780]">
            <span className="h-px flex-1 bg-[#e0e3e6]" />
            <span className="font-heading text-[10px] font-bold uppercase tracking-wider">Staff del club</span>
            <span className="h-px flex-1 bg-[#e0e3e6]" />
          </div>
        </>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="nombre@ejemplo.com"
          />
        </label>

        {modo !== 'recuperar' && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Contraseña</span>
            <input
              type="password"
              autoComplete={modo === 'registrarse' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={modo === 'registrarse' ? 'Mínimo 8 caracteres' : ''}
            />
          </label>
        )}

        {modo === 'registrarse' && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Repetir contraseña</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {error && <Aviso tipo="error">{error}</Aviso>}
        {ok && <Aviso tipo="ok">{ok}</Aviso>}

        <button type="submit" disabled={cargando} className={primaryBtn}>
          {cargando
            ? 'Un momento…'
            : modo === 'ingresar'
            ? 'Ingresar'
            : modo === 'registrarse'
            ? 'Crear cuenta'
            : 'Enviar link'}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 pt-1">
        {modo === 'ingresar' ? (
          <>
            <button type="button" className={linkBtn} onClick={() => cambiarModo('registrarse')}>
              Es mi primera vez: crear cuenta
            </button>
            <button type="button" className={linkBtn} onClick={() => cambiarModo('recuperar')}>
              Olvidé mi contraseña
            </button>
          </>
        ) : (
          <button type="button" className={linkBtn} onClick={() => cambiarModo('ingresar')}>
            Volver a ingresar
          </button>
        )}
      </div>
    </Marco>
  );
};

/** Se muestra al volver del link de "Olvidé mi contraseña". */
export const NuevaContrasenaScreen: React.FC<{ onListo: () => void }> = ({ onListo }) => {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.');
    if (password !== password2) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      await cambiarContrasena(password);
      onListo();
    } catch (err) {
      setError(mensajeErrorAuth(err));
      setCargando(false);
    }
  };

  return (
    <Marco titulo="Elegí una contraseña nueva">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Contraseña nueva</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Repetir contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <button type="submit" disabled={cargando} className={primaryBtn}>
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </Marco>
  );
};

/** Cuenta creada pero sin rol ni ficha de jugador con ese email. */
export const PendienteScreen: React.FC<{ email: string; onReintentar: () => void; onSalir: () => void }> = ({
  email,
  onReintentar,
  onSalir,
}) => (
  <Marco
    titulo="Tu cuenta está pendiente"
    subtitulo={`Ingresaste como ${email}, pero ese email todavía no está habilitado en el club.`}
  >
    <ul className="font-sans text-[13px] text-[#44474f] list-disc pl-5 flex flex-col gap-1.5">
      <li>
        <strong>Jugadores:</strong> pedile al DT o al delegado que cargue este email en tu ficha.
      </li>
      <li>
        <strong>Staff:</strong> pedile al administrador que te habilite en Club Admin → Accesos.
      </li>
    </ul>
    <button type="button" onClick={onReintentar} className={primaryBtn}>
      Ya me habilitaron
    </button>
    <button type="button" onClick={onSalir} className={linkBtn}>
      Salir y usar otra cuenta
    </button>
  </Marco>
);

/** El jugador se elige de la lista del plantel y confirma con su cédula. */
export const VincularJugadorScreen: React.FC<{ onListo: () => void; onSalir: () => void }> = ({
  onListo,
  onSalir,
}) => {
  const [plantel, setPlantel] = useState<JugadorLista[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [celular, setCelular] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState<JugadorLista | null>(null);
  const [cedula, setCedula] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "No estoy en la lista": el jugador se anota con sus datos.
  const [anotandome, setAnotandome] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacimiento, setNacimiento] = useState('');

  useEffect(() => {
    cargarPlantelParaVincular()
      .then(setPlantel)
      .catch((err) => setErrorCarga(mensajeErrorAuth(err)));
  }, []);

  const filtrados = useMemo(() => {
    const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = sinTildes(busqueda.trim());
    return (plantel ?? []).filter((j) => !q || sinTildes(`${j.nombre} ${j.apellido} ${j.apellido} ${j.nombre}`).includes(q));
  }, [plantel, busqueda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (celular.replace(/\D/g, '').length < 8) return setError('Escribí tu número de celular completo (ej. 099 123 456).');
    if (!elegido) return setError('Elegite de la lista.');
    if (cedula.replace(/\D/g, '').length < 6) return setError('Escribí tu cédula completa.');
    setCargando(true);
    try {
      const r = await vincularJugador(elegido.id, cedula, celular);
      if (r === 'ok') return onListo();
      setError(
        r === 'bloqueado'
          ? 'Demasiados intentos con una cédula que no coincide. Probá de nuevo en una hora o pedile ayuda al delegado.'
          : `La cédula no coincide con la de ${elegido.nombre} ${elegido.apellido}. Revisala (con el dígito verificador) y volvé a intentar.`
      );
    } catch (err) {
      setError(mensajeErrorAuth(err));
    } finally {
      setCargando(false);
    }
  };

  const handleAnotarme = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !apellido.trim()) return setError('Escribí tu nombre y tu apellido.');
    if (cedula.replace(/\D/g, '').length < 6) return setError('Escribí tu cédula completa (con el dígito verificador).');
    if (!nacimiento) return setError('Poné tu fecha de nacimiento.');
    if (celular.replace(/\D/g, '').length < 8) return setError('Escribí tu número de celular completo (ej. 099 123 456).');
    setCargando(true);
    try {
      const r = await anotarme({ nombre, apellido, cedula, fechaNacimiento: nacimiento, celular });
      if (r === 'ok' || r === 'ya_anotado') return onListo();
      setError('Esa cédula ya está en el plantel. Volvé y elegite de la lista.');
    } catch (err) {
      setError(mensajeErrorAuth(err));
    } finally {
      setCargando(false);
    }
  };

  if (anotandome) {
    return (
      <Marco titulo="Anotarme en el plantel" subtitulo="Completá tus datos. Después la app te reconoce en este celular.">
        <form onSubmit={handleAnotarme} className="flex flex-col gap-3" noValidate>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Apellido</span>
            <input value={apellido} onChange={(e) => setApellido(e.target.value)} autoComplete="family-name" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Cédula</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className={inputClass}
              placeholder="1.234.567-8"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Fecha de nacimiento</span>
            <input type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Celular</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className={inputClass}
              placeholder="099 123 456"
            />
          </label>

          {error && <Aviso tipo="error">{error}</Aviso>}

          <button type="submit" disabled={cargando} className={primaryBtn}>
            {cargando ? 'Anotando…' : 'Anotarme'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setAnotandome(false);
            setError(null);
          }}
          className={linkBtn}
        >
          Volver a la lista
        </button>
      </Marco>
    );
  }

  return (
    <Marco titulo="¿Quién sos?" subtitulo="Se hace una sola vez: después la app te reconoce en este celular.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>1. Tu celular</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            className={inputClass}
            placeholder="099 123 456"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className={labelClass}>2. Elegite de la lista</span>
          {elegido ? (
            <div className="h-12 px-3 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-between">
              <span className="font-heading text-[14px] font-bold text-[#00183a]">
                {elegido.nombre} {elegido.apellido}
              </span>
              <button type="button" className={linkBtn} onClick={() => setElegido(null)}>
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={inputClass}
                placeholder="Buscá tu nombre o apellido"
              />
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[#e0e3e6] divide-y divide-[#eceef1]">
                {errorCarga && <p className="p-3 font-sans text-[13px] text-[#ba1a1a]">{errorCarga}</p>}
                {!plantel && !errorCarga && <p className="p-3 font-sans text-[13px] text-[#44474f]">Cargando plantel…</p>}
                {plantel && filtrados.length === 0 && (
                  <p className="p-3 font-sans text-[13px] text-[#44474f]">No aparece nadie con ese nombre.</p>
                )}
                {filtrados.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setElegido(j)}
                    className="w-full text-left px-3 py-2.5 font-sans text-[14px] text-[#191c1e] hover:bg-[#f2f4f7] active:bg-[#e6e8eb]"
                  >
                    <strong className="font-heading">{j.apellido}</strong>, {j.nombre}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {elegido && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>3. Tu cédula (para confirmar que sos vos)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className={inputClass}
              placeholder="1.234.567-8"
            />
          </label>
        )}

        {error && <Aviso tipo="error">{error}</Aviso>}

        <button type="submit" disabled={cargando || !elegido} className={primaryBtn}>
          {cargando ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
      <button type="button" onClick={onSalir} className={linkBtn}>
        Volver
      </button>
      <button
        type="button"
        onClick={() => {
          setAnotandome(true);
          setError(null);
        }}
        className="h-11 rounded-lg border-2 border-[#00183a] text-[#00183a] font-heading text-[12px] font-bold uppercase"
      >
        No estoy en la lista: anotarme
      </button>
    </Marco>
  );
};
