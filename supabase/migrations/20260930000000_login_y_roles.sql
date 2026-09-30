-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 2: login (Supabase Auth) y permisos por rol.
--
-- Cómo usarla: DESPUÉS de la migración inicial, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- Al terminar, habilitar al primer administrador (cambiar el email):
--   insert into public.miembros_club (email, rol) values ('tu-email@ejemplo.com', 'admin');
--
-- Cómo funciona el acceso:
--   - Cada persona entra con email y contraseña (Supabase Auth).
--   - Staff: el admin habilita su email con un rol en Club Admin → Accesos
--     (tabla miembros_club): 'admin', 'dt' (cuerpo técnico / delegados) o
--     'tesorero'.
--   - Jugadores: no hace falta habilitarlos. Si el email con el que entran
--     coincide con el email de su ficha (jugadores.email), ven SOLO lo suyo.
--   - Cualquier otra cuenta no ve nada ("pendiente de habilitación").
--   - La anon key (sin sesión) ya no puede leer ni escribir nada.
--
-- Qué puede hacer cada rol:
--   admin     todo, incluidos textos de la app, reglas y accesos
--   dt        plantel, carnés, ficha LUD, planilla, alta de jugadores,
--             ve si cada jugador está al día (cuotas), manda avisos
--   tesorero  ve el plantel, cobra cuotas, manda avisos
--   jugador   ve su ficha, sus cuotas y pagos, confirma asistencia
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Datos del padrón LUD (planilla de jugadores de la liga)
-- -----------------------------------------------------------------------------
alter table public.jugadores alter column numero drop not null;  -- el padrón no trae número de camiseta
alter table public.jugadores add column if not exists documento text;          -- cédula
alter table public.jugadores add column if not exists fecha_nacimiento date;
alter table public.jugadores add column if not exists activo boolean not null default true;
create unique index if not exists jugadores_documento_idx on public.jugadores (documento) where documento is not null;
alter table public.fichas_lud add column if not exists vencimiento_carne date;  -- carné de la liga
alter table public.carnes_salud add column if not exists fecha_examen date;     -- último examen / recibo

-- -----------------------------------------------------------------------------
-- Miembros del staff (por email; la cuenta puede crearse antes o después)
-- -----------------------------------------------------------------------------
create table if not exists public.miembros_club (
  email       text primary key check (email = lower(trim(email)) and email like '%@%'),
  rol         text not null check (rol in ('admin', 'dt', 'tesorero')),
  nombre      text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helpers de identidad. security definer para poder leer las tablas sin
-- depender de sus propias políticas (evita recursión en RLS).
-- -----------------------------------------------------------------------------
create or replace function public.mi_email()
returns text
language sql stable
set search_path = public
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '')
$$;

create or replace function public.mi_jugador_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select j.id
  from jugadores j
  where public.mi_email() is not null
    and lower(trim(j.email)) = public.mi_email()
  order by j.created_at
  limit 1
$$;

-- Rol efectivo: el de miembros_club, o 'jugador' si su email está en una ficha.
create or replace function public.mi_rol()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select m.rol from miembros_club m where m.email = public.mi_email()),
    case when public.mi_jugador_id() is not null then 'jugador' end
  )
$$;

create or replace function public.es_staff()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.mi_rol() in ('admin', 'dt', 'tesorero'), false)
$$;

-- Lo que la app necesita saber al iniciar sesión.
create or replace function public.mi_perfil()
returns json
language sql stable security definer
set search_path = public
as $$
  select json_build_object(
    'email', public.mi_email(),
    'rol', public.mi_rol(),
    'jugador_id', public.mi_jugador_id()
  )
$$;

-- -----------------------------------------------------------------------------
-- RPC con control de rol (security definer: el chequeo está adentro)
-- -----------------------------------------------------------------------------
create or replace function public.alta_jugador(datos jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_cuota_id uuid;
  v_periodo  date := date_trunc('month', current_date)::date;
begin
  if coalesce(public.mi_rol(), '') not in ('admin', 'dt') then
    raise exception 'No tenés permiso para dar de alta jugadores' using errcode = '42501';
  end if;

  insert into jugadores (
    numero, nombre, apellido, posicion, categoria, anio_nacimiento, avatar_url,
    telefono, email, direccion, es_capitan,
    emergencia_nombre, emergencia_telefono, emergencia_relacion,
    prestador_salud, emergencia_movil, numero_socio, documento, fecha_nacimiento
  ) values (
    nullif(datos->>'numero', '')::smallint,
    datos->>'nombre',
    datos->>'apellido',
    coalesce(datos->>'posicion', ''),
    coalesce(datos->>'categoria', 'Mayores Elbio U'),
    nullif(datos->>'anio_nacimiento', '')::smallint,
    nullif(datos->>'avatar_url', ''),
    coalesce(datos->>'telefono', ''),
    lower(trim(coalesce(datos->>'email', ''))),
    coalesce(datos->>'direccion', ''),
    coalesce((datos->>'es_capitan')::boolean, false),
    coalesce(datos->>'emergencia_nombre', ''),
    coalesce(datos->>'emergencia_telefono', ''),
    coalesce(datos->>'emergencia_relacion', 'Otro'),
    coalesce(datos->>'prestador_salud', ''),
    coalesce(datos->>'emergencia_movil', 'SEMM'),
    nullif(datos->>'numero_socio', ''),
    nullif(trim(datos->>'documento'), ''),
    nullif(datos->>'fecha_nacimiento', '')::date
  )
  returning id into v_id;

  if nullif(datos->>'carne_vencimiento', '') is not null then
    insert into carnes_salud (jugador_id, vencimiento, clinica, archivo_nombre, archivo_tamanio, verificado, notas)
    values (
      v_id,
      (datos->>'carne_vencimiento')::date,
      coalesce(datos->>'carne_clinica', ''),
      nullif(datos->>'carne_archivo_nombre', ''),
      nullif(datos->>'carne_archivo_tamanio', ''),
      coalesce((datos->>'carne_verificado')::boolean, false),
      nullif(datos->>'carne_notas', '')
    );
  end if;

  insert into fichas_lud (jugador_id, carne_en_mano, id_federado, categoria, consentimiento_firmado, vencimiento_carne)
  values (
    v_id,
    coalesce(datos->>'lud_carne_en_mano', 'En trámite secretaría'),
    nullif(datos->>'lud_id_federado', '')::integer,
    coalesce(datos->>'lud_categoria', 'Mayores (Fútbol Universitario)'),
    coalesce((datos->>'lud_consentimiento')::boolean, false),
    nullif(datos->>'lud_vencimiento_carne', '')::date
  );

  insert into estado_planilla (jugador_id, rol, asistencia_confirmada)
  values (v_id, coalesce(datos->>'planilla_rol', 'SUPLENTE'), false);

  -- La cuota del mes arranca pendiente; el cobro lo registra tesorería.
  insert into cuotas (jugador_id, periodo, estado)
  values (v_id, v_periodo, 'pendiente')
  returning id into v_cuota_id;

  return v_id;
end;
$$;

create or replace function public.registrar_pago(p_jugador_id uuid, p_metodo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recibo text;
  v_cuota  record;
begin
  if coalesce(public.mi_rol(), '') not in ('admin', 'tesorero') then
    raise exception 'No tenés permiso para registrar cobros' using errcode = '42501';
  end if;

  for v_cuota in
    select id, monto from cuotas
    where jugador_id = p_jugador_id and estado <> 'pagada'
    order by periodo
    for update
  loop
    if v_recibo is null then
      v_recibo := '#' || nextval('pagos_recibo_seq');
    end if;
    insert into pagos (cuota_id, jugador_id, monto, metodo, recibo)
    values (v_cuota.id, p_jugador_id, v_cuota.monto, p_metodo, v_recibo);
    update cuotas set estado = 'pagada' where id = v_cuota.id;
  end loop;

  return v_recibo;
end;
$$;

-- El jugador confirma o avisa ausencia SOLO en su propia fila.
create or replace function public.confirmar_asistencia(p_confirmada boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jugador uuid := public.mi_jugador_id();
begin
  if v_jugador is null then
    raise exception 'Tu usuario no está vinculado a una ficha de jugador' using errcode = '42501';
  end if;
  insert into estado_planilla (jugador_id, asistencia_confirmada, motivo_baja)
  values (v_jugador, p_confirmada, case when p_confirmada then null else p_motivo end)
  on conflict (jugador_id) do update
    set asistencia_confirmada = excluded.asistencia_confirmada,
        motivo_baja = excluded.motivo_baja;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos: fuera anon; authenticated con políticas por rol
-- -----------------------------------------------------------------------------
revoke all on
  public.jugadores, public.carnes_salud, public.fichas_lud, public.estado_planilla,
  public.cuotas, public.pagos, public.reglas_automatizacion, public.mensajes_enviados,
  public.roles_club, public.textos_app, public.miembros_club
  from anon;
revoke execute on all functions in schema public from public, anon;
revoke usage on sequence public.pagos_recibo_seq from anon;

grant select, insert, update on
  public.jugadores, public.carnes_salud, public.fichas_lud, public.estado_planilla,
  public.cuotas, public.pagos, public.reglas_automatizacion, public.mensajes_enviados,
  public.textos_app
  to authenticated;
grant select on public.roles_club to authenticated;
grant select, insert, update, delete on public.miembros_club to authenticated;
grant execute on function
  public.mi_email(), public.mi_jugador_id(), public.mi_rol(), public.es_staff(), public.mi_perfil(),
  public.alta_jugador(jsonb), public.registrar_pago(uuid, text), public.confirmar_asistencia(boolean, text)
  to authenticated;
-- set_updated_at la usan los triggers; generar_cuotas_mes queda solo para el SQL Editor.

alter table public.miembros_club enable row level security;

-- Borrar las políticas abiertas de la etapa sin login.
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and policyname like 'abierto\_%'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- Macro mental: staff = admin/dt/tesorero; "propio" = fila del jugador logueado.
-- (select f()) hace que Postgres evalúe la función una vez por consulta.

-- jugadores
drop policy if exists rol_select on public.jugadores;
create policy rol_select on public.jugadores for select to authenticated
  using ((select public.es_staff()) or id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.jugadores;
create policy rol_insert on public.jugadores for insert to authenticated
  with check ((select public.mi_rol()) in ('admin', 'dt'));
drop policy if exists rol_update on public.jugadores;
create policy rol_update on public.jugadores for update to authenticated
  using ((select public.mi_rol()) in ('admin', 'dt'))
  with check ((select public.mi_rol()) in ('admin', 'dt'));

-- carnes_salud, fichas_lud, estado_planilla: igual (DT/admin editan; el jugador ve lo suyo)
drop policy if exists rol_select on public.carnes_salud;
create policy rol_select on public.carnes_salud for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.carnes_salud;
create policy rol_insert on public.carnes_salud for insert to authenticated
  with check ((select public.mi_rol()) in ('admin', 'dt'));
drop policy if exists rol_update on public.carnes_salud;
create policy rol_update on public.carnes_salud for update to authenticated
  using ((select public.mi_rol()) in ('admin', 'dt'))
  with check ((select public.mi_rol()) in ('admin', 'dt'));

drop policy if exists rol_select on public.fichas_lud;
create policy rol_select on public.fichas_lud for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.fichas_lud;
create policy rol_insert on public.fichas_lud for insert to authenticated
  with check ((select public.mi_rol()) in ('admin', 'dt'));
drop policy if exists rol_update on public.fichas_lud;
create policy rol_update on public.fichas_lud for update to authenticated
  using ((select public.mi_rol()) in ('admin', 'dt'))
  with check ((select public.mi_rol()) in ('admin', 'dt'));

drop policy if exists rol_select on public.estado_planilla;
create policy rol_select on public.estado_planilla for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.estado_planilla;
create policy rol_insert on public.estado_planilla for insert to authenticated
  with check ((select public.mi_rol()) in ('admin', 'dt'));
drop policy if exists rol_update on public.estado_planilla;
create policy rol_update on public.estado_planilla for update to authenticated
  using ((select public.mi_rol()) in ('admin', 'dt'))
  with check ((select public.mi_rol()) in ('admin', 'dt'));

-- cuotas: el staff ve (el DT necesita saber quién está al día); cobra tesorería
drop policy if exists rol_select on public.cuotas;
create policy rol_select on public.cuotas for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.cuotas;
create policy rol_insert on public.cuotas for insert to authenticated
  with check ((select public.mi_rol()) in ('admin', 'tesorero'));
drop policy if exists rol_update on public.cuotas;
create policy rol_update on public.cuotas for update to authenticated
  using ((select public.mi_rol()) in ('admin', 'tesorero'))
  with check ((select public.mi_rol()) in ('admin', 'tesorero'));

-- pagos: solo tesorería/admin y el propio jugador
drop policy if exists rol_select on public.pagos;
create policy rol_select on public.pagos for select to authenticated
  using ((select public.mi_rol()) in ('admin', 'tesorero') or jugador_id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.pagos;
create policy rol_insert on public.pagos for insert to authenticated
  with check ((select public.mi_rol()) in ('admin', 'tesorero'));

-- reglas de automatización
drop policy if exists rol_select on public.reglas_automatizacion;
create policy rol_select on public.reglas_automatizacion for select to authenticated
  using ((select public.es_staff()));
drop policy if exists rol_update on public.reglas_automatizacion;
create policy rol_update on public.reglas_automatizacion for update to authenticated
  using ((select public.mi_rol()) = 'admin')
  with check ((select public.mi_rol()) = 'admin');

-- mensajes enviados
drop policy if exists rol_select on public.mensajes_enviados;
create policy rol_select on public.mensajes_enviados for select to authenticated
  using ((select public.es_staff()) or jugador_id = (select public.mi_jugador_id()));
drop policy if exists rol_insert on public.mensajes_enviados;
create policy rol_insert on public.mensajes_enviados for insert to authenticated
  with check ((select public.es_staff()));

-- roles del club (descripción de perfiles): lectura para cualquiera con sesión
drop policy if exists rol_select on public.roles_club;
create policy rol_select on public.roles_club for select to authenticated
  using (true);

-- textos de la app: todos leen, el admin edita
drop policy if exists rol_select on public.textos_app;
create policy rol_select on public.textos_app for select to authenticated
  using (true);
drop policy if exists rol_insert on public.textos_app;
create policy rol_insert on public.textos_app for insert to authenticated
  with check ((select public.mi_rol()) = 'admin');
drop policy if exists rol_update on public.textos_app;
create policy rol_update on public.textos_app for update to authenticated
  using ((select public.mi_rol()) = 'admin')
  with check ((select public.mi_rol()) = 'admin');

-- miembros del staff: el admin gestiona; cada uno ve su propia fila
drop policy if exists rol_select on public.miembros_club;
create policy rol_select on public.miembros_club for select to authenticated
  using ((select public.mi_rol()) = 'admin' or email = (select public.mi_email()));
drop policy if exists rol_insert on public.miembros_club;
create policy rol_insert on public.miembros_club for insert to authenticated
  with check ((select public.mi_rol()) = 'admin');
drop policy if exists rol_update on public.miembros_club;
create policy rol_update on public.miembros_club for update to authenticated
  using ((select public.mi_rol()) = 'admin')
  with check ((select public.mi_rol()) = 'admin');
-- El admin no puede borrarse a sí mismo (para no quedarse sin administrador).
drop policy if exists rol_delete on public.miembros_club;
create policy rol_delete on public.miembros_club for delete to authenticated
  using ((select public.mi_rol()) = 'admin' and email <> (select public.mi_email()));

-- Fin.
select 'Listo: login y permisos por rol activados' as resultado;
