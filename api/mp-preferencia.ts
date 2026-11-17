// Función de Vercel: arma el link de Mercado Pago (Checkout Pro) para pagar un cargo.
//
// La llama la app con el login del jugador (o del tesorero). La base valida que
// el cargo sea suyo y devuelve lo que falta pagar; el link se arma por ese
// saldo, nunca por un monto que mande el celular.
//
// Pedido:   POST { cargoId }
// Respuesta: { url }  (link de pago de MP)
import { appUrl, json, mp, supabaseDelUsuario } from './_mp.js';

interface Preferencia {
  id: string;
  init_point: string;
}

export async function POST(request: Request): Promise<Response> {
  const supabase = supabaseDelUsuario(request);
  if (!supabase) return json({ error: 'Falta el login.' }, 401);

  let cargoId = '';
  try {
    cargoId = String(((await request.json()) as { cargoId?: string }).cargoId ?? '');
  } catch {
    return json({ error: 'Pedido inválido.' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(cargoId)) return json({ error: 'Cargo inválido.' }, 400);

  const { data, error } = await supabase.rpc('mp_cargo_para_pagar', { p_cargo_id: cargoId });
  if (error) return json({ error: error.message }, error.code === '42501' ? 403 : 500);
  const fila = (data as { concepto: string; saldo: number }[] | null)?.[0];
  if (!fila) return json({ error: 'No existe ese cobro.' }, 404);
  if (fila.saldo <= 0) return json({ error: 'Ese cobro ya está pago.' }, 409);

  const base = appUrl(request);
  try {
    const pref = await mp<Preferencia>('/checkout/preferences', {
      body: {
        items: [
          {
            id: cargoId,
            title: `Elbio — ${fila.concepto}`.slice(0, 250),
            quantity: 1,
            unit_price: fila.saldo,
            currency_id: 'UYU',
          },
        ],
        external_reference: `cargo:${cargoId}`,
        notification_url: `${base}/api/mp-webhook`,
        back_urls: {
          success: `${base}/?mp=ok`,
          pending: `${base}/?mp=pendiente`,
          failure: `${base}/?mp=error`,
        },
        auto_return: 'approved',
        statement_descriptor: 'ELBIO',
        // El link vence a los 7 días: si se abre después, se pide otro.
        expires: true,
        expiration_date_to: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      },
    });
    return json({ url: pref.init_point });
  } catch (err) {
    return json({ error: `No se pudo armar el link de pago: ${(err as Error).message}` }, 502);
  }
}
