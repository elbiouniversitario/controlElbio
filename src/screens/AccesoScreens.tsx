import React, { useState } from 'react';
import {
  cambiarContrasena,
  crearCuenta,
  enviarRecuperacion,
  iniciarSesion,
  mensajeErrorAuth,
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
    <img src="/icons/icon-192.png" alt="" className="w-20 h-20 rounded-2xl shadow-lg mb-4" />
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

  const titulos: Record<Modo, [string, string]> = {
    ingresar: ['Ingresar', 'Con el email y la contraseña de tu cuenta.'],
    registrarse: [
      'Crear cuenta',
      'Jugadores: usá el mismo email que tenés en tu ficha del club. Staff: el email que te habilitó el administrador.',
    ],
    recuperar: ['Recuperar contraseña', 'Te mandamos un link por email para elegir una nueva.'],
  };

  return (
    <Marco titulo={titulos[modo][0]} subtitulo={titulos[modo][1]}>
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
