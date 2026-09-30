import React, { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cargarPerfil, Perfil, salir as cerrar } from '../lib/auth';
import { LoginScreen, NuevaContrasenaScreen, PendienteScreen, VincularJugadorScreen } from '../screens/AccesoScreens';

interface AuthGateProps {
  /** perfil = null solo en modo demo (sin Supabase configurado). */
  children: (perfil: Perfil | null, salir: () => void) => ReactNode;
}

const Pantalla: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#00183a] flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
    {children}
  </div>
);

/**
 * Pide login cuando Supabase está configurado. Sin Supabase (modo demo) deja
 * pasar directo, sin perfil.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  // anonimo = jugador que entró con su celular (sin email ni contraseña).
  const [usuario, setUsuario] = useState<{ id: string; anonimo: boolean } | null | undefined>(
    supabase ? undefined : null
  );
  const [recuperando, setRecuperando] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Sesión: la inicial y cualquier cambio (ingreso, salida, link de recuperación).
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      // Solo se guarda el id: así renovar el token no vuelve a cargar el perfil.
      setUsuario((prev) => {
        const id = session?.user.id;
        if (!id) return null;
        return prev?.id === id ? prev : { id, anonimo: session.user.is_anonymous === true };
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Perfil (rol y ficha) de quien ingresó.
  useEffect(() => {
    if (!usuario) {
      setPerfil(null);
      return;
    }
    let cancelado = false;
    setPerfil(null);
    setErrorPerfil(null);
    cargarPerfil()
      .then((p) => !cancelado && setPerfil(p))
      .catch((err) => {
        if (cancelado) return;
        console.error('Error cargando el perfil', err);
        setErrorPerfil(err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err));
      });
    return () => {
      cancelado = true;
    };
  }, [usuario, intento]);

  const salir = () => {
    setRecuperando(false);
    void cerrar(usuario?.anonimo ?? false);
  };

  if (!supabase) return <>{children(null, () => {})}</>;

  if (usuario === undefined) {
    return (
      <Pantalla>
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
      </Pantalla>
    );
  }

  if (usuario === null) return <LoginScreen />;

  if (recuperando) return <NuevaContrasenaScreen onListo={() => setRecuperando(false)} />;

  if (errorPerfil) {
    return (
      <Pantalla>
        <span className="material-symbols-outlined text-[40px] text-[#fabc4d]">cloud_off</span>
        <p className="font-heading font-bold text-[16px]">No se pudo verificar tu acceso</p>
        <p className="font-sans text-[13px] text-[#acc7fc] max-w-xs">{errorPerfil}. Revisá la conexión.</p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="mt-2 h-11 px-6 rounded-lg bg-white text-[#00183a] font-heading text-[12px] font-bold"
        >
          Reintentar
        </button>
        <button type="button" onClick={salir} className="font-heading text-[12px] underline text-[#acc7fc]">
          Salir
        </button>
      </Pantalla>
    );
  }

  if (!perfil) {
    return (
      <Pantalla>
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="font-heading text-[12px] font-bold">Verificando acceso…</p>
      </Pantalla>
    );
  }

  if (!perfil.rol && usuario.anonimo) {
    return <VincularJugadorScreen onListo={() => setIntento((n) => n + 1)} onSalir={salir} />;
  }

  if (!perfil.rol) {
    return <PendienteScreen email={perfil.email} onReintentar={() => setIntento((n) => n + 1)} onSalir={salir} />;
  }

  return <>{children(perfil, salir)}</>;
};
