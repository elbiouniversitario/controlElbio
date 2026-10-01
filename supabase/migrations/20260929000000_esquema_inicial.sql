-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración inicial: tablas, índices, funciones y RLS.
--
-- Cómo usarla: pegar TODO este archivo en Supabase → SQL Editor → Run.
-- Después correr supabase/seed.sql si se quieren los datos de ejemplo.
-- Se puede correr más de una vez sin problema (no borra datos), hasta activar el login.
--
-- IMPORTANTE (seguridad): por ahora la app NO tiene login. Las políticas RLS
-- de este archivo dejan leer y escribir a cualquiera que tenga la anon key
-- (que viaja en el JavaScript de la app, o sea, es pública). Eso incluye datos
-- personales y de salud de los jugadores. Las políticas a aplicar cuando se
-- agregue Supabase Auth están en la migración 2 (20260930000000_login_y_roles.sql).
-- No cargar datos reales sensibles hasta hacerlo.
-- =============================================================================

-- Freno: si ya se activó el login (migración 2), correr esto de nuevo
-- reabriría el acceso sin login. En ese caso no se ejecuta nada.
do $$
begin
  if to_regclass('public.miembros_club') is not null then
    raise exception 'El login ya está activado (migración 2). No hace falta volver a correr esta migración.';
  end if;
end;
$$;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Jugadores (datos personales, contacto de emergencia y cobertura médica)
-- -----------------------------------------------------------------------------
create table if not exists public.jugadores (
  id                     uuid primary key default gen_random_uuid(),
  numero                 smallint not null check (numero between 0 and 99),
  nombre                 text not null,
  apellido               text not null,
  posicion               text not null default '',
  categoria              text not null default 'Mayores Elbio U',
  anio_nacimiento        smallint check (anio_nacimiento between 1900 and 2100),
  -- NULL = la app muestra un avatar con iniciales. Pensado para apuntar a
  -- Supabase Storage (bucket "avatares") cuando se suban fotos reales.
  avatar_url             text,
  telefono               text not null default '',
  email                  text not null default '',
  direccion              text not null default '',
  es_capitan             boolean not null default false,

  -- Contacto de emergencia
  emergencia_nombre      text not null default '',
  emergencia_telefono    text not null default '',
  emergencia_relacion    text not null default 'Otro'
    check (emergencia_relacion in ('Padre/Madre', 'Pareja', 'Hermano/a', 'Otro')),

  -- Cobertura médica
  prestador_salud        text not null default '',
  emergencia_movil       text not null default 'SEMM'
    check (emergencia_movil in ('SEMM', 'UCM Falck', 'SUAT', 'Otra / Interior')),
  numero_socio           text,

  -- Futuro: vínculo con Supabase Auth para que cada jugador vea solo lo suyo.
  auth_user_id           uuid unique references auth.users (id) on delete set null,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists jugadores_apellido_idx on public.jugadores (apellido, nombre);
create index if not exists jugadores_created_at_idx on public.jugadores (created_at);

drop trigger if exists jugadores_updated_at on public.jugadores;
create trigger jugadores_updated_at
  before update on public.jugadores
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Carné de salud (historial: una fila por carné presentado; vigente = el de
-- vencimiento más lejano). Los días restantes se calculan en la app.
-- -----------------------------------------------------------------------------
create table if not exists public.carnes_salud (
  id                uuid primary key default gen_random_uuid(),
  jugador_id        uuid not null references public.jugadores (id) on delete cascade,
  vencimiento       date not null,
  clinica           text not null default '',
  archivo_nombre    text,
  archivo_tamanio   text,
  -- Futuro: ruta del archivo en Supabase Storage (bucket "carnes").
  archivo_path      text,
  verificado        boolean not null default false,
  notas             text,
  created_at        timestamptz not null default now()
);

create index if not exists carnes_salud_jugador_venc_idx on public.carnes_salud (jugador_id, vencimiento desc);
create index if not exists carnes_salud_vencimiento_idx on public.carnes_salud (vencimiento);

-- -----------------------------------------------------------------------------
-- Ficha LUD (1 a 1 con jugador)
-- -----------------------------------------------------------------------------
create table if not exists public.fichas_lud (
  jugador_id              uuid primary key references public.jugadores (id) on delete cascade,
  carne_en_mano           text not null default 'En trámite secretaría'
    check (carne_en_mano in ('En mano del delegado', 'En poder del jugador', 'En trámite secretaría')),
  id_federado             integer unique,
  categoria               text not null default 'Mayores (Fútbol Universitario)',
  consentimiento_firmado  boolean not null default false,
  updated_at              timestamptz not null default now()
);

drop trigger if exists fichas_lud_updated_at on public.fichas_lud;
create trigger fichas_lud_updated_at
  before update on public.fichas_lud
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Estado en planilla del próximo partido (1 a 1 con jugador)
-- -----------------------------------------------------------------------------
create table if not exists public.estado_planilla (
  jugador_id              uuid primary key references public.jugadores (id) on delete cascade,
  rol                     text not null default 'SUPLENTE'
    check (rol in ('TITULAR', 'SUPLENTE', 'BAJA', 'RESERVA')),
  asistencia_confirmada   boolean,
  motivo_baja             text,
  updated_at              timestamptz not null default now()
);

create index if not exists estado_planilla_rol_idx on public.estado_planilla (rol);

drop trigger if exists estado_planilla_updated_at on public.estado_planilla;
create trigger estado_planilla_updated_at
  before update on public.estado_planilla
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cuotas: una fila por jugador y mes (periodo = primer día del mes)
-- -----------------------------------------------------------------------------
create table if not exists public.cuotas (
  id            uuid primary key default gen_random_uuid(),
  jugador_id    uuid not null references public.jugadores (id) on delete cascade,
  periodo       date not null check (periodo = date_trunc('month', periodo)::date),
  monto         integer not null default 1400 check (monto >= 0),
  estado        text not null default 'pendiente'
    check (estado in ('pendiente', 'pagada', 'vencida')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (jugador_id, periodo)
);

create index if not exists cuotas_periodo_estado_idx on public.cuotas (periodo, estado);

drop trigger if exists cuotas_updated_at on public.cuotas;
create trigger cuotas_updated_at
  before update on public.cuotas
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Pagos: cada cobro registrado (una cuota puede tener un pago)
-- -----------------------------------------------------------------------------
create sequence if not exists public.pagos_recibo_seq start 5000;

create table if not exists public.pagos (
  id            uuid primary key default gen_random_uuid(),
  cuota_id      uuid not null references public.cuotas (id) on delete cascade,
  jugador_id    uuid not null references public.jugadores (id) on delete cascade,
  monto         integer not null check (monto >= 0),
  metodo        text not null default '',
  -- Un cobro que salda varios meses genera varias filas con el mismo recibo.
  recibo        text not null default ('#' || nextval('public.pagos_recibo_seq')),
  pagado_en     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists pagos_jugador_idx on public.pagos (jugador_id, pagado_en desc);
create index if not exists pagos_cuota_idx on public.pagos (cuota_id);
create index if not exists pagos_recibo_idx on public.pagos (recibo);

-- -----------------------------------------------------------------------------
-- Reglas de automatización (avisos automáticos)
-- -----------------------------------------------------------------------------
create table if not exists public.reglas_automatizacion (
  id                uuid primary key default gen_random_uuid(),
  clave             text not null unique,
  titulo            text not null,
  etiqueta          text not null default '',
  descripcion       text not null default '',
  activa            boolean not null default true,
  icono             text not null default 'notifications',
  -- Clases de Tailwind usadas por la app para pintar la tarjeta.
  clase_etiqueta    text,
  clase_icono_fondo text not null default 'bg-surface-container-high',
  clase_icono_color text not null default 'text-primary',
  orden             smallint not null default 0,
  updated_at        timestamptz not null default now()
);

drop trigger if exists reglas_automatizacion_updated_at on public.reglas_automatizacion;
create trigger reglas_automatizacion_updated_at
  before update on public.reglas_automatizacion
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Mensajes enviados (historial de avisos)
-- -----------------------------------------------------------------------------
create table if not exists public.mensajes_enviados (
  id              uuid primary key default gen_random_uuid(),
  jugador_id      uuid references public.jugadores (id) on delete set null,
  -- Se guarda el nombre por si el jugador se borra.
  jugador_nombre  text not null,
  tema            text not null,
  tipo            text not null default 'general'
    check (tipo in ('general', 'cuota', 'carne', 'cumpleanios', 'citacion')),
  estado          text not null default 'Enviado'
    check (estado in ('Enviado', 'Entregado', 'Leído')),
  enviado_en      timestamptz not null default now()
);

create index if not exists mensajes_enviados_enviado_en_idx on public.mensajes_enviados (enviado_en desc);
create index if not exists mensajes_enviados_jugador_idx on public.mensajes_enviados (jugador_id);

-- -----------------------------------------------------------------------------
-- Roles del club
-- -----------------------------------------------------------------------------
create table if not exists public.roles_club (
  id                uuid primary key default gen_random_uuid(),
  clave             text not null unique,
  titulo            text not null,
  subtitulo         text not null default '',
  descripcion       text not null default '',
  etiqueta          text not null default '',
  icono             text not null default 'badge',
  clase_icono       text not null default 'bg-surface-container-high text-primary',
  cantidad_activos  integer not null default 0,
  orden             smallint not null default 0
);

-- -----------------------------------------------------------------------------
-- Textos de la app editables por el admin (datos del partido, temporada...).
-- Si una clave no está acá, la app usa el valor por defecto de src/lib/textos.tsx.
-- -----------------------------------------------------------------------------
create table if not exists public.textos_app (
  clave       text primary key check (clave ~ '^[a-z0-9_]+$'),
  valor       text not null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists textos_app_updated_at on public.textos_app;
create trigger textos_app_updated_at
  before update on public.textos_app
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Funciones (RPC) para operaciones de varios pasos, así quedan atómicas.
-- security invoker: respetan RLS igual que un insert/update directo.
-- =============================================================================

-- Alta de jugador con carné, ficha LUD, estado en planilla y cuota del mes.
create or replace function public.alta_jugador(datos jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id       uuid;
  v_cuota_id uuid;
  v_periodo  date := date_trunc('month', current_date)::date;
begin
  insert into jugadores (
    numero, nombre, apellido, posicion, categoria, anio_nacimiento, avatar_url,
    telefono, email, direccion, es_capitan,
    emergencia_nombre, emergencia_telefono, emergencia_relacion,
    prestador_salud, emergencia_movil, numero_socio
  ) values (
    (datos->>'numero')::smallint,
    datos->>'nombre',
    datos->>'apellido',
    coalesce(datos->>'posicion', ''),
    coalesce(datos->>'categoria', 'Mayores Elbio U'),
    nullif(datos->>'anio_nacimiento', '')::smallint,
    nullif(datos->>'avatar_url', ''),
    coalesce(datos->>'telefono', ''),
    coalesce(datos->>'email', ''),
    coalesce(datos->>'direccion', ''),
    coalesce((datos->>'es_capitan')::boolean, false),
    coalesce(datos->>'emergencia_nombre', ''),
    coalesce(datos->>'emergencia_telefono', ''),
    coalesce(datos->>'emergencia_relacion', 'Otro'),
    coalesce(datos->>'prestador_salud', ''),
    coalesce(datos->>'emergencia_movil', 'SEMM'),
    nullif(datos->>'numero_socio', '')
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

  insert into fichas_lud (jugador_id, carne_en_mano, id_federado, categoria, consentimiento_firmado)
  values (
    v_id,
    coalesce(datos->>'lud_carne_en_mano', 'En trámite secretaría'),
    nullif(datos->>'lud_id_federado', '')::integer,
    coalesce(datos->>'lud_categoria', 'Mayores (Fútbol Universitario)'),
    coalesce((datos->>'lud_consentimiento')::boolean, false)
  );

  insert into estado_planilla (jugador_id, rol, asistencia_confirmada)
  values (v_id, coalesce(datos->>'planilla_rol', 'SUPLENTE'), false);

  insert into cuotas (jugador_id, periodo, estado)
  values (v_id, v_periodo, coalesce(datos->>'cuota_estado', 'pendiente'))
  returning id into v_cuota_id;

  if datos->>'cuota_estado' = 'pagada' then
    insert into pagos (cuota_id, jugador_id, monto, metodo)
    select v_cuota_id, v_id, monto, coalesce(datos->>'pago_metodo', 'Efectivo')
    from cuotas where id = v_cuota_id;
  end if;

  return v_id;
end;
$$;

-- Registra el cobro de todas las cuotas impagas de un jugador.
-- Devuelve el número de recibo (o NULL si no debía nada).
create or replace function public.registrar_pago(p_jugador_id uuid, p_metodo text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_recibo text;
  v_cuota  record;
begin
  for v_cuota in
    select id, monto from cuotas
    where jugador_id = p_jugador_id and estado <> 'pagada'
    order by periodo
    for update
  loop
    if v_recibo is null then
      v_recibo := '#' || nextval('pagos_recibo_seq');
    end if;
    -- Un mismo recibo para todas las cuotas saldadas en este cobro.
    insert into pagos (cuota_id, jugador_id, monto, metodo, recibo)
    values (v_cuota.id, p_jugador_id, v_cuota.monto, p_metodo, v_recibo);
    update cuotas set estado = 'pagada' where id = v_cuota.id;
  end loop;

  return v_recibo;
end;
$$;

-- Genera las cuotas de un mes para todos los jugadores que no la tengan.
-- Uso (SQL Editor, a principio de mes): select public.generar_cuotas_mes();
create or replace function public.generar_cuotas_mes(p_periodo date default current_date, p_monto integer default 1400)
returns integer
language sql
security invoker
set search_path = public
as $$
  with nuevas as (
    insert into cuotas (jugador_id, periodo, monto)
    select j.id, date_trunc('month', p_periodo)::date, p_monto
    from jugadores j
    on conflict (jugador_id, periodo) do nothing
    returning 1
  )
  select count(*)::integer from nuevas;
$$;

-- =============================================================================
-- Permisos y RLS
-- =============================================================================
-- Grants explícitos (los proyectos nuevos de Supabase pueden no exponer
-- automáticamente las tablas nuevas a la API).
grant usage on schema public to anon, authenticated;
grant select, insert, update on
  public.jugadores, public.carnes_salud, public.fichas_lud, public.estado_planilla,
  public.cuotas, public.pagos, public.reglas_automatizacion, public.mensajes_enviados
  to anon, authenticated;
grant select on public.roles_club to anon, authenticated;
grant select, insert, update on public.textos_app to anon, authenticated;
grant usage on sequence public.pagos_recibo_seq to anon, authenticated;
grant execute on function public.alta_jugador(jsonb) to anon, authenticated;
grant execute on function public.registrar_pago(uuid, text) to anon, authenticated;
-- generar_cuotas_mes queda solo para el SQL Editor (rol postgres).
revoke execute on function public.generar_cuotas_mes(date, integer) from public, anon, authenticated;

alter table public.jugadores             enable row level security;
alter table public.carnes_salud          enable row level security;
alter table public.fichas_lud            enable row level security;
alter table public.estado_planilla       enable row level security;
alter table public.cuotas                enable row level security;
alter table public.pagos                 enable row level security;
alter table public.reglas_automatizacion enable row level security;
alter table public.mensajes_enviados     enable row level security;
alter table public.roles_club            enable row level security;
alter table public.textos_app            enable row level security;

-- ---------------------------------------------------------------------------
-- ETAPA ACTUAL (sin login): acceso abierto con la anon key.
-- No se permite DELETE desde la app en ninguna tabla.
-- Todas las políticas se llaman "abierto_*" para poder borrarlas juntas
-- cuando se agregue el login: la migración 2 las borra y pone permisos por rol.
-- ---------------------------------------------------------------------------
drop policy if exists abierto_select on public.jugadores; create policy abierto_select on public.jugadores for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.jugadores; create policy abierto_insert on public.jugadores for insert to anon, authenticated with check (true);
drop policy if exists abierto_update on public.jugadores; create policy abierto_update on public.jugadores for update to anon, authenticated using (true) with check (true);

drop policy if exists abierto_select on public.carnes_salud; create policy abierto_select on public.carnes_salud for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.carnes_salud; create policy abierto_insert on public.carnes_salud for insert to anon, authenticated with check (true);
drop policy if exists abierto_update on public.carnes_salud; create policy abierto_update on public.carnes_salud for update to anon, authenticated using (true) with check (true);

drop policy if exists abierto_select on public.fichas_lud; create policy abierto_select on public.fichas_lud for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.fichas_lud; create policy abierto_insert on public.fichas_lud for insert to anon, authenticated with check (true);
drop policy if exists abierto_update on public.fichas_lud; create policy abierto_update on public.fichas_lud for update to anon, authenticated using (true) with check (true);

drop policy if exists abierto_select on public.estado_planilla; create policy abierto_select on public.estado_planilla for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.estado_planilla; create policy abierto_insert on public.estado_planilla for insert to anon, authenticated with check (true);
drop policy if exists abierto_update on public.estado_planilla; create policy abierto_update on public.estado_planilla for update to anon, authenticated using (true) with check (true);

drop policy if exists abierto_select on public.cuotas; create policy abierto_select on public.cuotas for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.cuotas; create policy abierto_insert on public.cuotas for insert to anon, authenticated with check (true);
drop policy if exists abierto_update on public.cuotas; create policy abierto_update on public.cuotas for update to anon, authenticated using (true) with check (true);

drop policy if exists abierto_select on public.pagos; create policy abierto_select on public.pagos for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.pagos; create policy abierto_insert on public.pagos for insert to anon, authenticated with check (true);

drop policy if exists abierto_select on public.reglas_automatizacion; create policy abierto_select on public.reglas_automatizacion for select to anon, authenticated using (true);
drop policy if exists abierto_update on public.reglas_automatizacion; create policy abierto_update on public.reglas_automatizacion for update to anon, authenticated using (true) with check (true);

drop policy if exists abierto_select on public.mensajes_enviados; create policy abierto_select on public.mensajes_enviados for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.mensajes_enviados; create policy abierto_insert on public.mensajes_enviados for insert to anon, authenticated with check (true);

drop policy if exists abierto_select on public.roles_club; create policy abierto_select on public.roles_club for select to anon, authenticated using (true);

drop policy if exists abierto_select on public.textos_app; create policy abierto_select on public.textos_app for select to anon, authenticated using (true);
drop policy if exists abierto_insert on public.textos_app; create policy abierto_insert on public.textos_app for insert to anon, authenticated with check (true);
drop policy if exists abierto_update on public.textos_app; create policy abierto_update on public.textos_app for update to anon, authenticated using (true) with check (true);

-- Fin. Si todo salió bien, el SQL Editor muestra una fila con "Listo".
select 'Listo: tablas creadas' as resultado;
