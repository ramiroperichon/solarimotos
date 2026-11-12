-- =====================================================================
-- Solari Motos · 004 · Clientes, planes de financiación y cuotas
-- Datos personales: SOLO el administrador con doble factor (AAL2) puede
-- leerlos o modificarlos. Los visitantes no tienen ningún acceso.
-- Todo cambio queda en la auditoría.
-- =====================================================================

-- Clientes
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 120),
  dni text not null default '' check (dni ~ '^[0-9]{0,11}$'),
  telefono text not null default '' check (telefono ~ '^([0-9]{10,15})?$'),
  email text not null default '' check (length(email) <= 120),
  direccion text not null default '' check (length(direccion) <= 160),
  localidad text not null default '' check (length(localidad) <= 80),
  notas text not null default '' check (length(notas) <= 1000),
  activo boolean not null default true,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

-- Planes de financiación (uno o más por cliente)
create table public.planes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  moto_id text references public.motos(id) on delete set null,
  vehiculo text not null default '' check (length(vehiculo) <= 160),
  precio_total numeric(14,2) check (precio_total is null or precio_total >= 0),
  entrega numeric(14,2) not null default 0 check (entrega >= 0),
  cantidad_cuotas integer not null check (cantidad_cuotas between 1 and 120),
  monto_cuota numeric(14,2) not null check (monto_cuota > 0),
  primer_vencimiento date not null,
  estado text not null default 'activo' check (estado in ('activo', 'cancelado')),
  notas text not null default '' check (length(notas) <= 600),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

-- Cuotas (se generan solas al crear el plan)
create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes(id) on delete cascade,
  numero integer not null check (numero between 1 and 120),
  vencimiento date not null,
  monto numeric(14,2) not null check (monto > 0),
  pagado numeric(14,2) not null default 0 check (pagado >= 0),
  fecha_pago date,
  medio_pago text not null default '' check (length(medio_pago) <= 40),
  nota text not null default '' check (length(nota) <= 300),
  ultimo_aviso timestamptz,
  avisos integer not null default 0 check (avisos >= 0),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid,
  unique (plan_id, numero)
);

-- Ajustes de cobranza (una sola fila): días de aviso y mensajes de WhatsApp
create table public.cobranza (
  id smallint primary key default 1 check (id = 1),
  dias_aviso integer not null default 5 check (dias_aviso between 0 and 30),
  plantillas jsonb not null default '{}'::jsonb check (jsonb_typeof(plantillas) = 'object'),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);
insert into public.cobranza (id, dias_aviso, plantillas) values (1, 5, jsonb_build_object(
  'recordatorio', 'Hola {nombre}! Te escribimos de Solari Motos para recordarte que la cuota {cuota} de {total} de tu {moto} vence el {vencimiento} ({monto}). Podés acercarte al local o consultarnos por transferencia. Gracias por estar al día. Saludos!',
  'vencida', 'Hola {nombre}, ¿cómo estás? Te escribimos de Solari Motos porque la cuota {cuota} de {total} de tu {moto} venció el {vencimiento}. Tenés {vencidas} cuota(s) pendiente(s) por {adeudado}. Cuando puedas acercate al local o avisanos si necesitás coordinar. Saludos!',
  'pago', 'Hola {nombre}! Registramos tu pago de {pagado} correspondiente a la cuota {cuota} de {total} de tu {moto} ({fecha_pago}). Te quedan {restantes} cuota(s). Muchas gracias! Solari Motos.'
)) on conflict (id) do nothing;

create index planes_cliente_idx on public.planes (cliente_id);
create index planes_moto_idx on public.planes (moto_id);
create index cuotas_plan_idx on public.cuotas (plan_id);
create index cuotas_pendientes_idx on public.cuotas (vencimiento) where pagado < monto;
create index clientes_nombre_idx on public.clientes (lower(nombre));

-- Genera las cuotas mensuales al crear un plan
create or replace function privado.generar_cuotas()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.cuotas (plan_id, numero, vencimiento, monto)
  select new.id, n, (new.primer_vencimiento + make_interval(months => n - 1))::date, new.monto_cuota
  from generate_series(1, new.cantidad_cuotas) as n;
  return null;
end;
$$;
revoke all on function privado.generar_cuotas() from public, anon, authenticated;

create trigger planes_generar_cuotas after insert on public.planes
  for each row execute function privado.generar_cuotas();

-- Sello de modificación y auditoría
create trigger clientes_sello before insert or update on public.clientes for each row execute function privado.sello_modificacion();
create trigger planes_sello before insert or update on public.planes for each row execute function privado.sello_modificacion();
create trigger cuotas_sello before insert or update on public.cuotas for each row execute function privado.sello_modificacion();
create trigger cobranza_sello before insert or update on public.cobranza for each row execute function privado.sello_modificacion();
create trigger clientes_auditoria after insert or update or delete on public.clientes for each row execute function privado.registrar_auditoria();
create trigger planes_auditoria after insert or update or delete on public.planes for each row execute function privado.registrar_auditoria();
create trigger cuotas_auditoria after update or delete on public.cuotas for each row execute function privado.registrar_auditoria();
create trigger cobranza_auditoria after update on public.cobranza for each row execute function privado.registrar_auditoria();

-- Seguridad: RLS forzado, sin acceso anónimo, todo exige admin con doble factor
alter table public.clientes enable row level security;
alter table public.planes enable row level security;
alter table public.cuotas enable row level security;
alter table public.cobranza enable row level security;
alter table public.clientes force row level security;
alter table public.planes force row level security;
alter table public.cuotas force row level security;
alter table public.cobranza force row level security;

revoke all on public.clientes, public.planes, public.cuotas, public.cobranza from anon;

create policy "admin lee clientes" on public.clientes for select to authenticated using ((select privado.es_admin_verificado()));
create policy "admin alta clientes" on public.clientes for insert to authenticated with check ((select privado.es_admin_verificado()));
create policy "admin edita clientes" on public.clientes for update to authenticated using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));
create policy "admin borra clientes" on public.clientes for delete to authenticated using ((select privado.es_admin_verificado()));

create policy "admin lee planes" on public.planes for select to authenticated using ((select privado.es_admin_verificado()));
create policy "admin alta planes" on public.planes for insert to authenticated with check ((select privado.es_admin_verificado()));
create policy "admin edita planes" on public.planes for update to authenticated using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));
create policy "admin borra planes" on public.planes for delete to authenticated using ((select privado.es_admin_verificado()));

create policy "admin lee cuotas" on public.cuotas for select to authenticated using ((select privado.es_admin_verificado()));
create policy "admin edita cuotas" on public.cuotas for update to authenticated using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));

create policy "admin lee cobranza" on public.cobranza for select to authenticated using ((select privado.es_admin_verificado()));
create policy "admin edita cobranza" on public.cobranza for update to authenticated using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));

-- Las cuotas solo se crean con el plan y se borran con él
revoke insert, delete, truncate on public.cuotas from authenticated;
revoke insert, delete, truncate on public.cobranza from authenticated;
