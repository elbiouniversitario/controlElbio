-- =============================================================================
-- Mercado Pago: pago de cobros con link y suscripción automática a la cuota.
-- =============================================================================
--
-- Cómo funciona:
--   - Pago puntual: el jugador toca "Pagar con Mercado Pago" en un cargo. La
--     función de Vercel api/mp-preferencia arma el link (Checkout Pro) con
--     external_reference = 'cargo:<cargo_id>'.
--   - Suscripción: el jugador activa el débito automático de la cuota. La
--     función api/mp-suscripcion crea un preapproval con
--     external_reference = 'cuota:<jugador_id>'.
--   - Confirmación: Mercado Pago avisa a api/mp-webhook. La función vuelve a
--     pedir el pago a la API de MP (no confía en el aviso) y, si está
--     aprobado, llama a mp_registrar_pago con la clave de servicio. El pago
--     entra ya confirmado, con metodo 'mercadopago'. Un mismo pago de MP no se
--     registra dos veces (índice único por mp_payment_id).
--
-- Las funciones mp_registrar_pago / mp_revertir_pago / mp_guardar_suscripcion
-- solo las puede llamar la clave de servicio (las funciones de Vercel).

-- ---- Pagos: id de Mercado Pago ------------------------------------------------
alter table public.pagos add column if not exists mp_payment_id text;
create unique index if not exists pagos_mp_payment_uq
  on public.pagos (mp_payment_id) where mp_payment_id is not null;

-- ---- Suscripciones a la cuota ---------------------------------------------------
create table if not exists public.suscripciones_mp (
  jugador_id      uuid primary key references public.jugadores (id) on delete cascade,
  preapproval_id  text not null unique,
  -- pending: creada, el jugador todavía no la autorizó en MP
  -- authorized: activa, MP cobra solo todos los meses
  -- paused / cancelled: frenada
  estado          text not null default 'pending'
                  check (estado in ('pending', 'authorized', 'paused', 'cancelled')),
  monto           integer not null check (monto > 0),
  email           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.suscripciones_mp enable row level security;
drop policy if exists suscripcion_select on public.suscripciones_mp;
create policy suscripcion_select on public.suscripciones_mp for select to authenticated
  using (jugador_id = public.mi_jugador_id() or public.es_tesorero());
-- Sin políticas de insert/update/delete: escribe solo la clave de servicio.

-- ---- Para armar el link de pago de un cargo -------------------------------------
-- Lo puede pedir el dueño del cargo o el tesorero. Devuelve lo que falta pagar.
create or replace function public.mp_cargo_para_pagar(p_cargo_id uuid)
returns table (concepto text, saldo integer, jugador_id uuid)
language plpgsql stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from cargos ca
    where ca.id = p_cargo_id
      and (ca.jugador_id = public.mi_jugador_id() or public.es_tesorero())
  ) then
    raise exception 'Ese cobro no es tuyo' using errcode = '42501';
  end if;
  return query
    select co.concepto, public.saldo_cargo(ca.id), ca.jugador_id
    from cargos ca join cobros co on co.id = ca.cobro_id
    where ca.id = p_cargo_id;
end;
$$;

-- ---- Para armar la suscripción del jugador logueado ------------------------------
-- monto: excepción del jugador o cuota general (0 = exonerado, no se suscribe).
create or replace function public.mp_mi_cuota()
returns table (jugador_id uuid, nombre text, email text, monto integer)
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_jugador uuid := public.mi_jugador_id();
  v_general int;
begin
  if v_jugador is null then
    raise exception 'Primero vinculá tu ficha' using errcode = '42501';
  end if;
  select nullif(regexp_replace(valor, '\D', '', 'g'), '')::int into v_general
  from textos_app where clave = 'cuota_monto';
  return query
    select j.id, trim(j.nombre || ' ' || j.apellido), j.email,
           coalesce(e.monto, v_general, 0)::int
    from jugadores j
    left join excepciones_cuota e on e.jugador_id = j.id
    where j.id = v_jugador;
end;
$$;

-- ---- Registrar un pago aprobado en MP (solo clave de servicio) -------------------
-- p_cargo_id: pago puntual de ese cargo.
-- Si p_cargo_id es null, es un cobro de la suscripción: se aplica a la cuota
-- más vieja con saldo del jugador; si no tiene ninguna, a la del mes de
-- p_fecha (se crea el cobro/cargo del mes si todavía no se generó).
-- Devuelve el id del pago (o el que ya existía con ese mp_payment_id).
create or replace function public.mp_registrar_pago(
  p_mp_payment_id text,
  p_cargo_id      uuid,
  p_jugador_id    uuid,
  p_monto         integer,
  p_fecha         date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id      uuid;
  v_cargo   uuid := p_cargo_id;
  v_jugador uuid := p_jugador_id;
  v_periodo date := date_trunc('month', coalesce(p_fecha, current_date))::date;
  v_cobro   uuid;
begin
  if coalesce(p_mp_payment_id, '') = '' or coalesce(p_monto, 0) <= 0 then
    raise exception 'Pago de Mercado Pago inválido' using errcode = '22023';
  end if;

  select id into v_id from pagos where mp_payment_id = p_mp_payment_id;
  if v_id is not null then
    return v_id;
  end if;

  if v_cargo is not null then
    select jugador_id into v_jugador from cargos where id = v_cargo;
    if v_jugador is null then
      raise exception 'No existe ese cargo' using errcode = '22023';
    end if;
  else
    if v_jugador is null or not exists (select 1 from jugadores where id = v_jugador) then
      raise exception 'No existe ese jugador' using errcode = '22023';
    end if;
    select ca.id into v_cargo
    from cargos ca join cobros co on co.id = ca.cobro_id
    where ca.jugador_id = v_jugador and co.tipo = 'cuota' and public.saldo_cargo(ca.id) > 0
    order by co.periodo
    limit 1;

    if v_cargo is null then
      insert into cobros (concepto, tipo, periodo, fecha)
      values ('Cuota ' || public.nombre_mes(v_periodo), 'cuota', v_periodo, v_periodo)
      on conflict do nothing;
      select id into v_cobro from cobros where tipo = 'cuota' and periodo = v_periodo;
      insert into cargos (cobro_id, jugador_id, monto)
      values (v_cobro, v_jugador, p_monto)
      on conflict (cobro_id, jugador_id) do nothing;
      select id into v_cargo from cargos where cobro_id = v_cobro and jugador_id = v_jugador;
    end if;
  end if;

  insert into pagos (cargo_id, jugador_id, monto, metodo, estado, mp_payment_id, revisado_en, pagado_en)
  values (v_cargo, v_jugador, p_monto, 'mercadopago', 'confirmado', p_mp_payment_id, now(), now())
  on conflict (mp_payment_id) where mp_payment_id is not null do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from pagos where mp_payment_id = p_mp_payment_id;
  end if;
  return v_id;
end;
$$;

-- Devolución o contracargo en MP: el pago pasa a rechazado.
create or replace function public.mp_revertir_pago(p_mp_payment_id text, p_motivo text)
returns void
language sql
security definer
set search_path = public
as $$
  update pagos
  set estado = 'rechazado', motivo_rechazo = coalesce(nullif(trim(p_motivo), ''), 'Devuelto en Mercado Pago'),
      revisado_en = now()
  where mp_payment_id = p_mp_payment_id and estado = 'confirmado'
$$;

-- Alta / cambio de estado de una suscripción.
create or replace function public.mp_guardar_suscripcion(
  p_jugador_id uuid, p_preapproval_id text, p_estado text, p_monto integer, p_email text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into suscripciones_mp (jugador_id, preapproval_id, estado, monto, email)
  values (p_jugador_id, p_preapproval_id, p_estado, p_monto, coalesce(p_email, ''))
  on conflict (jugador_id) do update
  set preapproval_id = excluded.preapproval_id,
      estado         = excluded.estado,
      monto          = coalesce(nullif(excluded.monto, 0), suscripciones_mp.monto),
      email          = coalesce(nullif(excluded.email, ''), suscripciones_mp.email),
      updated_at     = now()
$$;

-- Solo estado, por preapproval (lo usa el webhook).
create or replace function public.mp_estado_suscripcion(p_preapproval_id text, p_estado text)
returns void
language sql
security definer
set search_path = public
as $$
  update suscripciones_mp set estado = p_estado, updated_at = now()
  where preapproval_id = p_preapproval_id
$$;

revoke all on function public.mp_registrar_pago(text, uuid, uuid, integer, date) from public, anon, authenticated;
revoke all on function public.mp_revertir_pago(text, text) from public, anon, authenticated;
revoke all on function public.mp_guardar_suscripcion(uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.mp_estado_suscripcion(text, text) from public, anon, authenticated;
grant execute on function public.mp_registrar_pago(text, uuid, uuid, integer, date) to service_role;
grant execute on function public.mp_revertir_pago(text, text) to service_role;
grant execute on function public.mp_guardar_suscripcion(uuid, text, text, integer, text) to service_role;
grant execute on function public.mp_estado_suscripcion(text, text) to service_role;

revoke all on function public.mp_cargo_para_pagar(uuid) from public, anon;
revoke all on function public.mp_mi_cuota() from public, anon;
grant execute on function public.mp_cargo_para_pagar(uuid) to authenticated;
grant execute on function public.mp_mi_cuota() to authenticated;
