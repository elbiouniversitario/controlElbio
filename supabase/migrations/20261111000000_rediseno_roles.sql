-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 12: rediseño 2026-11 (roles con PIN, plata unificada, prácticas).
--
-- Cómo usarla: DESPUÉS de todas las anteriores, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- ANTES: hacer un backup (Database → Backups) — esta migración cambia permisos
-- de todas las tablas.
--
-- Qué cambia:
--   1. Roles: jugador / delegado / tesorero, en jugadores.rol_club. Desaparecen
--      admin y dt (admin y tesorero → tesorero; dt → delegado). La tabla
--      miembros_club queda en la base (por si hay que volver atrás) pero ya
--      no da permisos. Se deja de entrar con email: todos entran con
--      celular + cédula.
--   2. PIN de staff: para pasar a la vista de delegado/tesorero hay que poner
--      un PIN de 4 a 6 dígitos (guardado hasheado). Sin PIN, el staff ve lo
--      mismo que un jugador. El modo staff dura 12 horas.
--   3. Límite de intentos por JUGADOR (antes era por sesión: se puenteaba
--      abriendo otra sesión). Contra: alguien puede bloquear 1 hora el ingreso
--      de un jugador probando cédulas a propósito.
--   4. Plata unificada: cobros (cuota del mes, asado, indumentaria…), cargos
--      (cuánto le toca a cada jugador) y pagos con estado
--      informado / confirmado / rechazado y foto del comprobante. Las cuotas
--      viejas se copian como cobros. Excepciones de cuota por jugador. Gastos.
--   5. Prácticas y asistencias (desde la lista de WhatsApp).
--   6. Historial de avisos manuales.
--   7. La deuda ya no inhabilita (eso lo calcula la app: solo documentos).
-- =============================================================================

-- pgcrypto en Supabase vive en el esquema "extensions".
create extension if not exists pgcrypto with schema extensions;

-- =============================================================================
-- 1. ROLES
-- =============================================================================

alter table public.jugadores drop constraint if exists jugadores_rol_club_check;
update public.jugadores set rol_club = 'delegado' where rol_club = 'dt';

-- Pasar los roles de miembros_club (por email) a la ficha del jugador.
update public.jugadores j
set rol_club = case
  when m.rol in ('admin', 'tesorero') then 'tesorero'
  when m.rol = 'dt' and j.rol_club <> 'tesorero' then 'delegado'
  else j.rol_club
end
from public.miembros_club m
where m.email = lower(trim(j.email)) and j.email <> '';

alter table public.jugadores add constraint jugadores_rol_club_check
  check (rol_club in ('jugador', 'delegado', 'tesorero'));

-- La ficha del usuario: SOLO por vínculo de celular (se saca el login por email).
create or replace function public.mi_jugador_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select v.jugador_id
  from vinculos_jugador v
  join jugadores j on j.id = v.jugador_id and j.activo
  where v.user_id = auth.uid()
$$;

-- El rol que el tesorero le asignó (sin importar si puso el PIN).
create or replace function public.mi_rol_asignado()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce((select j.rol_club from jugadores j where j.id = public.mi_jugador_id()), 'jugador')
$$;

-- =============================================================================
-- 2. PIN DE STAFF
-- =============================================================================

-- Tabla aparte (no columna de jugadores) para que nadie lea el hash con un select.
create table if not exists public.pines_staff (
  jugador_id  uuid primary key references public.jugadores (id) on delete cascade,
  pin_hash    text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.sesiones_staff (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  jugador_id  uuid not null references public.jugadores (id) on delete cascade,
  hasta       timestamptz not null
);

create table if not exists public.intentos_pin (
  id          bigint generated always as identity primary key,
  jugador_id  uuid not null references public.jugadores (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists intentos_pin_jugador_idx on public.intentos_pin (jugador_id, created_at);

alter table public.pines_staff    enable row level security;
alter table public.sesiones_staff enable row level security;
alter table public.intentos_pin   enable row level security;
revoke all on public.pines_staff, public.sesiones_staff, public.intentos_pin from anon, authenticated;

-- Rol EFECTIVO: el asignado solo si la sesión está en modo staff (PIN puesto
-- hace menos de 12 h, y sigue siendo la misma ficha). Si no, 'jugador'.
create or replace function public.mi_rol()
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from sesiones_staff s
      where s.user_id = auth.uid()
        and s.jugador_id = public.mi_jugador_id()
        and s.hasta > now()
    ) then public.mi_rol_asignado()
    else 'jugador'
  end
$$;

create or replace function public.es_staff()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.mi_rol() in ('delegado', 'tesorero'), false)
$$;

create or replace function public.es_tesorero()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.mi_rol() = 'tesorero', false)
$$;

-- Lo usaban las políticas viejas: ahora carga el plantel todo el staff.
create or replace function public.carga_plantel()
returns boolean
language sql stable
set search_path = public
as $$
  select public.es_staff()
$$;

-- Perfil para la app: quién soy, qué rol tengo asignado, si ya tengo PIN y si
-- estoy en modo staff.
drop function if exists public.mi_perfil();
create function public.mi_perfil()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'jugador_id',    public.mi_jugador_id(),
    'rol_asignado',  public.mi_rol_asignado(),
    'rol',           public.mi_rol(),
    'tiene_pin',     exists (select 1 from pines_staff p where p.jugador_id = public.mi_jugador_id()),
    'staff_hasta',   (select s.hasta from sesiones_staff s
                       where s.user_id = auth.uid() and s.hasta > now())
  )
$$;

-- Primera vez: el staff crea su PIN (y queda en modo staff).
-- Devuelve 'ok', 'no_es_staff', 'ya_tiene_pin' o 'pin_invalido'.
create or replace function public.crear_pin(p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jugador uuid := public.mi_jugador_id();
begin
  if v_jugador is null or public.mi_rol_asignado() not in ('delegado', 'tesorero') then
    return 'no_es_staff';
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    return 'pin_invalido';
  end if;
  if exists (select 1 from pines_staff where jugador_id = v_jugador) then
    return 'ya_tiene_pin';
  end if;

  insert into pines_staff (jugador_id, pin_hash)
  values (v_jugador, extensions.crypt(p_pin, extensions.gen_salt('bf')));

  insert into sesiones_staff (user_id, jugador_id, hasta)
  values (auth.uid(), v_jugador, now() + interval '12 hours')
  on conflict (user_id) do update set jugador_id = excluded.jugador_id, hasta = excluded.hasta;
  return 'ok';
end;
$$;

-- Pasar a modo staff. Devuelve 'ok', 'incorrecto', 'bloqueado', 'sin_pin' o
-- 'no_es_staff'. Máximo 5 PIN incorrectos por hora y por jugador. No usa raise
-- para los fallos: desharía el registro del intento.
create or replace function public.verificar_pin(p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jugador uuid := public.mi_jugador_id();
  v_hash    text;
  v_fallos  int;
begin
  if v_jugador is null or public.mi_rol_asignado() not in ('delegado', 'tesorero') then
    return 'no_es_staff';
  end if;

  select pin_hash into v_hash from pines_staff where jugador_id = v_jugador;
  if v_hash is null then
    return 'sin_pin';
  end if;

  select count(*) into v_fallos from intentos_pin
  where jugador_id = v_jugador and created_at > now() - interval '1 hour';
  if v_fallos >= 5 then
    return 'bloqueado';
  end if;

  if extensions.crypt(coalesce(p_pin, ''), v_hash) <> v_hash then
    insert into intentos_pin (jugador_id) values (v_jugador);
    return case when v_fallos + 1 >= 5 then 'bloqueado' else 'incorrecto' end;
  end if;

  delete from intentos_pin where jugador_id = v_jugador;
  insert into sesiones_staff (user_id, jugador_id, hasta)
  values (auth.uid(), v_jugador, now() + interval '12 hours')
  on conflict (user_id) do update set jugador_id = excluded.jugador_id, hasta = excluded.hasta;
  return 'ok';
end;
$$;

create or replace function public.salir_modo_staff()
returns void
language sql
security definer
set search_path = public
as $$
  delete from sesiones_staff where user_id = auth.uid();
$$;

-- El tesorero borra el PIN de alguien que se lo olvidó (lo vuelve a crear al entrar).
create or replace function public.resetear_pin(p_jugador_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero puede resetear un PIN' using errcode = '42501';
  end if;
  delete from pines_staff where jugador_id = p_jugador_id;
  delete from sesiones_staff where jugador_id = p_jugador_id;
  delete from intentos_pin where jugador_id = p_jugador_id;
end;
$$;

-- Asignar rol (solo tesorero). No deja al club sin tesorero.
drop function if exists public.asignar_rol_jugador(uuid, text);
create function public.asignar_rol_jugador(p_jugador_id uuid, p_rol text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero asigna roles' using errcode = '42501';
  end if;
  if p_rol not in ('jugador', 'delegado', 'tesorero') then
    raise exception 'Rol inválido' using errcode = '22023';
  end if;
  if p_rol <> 'tesorero'
     and (select rol_club from jugadores where id = p_jugador_id) = 'tesorero'
     and (select count(*) from jugadores where rol_club = 'tesorero' and activo) <= 1 then
    raise exception 'Tiene que quedar al menos un tesorero' using errcode = '22023';
  end if;

  update jugadores set rol_club = p_rol where id = p_jugador_id;
  if p_rol = 'jugador' then
    delete from pines_staff where jugador_id = p_jugador_id;
    delete from sesiones_staff where jugador_id = p_jugador_id;
  end if;
end;
$$;

-- Nadie cambia rol_club con un update directo (solo con asignar_rol_jugador).
create or replace function public.proteger_rol_club()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.rol_club is distinct from old.rol_club and not public.es_tesorero() then
    raise exception 'Solo el tesorero cambia roles' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists jugadores_proteger_rol on public.jugadores;
create trigger jugadores_proteger_rol
  before update of rol_club on public.jugadores
  for each row execute function public.proteger_rol_club();

-- =============================================================================
-- 3. LÍMITE DE INTENTOS DE CÉDULA POR JUGADOR
-- =============================================================================

alter table public.intentos_vinculo add column if not exists jugador_id uuid
  references public.jugadores (id) on delete cascade;
create index if not exists intentos_vinculo_jugador_idx on public.intentos_vinculo (jugador_id, created_at);

-- 'ok', 'cedula_incorrecta' o 'bloqueado'. Bloquea con 5 fallos en 1 hora
-- sobre ESE jugador, o con 10 fallos en 1 hora desde la misma sesión.
create or replace function public.vincular_jugador(p_jugador_id uuid, p_documento text, p_telefono text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_documento     text;
  v_telefono      text := regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g');
  v_fallos_jug    int;
  v_fallos_sesion int;
begin
  if v_uid is null then
    raise exception 'Sesión inválida' using errcode = '42501';
  end if;
  if length(regexp_replace(v_telefono, '\D', '', 'g')) < 8 then
    raise exception 'El número de celular no es válido' using errcode = '22023';
  end if;

  select count(*) into v_fallos_jug from intentos_vinculo
  where jugador_id = p_jugador_id and created_at > now() - interval '1 hour';
  select count(*) into v_fallos_sesion from intentos_vinculo
  where user_id = v_uid and created_at > now() - interval '1 hour';
  if v_fallos_jug >= 5 or v_fallos_sesion >= 10 then
    return 'bloqueado';
  end if;

  select documento into v_documento from jugadores where id = p_jugador_id and activo;

  -- Se comparan solo los dígitos: 4.857.346-7 = 4857346-7 = 48573467
  if v_documento is null
     or regexp_replace(coalesce(p_documento, ''), '\D', '', 'g') = ''
     or regexp_replace(v_documento, '\D', '', 'g') <> regexp_replace(coalesce(p_documento, ''), '\D', '', 'g') then
    insert into intentos_vinculo (user_id, jugador_id) values (v_uid, p_jugador_id);
    return case when v_fallos_jug + 1 >= 5 then 'bloqueado' else 'cedula_incorrecta' end;
  end if;

  insert into vinculos_jugador (user_id, jugador_id, telefono)
  values (v_uid, p_jugador_id, v_telefono)
  on conflict (user_id) do update
    set jugador_id = excluded.jugador_id, telefono = excluded.telefono, created_at = now();

  update jugadores set telefono = v_telefono where id = p_jugador_id;
  delete from intentos_vinculo where jugador_id = p_jugador_id;
  return 'ok';
end;
$$;

-- =============================================================================
-- 4. PLATA: cobros, cargos, pagos, excepciones de cuota, gastos
-- =============================================================================

create table if not exists public.cobros (
  id          uuid primary key default gen_random_uuid(),
  concepto    text not null check (length(trim(concepto)) > 0),
  tipo        text not null default 'extra' check (tipo in ('cuota', 'extra')),
  -- Solo para tipo 'cuota': primer día del mes.
  periodo     date check (periodo is null or periodo = date_trunc('month', periodo)::date),
  fecha       date not null default current_date,
  vence       date,
  creado_por  uuid references public.jugadores (id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((tipo = 'cuota') = (periodo is not null))
);
create unique index if not exists cobros_cuota_periodo_uq on public.cobros (periodo) where tipo = 'cuota';

create table if not exists public.cargos (
  id          uuid primary key default gen_random_uuid(),
  cobro_id    uuid not null references public.cobros (id) on delete cascade,
  jugador_id  uuid not null references public.jugadores (id) on delete cascade,
  monto       integer not null check (monto >= 0),
  created_at  timestamptz not null default now(),
  unique (cobro_id, jugador_id)
);
create index if not exists cargos_jugador_idx on public.cargos (jugador_id);

alter table public.pagos alter column cuota_id drop not null;
alter table public.pagos add column if not exists cargo_id uuid references public.cargos (id) on delete cascade;
alter table public.pagos add column if not exists estado text not null default 'confirmado';
alter table public.pagos drop constraint if exists pagos_estado_check;
alter table public.pagos add constraint pagos_estado_check
  check (estado in ('informado', 'confirmado', 'rechazado'));
alter table public.pagos add column if not exists foto_path text;
alter table public.pagos add column if not exists motivo_rechazo text;
alter table public.pagos add column if not exists revisado_por uuid references public.jugadores (id) on delete set null;
alter table public.pagos add column if not exists revisado_en timestamptz;
create index if not exists pagos_cargo_idx on public.pagos (cargo_id);
create index if not exists pagos_estado_idx on public.pagos (estado) where estado = 'informado';

-- Monto propio de cuota por jugador (descuento, beca). 0 = exonerado.
-- Tabla aparte para que el delegado (que lee jugadores) no vea montos.
create table if not exists public.excepciones_cuota (
  jugador_id  uuid primary key references public.jugadores (id) on delete cascade,
  monto       integer not null check (monto >= 0),
  motivo      text not null default '',
  updated_at  timestamptz not null default now()
);

create table if not exists public.gastos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null default current_date,
  monto       integer not null check (monto > 0),
  descripcion text not null check (length(trim(descripcion)) > 0),
  creado_por  uuid default public.mi_jugador_id() references public.jugadores (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists gastos_fecha_idx on public.gastos (fecha desc);

-- ---- Copiar las cuotas viejas al modelo nuevo (idempotente) -----------------

create or replace function public.nombre_mes(p date)
returns text
language sql immutable
as $$
  select (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                'setiembre','octubre','noviembre','diciembre'])[extract(month from p)::int]
         || ' ' || extract(year from p)::int
$$;

insert into public.cobros (concepto, tipo, periodo, fecha, vence)
select 'Cuota ' || public.nombre_mes(c.periodo), 'cuota', c.periodo, c.periodo, null
from (select distinct periodo from public.cuotas) c
on conflict do nothing;

insert into public.cargos (cobro_id, jugador_id, monto)
select co.id, cu.jugador_id, cu.monto
from public.cuotas cu
join public.cobros co on co.tipo = 'cuota' and co.periodo = cu.periodo
on conflict (cobro_id, jugador_id) do nothing;

update public.pagos p
set cargo_id = ca.id
from public.cuotas cu
join public.cobros co on co.tipo = 'cuota' and co.periodo = cu.periodo
join public.cargos ca on ca.cobro_id = co.id and ca.jugador_id = cu.jugador_id
where p.cuota_id = cu.id and p.cargo_id is null;

-- Cuotas marcadas 'pagada' sin ningún pago registrado: se les crea el pago
-- (si no, aparecerían como deuda).
insert into public.pagos (cuota_id, cargo_id, jugador_id, monto, metodo, estado)
select cu.id, ca.id, cu.jugador_id, cu.monto, 'registrado antes del cambio', 'confirmado'
from public.cuotas cu
join public.cobros co on co.tipo = 'cuota' and co.periodo = cu.periodo
join public.cargos ca on ca.cobro_id = co.id and ca.jugador_id = cu.jugador_id
where cu.estado = 'pagada'
  and not exists (select 1 from public.pagos p where p.cuota_id = cu.id);

-- ---- Funciones de plata ------------------------------------------------------

-- Saldo pendiente de un cargo (monto − pagos confirmados).
create or replace function public.saldo_cargo(p_cargo_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select greatest(ca.monto - coalesce((
    select sum(p.monto) from pagos p where p.cargo_id = ca.id and p.estado = 'confirmado'
  ), 0), 0)::int
  from cargos ca where ca.id = p_cargo_id
$$;

-- Jugador: "ya pagué". Queda informado hasta que el tesorero lo confirma.
create or replace function public.informar_pago(p_cargo_id uuid, p_monto integer, p_metodo text, p_foto_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jugador uuid := public.mi_jugador_id();
  v_id      uuid;
begin
  if v_jugador is null
     or not exists (select 1 from cargos where id = p_cargo_id and jugador_id = v_jugador) then
    raise exception 'Ese cobro no es tuyo' using errcode = '42501';
  end if;
  if coalesce(p_monto, 0) <= 0 then
    raise exception 'El monto tiene que ser mayor a cero' using errcode = '22023';
  end if;
  if p_metodo not in ('transferencia', 'efectivo') then
    raise exception 'Medio de pago inválido' using errcode = '22023';
  end if;
  if p_foto_path is not null and p_foto_path not like 'comprobantes/' || v_jugador::text || '/%' then
    raise exception 'Foto inválida' using errcode = '22023';
  end if;
  if exists (select 1 from pagos where cargo_id = p_cargo_id and estado = 'informado') then
    raise exception 'Ya hay un pago informado para ese cobro, esperá a que lo confirmen' using errcode = '22023';
  end if;

  insert into pagos (cargo_id, jugador_id, monto, metodo, estado, foto_path)
  values (p_cargo_id, v_jugador, p_monto, p_metodo, 'informado', p_foto_path)
  returning id into v_id;
  return v_id;
end;
$$;

-- Tesorero: confirmar o rechazar un pago informado.
create or replace function public.revisar_pago(p_pago_id uuid, p_confirmar boolean, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero confirma pagos' using errcode = '42501';
  end if;
  if not p_confirmar and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Para rechazar hay que poner el motivo' using errcode = '22023';
  end if;

  update pagos
  set estado         = case when p_confirmar then 'confirmado' else 'rechazado' end,
      motivo_rechazo = case when p_confirmar then null else trim(p_motivo) end,
      revisado_por   = public.mi_jugador_id(),
      revisado_en    = now(),
      pagado_en      = case when p_confirmar then now() else pagado_en end
  where id = p_pago_id and estado = 'informado';

  if not found then
    raise exception 'Ese pago ya fue revisado' using errcode = '22023';
  end if;
end;
$$;

-- Tesorero: cobró en mano (sin que el jugador lo informe).
create or replace function public.registrar_pago_directo(p_cargo_id uuid, p_monto integer, p_metodo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero registra pagos' using errcode = '42501';
  end if;
  if coalesce(p_monto, 0) <= 0 then
    raise exception 'El monto tiene que ser mayor a cero' using errcode = '22023';
  end if;

  insert into pagos (cargo_id, jugador_id, monto, metodo, estado, revisado_por, revisado_en)
  select ca.id, ca.jugador_id, p_monto, coalesce(nullif(p_metodo, ''), 'efectivo'), 'confirmado',
         public.mi_jugador_id(), now()
  from cargos ca where ca.id = p_cargo_id
  returning id into v_id;

  if v_id is null then
    raise exception 'No existe ese cargo' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

-- Tesorero: crear un cobro con monto propio por jugador.
-- p = {"concepto": "Asado 15/11", "fecha": "2026-11-15", "vence": null,
--      "cargos": [{"jugador_id": "...", "monto": 500}, ...]}
create or replace function public.crear_cobro(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero crea cobros' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p->'cargos', '[]'::jsonb)) = 0 then
    raise exception 'Elegí al menos un jugador' using errcode = '22023';
  end if;

  insert into cobros (concepto, tipo, fecha, vence, creado_por)
  values (
    trim(p->>'concepto'),
    'extra',
    coalesce(nullif(p->>'fecha', '')::date, current_date),
    nullif(p->>'vence', '')::date,
    public.mi_jugador_id()
  )
  returning id into v_id;

  insert into cargos (cobro_id, jugador_id, monto)
  select v_id, (c->>'jugador_id')::uuid, (c->>'monto')::int
  from jsonb_array_elements(p->'cargos') c
  where (c->>'monto')::int > 0;

  return v_id;
end;
$$;

-- Monto de la cuota: la app vieja usaba 1400 cuando no estaba guardado en
-- textos_app; se deja guardado ese mismo valor para que generar_cuota_mes
-- funcione igual (VERIFICAR con el tesorero).
insert into public.textos_app (clave, valor) values ('cuota_monto', '1400')
on conflict (clave) do nothing;

-- Tesorero: generar la cuota de un mes con el monto general (textos_app
-- 'cuota_monto') y las excepciones. Exonerados (0) no reciben cargo.
-- Devuelve cuántos cargos se crearon. Se puede correr más de una vez.
create or replace function public.generar_cuota_mes(p_periodo date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo date := date_trunc('month', coalesce(p_periodo, current_date))::date;
  v_general int;
  v_dia     int;
  v_cobro   uuid;
  v_n       int;
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero genera cuotas' using errcode = '42501';
  end if;

  select nullif(regexp_replace(valor, '\D', '', 'g'), '')::int into v_general
  from textos_app where clave = 'cuota_monto';
  if coalesce(v_general, 0) <= 0 then
    raise exception 'Falta configurar el monto de la cuota mensual' using errcode = '22023';
  end if;
  select nullif(regexp_replace(valor, '\D', '', 'g'), '')::int into v_dia
  from textos_app where clave = 'cuota_dia_vencimiento';

  insert into cobros (concepto, tipo, periodo, fecha, vence, creado_por)
  values ('Cuota ' || public.nombre_mes(v_periodo), 'cuota', v_periodo, v_periodo,
          case when v_dia between 1 and 28 then v_periodo + (v_dia - 1) end,
          public.mi_jugador_id())
  on conflict do nothing;
  select id into v_cobro from cobros where tipo = 'cuota' and periodo = v_periodo;

  insert into cargos (cobro_id, jugador_id, monto)
  select v_cobro, j.id, coalesce(e.monto, v_general)
  from jugadores j
  left join excepciones_cuota e on e.jugador_id = j.id
  where j.activo and coalesce(e.monto, v_general) > 0
  on conflict (cobro_id, jugador_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Staff: quién debe y cuánto (el delegado lo ve sin ver la caja).
create or replace function public.deudores()
returns table (jugador_id uuid, deuda integer, cargos_pendientes integer)
language plpgsql stable
security definer
set search_path = public
as $$
begin
  if not public.es_staff() then
    raise exception 'No tenés permiso' using errcode = '42501';
  end if;
  return query
    select ca.jugador_id,
           sum(public.saldo_cargo(ca.id))::int,
           count(*) filter (where public.saldo_cargo(ca.id) > 0)::int
    from cargos ca
    join jugadores j on j.id = ca.jugador_id and j.activo
    group by ca.jugador_id
    having sum(public.saldo_cargo(ca.id)) > 0;
end;
$$;

-- =============================================================================
-- 5. PRÁCTICAS
-- =============================================================================

create table if not exists public.practicas (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null,
  hora            time,
  lugar           text not null default '',
  texto_original  text not null default '',
  creado_por      uuid references public.jugadores (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists practicas_fecha_idx on public.practicas (fecha desc);

create table if not exists public.asistencias (
  practica_id  uuid not null references public.practicas (id) on delete cascade,
  jugador_id   uuid not null references public.jugadores (id) on delete cascade,
  primary key (practica_id, jugador_id)
);
create index if not exists asistencias_jugador_idx on public.asistencias (jugador_id);

-- p = {"fecha": "2026-11-11", "hora": "20:00", "lugar": "Parque Rodó",
--      "texto_original": "...", "jugadores": ["uuid", ...]}
create or replace function public.crear_practica(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_staff() then
    raise exception 'Solo el staff carga prácticas' using errcode = '42501';
  end if;

  insert into practicas (fecha, hora, lugar, texto_original, creado_por)
  values (
    (p->>'fecha')::date,
    nullif(p->>'hora', '')::time,
    coalesce(p->>'lugar', ''),
    coalesce(p->>'texto_original', ''),
    public.mi_jugador_id()
  )
  returning id into v_id;

  insert into asistencias (practica_id, jugador_id)
  select distinct v_id, x::uuid
  from jsonb_array_elements_text(coalesce(p->'jugadores', '[]'::jsonb)) x
  on conflict do nothing;

  return v_id;
end;
$$;

-- =============================================================================
-- 6. HISTORIAL DE AVISOS MANUALES
-- =============================================================================

create table if not exists public.avisos_enviados (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  cuerpo       text not null default '',
  -- 'todos', 'no_habilitados', 'deudores', 'seleccion'
  destino      text not null default 'seleccion',
  cantidad     integer not null default 0,
  enviado_por  uuid default public.mi_jugador_id() references public.jugadores (id) on delete set null,
  enviado_en   timestamptz not null default now()
);
create index if not exists avisos_enviados_fecha_idx on public.avisos_enviados (enviado_en desc);

-- =============================================================================
-- 7. ALTA DE JUGADOR (mínima) — ya no crea cuota ni planilla
-- =============================================================================

create or replace function public.alta_jugador(datos jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_staff() then
    raise exception 'No tenés permiso para dar de alta jugadores' using errcode = '42501';
  end if;
  if coalesce(trim(datos->>'nombre'), '') = '' or coalesce(trim(datos->>'apellido'), '') = '' then
    raise exception 'Faltan nombre y apellido' using errcode = '22023';
  end if;
  if coalesce(regexp_replace(datos->>'documento', '\D', '', 'g'), '') = '' then
    raise exception 'Falta la cédula' using errcode = '22023';
  end if;

  insert into jugadores (nombre, apellido, documento, telefono, anio_nacimiento, fecha_nacimiento, email)
  values (
    trim(datos->>'nombre'),
    trim(datos->>'apellido'),
    trim(datos->>'documento'),
    regexp_replace(coalesce(datos->>'telefono', ''), '[^0-9+]', '', 'g'),
    nullif(datos->>'anio_nacimiento', '')::smallint,
    nullif(datos->>'fecha_nacimiento', '')::date,
    ''
  )
  returning id into v_id;

  insert into fichas_lud (jugador_id) values (v_id) on conflict do nothing;
  return v_id;
end;
$$;

-- =============================================================================
-- 8. POLÍTICAS (se borran todas las de estas tablas y se rehacen)
-- =============================================================================

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'jugadores', 'carnes_salud', 'fichas_lud', 'estado_planilla', 'cuotas', 'pagos',
        'reglas_automatizacion', 'mensajes_enviados', 'roles_club', 'textos_app',
        'miembros_club', 'vinculos_jugador', 'cobros', 'cargos', 'excepciones_cuota',
        'gastos', 'practicas', 'asistencias', 'avisos_enviados')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

alter table public.cobros            enable row level security;
alter table public.cargos            enable row level security;
alter table public.excepciones_cuota enable row level security;
alter table public.gastos            enable row level security;
alter table public.practicas         enable row level security;
alter table public.asistencias       enable row level security;
alter table public.avisos_enviados   enable row level security;

revoke all on
  public.cobros, public.cargos, public.excepciones_cuota, public.gastos,
  public.practicas, public.asistencias, public.avisos_enviados, public.miembros_club
  from anon, authenticated;

-- Lectura para todos los logueados (las políticas filtran); escritura directa
-- solo donde hace falta. El resto se escribe por funciones.
grant select on
  public.cobros, public.cargos, public.excepciones_cuota, public.gastos,
  public.practicas, public.asistencias, public.avisos_enviados
  to authenticated;
grant insert, update, delete on public.excepciones_cuota, public.gastos to authenticated;
grant insert on public.avisos_enviados to authenticated;
grant delete on public.practicas, public.asistencias to authenticated;
grant insert on public.asistencias to authenticated;
revoke insert, update, delete on public.pagos, public.cuotas, public.estado_planilla from authenticated;
grant delete on public.carnes_salud to authenticated;

-- jugadores: el staff ve y edita a todos; cada uno se ve a sí mismo.
create policy rol_select on public.jugadores for select to authenticated
  using ((select public.es_staff()) or id = (select public.mi_jugador_id()));
create policy rol_insert on public.jugadores for insert to authenticated
  with check ((select public.es_staff()));
create policy rol_update on public.jugadores for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

-- documentos
create policy rol_select on public.carnes_salud for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_insert on public.carnes_salud for insert to authenticated
  with check ((select public.es_staff()));
create policy rol_update on public.carnes_salud for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));
create policy rol_delete on public.carnes_salud for delete to authenticated
  using ((select public.es_staff()));

create policy rol_select on public.fichas_lud for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_insert on public.fichas_lud for insert to authenticated
  with check ((select public.es_staff()));
create policy rol_update on public.fichas_lud for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));

-- tablas viejas (solo lectura, quedan por si hay que volver atrás)
create policy rol_select on public.estado_planilla for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_select on public.cuotas for select to authenticated
  using ((select public.es_tesorero()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_select on public.roles_club for select to authenticated using (true);

-- plata: el tesorero ve todo; el jugador, lo suyo. El delegado usa deudores().
create policy rol_select on public.pagos for select to authenticated
  using ((select public.es_tesorero()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_select on public.cargos for select to authenticated
  using ((select public.es_tesorero()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_select on public.cobros for select to authenticated
  using (
    (select public.es_tesorero())
    or exists (select 1 from public.cargos c
               where c.cobro_id = cobros.id and c.jugador_id = (select public.mi_jugador_id()))
  );
create policy rol_all on public.excepciones_cuota for all to authenticated
  using ((select public.es_tesorero())) with check ((select public.es_tesorero()));
create policy rol_all on public.gastos for all to authenticated
  using ((select public.es_tesorero())) with check ((select public.es_tesorero()));

-- prácticas: la lista la ve cualquiera del plantel (ya está en el grupo de
-- WhatsApp); las asistencias, el staff y cada uno las suyas.
create policy rol_select on public.practicas for select to authenticated using (true);
create policy rol_delete on public.practicas for delete to authenticated
  using ((select public.es_staff()));
create policy rol_select on public.asistencias for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
create policy rol_insert on public.asistencias for insert to authenticated
  with check ((select public.es_staff()));
create policy rol_delete on public.asistencias for delete to authenticated
  using ((select public.es_staff()));

-- avisos
create policy rol_select on public.reglas_automatizacion for select to authenticated
  using ((select public.es_staff()));
create policy rol_update on public.reglas_automatizacion for update to authenticated
  using ((select public.es_tesorero())) with check ((select public.es_tesorero()));
create policy rol_select on public.mensajes_enviados for select to authenticated
  using ((select public.es_staff()));
create policy rol_insert on public.mensajes_enviados for insert to authenticated
  with check ((select public.es_staff()));
create policy rol_select on public.avisos_enviados for select to authenticated
  using ((select public.es_staff()));
create policy rol_insert on public.avisos_enviados for insert to authenticated
  with check ((select public.es_staff()));

-- configuración: la leen todos; la cambia el tesorero.
create policy rol_select on public.textos_app for select to authenticated using (true);
create policy rol_insert on public.textos_app for insert to authenticated
  with check ((select public.es_tesorero()));
create policy rol_update on public.textos_app for update to authenticated
  using ((select public.es_tesorero())) with check ((select public.es_tesorero()));

-- vínculos
create policy rol_select on public.vinculos_jugador for select to authenticated
  using ((select public.es_staff()) or user_id = (select auth.uid()));

-- =============================================================================
-- 9. STORAGE: comprobantes de pago en documentos/comprobantes/{jugador_id}/
-- =============================================================================

drop policy if exists comprobante_subir on storage.objects;
create policy comprobante_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = 'comprobantes'
    and (storage.foldername(name))[2] = (select public.mi_jugador_id())::text
  );

drop policy if exists comprobante_ver on storage.objects;
create policy comprobante_ver on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = 'comprobantes'
    and ((select public.es_tesorero())
         or (storage.foldername(name))[2] = (select public.mi_jugador_id())::text)
  );

-- =============================================================================
-- 10. PERMISOS DE FUNCIONES
-- =============================================================================

revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.mi_jugador_id(), public.mi_rol_asignado(), public.mi_rol(), public.es_staff(),
  public.es_tesorero(), public.carga_plantel(), public.mi_perfil(),
  public.crear_pin(text), public.verificar_pin(text), public.salir_modo_staff(),
  public.resetear_pin(uuid), public.asignar_rol_jugador(uuid, text),
  public.vincular_jugador(uuid, text, text),
  public.saldo_cargo(uuid), public.informar_pago(uuid, integer, text, text),
  public.revisar_pago(uuid, boolean, text), public.registrar_pago_directo(uuid, integer, text),
  public.crear_cobro(jsonb), public.generar_cuota_mes(date), public.deudores(),
  public.crear_practica(jsonb), public.alta_jugador(jsonb), public.nombre_mes(date)
  to authenticated;

-- Lo que quedó del partido y del login por email: nadie lo ejecuta más.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.anotarme(text, text, text, date, text)',
    'public.confirmar_asistencia(boolean, text)',
    'public.registrar_pago(uuid, text)',
    'public.generar_cuotas_mes(date, integer)',
    'public.generar_cuotas_del_mes(integer)',
    'public.mi_email()'
  ] loop
    begin
      execute format('revoke execute on function %s from authenticated', f);
    exception when undefined_function then
      null;  -- no existe con esa firma en esta base
    end;
  end loop;
end;
$$;

-- =============================================================================
-- Resultado: avisa si algún miembro del staff viejo no tiene ficha de jugador
-- (no va a poder entrar: hay que darle de alta y asignarle el rol a mano).
-- =============================================================================
select 'Listo: rediseño 2026-11 aplicado. Tesoreros: '
       || (select count(*) from public.jugadores where rol_club = 'tesorero')
       || ', delegados: '
       || (select count(*) from public.jugadores where rol_club = 'delegado')
       || coalesce('. OJO, staff sin ficha de jugador: ' || (
            select string_agg(m.email || ' (' || m.rol || ')', ', ')
            from public.miembros_club m
            where not exists (select 1 from public.jugadores j
                              where lower(trim(j.email)) = m.email)
          ), '')
       as resultado;
