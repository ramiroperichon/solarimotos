-- =====================================================================
-- Solari Motos · 003 · Permitir al admin listar/borrar fotos (APLICADA)
-- Storage necesita permiso SELECT sobre storage.objects para poder
-- borrar archivos y listar carpetas. La lectura pública de las fotos no
-- cambia: se sirve por la URL pública del bucket.
-- =====================================================================
create policy "admin lista fotos" on storage.objects for select to authenticated
  using (bucket_id = 'motos' and (select privado.es_admin_verificado()));
