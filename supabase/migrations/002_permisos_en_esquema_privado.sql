-- =====================================================================
-- Solari Motos · 002 · Permisos en esquema privado (PENDIENTE DE APLICAR)
-- Sin DROP: solo modifica políticas existentes y agrega nuevas.
-- Resuelve:
--  · Lectura pública del catálogo (los visitantes anónimos no pueden
--    ejecutar es_admin(), por eso hoy la lectura falla).
--  · Avisos del revisor de seguridad: las funciones de autorización dejan
--    de estar expuestas en la API.
-- Cómo aplicarla: Supabase → SQL Editor → pegar este archivo → Run.
-- =====================================================================

-- 1) Funciones de autorización en el esquema privado (no expuesto por la API)
create or replace function privado.es_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from privado.admins a where a.user_id = (select auth.uid()) and a.activo);
$$;

create or replace function privado.es_admin_verificado()
returns boolean language sql stable security definer set search_path = ''
as $$
  select privado.es_admin() and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

revoke all on function privado.es_admin() from public, anon;
revoke all on function privado.es_admin_verificado() from public, anon;
grant usage on schema privado to authenticated;
grant execute on function privado.es_admin() to authenticated;
grant execute on function privado.es_admin_verificado() to authenticated;

-- 2) Lectura: las políticas actuales pasan a ser solo para usuarios con sesión
alter policy "lectura publica motos" on public.motos to authenticated using (publicado or (select privado.es_admin()));
alter policy "lectura publica cascos" on public.cascos to authenticated using (publicado or (select privado.es_admin()));
alter policy "lectura publica promociones" on public.promociones to authenticated using (publicado or (select privado.es_admin()));

--    y los visitantes anónimos leen solo lo publicado
create policy "visitantes leen motos" on public.motos for select to anon using (publicado);
create policy "visitantes leen cascos" on public.cascos for select to anon using (publicado);
create policy "visitantes leen promociones" on public.promociones for select to anon using (publicado);

-- 3) Escritura: admin con doble factor (AAL2), usando las funciones privadas
alter policy "admin alta motos" on public.motos with check ((select privado.es_admin_verificado()));
alter policy "admin edita motos" on public.motos using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));
alter policy "admin borra motos" on public.motos using ((select privado.es_admin_verificado()));
alter policy "admin alta cascos" on public.cascos with check ((select privado.es_admin_verificado()));
alter policy "admin edita cascos" on public.cascos using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));
alter policy "admin borra cascos" on public.cascos using ((select privado.es_admin_verificado()));
alter policy "admin alta promociones" on public.promociones with check ((select privado.es_admin_verificado()));
alter policy "admin edita promociones" on public.promociones using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));
alter policy "admin borra promociones" on public.promociones using ((select privado.es_admin_verificado()));
alter policy "admin edita sitio" on public.sitio using ((select privado.es_admin_verificado())) with check ((select privado.es_admin_verificado()));
alter policy "admin lee auditoria" on public.auditoria using ((select privado.es_admin_verificado()));

alter policy "admin sube fotos" on storage.objects
  with check (bucket_id = 'motos' and (select privado.es_admin_verificado()));
alter policy "admin actualiza fotos" on storage.objects
  using (bucket_id = 'motos' and (select privado.es_admin_verificado()))
  with check (bucket_id = 'motos' and (select privado.es_admin_verificado()));
alter policy "admin borra fotos" on storage.objects
  using (bucket_id = 'motos' and (select privado.es_admin_verificado()));

-- 4) Perfil para el panel: función INVOKER (solo devuelve datos de la propia sesión)
create or replace function public.mi_perfil()
returns json language sql stable security invoker set search_path = ''
as $$
  select json_build_object(
    'es_admin', privado.es_admin(),
    'aal', coalesce((select auth.jwt() ->> 'aal'), 'aal1'),
    'email', (select auth.jwt() ->> 'email')
  );
$$;
revoke all on function public.mi_perfil() from public, anon;
grant execute on function public.mi_perfil() to authenticated;

-- 5) Las funciones viejas de public dejan de poder llamarse desde la API
revoke all on function public.es_admin() from public, anon, authenticated;
revoke all on function public.es_admin_verificado() from public, anon, authenticated;
