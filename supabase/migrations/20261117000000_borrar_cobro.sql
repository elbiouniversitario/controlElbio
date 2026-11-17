-- Tesorero: borrar un cobro cargado por error (asado, camiseta, cuota del mes).
--
-- Borra el cobro y, en cascada, sus cargos y los pagos informados o rechazados.
-- Si alguien ya tiene un pago CONFIRMADO de ese cobro no se borra: esa plata
-- entró a la caja y desaparecería del saldo. Primero hay que resolver ese pago.
--
-- (Editar gastos no necesita nada: la política rol_all de gastos ya deja al
-- tesorero hacer update.)

create or replace function public.borrar_cobro(p_cobro_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pagado integer;
  v_n      integer;
begin
  if not public.es_tesorero() then
    raise exception 'Solo el tesorero borra cobros' using errcode = '42501';
  end if;
  if not exists (select 1 from cobros where id = p_cobro_id) then
    raise exception 'No existe ese cobro' using errcode = '22023';
  end if;

  select coalesce(sum(pa.monto), 0), count(*) into v_pagado, v_n
  from pagos pa join cargos ca on ca.id = pa.cargo_id
  where ca.cobro_id = p_cobro_id and pa.estado = 'confirmado';

  if v_n > 0 then
    raise exception 'No se puede borrar: ya tiene % pago(s) confirmado(s) por $%. Esa plata ya está en la caja.', v_n, v_pagado
      using errcode = '22023';
  end if;

  delete from cobros where id = p_cobro_id;
end;
$$;

revoke all on function public.borrar_cobro(uuid) from public, anon;
grant execute on function public.borrar_cobro(uuid) to authenticated;
