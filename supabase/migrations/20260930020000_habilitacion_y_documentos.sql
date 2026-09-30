-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 4: habilitación manual y documentos (ficha médica y carné LUD).
--
-- Cómo usarla: DESPUÉS de la migración 3, pegar TODO este archivo en
-- Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- - Habilitación: el admin o el DT pueden forzar "habilitado" o
--   "inhabilitado" (con motivo). Si no se fuerza (null), la app lo calcula
--   con los vencimientos de ficha médica y carné LUD.
-- - Documentos: fotos o PDF de la ficha médica y del carné LUD en un bucket
--   PRIVADO de Supabase Storage ("documentos"), en una carpeta por jugador
--   (<id del jugador>/archivo). Los suben el admin y el DT; los ve el staff y
--   cada jugador los suyos.
-- =============================================================================

alter table public.jugadores add column if not exists habilitacion_manual text
  check (habilitacion_manual in ('habilitado', 'inhabilitado'));
alter table public.jugadores add column if not exists motivo_habilitacion text;

alter table public.fichas_lud add column if not exists archivo_carne_path text;

-- -----------------------------------------------------------------------------
-- Bucket privado para los documentos (máx. 10 MB; imágenes y PDF)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ver: el staff todos; el jugador solo su carpeta.
drop policy if exists documentos_select on storage.objects;
create policy documentos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (
      (select public.es_staff())
      or (storage.foldername(name))[1] = (select public.mi_jugador_id())::text
    )
  );

-- Subir y reemplazar: admin y DT.
drop policy if exists documentos_insert on storage.objects;
create policy documentos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (select public.mi_rol()) in ('admin', 'dt'));

drop policy if exists documentos_update on storage.objects;
create policy documentos_update on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and (select public.mi_rol()) in ('admin', 'dt'))
  with check (bucket_id = 'documentos' and (select public.mi_rol()) in ('admin', 'dt'));

select 'Listo: habilitación manual y documentos activados' as resultado;
