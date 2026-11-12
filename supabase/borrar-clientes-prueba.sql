-- Borra los clientes de PRUEBA (los que terminan en "(prueba)") con sus planes y cuotas.
-- Supabase → SQL Editor → pegar → Run. La Actividad conserva el registro.
delete from public.planes where cliente_id in (select id from public.clientes where nombre like '%(prueba)');
delete from public.clientes where nombre like '%(prueba)';
