-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 5: generar las cuotas del mes desde la app (Tesorería).
--
-- Cómo usarla: DESPUÉS de la migración 4, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- =============================================================================

-- Crea la cuota del mes actual para cada jugador activo que no la tenga y
-- pasa a "vencida" las cuotas impagas de meses anteriores.
-- Solo admin y tesorería. Devuelve cuántas cuotas nuevas creó.
create or replace function public.generar_cuotas_del_mes(p_monto integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo date := date_trunc('month', current_date)::date;
  v_nuevas  integer;
begin
  if coalesce(public.mi_rol(), '') not in ('admin', 'tesorero') then
    raise exception 'No tenés permiso para generar cuotas' using errcode = '42501';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto de la cuota tiene que ser mayor a 0' using errcode = '22023';
  end if;

  update cuotas set estado = 'vencida'
  where estado = 'pendiente' and periodo < v_periodo;

  with nuevas as (
    insert into cuotas (jugador_id, periodo, monto)
    select j.id, v_periodo, p_monto
    from jugadores j
    where j.activo
    on conflict (jugador_id, periodo) do nothing
    returning 1
  )
  select count(*)::integer into v_nuevas from nuevas;

  return v_nuevas;
end;
$$;

revoke execute on function public.generar_cuotas_del_mes(integer) from public, anon;
grant execute on function public.generar_cuotas_del_mes(integer) to authenticated;

-- Perfil "Tesorería" en Club Admin → Gestión de roles (faltaba en la lista).
insert into public.roles_club (clave, titulo, subtitulo, descripcion, etiqueta, icono, clase_icono, cantidad_activos, orden)
values ('tesorero', 'Tesorería', 'Cuotas y Cobros',
        'Genera las cuotas del mes, registra cobros y manda recordatorios de pago.',
        'Finanzas', 'account_balance_wallet', 'bg-[#fff8e1] text-[#b76e00]', 0, 3)
on conflict (clave) do nothing;
update public.roles_club set orden = 4 where clave = 'jugador' and orden < 4;

select 'Listo: cuotas desde la app activadas' as resultado;
