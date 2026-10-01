-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 8: avisos automáticos (vencimientos, cuota y cumpleaños).
--
-- Cómo usarla: DESPUÉS de la migración 7, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- Todos los días a la mañana, la función api/avisos-automaticos de Vercel
-- revisa los vencimientos y manda una notificación a cada jugador. Esta tabla
-- guarda qué aviso ya se mandó, para no repetirlo.
-- =============================================================================

create table if not exists public.avisos_automaticos (
  id          uuid primary key default gen_random_uuid(),
  jugador_id  uuid not null references public.jugadores (id) on delete cascade,
  -- 'ficha_medica', 'carne_lud', 'cuota' o 'cumpleanios'
  tipo        text not null,
  -- Qué vencimiento: la fecha de vencimiento, el mes de la cuota o el año del cumpleaños.
  referencia  text not null,
  -- En qué momento se avisó: días antes del vencimiento ('30', '5', '0'…) o 'dia'.
  hito        text not null,
  enviado_en  timestamptz not null default now(),
  unique (jugador_id, tipo, referencia, hito)
);

-- Solo la usa la función de Vercel (con la clave de servicio). Nadie más la toca.
alter table public.avisos_automaticos enable row level security;
revoke all on public.avisos_automaticos from anon, authenticated;

-- Textos guardados que hablaban de WhatsApp (los avisos ahora van por notificación).
update public.roles_club
set descripcion = 'Control de tesorería, auditoría, configuración de torneos, asignación de permisos y avisos al plantel.'
where descripcion like '%WhatsApp%' and clave = 'admin';
update public.reglas_automatizacion
set descripcion = 'Aviso automático por notificación al jugador cuando le falta poco para vencer, y el día que vence.'
where descripcion like '%WhatsApp%';

select 'Listo: avisos automáticos activados' as resultado;
