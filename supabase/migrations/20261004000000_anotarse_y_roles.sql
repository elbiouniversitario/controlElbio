-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 9: los jugadores se anotan solos y el admin les asigna rol.
--
-- Cómo usarla: pegar TODO este archivo en Supabase → SQL Editor → Run
-- (después de las anteriores). Se puede correr más de una vez.
--
-- - Un jugador que no está en el padrón se anota desde la app (nombre,
--   apellido, cédula, nacimiento y celular) y entra directo al plantel.
-- - Todos son "jugador". Desde Club → Roles del plantel el admin puede
--   hacer a un jugador "delegado" o "cuerpo técnico" (dt).
-- - El delegado puede lo mismo que el cuerpo técnico (alta y edición de
--   jugadores, documentos, convocatoria y próximo partido). Cuotas y
--   configuración siguen siendo de tesorería y del admin.
-- =============================================================================

alter table public.jugadores add column if not exists rol_club text not null default 'jugador';
alter table public.jugadores drop constraint if exists jugadores_rol_club_check;
alter table public.jugadores add constraint jugadores_rol_club_check
  check (rol_club in ('jugador', 'delegado', 'dt'));

-- Rol de quien usa la app: primero el staff cargado por email (admin, dt,
-- tesorero); si no, el rol que el admin le dio a su ficha de jugador.
create or replace function public.mi_rol()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select m.rol from miembros_club m where m.email = public.mi_email()),
    (select j.rol_club from jugadores j where j.id = public.mi_jugador_id())
  )
$$;

create or replace function public.es_staff()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.mi_rol() in ('admin', 'dt', 'tesorero', 'delegado'), false)
$$;

-- El delegado puede lo mismo que el cuerpo técnico: alta y edición de
-- jugadores, documentos, convocatoria y próximo partido.
create or replace function public.carga_plantel()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.mi_rol() in ('admin', 'dt', 'delegado'), false)
$$;

drop policy if exists rol_insert on public.jugadores;
create policy rol_insert on public.jugadores for insert to authenticated
  with check ((select public.carga_plantel()));
drop policy if exists rol_update on public.jugadores;
create policy rol_update on public.jugadores for update to authenticated
  using ((select public.carga_plantel()))
  with check ((select public.carga_plantel()));

drop policy if exists rol_insert on public.carnes_salud;
create policy rol_insert on public.carnes_salud for insert to authenticated
  with check ((select public.carga_plantel()));
drop policy if exists rol_update on public.carnes_salud;
create policy rol_update on public.carnes_salud for update to authenticated
  using ((select public.carga_plantel()))
  with check ((select public.carga_plantel()));

drop policy if exists rol_insert on public.fichas_lud;
create policy rol_insert on public.fichas_lud for insert to authenticated
  with check ((select public.carga_plantel()));
drop policy if exists rol_update on public.fichas_lud;
create policy rol_update on public.fichas_lud for update to authenticated
  using ((select public.carga_plantel()))
  with check ((select public.carga_plantel()));

drop policy if exists rol_insert on public.estado_planilla;
create policy rol_insert on public.estado_planilla for insert to authenticated
  with check ((select public.carga_plantel()));
drop policy if exists rol_update on public.estado_planilla;
create policy rol_update on public.estado_planilla for update to authenticated
  using ((select public.carga_plantel()))
  with check ((select public.carga_plantel()));

drop policy if exists rol_select on public.vinculos_jugador;
create policy rol_select on public.vinculos_jugador for select to authenticated
  using ((select public.carga_plantel()) or user_id = (select auth.uid()));

drop policy if exists documentos_insert on storage.objects;
create policy documentos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (select public.carga_plantel()));
drop policy if exists documentos_update on storage.objects;
create policy documentos_update on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and (select public.carga_plantel()))
  with check (bucket_id = 'documentos' and (select public.carga_plantel()));

-- Próximo partido (textos de la migración 6): también el delegado.
drop policy if exists rol_insert on public.textos_app;
create policy rol_insert on public.textos_app for insert to authenticated
  with check (
    (select public.mi_rol()) = 'admin'
    or ((select public.mi_rol()) in ('dt', 'delegado') and public.es_texto_del_partido(clave))
  );
drop policy if exists rol_update on public.textos_app;
create policy rol_update on public.textos_app for update to authenticated
  using (
    (select public.mi_rol()) = 'admin'
    or ((select public.mi_rol()) in ('dt', 'delegado') and public.es_texto_del_partido(clave))
  )
  with check (
    (select public.mi_rol()) = 'admin'
    or ((select public.mi_rol()) in ('dt', 'delegado') and public.es_texto_del_partido(clave))
  );

-- Alta de jugador (igual que en la migración 2, con el permiso nuevo).
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
  if not public.carga_plantel() then
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

-- Habilitación manual: por función, para que el delegado la cambie sin poder
-- editar el resto de la ficha.
create or replace function public.guardar_habilitacion(p_jugador_id uuid, p_estado text, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.carga_plantel() then
    raise exception 'No tenés permiso para cambiar la habilitación' using errcode = '42501';
  end if;
  if p_estado is not null and p_estado not in ('habilitado', 'inhabilitado') then
    raise exception 'Estado de habilitación inválido' using errcode = '22023';
  end if;
  update jugadores
  set habilitacion_manual = p_estado,
      motivo_habilitacion = nullif(trim(coalesce(p_motivo, '')), '')
  where id = p_jugador_id;
  if not found then
    raise exception 'No existe ese jugador' using errcode = 'P0002';
  end if;
end;
$$;

-- Admin: rol de un jugador en el club.
create or replace function public.asignar_rol_jugador(p_jugador_id uuid, p_rol text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.mi_rol(), '') <> 'admin' then
    raise exception 'Solo el admin asigna roles' using errcode = '42501';
  end if;
  if p_rol not in ('jugador', 'delegado', 'dt') then
    raise exception 'Rol inválido' using errcode = '22023';
  end if;
  update jugadores set rol_club = p_rol where id = p_jugador_id;
  if not found then
    raise exception 'No existe ese jugador' using errcode = 'P0002';
  end if;
end;
$$;

-- Jugador que no está en el padrón: se anota y queda vinculado a esta sesión.
-- Devuelve 'ok', 'ya_existe' (esa cédula ya está: que se elija de la lista)
-- o 'ya_anotado' (esta sesión ya tiene ficha).
create or replace function public.anotarme(
  p_nombre text, p_apellido text, p_documento text, p_fecha_nacimiento date, p_telefono text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_ci       text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  v_telefono text := regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g');
  v_nombre   text := initcap(trim(coalesce(p_nombre, '')));
  v_apellido text := initcap(trim(coalesce(p_apellido, '')));
  v_monto    integer;
  v_id       uuid;
begin
  if v_uid is null then
    raise exception 'Sesión inválida' using errcode = '42501';
  end if;
  if v_nombre = '' or v_apellido = '' then
    raise exception 'Falta el nombre o el apellido' using errcode = '22023';
  end if;
  if length(v_ci) not between 6 and 9 then
    raise exception 'La cédula no es válida' using errcode = '22023';
  end if;
  if length(regexp_replace(v_telefono, '\D', '', 'g')) < 8 then
    raise exception 'El número de celular no es válido' using errcode = '22023';
  end if;
  if p_fecha_nacimiento is null or p_fecha_nacimiento > current_date - interval '14 years'
     or p_fecha_nacimiento < date '1940-01-01' then
    raise exception 'La fecha de nacimiento no es válida' using errcode = '22023';
  end if;
  if exists (select 1 from vinculos_jugador v join jugadores j on j.id = v.jugador_id and j.activo
             where v.user_id = v_uid) then
    return 'ya_anotado';
  end if;
  if exists (select 1 from jugadores where regexp_replace(coalesce(documento, ''), '\D', '', 'g') = v_ci) then
    return 'ya_existe';
  end if;

  insert into jugadores (nombre, apellido, documento, fecha_nacimiento, anio_nacimiento, telefono, activo)
  values (v_nombre, v_apellido, v_ci, p_fecha_nacimiento, extract(year from p_fecha_nacimiento)::smallint, v_telefono, true)
  returning id into v_id;

  insert into fichas_lud (jugador_id) values (v_id) on conflict do nothing;
  insert into estado_planilla (jugador_id, rol, asistencia_confirmada) values (v_id, 'SUPLENTE', false)
  on conflict do nothing;
  -- La cuota del mes, con el valor de Textos de la app → Tesorería.
  select nullif(regexp_replace(valor, '\D', '', 'g'), '')::integer into v_monto
  from textos_app where clave = 'cuota_monto';
  insert into cuotas (jugador_id, periodo, monto)
  values (v_id, date_trunc('month', current_date)::date, coalesce(v_monto, 1400))
  on conflict do nothing;

  insert into vinculos_jugador (user_id, jugador_id, telefono)
  values (v_uid, v_id, v_telefono)
  on conflict (user_id) do update
    set jugador_id = excluded.jugador_id, telefono = excluded.telefono, created_at = now();
  return 'ok';
end;
$$;

revoke execute on function
  public.guardar_habilitacion(uuid, text, text),
  public.asignar_rol_jugador(uuid, text),
  public.anotarme(text, text, text, date, text)
  from public, anon;
grant execute on function
  public.guardar_habilitacion(uuid, text, text),
  public.asignar_rol_jugador(uuid, text),
  public.anotarme(text, text, text, date, text)
  to authenticated;

-- Perfil "Delegado" en Club Admin → Gestión de roles.
insert into public.roles_club (clave, titulo, subtitulo, descripcion, etiqueta, icono, clase_icono, cantidad_activos, orden)
values ('delegado', 'Delegado', 'Documentación',
        'Igual que el cuerpo técnico: plantel, documentos, convocatoria y próximo partido. Recibe los avisos de cuotas. Lo asigna el admin desde Roles del plantel.',
        'Plantel', 'assignment_ind', 'bg-[#e8f5e9] text-[#1b5e20]', 0, 2)
on conflict (clave) do nothing;

select 'Listo: anotarse y roles del plantel activados' as resultado;
