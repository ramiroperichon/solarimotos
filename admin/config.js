/* Panel de administración · configuración pública
   La clave "publishable" es pública por diseño: lo que permite hacer lo
   deciden las políticas RLS de la base de datos (y el doble factor).
   NUNCA poner acá la clave "service_role" / "secret". */
window.SOLARI_ADMIN = {
  supabaseUrl: 'https://fscriiqeyobkvujlgmjw.supabase.co',
  supabaseClave: 'sb_publishable_6gJyEjk2cKZdei8kNKrsKQ_rg6HcsFH',
  // Sitio público (para ver las fotos que están en el repositorio y el botón "Ver web")
  sitioPublico: 'https://ramiroperichon.github.io/solarimotos/',
  bucket: 'motos',
  inactividadMin: 15,
  sesionMaxHoras: 8
};
