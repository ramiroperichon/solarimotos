-- =====================================================================
-- Solari Motos · 001 · Esquema base con seguridad (APLICADA)
-- Contraseñas: las gestiona Supabase Auth (bcrypt con sal por usuario).
-- Esta base solo guarda permisos, contenido del catálogo y auditoría.
-- =====================================================================

-- Esquema privado: NO está expuesto por la API (PostgREST solo expone public)
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- Lista blanca de emails autorizados a tener cuenta de administración
create table privado.emails_autorizados (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre text,
  creado timestamptz not null default now()
);

-- Administradores (se completa solo al crear la cuenta con un email autorizado)
create table privado.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  creado timestamptz not null default now(),
  activo boolean not null default true
);

-- Bloqueo de registros: auth.users solo acepta emails autorizados
create or replace function privado.validar_registro()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from privado.emails_autorizados e where e.email = lower(new.email)) then
    raise exception 'Registro no permitido' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function privado.alta_admin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into privado.admins (user_id, email) values (new.id, lower(new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger solari_validar_registro before insert on auth.users
  for each row execute function privado.validar_registro();
create trigger solari_alta_admin after insert on auth.users
  for each row execute function privado.alta_admin();

-- Funciones de autorización (la 002 las reemplaza por versiones en "privado")
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from privado.admins a where a.user_id = (select auth.uid()) and a.activo);
$$;

create or replace function public.es_admin_verificado()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.es_admin() and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

revoke all on function public.es_admin() from public, anon;
revoke all on function public.es_admin_verificado() from public, anon;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_admin_verificado() to authenticated;

create or replace function public.mi_perfil()
returns json language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'es_admin', public.es_admin(),
    'aal', coalesce((select auth.jwt() ->> 'aal'), 'aal1'),
    'email', (select auth.jwt() ->> 'email')
  );
$$;
revoke all on function public.mi_perfil() from public, anon;
grant execute on function public.mi_perfil() to authenticated;

-- Contenido del catálogo
create or replace function privado.sello_modificacion()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.actualizado := now();
  new.actualizado_por := (select auth.uid());
  return new;
end;
$$;

create table public.motos (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(id) <= 80),
  marca text not null check (length(marca) between 1 and 60),
  modelo text not null check (length(modelo) between 1 and 80),
  categoria text not null check (length(categoria) between 1 and 40),
  cilindrada integer not null check (cilindrada between 49 and 2000),
  anio integer not null check (anio between 2000 and 2100),
  precio numeric(14,2) check (precio is null or precio > 0),
  disponibilidad text not null default 'disponible'
    check (disponibilidad in ('disponible','ultima','pedido','reservada','consultar')),
  etiqueta text not null default '' check (length(etiqueta) <= 40),
  resumen text not null default '' check (length(resumen) <= 600),
  financiacion text not null default '' check (length(financiacion) <= 200),
  ficha jsonb not null default '{}'::jsonb check (jsonb_typeof(ficha) in ('object','array')),
  imagenes jsonb not null default '[]'::jsonb check (jsonb_typeof(imagenes) = 'array' and jsonb_array_length(imagenes) <= 30),
  vista360 jsonb check (vista360 is null or jsonb_typeof(vista360) = 'object'),
  publicado boolean not null default true,
  orden integer not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

create table public.cascos (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(id) <= 80),
  tipo text not null check (length(tipo) between 1 and 40),
  nombre text not null check (length(nombre) between 1 and 80),
  talles text not null default '' check (length(talles) <= 60),
  precio numeric(14,2) check (precio is null or precio > 0),
  disponibilidad text not null default 'disponible'
    check (disponibilidad in ('disponible','ultima','pedido','reservada','consultar')),
  detalle text not null default '' check (length(detalle) <= 400),
  imagenes jsonb not null default '[]'::jsonb check (jsonb_typeof(imagenes) = 'array' and jsonb_array_length(imagenes) <= 12),
  publicado boolean not null default true,
  orden integer not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

create table public.promociones (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(id) <= 80),
  titulo text not null check (length(titulo) between 1 and 80),
  texto text not null default '' check (length(texto) <= 300),
  vigencia text not null default '' check (length(vigencia) <= 80),
  demo boolean not null default false,
  publicado boolean not null default true,
  orden integer not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

create table public.sitio (
  id smallint primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  financiacion jsonb not null default '{}'::jsonb check (jsonb_typeof(financiacion) = 'object'),
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

create index motos_orden_idx on public.motos (orden, id);
create index cascos_orden_idx on public.cascos (orden, id);
create index promociones_orden_idx on public.promociones (orden, id);

create trigger motos_sello before insert or update on public.motos for each row execute function privado.sello_modificacion();
create trigger cascos_sello before insert or update on public.cascos for each row execute function privado.sello_modificacion();
create trigger promociones_sello before insert or update on public.promociones for each row execute function privado.sello_modificacion();
create trigger sitio_sello before insert or update on public.sitio for each row execute function privado.sello_modificacion();

-- Auditoría inalterable
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro text,
  accion text not null,
  usuario uuid,
  email text,
  antes jsonb,
  despues jsonb,
  fecha timestamptz not null default now()
);
create index auditoria_fecha_idx on public.auditoria (fecha desc);

create or replace function privado.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.auditoria (tabla, registro, accion, usuario, email, antes, despues)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    tg_op,
    (select auth.uid()),
    (select auth.jwt() ->> 'email'),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger motos_auditoria after insert or update or delete on public.motos for each row execute function privado.registrar_auditoria();
create trigger cascos_auditoria after insert or update or delete on public.cascos for each row execute function privado.registrar_auditoria();
create trigger promociones_auditoria after insert or update or delete on public.promociones for each row execute function privado.registrar_auditoria();
create trigger sitio_auditoria after insert or update or delete on public.sitio for each row execute function privado.registrar_auditoria();

-- RLS activado y forzado
alter table public.motos enable row level security;
alter table public.cascos enable row level security;
alter table public.promociones enable row level security;
alter table public.sitio enable row level security;
alter table public.auditoria enable row level security;
alter table public.motos force row level security;
alter table public.cascos force row level security;
alter table public.promociones force row level security;
alter table public.sitio force row level security;
alter table public.auditoria force row level security;

create policy "lectura publica motos" on public.motos for select to anon, authenticated using (publicado or (select public.es_admin()));
create policy "lectura publica cascos" on public.cascos for select to anon, authenticated using (publicado or (select public.es_admin()));
create policy "lectura publica promociones" on public.promociones for select to anon, authenticated using (publicado or (select public.es_admin()));
create policy "lectura publica sitio" on public.sitio for select to anon, authenticated using (true);

create policy "admin alta motos" on public.motos for insert to authenticated with check ((select public.es_admin_verificado()));
create policy "admin edita motos" on public.motos for update to authenticated using ((select public.es_admin_verificado())) with check ((select public.es_admin_verificado()));
create policy "admin borra motos" on public.motos for delete to authenticated using ((select public.es_admin_verificado()));
create policy "admin alta cascos" on public.cascos for insert to authenticated with check ((select public.es_admin_verificado()));
create policy "admin edita cascos" on public.cascos for update to authenticated using ((select public.es_admin_verificado())) with check ((select public.es_admin_verificado()));
create policy "admin borra cascos" on public.cascos for delete to authenticated using ((select public.es_admin_verificado()));
create policy "admin alta promociones" on public.promociones for insert to authenticated with check ((select public.es_admin_verificado()));
create policy "admin edita promociones" on public.promociones for update to authenticated using ((select public.es_admin_verificado())) with check ((select public.es_admin_verificado()));
create policy "admin borra promociones" on public.promociones for delete to authenticated using ((select public.es_admin_verificado()));
create policy "admin edita sitio" on public.sitio for update to authenticated using ((select public.es_admin_verificado())) with check ((select public.es_admin_verificado()));

create policy "admin lee auditoria" on public.auditoria for select to authenticated using ((select public.es_admin_verificado()));
revoke insert, update, delete, truncate on public.auditoria from anon, authenticated;

revoke insert, update, delete, truncate on public.motos, public.cascos, public.promociones, public.sitio from anon;
revoke all on public.auditoria from anon;
revoke insert, delete, truncate on public.sitio from authenticated;

-- Almacenamiento de fotos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('motos', 'motos', true, 6291456, array['image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'motos' and (select public.es_admin_verificado()));
create policy "admin actualiza fotos" on storage.objects for update to authenticated
  using (bucket_id = 'motos' and (select public.es_admin_verificado()))
  with check (bucket_id = 'motos' and (select public.es_admin_verificado()));
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'motos' and (select public.es_admin_verificado()));

insert into privado.emails_autorizados (email, nombre) values ('perichonramiro12@gmail.com', 'Ramiro Perichon');
