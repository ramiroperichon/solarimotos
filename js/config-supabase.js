/* ==========================================================================
   SOLARI MOTOS — Conexión pública con Supabase
   La clave "publishable" está pensada para usarse en el navegador: solo
   permite lo que autorizan las políticas RLS de la base (leer lo publicado).
   NUNCA poner acá la clave "service_role" / "secret".
   ========================================================================== */
window.SOLARI_SUPABASE = {
  url: 'https://fscriiqeyobkvujlgmjw.supabase.co',
  clave: 'sb_publishable_6gJyEjk2cKZdei8kNKrsKQ_rg6HcsFH',
  // Dirección del panel de administración (subdominio)
  panel: 'https://admin.solarimotos.com.ar/'
};
