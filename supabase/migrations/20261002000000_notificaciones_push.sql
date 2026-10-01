-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 7: notificaciones de la app (push).
--
-- Cómo usarla: DESPUÉS de la migración 6, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- Cada celular que activa las notificaciones guarda acá su "suscripción".
-- El staff manda avisos desde la app; la función /api/notificar de Vercel
-- pide las suscripciones con el login de quien manda (solo staff) y las envía.
-- =============================================================================

create table if not exists public.push_suscripciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  jugador_id  uuid references public.jugadores (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  dispositivo text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_suscripciones_jugador_idx on public.push_suscripciones (jugador_id);

-- Nadie lee ni escribe la tabla directo: todo pasa por las funciones de abajo.
alter table public.push_suscripciones enable row level security;
revoke all on public.push_suscripciones from anon, authenticated;

-- El celular de quien está logueado activa las notificaciones.
create or replace function public.guardar_suscripcion_push(
  p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tenés que ingresar para activar las notificaciones' using errcode = '42501';
  end if;
  insert into push_suscripciones (user_id, jugador_id, endpoint, p256dh, auth, dispositivo)
  values (auth.uid(), public.mi_jugador_id(), p_endpoint, p_p256dh, p_auth, left(p_dispositivo, 200))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        jugador_id = excluded.jugador_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        dispositivo = excluded.dispositivo,
        updated_at = now();
end;
$$;

-- Desactivar en este celular.
create or replace function public.quitar_suscripcion_push(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from push_suscripciones where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- Staff: qué jugadores tienen las notificaciones activas (para mostrarlo en la app).
create or replace function public.jugadores_con_push()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct jugador_id from push_suscripciones
  where jugador_id is not null and public.es_staff();
$$;

-- Staff: las suscripciones de esos jugadores, para mandarles el aviso.
create or replace function public.push_destinos(p_jugadores uuid[])
returns table (jugador_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not coalesce(public.es_staff(), false) then
    raise exception 'No tenés permiso para mandar notificaciones' using errcode = '42501';
  end if;
  return query
    select s.jugador_id, s.endpoint, s.p256dh, s.auth
    from push_suscripciones s
    where s.jugador_id = any (p_jugadores);
end;
$$;

-- Staff: borrar suscripciones que el celular ya dio de baja (desinstaló la app, etc.).
create or replace function public.push_quitar_vencidas(p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.es_staff(), false) then
    raise exception 'No tenés permiso' using errcode = '42501';
  end if;
  delete from push_suscripciones where endpoint = any (p_endpoints);
end;
$$;

revoke execute on function
  public.guardar_suscripcion_push(text, text, text, text),
  public.quitar_suscripcion_push(text),
  public.jugadores_con_push(),
  public.push_destinos(uuid[]),
  public.push_quitar_vencidas(text[])
  from public, anon;
grant execute on function
  public.guardar_suscripcion_push(text, text, text, text),
  public.quitar_suscripcion_push(text),
  public.jugadores_con_push(),
  public.push_destinos(uuid[]),
  public.push_quitar_vencidas(text[])
  to authenticated;

select 'Listo: notificaciones de la app activadas' as resultado;
