-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 3: los jugadores entran con su celular, sin email ni contraseña.
--
-- Cómo usarla: DESPUÉS de la migración 2, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- Requiere activar en Supabase: Authentication → Sign In / Providers →
-- "Allow anonymous sign-ins" (permitir ingresos anónimos).
--
-- Cómo funciona:
--   1. El jugador toca "Soy jugador": la app abre una sesión anónima en ese
--      celular (Supabase Auth, sin email ni contraseña).
--   2. Escribe su celular, se elige de la lista del plantel y escribe su
--      cédula. Si la cédula coincide con la del padrón, esa sesión queda
--      vinculada a su ficha (tabla vinculos_jugador) y el celular se guarda
--      en jugadores.telefono.
--   3. Desde ahí la app le muestra solo su ficha, como a cualquier jugador.
--   Máximo 5 cédulas incorrectas por hora y por sesión, para que nadie pueda
--   adivinarla probando.
-- =============================================================================

create table if not exists public.vinculos_jugador (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  jugador_id  uuid not null references public.jugadores (id) on delete cascade,
  telefono    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists vinculos_jugador_jugador_idx on public.vinculos_jugador (jugador_id);

create table if not exists public.intentos_vinculo (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  created_at  timestamptz not null default now()
);

create index if not exists intentos_vinculo_user_idx on public.intentos_vinculo (user_id, created_at);

-- Solo se accede por las funciones de abajo; el staff puede ver los vínculos.
alter table public.vinculos_jugador enable row level security;
alter table public.intentos_vinculo enable row level security;
revoke all on public.vinculos_jugador, public.intentos_vinculo from anon, authenticated;
grant select on public.vinculos_jugador to authenticated;

drop policy if exists rol_select on public.vinculos_jugador;
create policy rol_select on public.vinculos_jugador for select to authenticated
  using ((select public.mi_rol()) in ('admin', 'dt') or user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- La ficha del usuario: por vínculo de celular o por email (cuenta con email).
-- -----------------------------------------------------------------------------
create or replace function public.mi_jugador_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select v.jugador_id
       from vinculos_jugador v
       join jugadores j on j.id = v.jugador_id and j.activo
      where v.user_id = auth.uid()),
    (select j.id
       from jugadores j
      where public.mi_email() is not null
        and lower(trim(j.email)) = public.mi_email()
      order by j.created_at
      limit 1)
  )
$$;

-- -----------------------------------------------------------------------------
-- Lista del plantel para elegirse (solo nombre y apellido).
-- -----------------------------------------------------------------------------
create or replace function public.plantel_para_vincular()
returns table (id uuid, nombre text, apellido text)
language sql stable security definer
set search_path = public
as $$
  select j.id, j.nombre, j.apellido
  from jugadores j
  where j.activo and auth.uid() is not null
  order by j.apellido, j.nombre
$$;

-- -----------------------------------------------------------------------------
-- Vincular esta sesión a una ficha, verificando la cédula.
-- Devuelve 'ok', 'cedula_incorrecta' o 'bloqueado'. No usa raise para los
-- fallos: un raise desharía el registro del intento fallido.
-- -----------------------------------------------------------------------------
drop function if exists public.vincular_jugador(uuid, text, text);
create function public.vincular_jugador(p_jugador_id uuid, p_documento text, p_telefono text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_documento text;
  v_telefono  text := regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g');
  v_fallos    int;
begin
  if v_uid is null then
    raise exception 'Sesión inválida' using errcode = '42501';
  end if;

  if length(regexp_replace(v_telefono, '\D', '', 'g')) < 8 then
    raise exception 'El número de celular no es válido' using errcode = '22023';
  end if;

  select count(*) into v_fallos
  from intentos_vinculo
  where user_id = v_uid and created_at > now() - interval '1 hour';
  if v_fallos >= 5 then
    return 'bloqueado';
  end if;

  select documento into v_documento from jugadores where id = p_jugador_id and activo;

  -- Se comparan solo los dígitos: 4.857.346-7 = 4857346-7 = 48573467
  if v_documento is null
     or regexp_replace(v_documento, '\D', '', 'g') <> regexp_replace(coalesce(p_documento, ''), '\D', '', 'g')
     or regexp_replace(coalesce(p_documento, ''), '\D', '', 'g') = '' then
    insert into intentos_vinculo (user_id) values (v_uid);
    return case when v_fallos + 1 >= 5 then 'bloqueado' else 'cedula_incorrecta' end;
  end if;

  insert into vinculos_jugador (user_id, jugador_id, telefono)
  values (v_uid, p_jugador_id, v_telefono)
  on conflict (user_id) do update
    set jugador_id = excluded.jugador_id, telefono = excluded.telefono, created_at = now();

  update jugadores set telefono = v_telefono where id = p_jugador_id;
  delete from intentos_vinculo where user_id = v_uid;
  return 'ok';
end;
$$;

-- Al cerrar sesión en el celular, se borra el vínculo de esa sesión.
create or replace function public.desvincularme()
returns void
language sql
security definer
set search_path = public
as $$
  delete from vinculos_jugador where user_id = auth.uid()
$$;

revoke execute on function public.plantel_para_vincular(), public.vincular_jugador(uuid, text, text),
  public.desvincularme() from public, anon;
grant execute on function public.plantel_para_vincular(), public.vincular_jugador(uuid, text, text),
  public.desvincularme() to authenticated;

select 'Listo: ingreso de jugadores con celular activado' as resultado;
