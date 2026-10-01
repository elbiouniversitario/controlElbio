// Función de Vercel: manda notificaciones de la app a los jugadores elegidos.
//
// La llama la app (staff) con su login de Supabase. Las suscripciones se piden
// a la base con ese mismo login: la función push_destinos solo responde al
// staff, así que acá no hace falta la clave de servicio de Supabase.
//
// Variables en Vercel:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (las mismas de la app)
//   VITE_VAPID_PUBLIC_KEY  (la pública: la usa también la app)
//   VAPID_PRIVATE_KEY      (Secret: solo acá)
//   VAPID_SUBJECT      (opcional, ej. mailto:elbiouniversitario@gmail.com)
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

interface Mensaje {
  jugadorId: string;
  cuerpo: string;
}

interface Pedido {
  titulo: string;
  mensajes: Mensaje[];
  url?: string;
}

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const publica = process.env.VITE_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!url || !anon || !publica || !privada) {
    return json({ error: 'Faltan variables en Vercel (las claves VAPID o las de Supabase).' }, 500);
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Falta el login.' }, 401);

  let pedido: Pedido;
  try {
    pedido = (await request.json()) as Pedido;
  } catch {
    return json({ error: 'Pedido inválido.' }, 400);
  }
  const titulo = String(pedido.titulo ?? '').slice(0, 80).trim();
  const mensajes = (Array.isArray(pedido.mensajes) ? pedido.mensajes : [])
    .filter((m) => m && typeof m.jugadorId === 'string' && typeof m.cuerpo === 'string')
    .slice(0, 200);
  if (!titulo || mensajes.length === 0) return json({ error: 'Falta el título o los destinatarios.' }, 400);
  // Solo links de la propia app.
  const destino = typeof pedido.url === 'string' && pedido.url.startsWith('/') ? pedido.url : '/';

  // Cliente con el login de quien manda: la base decide si es staff.
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: destinos, error } = await supabase.rpc('push_destinos', {
    p_jugadores: mensajes.map((m) => m.jugadorId),
  });
  if (error) {
    const status = error.code === '42501' ? 403 : 500;
    return json({ error: error.message }, status);
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:elbiouniversitario@gmail.com', publica, privada);

  const cuerpoDe = new Map(mensajes.map((m) => [m.jugadorId, m.cuerpo.slice(0, 500)]));
  const llegaron = new Set<string>();
  const vencidas: string[] = [];
  let fallidos = 0;

  const filas = (destinos ?? []) as { jugador_id: string; endpoint: string; p256dh: string; auth: string }[];
  await Promise.all(
    filas.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ titulo, cuerpo: cuerpoDe.get(s.jugador_id) ?? '', url: destino }),
          { TTL: 60 * 60 * 24 }
        );
        llegaron.add(s.jugador_id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: el celular dio de baja la suscripción (desinstaló, borró datos…).
        if (status === 404 || status === 410) vencidas.push(s.endpoint);
        else fallidos++;
      }
    })
  );

  if (vencidas.length) await supabase.rpc('push_quitar_vencidas', { p_endpoints: vencidas });

  return json({
    enviados: [...llegaron],
    sinNotificaciones: mensajes.map((m) => m.jugadorId).filter((id) => !llegaron.has(id)),
    fallidos,
  });
}
