import { supabase } from './supabase';

export type Rol = 'admin' | 'dt' | 'tesorero' | 'jugador';

/** Quién está usando la app. En modo demo (sin Supabase) no hay perfil. */
export interface Perfil {
  email: string;
  /** null = cuenta sin rol ni ficha de jugador: pendiente de habilitación. */
  rol: Rol | null;
  /** Ficha de jugador vinculada por email (también puede tenerla alguien del staff). */
  jugadorId: string | null;
}

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  dt: 'Cuerpo técnico / Delegado',
  tesorero: 'Tesorería',
  jugador: 'Jugador',
};

function cliente() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

export async function cargarPerfil(): Promise<Perfil> {
  const { data, error } = await cliente().rpc('mi_perfil');
  if (error) throw error;
  const p = data as { email: string | null; rol: Rol | null; jugador_id: string | null };
  return { email: p.email ?? '', rol: p.rol, jugadorId: p.jugador_id };
}

/** Traduce los errores de Supabase Auth a mensajes para el usuario. */
export function mensajeErrorAuth(err: unknown): string {
  const e = err as { message?: string; code?: string; status?: number } | null;
  const msg = e?.message ?? String(err);
  const code = e?.code ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return 'Todavía no confirmaste tu email. Revisá tu correo (y la carpeta de spam) y tocá el link de confirmación.';
  if (code === 'user_already_exists' || /already registered/i.test(msg)) return 'Ya existe una cuenta con ese email. Probá ingresar.';
  if (code === 'weak_password' || /password should be/i.test(msg)) return 'La contraseña es muy corta: usá al menos 8 caracteres.';
  if (code === 'over_email_send_rate_limit' || e?.status === 429 || /rate limit/i.test(msg))
    return 'Se enviaron demasiados emails en poco tiempo. Esperá unos minutos y volvé a intentar.';
  if (/failed to fetch|network/i.test(msg)) return 'No hay conexión. Revisá internet y volvé a intentar.';
  if (code === 'anonymous_provider_disabled' || /anonymous sign-ins are disabled/i.test(msg))
    return 'El ingreso con celular todavía no está activado. Avisale al administrador del club.';
  return msg;
}

export async function iniciarSesion(email: string, password: string): Promise<void> {
  const { error } = await cliente().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
}

/** Devuelve true si la cuenta quedó lista para usar, false si hay que confirmar el email. */
export async function crearCuenta(email: string, password: string): Promise<boolean> {
  const { data, error } = await cliente().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data.session !== null;
}

export async function enviarRecuperacion(email: string): Promise<void> {
  const { error } = await cliente().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function cambiarContrasena(password: string): Promise<void> {
  const { error } = await cliente().auth.updateUser({ password });
  if (error) throw error;
}

export async function cerrarSesion(): Promise<void> {
  await cliente().auth.signOut();
}

// ---------------------------------------------------------------------------
// Jugadores: ingreso con celular (sesión anónima + vínculo verificado con cédula)
// ---------------------------------------------------------------------------
export async function entrarComoJugador(): Promise<void> {
  const { error } = await cliente().auth.signInAnonymously();
  if (error) throw error;
}

export interface JugadorLista {
  id: string;
  nombre: string;
  apellido: string;
}

export async function cargarPlantelParaVincular(): Promise<JugadorLista[]> {
  const { data, error } = await cliente().rpc('plantel_para_vincular');
  if (error) throw error;
  return data as JugadorLista[];
}

export type ResultadoVinculo = 'ok' | 'cedula_incorrecta' | 'bloqueado';

export async function vincularJugador(jugadorId: string, cedula: string, celular: string): Promise<ResultadoVinculo> {
  const { data, error } = await cliente().rpc('vincular_jugador', {
    p_jugador_id: jugadorId,
    p_documento: cedula,
    p_telefono: celular,
  });
  if (error) throw error;
  return data as ResultadoVinculo;
}

/** Cierra sesión; si era un jugador con celular, primero borra el vínculo de ese celular. */
export async function salir(anonimo: boolean): Promise<void> {
  if (anonimo) {
    await cliente().rpc('desvincularme').then(
      () => undefined,
      () => undefined
    );
  }
  await cerrarSesion();
}
