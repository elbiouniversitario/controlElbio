-- =============================================================================
-- Club Elbio Fernández — Gestión LUD
-- Migración 11: estudio (último examen aprobado) en la ficha del jugador.
--
-- Cómo usarla: pegar TODO este archivo en Supabase → SQL Editor → Run
-- (después de las anteriores). Se puede correr más de una vez.
--
-- Regla de la LUD: para jugar hay que tener un examen aprobado posterior al
-- 25/10 del año anterior. Excepciones: el jugador ya está recibido o tiene
-- artículo. El último examen venía del padrón guardado junto a la ficha
-- médica (carnes_salud.fecha_examen); acá pasa a la ficha del jugador.
-- =============================================================================

alter table public.jugadores add column if not exists fecha_ultimo_examen date;
alter table public.jugadores add column if not exists excepcion_estudio text;
alter table public.jugadores drop constraint if exists jugadores_excepcion_estudio_check;
alter table public.jugadores add constraint jugadores_excepcion_estudio_check
  check (excepcion_estudio in ('recibido', 'articulo'));

-- Copiar el último examen del padrón (el más reciente de cada jugador).
update public.jugadores j
set fecha_ultimo_examen = c.fecha
from (
  select distinct on (jugador_id) jugador_id, fecha_examen as fecha
  from public.carnes_salud
  where fecha_examen is not null
  order by jugador_id, fecha_examen desc
) c
where c.jugador_id = j.id and j.fecha_ultimo_examen is null;

select 'Listo: estudio en la ficha del jugador' as resultado;
