-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 10: notificaciones también para el staff que entra con email.
--
-- Cómo usarla: pegar TODO este archivo en Supabase → SQL Editor → Run
-- (después de las anteriores). Se puede correr más de una vez.
--
-- La suscripción de cada celular guarda también el email de quien la
-- activó, así el admin ve en Club qué miembros del staff (sin ficha de
-- jugador) tienen las notificaciones activadas.
-- =============================================================================

alter table public.push_suscripciones add column if not exists email text;
create index if not exists push_suscripciones_email_idx on public.push_suscripciones (email);

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
  insert into push_suscripciones (user_id, jugador_id, email, endpoint, p256dh, auth, dispositivo)
  values (auth.uid(), public.mi_jugador_id(), public.mi_email(), p_endpoint, p_p256dh, p_auth, left(p_dispositivo, 200))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        jugador_id = excluded.jugador_id,
        email = excluded.email,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        dispositivo = excluded.dispositivo,
        updated_at = now();
end;
$$;

-- Staff: emails que tienen las notificaciones activadas en algún celular.
create or replace function public.emails_con_push()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct lower(email) from push_suscripciones
  where email is not null and public.es_staff();
$$;

revoke execute on function public.emails_con_push() from public, anon;
grant execute on function public.emails_con_push() to authenticated;

select 'Listo: notificaciones del staff activadas' as resultado;
