# Endurecer permisos cuando haya login

Hoy (sin login) la migración deja a la anon key leer, insertar y modificar todo
(sin borrar). Cuando se agregue Supabase Auth, aplicar esto en una migración nueva.
**No ejecutar todavía.**

```text
---------------------------------------------------------------------------
PARA ENDURECER CON LOGIN (no ejecutar todavía)
---------------------------------------------------------------------------
Idea: cada usuario de Supabase Auth tiene una fila en una tabla de miembros
con su rol ('admin', 'dt' para cuerpo técnico/delegados, 'tesorero',
'jugador'); los jugadores además se vinculan por jugadores.auth_user_id.

1) Tabla de miembros y helper:

  create table public.miembros_club (
    user_id uuid primary key references auth.users (id) on delete cascade,
    rol     text not null check (rol in ('admin', 'dt', 'tesorero', 'jugador'))
  );
  alter table public.miembros_club enable row level security;
  create policy propio on public.miembros_club for select to authenticated
    using (user_id = (select auth.uid()));

  create function public.mi_rol() returns text
  language sql stable security definer set search_path = public as $$
    select rol from miembros_club where user_id = (select auth.uid())
  $$;

  create function public.mi_jugador_id() returns uuid
  language sql stable security definer set search_path = public as $$
    select id from jugadores where auth_user_id = (select auth.uid())
  $$;

2) Sacar TODO el acceso de anon y las políticas abiertas:

  revoke all on all tables in schema public from anon;
  revoke execute on all functions in schema public from anon;
  -- y en cada tabla: drop policy abierto_select / abierto_insert / abierto_update

3) Políticas por rol (todas "to authenticated"):

  jugadores, carnes_salud, fichas_lud, estado_planilla:
    select: mi_rol() in ('admin','dt','tesorero') or jugador_id = mi_jugador_id()
            (en jugadores: id = mi_jugador_id())
    insert/update: mi_rol() in ('admin','dt')
    El jugador puede además:
      - update en estado_planilla de su propia fila (confirmar asistencia),
        idealmente vía una RPC que solo toque asistencia_confirmada/motivo_baja.
      - insert en carnes_salud con jugador_id = mi_jugador_id() y
        verificado = false (subir renovación; lo verifica el DT).

  cuotas, pagos:
    select: mi_rol() in ('admin','tesorero') or jugador_id = mi_jugador_id()
    insert/update: mi_rol() in ('admin','tesorero')
    (el DT puede necesitar solo saber si está al día: exponer una vista
     sin montos si hace falta)

  reglas_automatizacion:
    select: mi_rol() in ('admin','dt','tesorero')
    update: mi_rol() = 'admin'

  mensajes_enviados:
    select: mi_rol() in ('admin','dt','tesorero') or jugador_id = mi_jugador_id()
    insert: mi_rol() in ('admin','dt','tesorero')

  roles_club:
    select: cualquier authenticated; cambios solo 'admin'.

  textos_app:
    select: cualquier authenticated; insert/update solo mi_rol() = 'admin'.

4) Las RPC alta_jugador y registrar_pago son security invoker, así que
   quedan cubiertas por estas políticas sin cambios; conviene igualmente
   revocarles execute a anon (paso 2).
---------------------------------------------------------------------------
```
