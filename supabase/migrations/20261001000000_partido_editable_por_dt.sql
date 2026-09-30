-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 6: el cuerpo técnico (rol dt) puede cargar el próximo partido.
--
-- Cómo usarla: DESPUÉS de la migración 5, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- El admin sigue editando todos los textos. El dt solo puede guardar los
-- datos del próximo partido (fecha, rival, día, horas y cancha).
-- =============================================================================

create or replace function public.es_texto_del_partido(p_clave text)
returns boolean
language sql
immutable
as $$
  select p_clave in ('fecha', 'rival', 'partido_dia', 'partido_dia_corto',
                     'partido_hora', 'citacion_hora', 'cancha');
$$;

drop policy if exists rol_insert on public.textos_app;
create policy rol_insert on public.textos_app for insert to authenticated
  with check (
    (select public.mi_rol()) = 'admin'
    or ((select public.mi_rol()) = 'dt' and public.es_texto_del_partido(clave))
  );

drop policy if exists rol_update on public.textos_app;
create policy rol_update on public.textos_app for update to authenticated
  using (
    (select public.mi_rol()) = 'admin'
    or ((select public.mi_rol()) = 'dt' and public.es_texto_del_partido(clave))
  )
  with check (
    (select public.mi_rol()) = 'admin'
    or ((select public.mi_rol()) = 'dt' and public.es_texto_del_partido(clave))
  );

select 'Listo: el cuerpo técnico ya puede cargar el próximo partido' as resultado;
