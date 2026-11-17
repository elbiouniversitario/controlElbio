// Función de Vercel: débito automático de la cuota con Mercado Pago (preapproval).
//
// Pedidos (con el login del jugador):
//   POST { accion: 'crear', email }  → { url }  link para autorizar en MP
//   POST { accion: 'cancelar' }      → { ok: true }
//
// El monto sale de la base (excepción del jugador o cuota general), no del
// celular. El email es el de la cuenta de Mercado Pago con la que va a pagar.
import { appUrl, json, mp, supabaseDelUsuario, supabaseServicio } from './_mp.js';

interface MiCuota {
  jugador_id: string;
  nombre: string;
  email: string;
  monto: number;
}

interface Preapproval {
  id: string;
  status: string;
  init_point: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  const supabase = supabaseDelUsuario(request);
  if (!supabase) return json({ error: 'Falta el login.' }, 401);

  let pedido: { accion?: string; email?: string };
  try {
    pedido = (await request.json()) as typeof pedido;
  } catch {
    return json({ error: 'Pedido inválido.' }, 400);
  }

  const { data, error } = await supabase.rpc('mp_mi_cuota');
  if (error) return json({ error: error.message }, error.code === '42501' ? 403 : 500);
  const yo = (data as MiCuota[] | null)?.[0];
  if (!yo) return json({ error: 'Primero vinculá tu ficha.' }, 403);

  let servicio;
  try {
    servicio = supabaseServicio();
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
  const { data: actual } = await servicio
    .from('suscripciones_mp')
    .select('preapproval_id, estado')
    .eq('jugador_id', yo.jugador_id)
    .maybeSingle();

  try {
    if (pedido.accion === 'cancelar') {
      if (!actual || actual.estado === 'cancelled') return json({ ok: true });
      await mp(`/preapproval/${actual.preapproval_id}`, { method: 'PUT', body: { status: 'cancelled' } });
      await servicio.rpc('mp_estado_suscripcion', { p_preapproval_id: actual.preapproval_id, p_estado: 'cancelled' });
      return json({ ok: true });
    }

    if (pedido.accion !== 'crear') return json({ error: 'Acción inválida.' }, 400);
    const email = String(pedido.email ?? '').trim().toLowerCase();
    if (!EMAIL.test(email)) return json({ error: 'Poné el email de tu cuenta de Mercado Pago.' }, 400);
    if (yo.monto <= 0) return json({ error: 'No tenés cuota para pagar (estás exonerado).' }, 409);
    if (actual?.estado === 'authorized') return json({ error: 'Ya tenés el débito automático activo.' }, 409);

    // Si quedó una pendiente sin autorizar, se cancela y se arma una nueva.
    if (actual && actual.estado === 'pending') {
      await mp(`/preapproval/${actual.preapproval_id}`, { method: 'PUT', body: { status: 'cancelled' } }).catch(
        () => undefined
      );
    }

    const pre = await mp<Preapproval>('/preapproval', {
      body: {
        reason: 'Cuota mensual Elbio',
        external_reference: `cuota:${yo.jugador_id}`,
        payer_email: email,
        back_url: `${appUrl(request)}/?mp=suscripcion`,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: yo.monto,
          currency_id: 'UYU',
        },
      },
    });
    await servicio.rpc('mp_guardar_suscripcion', {
      p_jugador_id: yo.jugador_id,
      p_preapproval_id: pre.id,
      p_estado: 'pending',
      p_monto: yo.monto,
      p_email: email,
    });
    return json({ url: pre.init_point });
  } catch (err) {
    const msg = (err as Error).message;
    // MP rechaza emails que no son de una cuenta de MP de Uruguay.
    const ayuda = /payer|email|site/i.test(msg)
      ? ' Revisá que el email sea el de tu cuenta de Mercado Pago Uruguay.'
      : '';
    return json({ error: `Mercado Pago no aceptó la suscripción: ${msg}.${ayuda}` }, 502);
  }
}
