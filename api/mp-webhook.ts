// Función de Vercel: avisos de Mercado Pago (webhooks).
//
// No se confía en el contenido del aviso: con el id que llega se vuelve a
// pedir el pago / la suscripción a la API de MP con el token del club, y
// recién ahí se registra. Un mismo pago no entra dos veces (mp_payment_id único).
//
// Avisos que maneja:
//   payment                          → pago puntual (cargo:<id>) o cobro de suscripción (cuota:<jugador>)
//   subscription_authorized_payment  → cobro mensual de la suscripción
//   subscription_preapproval         → la suscripción se autorizó / pausó / canceló
// Siempre responde 200 salvo error transitorio (así MP reintenta solo esos).
import { firmaValida, json, mp, supabaseServicio } from './_mp.js';

interface PagoMP {
  id: number;
  status: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string | null;
  date_approved: string | null;
  metadata?: { preapproval_id?: string } | null;
  point_of_interaction?: { transaction_data?: { subscription_id?: string } } | null;
}

interface CobroSuscripcion {
  id: number;
  preapproval_id: string;
  status: string;
  payment?: { id?: number; status?: string } | null;
}

interface PreapprovalMP {
  id: string;
  status: string;
  external_reference: string | null;
  payer_email?: string;
  auto_recurring?: { transaction_amount?: number };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS_SUSCRIPCION = new Set(['pending', 'authorized', 'paused', 'cancelled']);

function leerReferencia(ref: string | null | undefined): { cargoId?: string; jugadorId?: string } {
  const [tipo, id] = String(ref ?? '').split(':');
  if (!id || !UUID.test(id)) return {};
  if (tipo === 'cargo') return { cargoId: id };
  if (tipo === 'cuota') return { jugadorId: id };
  return {};
}

async function jugadorDeSuscripcion(preapprovalId: string): Promise<string | undefined> {
  const pre = await mp<PreapprovalMP>(`/preapproval/${preapprovalId}`);
  return leerReferencia(pre.external_reference).jugadorId;
}

async function procesarPago(paymentId: string, jugadorPorSuscripcion?: string) {
  const pago = await mp<PagoMP>(`/v1/payments/${paymentId}`);
  const sb = supabaseServicio();
  const mpId = String(pago.id);

  if (pago.status === 'refunded' || pago.status === 'charged_back' || pago.status === 'cancelled') {
    await sb.rpc('mp_revertir_pago', { p_mp_payment_id: mpId, p_motivo: `Mercado Pago: ${pago.status}` });
    return 'revertido';
  }
  if (pago.status !== 'approved') return `ignorado (${pago.status})`;
  if (pago.currency_id && pago.currency_id !== 'UYU') return 'ignorado (moneda)';

  let { cargoId, jugadorId } = leerReferencia(pago.external_reference);
  if (!cargoId && !jugadorId) jugadorId = jugadorPorSuscripcion;
  if (!cargoId && !jugadorId) {
    // Cobro de suscripción sin referencia propia: se busca por la suscripción.
    const pre = pago.metadata?.preapproval_id || pago.point_of_interaction?.transaction_data?.subscription_id;
    if (pre) jugadorId = await jugadorDeSuscripcion(pre);
  }
  if (!cargoId && !jugadorId) return 'ignorado (sin referencia del club)';

  const { error } = await sb.rpc('mp_registrar_pago', {
    p_mp_payment_id: mpId,
    p_cargo_id: cargoId ?? null,
    p_jugador_id: jugadorId ?? null,
    p_monto: Math.round(pago.transaction_amount),
    p_fecha: (pago.date_approved ?? new Date().toISOString()).slice(0, 10),
  });
  if (error) throw new Error(error.message);
  return 'registrado';
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let cuerpo: { type?: string; topic?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    cuerpo = await request.json();
  } catch {
    // Los avisos viejos (IPN) llegan solo por query string.
  }
  const tipo = cuerpo.type || cuerpo.topic || url.searchParams.get('type') || url.searchParams.get('topic') || '';
  const id = String(cuerpo.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');
  if (!tipo || !id) return json({ ok: true, nada: true });

  if (!firmaValida(request, url.searchParams.get('data.id') ?? id)) {
    return json({ error: 'Firma inválida' }, 401);
  }

  try {
    let resultado = 'ignorado';
    if (tipo === 'payment') {
      resultado = await procesarPago(id);
    } else if (tipo === 'subscription_authorized_payment' || tipo === 'authorized_payment') {
      const cobro = await mp<CobroSuscripcion>(`/authorized_payments/${id}`);
      if (cobro.payment?.id) {
        const jugador = await jugadorDeSuscripcion(cobro.preapproval_id);
        resultado = await procesarPago(String(cobro.payment.id), jugador);
      } else {
        resultado = `sin pago todavía (${cobro.status})`;
      }
    } else if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
      const pre = await mp<PreapprovalMP>(`/preapproval/${id}`);
      const { jugadorId } = leerReferencia(pre.external_reference);
      if (jugadorId && ESTADOS_SUSCRIPCION.has(pre.status)) {
        const sb = supabaseServicio();
        const { error } = await sb.rpc('mp_guardar_suscripcion', {
          p_jugador_id: jugadorId,
          p_preapproval_id: pre.id,
          p_estado: pre.status,
          p_monto: Math.round(pre.auto_recurring?.transaction_amount ?? 0),
          p_email: pre.payer_email ?? '',
        });
        if (error) throw new Error(error.message);
        resultado = `suscripción ${pre.status}`;
      }
    }
    return json({ ok: true, resultado });
  } catch (err) {
    const status = (err as { status?: number }).status;
    // 404 de MP: el id no existe (aviso de prueba o de otra cuenta): no reintentar.
    if (status === 404) return json({ ok: true, resultado: 'no existe en MP' });
    console.error('mp-webhook', tipo, id, err);
    return json({ error: (err as Error).message }, 500);
  }
}
