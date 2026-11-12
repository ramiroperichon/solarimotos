-- =====================================================================
-- Solari Motos · 005 · Recibos de pago
-- Cada vez que se registra un pago en una cuota, la base le asigna un
-- número de recibo correlativo y guarda el monto de ese pago.
-- Anular el pago borra el número (queda en la auditoría).
-- =====================================================================

create sequence if not exists privado.recibos_seq start 1;

alter table public.cuotas
  add column if not exists recibo_numero bigint unique,
  add column if not exists ultimo_pago numeric(14,2) check (ultimo_pago is null or ultimo_pago > 0),
  add column if not exists recibo_fecha timestamptz;

create or replace function privado.numerar_recibo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.pagado > old.pagado then
    new.recibo_numero := nextval('privado.recibos_seq');
    new.ultimo_pago := new.pagado - old.pagado;
    new.recibo_fecha := now();
  elsif new.pagado = 0 then
    new.recibo_numero := null;
    new.ultimo_pago := null;
    new.recibo_fecha := null;
  else
    -- Nadie puede inventar o cambiar un número de recibo a mano
    new.recibo_numero := old.recibo_numero;
    new.ultimo_pago := old.ultimo_pago;
    new.recibo_fecha := old.recibo_fecha;
  end if;
  return new;
end;
$$;
revoke all on function privado.numerar_recibo() from public, anon, authenticated;

create trigger cuotas_recibo before update on public.cuotas
  for each row execute function privado.numerar_recibo();
