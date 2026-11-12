/* ==========================================================================
   SOLARI MOTOS — Panel de administración
   Seguridad:
   · Contraseñas: las gestiona Supabase Auth (bcrypt con sal por usuario).
     Este código nunca guarda ni registra contraseñas.
   · Doble factor TOTP obligatorio: sin él la base rechaza toda escritura (RLS AAL2).
   · Flujo PKCE, cierre por inactividad y vida máxima de sesión.
   · Freno a intentos fallidos con espera creciente.
   · Todo texto se escapa antes de mostrarse (sin inyección de HTML).
   ========================================================================== */

(function () {
  'use strict';

  // Anti-clickjacking: el panel nunca se muestra dentro de otra página
  if (window.top !== window.self) {
    document.documentElement.textContent = '';
    try { window.top.location.replace(window.self.location.href); } catch (e) { /* bloqueado */ }
    return;
  }
  document.documentElement.classList.add('ok-frame');

  const C = window.SOLARI_ADMIN;
  if (!window.supabase || !C) { document.body.textContent = 'No se pudo cargar el panel.'; return; }

  const KEY = 'solari-admin';
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseClave, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: KEY }
  });

  /* ---------- Utilidades ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmt = (n) => (n == null || n === '' ? 'Consultar precio' : money.format(Number(n)));
  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const STATUS = { disponible: 'Disponible', ultima: 'Última unidad', pedido: 'A pedido', reservada: 'Reservada', consultar: 'Consultar stock' };
  const sitioBase = location.pathname.includes('/admin/') ? new URL('../', location.href).href : C.sitioPublico;
  const imgSrc = (x) => (x && typeof x === 'object' ? x.src : x) || '';
  const resolver = (src) => (!src ? '' : /^(https?:|blob:|data:)/.test(src) ? src : sitioBase + src.replace(/^\//, ''));
  const urlSegura = (u) => /^(https:\/\/|assets\/)/.test(u);

  function toast(msg, error = false) {
    const t = $('[data-toast]');
    t.textContent = msg;
    t.classList.toggle('is-error', error);
    t.classList.add('is-on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('is-on'), 3200);
  }
  const loading = (on) => $('[data-loading]').classList.toggle('is-on', on);

  /* Mensajes claros para errores comunes, sin exponer detalles internos */
  function explicar(err) {
    const m = String((err && (err.message || err.error_description)) || err || '');
    if (/row-level security|permission denied|42501/i.test(m)) return 'Sin permiso para esta acción. Volvé a entrar con el código del autenticador.';
    if (/duplicate key|23505/i.test(m)) return 'Ya existe un registro con ese identificador.';
    if (/check constraint|23514/i.test(m)) return 'Algún dato no es válido (revisá largos, números y valores).';
    if (/JWT|expired/i.test(m)) return 'La sesión venció. Iniciá sesión de nuevo.';
    if (/network|fetch/i.test(m)) return 'Sin conexión con el servidor. Probá de nuevo.';
    return 'No se pudo completar la acción.';
  }

  /* ======================================================================
     ACCESO
     ====================================================================== */
  const views = { auth: $('[data-view="auth"]'), app: $('[data-view="app"]') };
  const showView = (v) => { views.auth.hidden = v !== 'auth'; views.app.hidden = v !== 'app'; };

  function step(name, msg = '', ok = false) {
    showView('auth');
    $$('[data-step]').forEach((f) => { f.hidden = f.dataset.step !== name; });
    const f = $(`[data-step="${name}"]`);
    const m = $('[data-msg]', f);
    m.textContent = msg;
    m.classList.toggle('is-ok', ok);
    const first = $('input', f);
    if (first) setTimeout(() => first.focus(), 50);
  }

  $$('[data-go]').forEach((b) => b.addEventListener('click', () => step(b.dataset.go)));
  $$('[data-toggle-pass]').forEach((b) => b.addEventListener('click', () => {
    const i = b.previousElementSibling;
    const show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.textContent = show ? 'Ocultar' : 'Ver';
  }));

  /* Fuerza de contraseña */
  const COMUNES = ['123456789012', 'contraseña123', 'password1234', 'qwertyuiop12', 'solarimotos1', 'solari12345', 'motos1234567', 'administrador'];
  function reglas(p, email = '') {
    const r = {
      len: p.length >= 12,
      upper: /[A-ZÁÉÍÓÚÑ]/.test(p),
      lower: /[a-záéíóúñ]/.test(p),
      digit: /\d/.test(p),
      symbol: /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(p)
    };
    const base = p.toLowerCase();
    const debil = COMUNES.some((c) => base.includes(c)) || (email && base.includes(email.split('@')[0].toLowerCase())) || /(.)\1{3,}/.test(p);
    const puntos = Object.values(r).filter(Boolean).length + (p.length >= 16 ? 1 : 0) - (debil ? 3 : 0);
    return { r, ok: Object.values(r).every(Boolean) && !debil, puntos, debil };
  }
  $$('[data-strength-input]').forEach((inp) => inp.addEventListener('input', () => {
    const form = inp.closest('form');
    const email = ($('input[type="email"]', form) || {}).value || '';
    const { r, puntos } = reglas(inp.value, email);
    const bar = $('[data-strength] span', form);
    const pct = Math.max(0, Math.min(100, (puntos / 6) * 100));
    bar.style.width = `${pct}%`;
    bar.style.background = pct >= 99 ? 'var(--ok)' : pct >= 66 ? 'var(--warn)' : 'var(--danger)';
    $$('[data-rule]', form).forEach((li) => li.classList.toggle('ok', !!r[li.dataset.rule]));
  }));

  /* Freno a intentos fallidos (además de los límites del servidor) */
  const FAILS = `${KEY}:intentos`;
  const leerFallos = () => { try { return JSON.parse(localStorage.getItem(FAILS)) || { n: 0, hasta: 0 }; } catch (e) { return { n: 0, hasta: 0 }; } };
  const fallo = () => {
    const f = leerFallos();
    f.n += 1;
    if (f.n >= 5) f.hasta = Date.now() + Math.min(15 * 60, 30 * 2 ** (f.n - 5)) * 1000;
    localStorage.setItem(FAILS, JSON.stringify(f));
  };
  const limpiarFallos = () => localStorage.removeItem(FAILS);

  /* Paso 1: email y contraseña */
  $('[data-step="login"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const m = $('[data-msg]', f);
    const espera = leerFallos().hasta - Date.now();
    if (espera > 0) { m.textContent = `Demasiados intentos. Esperá ${Math.ceil(espera / 1000)} segundos.`; return; }
    const email = f.email.value.trim().toLowerCase();
    const password = f.password.value;
    if (!email || !password) { m.textContent = 'Completá email y contraseña.'; return; }
    const btn = $('button[type="submit"]', f);
    btn.disabled = true;
    loading(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    loading(false);
    btn.disabled = false;
    f.password.value = '';
    if (error) {
      fallo();
      // Mensaje genérico: no revela si el email existe
      m.textContent = /confirm/i.test(error.message) ? 'Primero confirmá tu email con el link que te enviamos.' : 'Email o contraseña incorrectos.';
      return;
    }
    limpiarFallos();
    localStorage.setItem(`${KEY}:inicio`, String(Date.now()));
    segundoFactor();
  });

  /* Alta de cuenta */
  $('[data-step="signup"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const m = $('[data-msg]', f);
    const email = f.email.value.trim().toLowerCase();
    const { ok, debil } = reglas(f.password.value, email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { m.textContent = 'Revisá el email.'; return; }
    if (!ok) { m.textContent = debil ? 'La contraseña es muy fácil de adivinar.' : 'La contraseña no cumple todos los requisitos.'; return; }
    if (f.password.value !== f.password2.value) { m.textContent = 'Las contraseñas no coinciden.'; return; }
    loading(true);
    await sb.auth.signUp({ email, password: f.password.value, options: { emailRedirectTo: location.origin + location.pathname } });
    loading(false);
    f.reset();
    // Respuesta idéntica exista o no la autorización (no se revela la lista)
    step('login', 'Si el email está autorizado, te llegó un link para confirmar la cuenta. Abrilo y después iniciá sesión.', true);
  });

  /* Recuperar contraseña */
  $('[data-step="forgot"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const email = f.email.value.trim().toLowerCase();
    if (!email) return;
    loading(true);
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    loading(false);
    step('login', 'Si el email tiene cuenta, te llegó un link para crear una contraseña nueva.', true);
  });

  $('[data-step="newpass"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const m = $('[data-msg]', f);
    const { ok } = reglas(f.password.value);
    if (!ok) { m.textContent = 'La contraseña no cumple todos los requisitos (12+ caracteres, mayúscula, minúscula, número y símbolo).'; return; }
    if (f.password.value !== f.password2.value) { m.textContent = 'Las contraseñas no coinciden.'; return; }
    loading(true);
    const { error } = await sb.auth.updateUser({ password: f.password.value });
    loading(false);
    f.reset();
    if (error) { m.textContent = 'No se pudo cambiar. Pedí un link nuevo.'; return; }
    await salir('Contraseña actualizada. Iniciá sesión con la nueva.', true);
  });

  /* Paso 2: doble factor */
  let factorId = null;

  async function segundoFactor() {
    loading(true);
    const perfil = await sb.rpc('mi_perfil');
    if (perfil.error || !perfil.data || !perfil.data.es_admin) {
      loading(false);
      await salir('Esta cuenta no tiene permisos de administración.');
      return;
    }
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel === 'aal2') { loading(false); entrar(perfil.data); return; }
    const { data: factores } = await sb.auth.mfa.listFactors();
    loading(false);
    const verificado = factores && factores.totp && factores.totp.find((x) => x.status === 'verified');
    if (verificado) { factorId = verificado.id; step('mfa'); return; }
    enrolar(factores);
  }

  async function enrolar(factores) {
    loading(true);
    // Elimina intentos de alta anteriores sin terminar
    const pendientes = ((factores && factores.all) || []).filter((x) => x.status !== 'verified');
    for (const p of pendientes) await sb.auth.mfa.unenroll({ factorId: p.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Solari ${new Date().toISOString().slice(0, 10)}` });
    loading(false);
    if (error) { step('login', 'No se pudo iniciar el doble factor. Probá de nuevo.'); return; }
    factorId = data.id;
    $('[data-qr]').src = data.totp.qr_code;
    $('[data-secret]').textContent = data.totp.secret;
    step('enroll');
  }

  async function verificarCodigo(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const m = $('[data-msg]', f);
    const code = f.code.value.replace(/\D/g, '');
    if (code.length !== 6) { m.textContent = 'El código tiene 6 dígitos.'; return; }
    const espera = leerFallos().hasta - Date.now();
    if (espera > 0) { m.textContent = `Demasiados intentos. Esperá ${Math.ceil(espera / 1000)} segundos.`; return; }
    loading(true);
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    loading(false);
    f.code.value = '';
    if (error) { fallo(); m.textContent = 'Código incorrecto o vencido. Probá con el siguiente.'; return; }
    limpiarFallos();
    const perfil = await sb.rpc('mi_perfil');
    entrar(perfil.data || {});
  }
  $('[data-step="enroll"]').addEventListener('submit', verificarCodigo);
  $('[data-step="mfa"]').addEventListener('submit', verificarCodigo);

  /* Salir */
  async function salir(msg = '', ok = false) {
    clearTimeout(inactividad);
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* sin conexión */ }
    Object.keys(localStorage).filter((k) => k.startsWith(KEY) && !k.endsWith(':intentos')).forEach((k) => localStorage.removeItem(k));
    $('[data-content]').innerHTML = '';
    cerrarEditor();
    step('login', msg, ok);
  }
  $$('[data-logout]').forEach((b) => b.addEventListener('click', () => salir('Sesión cerrada.', true)));

  /* Cierre por inactividad y vida máxima de la sesión */
  let inactividad = 0;
  function reiniciarInactividad() {
    clearTimeout(inactividad);
    inactividad = setTimeout(() => salir('Se cerró la sesión por inactividad.'), C.inactividadMin * 60 * 1000);
  }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { if (!views.app.hidden) reiniciarInactividad(); }, { passive: true }));
  setInterval(() => {
    const inicio = Number(localStorage.getItem(`${KEY}:inicio`) || 0);
    if (!views.app.hidden && inicio && Date.now() - inicio > C.sesionMaxHoras * 3600 * 1000) salir('La sesión venció. Iniciá sesión de nuevo.');
  }, 60000);

  let recuperando = false;
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'PASSWORD_RECOVERY') { recuperando = true; step('newpass'); }
    if (evento === 'SIGNED_OUT' && !views.app.hidden) step('login', 'La sesión terminó.');
  });

  /* ======================================================================
     PANEL
     ====================================================================== */
  let tab = 'clientes';
  let modClientes = null;
  const clientes = () => (modClientes = modClientes || window.SolariModulos.clientes({ sb, $, $$, esc, toast, loading, explicar, abrirEditor, cerrarEditor, campo, area, selector, boton, leerForm }));
  function entrar(perfil) {
    showView('app');
    $('[data-user]').textContent = perfil.email || '';
    $('[data-site-link]').href = sitioBase;
    reiniciarInactividad();
    abrir(tab);
    if (tab !== 'clientes') clientes().precargar();
  }

  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.tab)));
  function abrir(t) {
    tab = t;
    $$('[data-tab]').forEach((b) => (b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    if (t !== 'clientes') document.body.classList.remove('con-bulk');
    ({ clientes: () => clientes().ver(), motos: verMotos, cascos: verCascos, promos: verPromos, sitio: verSitio, actividad: verActividad })[t]();
  }

  async function traer(tabla) {
    loading(true);
    const { data, error } = await sb.from(tabla).select('*').order('orden', { ascending: true }).order('id', { ascending: true });
    loading(false);
    if (error) { toast(explicar(error), true); return []; }
    return data;
  }

  /* ---------- Listado genérico ---------- */
  function listado({ titulo, filas, nuevo, item }) {
    const c = $('[data-content]');
    c.innerHTML = `
      <div class="head"><h1>${esc(titulo)} <span class="badge">${filas.length}</span></h1>
        <button class="btn btn--primary btn--sm" type="button" data-new>+ Agregar</button></div>
      ${filas.length > 6 ? '<input class="search" type="search" placeholder="Buscar…" data-search aria-label="Buscar">' : ''}
      <div class="list" data-list>${filas.map(item).join('')}</div>`;
    $('[data-new]', c).addEventListener('click', nuevo);
    const s = $('[data-search]', c);
    if (s) s.addEventListener('input', () => {
      const q = s.value.toLowerCase();
      $$('[data-row]', c).forEach((r) => { r.hidden = !r.dataset.row.includes(q); });
    });
  }

  /* ======================== MOTOS ======================== */
  async function verMotos() {
    const motos = await traer('motos');
    verMotos.cache = motos;
    listado({
      titulo: 'Motos',
      filas: motos,
      nuevo: () => editarMoto(null),
      item: (m) => `
        <article class="item" data-row="${esc(`${m.marca} ${m.modelo}`.toLowerCase())}">
          <img class="item__img" src="${esc(resolver(imgSrc(m.imagenes[0])))}" alt="" loading="lazy">
          <div>
            <div class="item__title">${esc(m.marca)} ${esc(m.modelo)}</div>
            <div class="item__meta">${esc(m.cilindrada)} cc · ${esc(fmt(m.precio))} · ${esc(STATUS[m.disponibilidad] || m.disponibilidad)}</div>
            <span class="badge ${m.publicado ? 'badge--ok' : 'badge--off'}">${m.publicado ? 'Publicada' : 'Oculta'}</span>
            ${m.vista360 ? '<span class="badge">360°</span>' : ''}
          </div>
          <div class="item__actions">
            <button class="btn btn--dark btn--sm" type="button" data-edit="${esc(m.id)}">Editar</button>
            <button class="btn btn--ghost btn--sm" type="button" data-pub="${esc(m.id)}">${m.publicado ? 'Ocultar' : 'Publicar'}</button>
          </div>
        </article>`
    });
    const c = $('[data-content]');
    $$('[data-edit]', c).forEach((b) => b.addEventListener('click', () => editarMoto(motos.find((x) => x.id === b.dataset.edit))));
    $$('[data-pub]', c).forEach((b) => b.addEventListener('click', async () => {
      const m = motos.find((x) => x.id === b.dataset.pub);
      await guardar('motos', { publicado: !m.publicado }, m.id, m.publicado ? 'Moto oculta de la web.' : 'Moto publicada.');
      verMotos();
    }));
  }

  function editarMoto(m) {
    const nueva = !m;
    const d = m || { id: '', marca: '', modelo: '', categoria: 'Calle', cilindrada: 110, anio: new Date().getFullYear(), precio: null, disponibilidad: 'disponible', etiqueta: '', resumen: '', financiacion: 'Con alternativas de financiación', ficha: { Motor: [['Cilindrada', '']] }, imagenes: [], vista360: null, publicado: true, orden: ((verMotos.cache || []).length + 1) * 10 };
    const st = { imagenes: JSON.parse(JSON.stringify(d.imagenes || [])), ficha: Array.isArray(d.ficha) ? { Ficha: d.ficha } : JSON.parse(JSON.stringify(d.ficha || {})), vista360: d.vista360 ? { ...d.vista360 } : null };

    abrirEditor(nueva ? 'Nueva moto' : `${d.marca} ${d.modelo}`, `
      <form data-form novalidate>
        <div class="grid2">
          ${campo('Marca', 'marca', d.marca, { req: 1, max: 60 })}
          ${campo('Modelo', 'modelo', d.modelo, { req: 1, max: 80 })}
          ${campo('Identificador (para la dirección web)', 'id', d.id, { req: 1, max: 80, ro: !nueva, hint: 'Solo minúsculas, números y guiones. No se puede cambiar después.' })}
          ${campo('Categoría', 'categoria', d.categoria, { req: 1, max: 40, list: 'cats' })}
          ${campo('Cilindrada (cc)', 'cilindrada', d.cilindrada, { type: 'number', min: 49, maxn: 2000, req: 1 })}
          ${campo('Año', 'anio', d.anio, { type: 'number', min: 2000, maxn: 2100, req: 1 })}
          ${campo('Precio de contado (vacío = "Consultar precio")', 'precio', d.precio == null ? '' : Math.round(d.precio), { type: 'number', min: 1 })}
          ${selector('Disponibilidad', 'disponibilidad', d.disponibilidad, STATUS)}
          ${campo('Etiqueta corta (opcional)', 'etiqueta', d.etiqueta, { max: 40 })}
          ${campo('Orden en el catálogo (menor = primero)', 'orden', d.orden, { type: 'number' })}
        </div>
        ${area('Resumen', 'resumen', d.resumen, 600)}
        ${campo('Texto de financiación', 'financiacion', d.financiacion, { max: 200 })}
        <label class="field check"><input type="checkbox" name="publicado" ${d.publicado ? 'checked' : ''}> Publicada en la web</label>
        <datalist id="cats"><option>Calle</option><option>Trail</option><option>Naked</option><option>Scooter</option><option>Sport</option><option>Custom</option></datalist>

        <fieldset><legend>Fotos</legend>
          <p class="hint">La primera es la principal. "Estudio" muestra la foto entera sobre blanco; "Ambiente" la recorta para llenar el espacio.</p>
          <div class="imgs" data-imgs></div>
          <label class="upload">Subir fotos (se optimizan solas)<input type="file" accept="image/*" multiple data-up></label>
        </fieldset>

        <fieldset><legend>Ficha técnica</legend><div data-ficha></div>
          <button class="btn btn--ghost btn--sm" type="button" data-add-group>+ Agregar sección</button>
        </fieldset>

        <fieldset><legend>Vista 360°</legend>
          <p class="hint">Opcional. Se arma con la herramienta "armar-360" y se suben los dos archivos que genera.</p>
          <div data-v360></div>
        </fieldset>
      </form>`,
    [
      !nueva && boton('Eliminar', 'btn--danger', async () => {
        const conf = window.prompt(`Para eliminar escribí el modelo exacto: ${d.modelo}`);
        if (conf !== d.modelo) { toast('No se eliminó.'); return; }
        loading(true);
        const { error } = await sb.from('motos').delete().eq('id', d.id);
        if (!error) await borrarCarpeta(`motos/${d.id}`);
        loading(false);
        if (error) { toast(explicar(error), true); return; }
        toast('Moto eliminada.');
        cerrarEditor();
        verMotos();
      }),
      boton('Guardar', 'btn--primary', async () => {
        const f = $('[data-form]');
        const v = leerForm(f);
        if (nueva) v.id = slug(v.id || `${v.marca}-${v.modelo}`);
        const err = validarMoto(v, st);
        if (err) { toast(err, true); return; }
        const fila = {
          marca: v.marca, modelo: v.modelo, categoria: v.categoria,
          cilindrada: Number(v.cilindrada), anio: Number(v.anio),
          precio: v.precio === '' ? null : Number(v.precio),
          disponibilidad: v.disponibilidad, etiqueta: v.etiqueta, resumen: v.resumen,
          financiacion: v.financiacion, orden: Number(v.orden) || 0, publicado: !!v.publicado,
          ficha: fichaLimpia(st.ficha), imagenes: st.imagenes, vista360: st.vista360
        };
        const ok = nueva ? await insertar('motos', { id: v.id, ...fila }) : await guardar('motos', fila, d.id, 'Cambios guardados.');
        if (ok) { cerrarEditor(); verMotos(); }
      })
    ]);

    const f = $('[data-form]');
    if (nueva) {
      const sync = () => { if (!f.id.dataset.touched) f.id.value = slug(`${f.marca.value}-${f.modelo.value}`); };
      f.marca.addEventListener('input', sync);
      f.modelo.addEventListener('input', sync);
      f.id.addEventListener('input', () => { f.id.dataset.touched = '1'; });
    }
    const carpeta = () => slug(f.id.value || `${f.marca.value}-${f.modelo.value}`) || 'sin-id';
    editorImagenes($('[data-imgs]'), $('[data-up]'), st, () => `motos/${carpeta()}`);
    editorFicha($('[data-ficha]'), st);
    $('[data-add-group]').addEventListener('click', () => {
      const n = window.prompt('Nombre de la sección (ej.: Motor, Frenos, Dimensiones)');
      if (n && n.trim()) { st.ficha[n.trim().slice(0, 40)] = [['', '']]; editorFicha($('[data-ficha]'), st); }
    });
    editor360($('[data-v360]'), st, () => `motos/${carpeta()}`);
  }

  function validarMoto(v, st) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.id || '')) return 'El identificador no es válido.';
    if (!v.marca || !v.modelo || !v.categoria) return 'Completá marca, modelo y categoría.';
    const cc = Number(v.cilindrada);
    if (!(cc >= 49 && cc <= 2000)) return 'La cilindrada debe estar entre 49 y 2000 cc.';
    const an = Number(v.anio);
    if (!(an >= 2000 && an <= 2100)) return 'Revisá el año.';
    if (v.precio !== '' && !(Number(v.precio) > 0)) return 'El precio debe ser mayor a 0 o quedar vacío.';
    if (st.imagenes.some((x) => !urlSegura(imgSrc(x)))) return 'Hay una foto con una dirección no permitida.';
    if (!st.imagenes.length) return 'Agregá al menos una foto.';
    return '';
  }

  /* ======================== CASCOS ======================== */
  async function verCascos() {
    const filas = await traer('cascos');
    listado({
      titulo: 'Cascos', filas, nuevo: () => editarSimple('cascos', null, filas),
      item: (x) => `
        <article class="item" data-row="${esc(x.nombre.toLowerCase())}">
          <img class="item__img" src="${esc(resolver(imgSrc(x.imagenes[0])) || resolver('assets/images/casco-placeholder.svg'))}" alt="" loading="lazy">
          <div><div class="item__title">${esc(x.nombre)}</div>
            <div class="item__meta">${esc(x.tipo)} · Talles ${esc(x.talles)} · ${esc(fmt(x.precio))}</div>
            <span class="badge ${x.publicado ? 'badge--ok' : 'badge--off'}">${x.publicado ? 'Publicado' : 'Oculto'}</span></div>
          <div class="item__actions"><button class="btn btn--dark btn--sm" type="button" data-edit="${esc(x.id)}">Editar</button></div>
        </article>`
    });
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editarSimple('cascos', filas.find((x) => x.id === b.dataset.edit), filas)));
  }

  /* ======================== PROMOCIONES ======================== */
  async function verPromos() {
    const filas = await traer('promociones');
    listado({
      titulo: 'Promociones', filas, nuevo: () => editarSimple('promociones', null, filas),
      item: (x) => `
        <article class="item" data-row="${esc(x.titulo.toLowerCase())}">
          <div class="item__img"></div>
          <div><div class="item__title">${esc(x.titulo)}</div>
            <div class="item__meta">${esc(x.vigencia)}</div>
            <span class="badge ${x.publicado ? 'badge--ok' : 'badge--off'}">${x.publicado ? 'Publicada' : 'Oculta'}</span>
            ${x.demo ? '<span class="badge">Ejemplo</span>' : ''}</div>
          <div class="item__actions"><button class="btn btn--dark btn--sm" type="button" data-edit="${esc(x.id)}">Editar</button></div>
        </article>`
    });
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editarSimple('promociones', filas.find((x) => x.id === b.dataset.edit), filas)));
  }

  /* Editor para cascos y promociones */
  function editarSimple(tabla, x, filas) {
    const nuevo = !x;
    const esCasco = tabla === 'cascos';
    const d = x || (esCasco
      ? { id: '', tipo: 'Integral', nombre: '', talles: 'S · M · L · XL', precio: null, disponibilidad: 'disponible', detalle: '', imagenes: [], publicado: true, orden: (filas.length + 1) * 10 }
      : { id: '', titulo: '', texto: '', vigencia: '', demo: false, publicado: true, orden: (filas.length + 1) * 10 });
    const st = { imagenes: JSON.parse(JSON.stringify(d.imagenes || [])) };
    abrirEditor(nuevo ? (esCasco ? 'Nuevo casco' : 'Nueva promoción') : (d.nombre || d.titulo), `
      <form data-form novalidate>
        ${esCasco ? `
          <div class="grid2">
            ${campo('Nombre', 'nombre', d.nombre, { req: 1, max: 80 })}
            ${campo('Tipo', 'tipo', d.tipo, { req: 1, max: 40 })}
            ${campo('Talles', 'talles', d.talles, { max: 60 })}
            ${campo('Precio (vacío = "Consultar precio")', 'precio', d.precio == null ? '' : Math.round(d.precio), { type: 'number', min: 1 })}
            ${selector('Disponibilidad', 'disponibilidad', d.disponibilidad, STATUS)}
            ${campo('Orden', 'orden', d.orden, { type: 'number' })}
          </div>
          ${area('Detalle', 'detalle', d.detalle, 400)}
          <fieldset><legend>Fotos</legend><div class="imgs" data-imgs></div>
            <label class="upload">Subir fotos<input type="file" accept="image/*" multiple data-up></label></fieldset>` : `
          ${campo('Título', 'titulo', d.titulo, { req: 1, max: 80 })}
          ${area('Texto', 'texto', d.texto, 300)}
          <div class="grid2">${campo('Vigencia', 'vigencia', d.vigencia, { max: 80 })}${campo('Orden', 'orden', d.orden, { type: 'number' })}</div>
          <label class="field check"><input type="checkbox" name="demo" ${d.demo ? 'checked' : ''}> Mostrar como "Ejemplo"</label>`}
        <label class="field check"><input type="checkbox" name="publicado" ${d.publicado ? 'checked' : ''}> Publicado en la web</label>
      </form>`,
    [
      !nuevo && boton('Eliminar', 'btn--danger', async () => {
        if (!window.confirm('¿Eliminar definitivamente?')) return;
        loading(true);
        const { error } = await sb.from(tabla).delete().eq('id', d.id);
        loading(false);
        if (error) { toast(explicar(error), true); return; }
        toast('Eliminado.');
        cerrarEditor();
        abrir(tab);
      }),
      boton('Guardar', 'btn--primary', async () => {
        const v = leerForm($('[data-form]'));
        const nombre = esCasco ? v.nombre : v.titulo;
        if (!nombre) { toast('Completá el nombre o título.', true); return; }
        if (esCasco && v.precio !== '' && !(Number(v.precio) > 0)) { toast('Revisá el precio.', true); return; }
        const fila = esCasco
          ? { nombre: v.nombre, tipo: v.tipo || 'Integral', talles: v.talles, precio: v.precio === '' ? null : Number(v.precio), disponibilidad: v.disponibilidad, detalle: v.detalle, imagenes: st.imagenes, orden: Number(v.orden) || 0, publicado: !!v.publicado }
          : { titulo: v.titulo, texto: v.texto, vigencia: v.vigencia, demo: !!v.demo, orden: Number(v.orden) || 0, publicado: !!v.publicado };
        const ok = nuevo ? await insertar(tabla, { id: slug(nombre) || `item-${Date.now()}`, ...fila }) : await guardar(tabla, fila, d.id, 'Cambios guardados.');
        if (ok) { cerrarEditor(); abrir(tab); }
      })
    ]);
    if (esCasco) editorImagenes($('[data-imgs]'), $('[data-up]'), st, () => `cascos/${slug($('[data-form]').nombre.value) || 'casco'}`);
  }

  /* ======================== DATOS DEL LOCAL ======================== */
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  async function verSitio() {
    loading(true);
    const { data, error } = await sb.from('sitio').select('config,financiacion').eq('id', 1).single();
    loading(false);
    if (error) { toast(explicar(error), true); return; }
    const cfg = data.config || {};
    const fin = data.financiacion || {};
    const h = cfg.horarios || {};
    const rango = (dia, i) => ((h[dia] || [])[i] || ['', '']);
    const c = $('[data-content]');
    c.innerHTML = `
      <div class="head"><h1>Datos del local</h1></div>
      <form data-form novalidate class="grid-form">
        <fieldset><legend>Contacto</legend><div class="grid2">
          ${campo('WhatsApp (solo números, con 549)', 'whatsapp', cfg.whatsapp, { req: 1, max: 20, hint: 'Ej.: 5493773450740' })}
          ${campo('WhatsApp como se muestra', 'whatsappVisible', cfg.whatsappVisible, { max: 30 })}
          ${campo('Teléfono', 'telefono', cfg.telefono, { max: 30 })}
          ${campo('Dirección', 'direccion', cfg.direccion, { max: 120 })}
          ${campo('Localidad', 'localidad', cfg.localidad, { max: 60 })}
          ${campo('Provincia', 'provincia', cfg.provincia, { max: 60 })}
          ${campo('Búsqueda para el mapa', 'mapaQuery', cfg.mapaQuery, { max: 160 })}
          ${campo('Mensaje inicial de WhatsApp', 'mensajeWhatsApp', cfg.mensajeWhatsApp, { max: 200 })}
          ${campo('Instagram (dirección completa)', 'instagram', (cfg.redes || {}).instagram, { max: 200 })}
          ${campo('Facebook (dirección completa)', 'facebook', (cfg.redes || {}).facebook, { max: 200 })}
        </div>
        ${campo('Marcas del local (separadas por coma)', 'marcas', (cfg.marcas || []).join(', '), { max: 300 })}
        <label class="field check"><input type="checkbox" name="demo" ${cfg.demo ? 'checked' : ''}> Mostrar precios como "Referencia"</label>
        </fieldset>

        <fieldset><legend>Horarios (para "Abierto / Cerrado ahora")</legend>
          ${DIAS.map((n, i) => `<div class="grid2"><span class="field">${n}</span><div class="ficha-row">
            <input name="h${i}a" value="${esc(rango(i, 0).join('-'))}" placeholder="08:00-12:00" aria-label="${n} mañana">
            <input name="h${i}b" value="${esc(rango(i, 1).join('-'))}" placeholder="16:30-20:30" aria-label="${n} tarde"><span></span></div></div>`).join('')}
          ${area('Texto de horarios (una línea por renglón: "Días | Horario")', 'horariosTexto', (cfg.horariosTexto || []).map((x) => `${x.texto} | ${x.horario}`).join('\n'), 400)}
        </fieldset>

        <fieldset><legend>Financiación</legend>
          ${area('Requisitos (uno por línea)', 'requisitos', (fin.requisitos || []).join('\n'), 800)}
          ${area('Medios de pago (uno por línea)', 'medios', (fin.medios || []).join('\n'), 400)}
          ${campo('Cuotas que puede elegir el cliente (separadas por coma)', 'cuotas', (fin.cuotasOpciones || []).join(', '), { max: 60 })}
          ${area('Aviso legal', 'aviso', fin.aviso, 400)}
          <div data-alts></div>
        </fieldset>
        <button class="btn btn--primary" type="submit">Guardar datos del local</button>
      </form>`;

    const alts = JSON.parse(JSON.stringify(fin.alternativas || []));
    const pintarAlts = () => {
      const el = $('[data-alts]');
      el.innerHTML = alts.map((a, i) => `
        <div class="ficha-group" data-alt="${i}">
          <div class="grid2">
            <input class="ficha-group__name" data-k="titulo" value="${esc(a.titulo)}" placeholder="Título" maxlength="60">
            <input class="ficha-group__name" data-k="bajada" value="${esc(a.bajada)}" placeholder="Bajada" maxlength="60">
          </div>
          <textarea class="ficha-group__name" data-k="texto" rows="2" maxlength="300" placeholder="Texto">${esc(a.texto)}</textarea>
          <input class="ficha-group__name" data-k="consulta" value="${esc(a.consulta)}" placeholder="Mensaje de WhatsApp" maxlength="200">
          <button class="mini" type="button" data-del-alt="${i}">Quitar alternativa</button>
        </div>`).join('') + '<button class="btn btn--ghost btn--sm" type="button" data-add-alt>+ Agregar alternativa</button>';
      $$('[data-alt] [data-k]', el).forEach((inp) => inp.addEventListener('input', () => { alts[inp.closest('[data-alt]').dataset.alt][inp.dataset.k] = inp.value; }));
      $$('[data-del-alt]', el).forEach((b) => b.addEventListener('click', () => { alts.splice(Number(b.dataset.delAlt), 1); pintarAlts(); }));
      $('[data-add-alt]', el).addEventListener('click', () => { alts.push({ titulo: '', bajada: '', texto: '', consulta: '' }); pintarAlts(); });
    };
    pintarAlts();

    $('[data-form]', c).addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = leerForm(e.currentTarget);
      if (!/^\d{10,15}$/.test(v.whatsapp)) { toast('El WhatsApp debe tener solo números (10 a 15).', true); return; }
      for (const u of [v.instagram, v.facebook]) if (u && !/^https:\/\//.test(u)) { toast('Las redes deben empezar con https://', true); return; }
      const horarios = {};
      for (let i = 0; i < 7; i++) {
        horarios[i] = [];
        for (const k of ['a', 'b']) {
          const t = (v[`h${i}${k}`] || '').replace(/\s/g, '');
          if (!t) continue;
          const mm = t.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
          if (!mm) { toast(`Revisá el horario del ${DIAS[i]} (formato 08:00-12:00).`, true); return; }
          horarios[i].push([`${mm[1].padStart(2, '0')}:${mm[2]}`, `${mm[3].padStart(2, '0')}:${mm[4]}`]);
        }
      }
      const lineas = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
      const horariosTexto = lineas(v.horariosTexto).map((l) => {
        const [texto, horario = ''] = l.split('|').map((x) => x.trim());
        const t = texto.toLowerCase();
        const dias = t.includes('domingo') ? [0] : t.includes('sábado') && !t.includes(' a ') ? [6] : t.includes('lunes a sábado') ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
        return { dias, texto, horario };
      });
      const config = {
        ...cfg,
        whatsapp: v.whatsapp, whatsappVisible: v.whatsappVisible, telefono: v.telefono, direccion: v.direccion,
        localidad: v.localidad, provincia: v.provincia, mapaQuery: v.mapaQuery, mensajeWhatsApp: v.mensajeWhatsApp,
        redes: { instagram: v.instagram, facebook: v.facebook },
        marcas: v.marcas.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20),
        demo: !!v.demo, horarios, horariosTexto
      };
      const financiacion = {
        ...fin,
        requisitos: lineas(v.requisitos), medios: lineas(v.medios),
        cuotasOpciones: v.cuotas.split(',').map((x) => Number(x.trim())).filter((n) => n > 0 && n <= 120),
        aviso: v.aviso,
        alternativas: alts.filter((a) => a.titulo.trim())
      };
      loading(true);
      const { error } = await sb.from('sitio').update({ config, financiacion }).eq('id', 1);
      loading(false);
      if (error) { toast(explicar(error), true); return; }
      toast('Datos del local guardados.');
    });
  }

  /* ======================== ACTIVIDAD ======================== */
  async function verActividad() {
    loading(true);
    const { data, error } = await sb.from('auditoria').select('tabla,registro,accion,email,fecha,nombre:despues->>nombre,nombreAntes:antes->>nombre,numero:despues->>numero,vehiculo:despues->>vehiculo,pagadoAntes:antes->>pagado,pagado:despues->>pagado,avisoAntes:antes->>ultimo_aviso,aviso:despues->>ultimo_aviso').order('fecha', { ascending: false }).limit(80);
    loading(false);
    const c = $('[data-content]');
    if (error) { c.innerHTML = '<p class="hint">No se pudo leer la actividad.</p>'; return; }
    const ACC = { INSERT: 'creó', UPDATE: 'modificó', DELETE: 'eliminó' };
    const TAB = { motos: 'la moto', cascos: 'el casco', promociones: 'la promoción', sitio: 'los datos del local', clientes: 'el cliente', planes: 'el plan', cuotas: 'la cuota', cobranza: 'los mensajes de cobranza' };
    const detalle = (r) => {
      if (r.tabla === 'sitio' || r.tabla === 'cobranza') return '';
      if (r.tabla === 'clientes') return r.nombre || r.nombreAntes || '';
      if (r.tabla === 'planes') return r.vehiculo || '';
      if (r.tabla === 'cuotas') {
        if (r.aviso && r.aviso !== r.avisoAntes) return `N.º ${r.numero} (aviso por WhatsApp)`;
        if (Number(r.pagado) > Number(r.pagadoAntes)) return `N.º ${r.numero} (pago registrado)`;
        if (Number(r.pagado) < Number(r.pagadoAntes)) return `N.º ${r.numero} (pago anulado)`;
        return `N.º ${r.numero || ''}`;
      }
      return r.registro;
    };
    c.innerHTML = `<div class="head"><h1>Actividad</h1></div>
      <p class="hint">Registro automático de cambios. No se puede editar ni borrar.</p>
      <div class="log">${data.map((r) => `
        <div class="log__row"><b>${esc(r.email || 'Sistema')}</b> ${esc(ACC[r.accion] || r.accion)} ${esc(TAB[r.tabla] || r.tabla)} <b>${esc(detalle(r))}</b>
          <small>${esc(new Date(r.fecha).toLocaleString('es-AR'))}</small></div>`).join('') || '<p class="hint">Sin actividad todavía.</p>'}</div>`;
  }

  /* ======================================================================
     COMPONENTES DEL EDITOR
     ====================================================================== */
  function campo(label, name, value, o = {}) {
    return `<label class="field">${esc(label)}
      <input name="${name}" type="${o.type || 'text'}" value="${esc(value == null ? '' : value)}"
        ${o.req ? 'required' : ''} ${o.max ? `maxlength="${o.max}"` : ''} ${o.min != null ? `min="${o.min}"` : ''} ${o.maxn != null ? `max="${o.maxn}"` : ''}
        ${o.ro ? 'readonly' : ''} ${o.list ? `list="${o.list}"` : ''} ${o.type === 'number' ? 'inputmode="numeric"' : ''}>
      ${o.hint ? `<small class="hint">${esc(o.hint)}</small>` : ''}</label>`;
  }
  const area = (label, name, value, max) => `<label class="field">${esc(label)}<textarea name="${name}" maxlength="${max}">${esc(value || '')}</textarea></label>`;
  const selector = (label, name, value, ops) => `<label class="field">${esc(label)}<select name="${name}">${Object.entries(ops).map(([k, t]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const boton = (texto, clase, fn) => ({ texto, clase, fn });

  function leerForm(f) {
    const out = {};
    $$('input, select, textarea', f).forEach((el) => {
      if (!el.name) return;
      out[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return out;
  }

  /* Drawer */
  let ultimoFoco = null;
  function abrirEditor(titulo, html, botones, opts = {}) {
    ultimoFoco = document.activeElement;
    const dr = $('[data-drawer]');
    $('[data-drawer-title]').textContent = titulo;
    $('[data-drawer-body]').innerHTML = html;
    const foot = $('[data-drawer-foot]');
    foot.innerHTML = '';
    botones.filter(Boolean).forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `btn ${b.clase}`;
      el.textContent = b.texto;
      el.addEventListener('click', async () => { el.disabled = true; try { await b.fn(); } finally { el.disabled = false; } });
      foot.appendChild(el);
    });
    dr.hidden = false;
    document.body.style.overflow = 'hidden';
    if (opts.sinFoco) { $('[data-drawer-body]').scrollTop = 0; setTimeout(() => $('.drawer__panel', dr).focus(), 60); }
    else setTimeout(() => { const i = $('input:not([readonly])', dr); if (i) i.focus(); }, 60);
  }
  function cerrarEditor() {
    const dr = $('[data-drawer]');
    if (dr.hidden) return;
    dr.hidden = true;
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }
  $$('[data-close]').forEach((el) => el.addEventListener('click', cerrarEditor));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarEditor(); });

  /* Guardado */
  async function guardar(tabla, fila, id, msg) {
    loading(true);
    const { data, error } = await sb.from(tabla).update(fila).eq('id', id).select('id');
    loading(false);
    if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso para guardar. Volvé a entrar con el código.', true); return false; }
    toast(msg);
    return true;
  }
  async function insertar(tabla, fila) {
    loading(true);
    const { error } = await sb.from(tabla).insert(fila);
    loading(false);
    if (error) { toast(explicar(error), true); return false; }
    toast('Creado correctamente.');
    return true;
  }

  /* Fotos: se optimizan en el navegador (máx. 1600 px, WebP) y se suben a Storage */
  function optimizar(file, maxW = 1600) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/i.test(file.type)) { reject(new Error('tipo')); return; }
      if (file.size > 25 * 1024 * 1024) { reject(new Error('tamaño')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxW / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('codificar'))), 'image/webp', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('leer')); };
      img.src = url;
    });
  }
  const nombreArchivo = (ext = 'webp') => `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}.${ext}`;

  async function subir(carpeta, blob, ext = 'webp') {
    const path = `${carpeta}/${nombreArchivo(ext)}`;
    const { error } = await sb.storage.from(C.bucket).upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    return sb.storage.from(C.bucket).getPublicUrl(path).data.publicUrl;
  }
  async function borrarCarpeta(carpeta) {
    const { data } = await sb.storage.from(C.bucket).list(carpeta, { limit: 200 });
    if (data && data.length) await sb.storage.from(C.bucket).remove(data.map((f) => `${carpeta}/${f.name}`));
  }
  async function borrarSiEsPropia(src) {
    const marca = `/storage/v1/object/public/${C.bucket}/`;
    const i = src.indexOf(marca);
    if (i >= 0) await sb.storage.from(C.bucket).remove([decodeURIComponent(src.slice(i + marca.length))]);
  }

  function editorImagenes(cont, input, st, carpeta) {
    const pintar = () => {
      cont.innerHTML = st.imagenes.map((x, i) => {
        const estudio = x && typeof x === 'object' && x.ajuste === 'contener';
        return `<div class="imgc">
          <img src="${esc(resolver(imgSrc(x)))}" alt="Foto ${i + 1}" class="${estudio ? '' : 'cubrir'}" loading="lazy">
          <div class="imgc__tag">${i === 0 ? 'Principal · ' : ''}${estudio ? 'Estudio' : 'Ambiente'}</div>
          <div class="imgc__ctl">
            <button type="button" data-a="izq" data-i="${i}" aria-label="Mover antes">‹</button>
            <button type="button" data-a="der" data-i="${i}" aria-label="Mover después">›</button>
            <button type="button" data-a="tipo" data-i="${i}">${estudio ? 'Ambiente' : 'Estudio'}</button>
            <button type="button" data-a="quitar" data-i="${i}" aria-label="Quitar foto">✕</button>
          </div></div>`;
      }).join('') || '<p class="hint">Todavía no hay fotos.</p>';
    };
    cont.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const i = Number(b.dataset.i);
      const a = b.dataset.a;
      const L = st.imagenes;
      if (a === 'izq' && i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]];
      if (a === 'der' && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]];
      if (a === 'tipo') { const s = imgSrc(L[i]); L[i] = (L[i] && typeof L[i] === 'object') ? s : { src: s, ajuste: 'contener' }; }
      if (a === 'quitar' && window.confirm('¿Quitar esta foto?')) {
        const [x] = L.splice(i, 1);
        borrarSiEsPropia(imgSrc(x)).catch(() => {});
      }
      pintar();
    });
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      input.value = '';
      if (!files.length) return;
      loading(true);
      let ok = 0;
      for (const f of files) {
        try {
          const blob = await optimizar(f);
          const url = await subir(carpeta(), blob);
          st.imagenes.push(st.imagenes.length === 0 ? { src: url, ajuste: 'contener' } : url);
          ok += 1;
          pintar();
        } catch (err) {
          toast(err && /tipo|tamaño/.test(err.message) ? `"${f.name}" no es una imagen válida o pesa más de 25 MB.` : explicar(err), true);
        }
      }
      loading(false);
      if (ok) toast(`${ok} foto(s) subida(s). Recordá guardar.`);
    });
    pintar();
  }

  function editorFicha(cont, st) {
    const grupos = st.ficha;
    cont.innerHTML = Object.keys(grupos).map((g) => `
      <div class="ficha-group" data-g="${esc(g)}">
        <div class="ficha-row"><input class="ficha-group__name" value="${esc(g)}" data-gname maxlength="40" aria-label="Nombre de la sección"><span></span><button type="button" data-delg aria-label="Quitar sección">✕</button></div>
        ${grupos[g].map(([k, v], i) => `<div class="ficha-row">
          <input value="${esc(k)}" data-k="${i}" placeholder="Dato (ej.: Potencia)" maxlength="60" aria-label="Dato">
          <input value="${esc(v)}" data-v="${i}" placeholder="Valor (ej.: 7 HP)" maxlength="160" aria-label="Valor">
          <button type="button" data-delr="${i}" aria-label="Quitar fila">✕</button></div>`).join('')}
        <button class="mini" type="button" data-addr>+ Fila</button>
      </div>`).join('');
    $$('[data-g]', cont).forEach((box) => {
      let g = box.dataset.g;
      $('[data-gname]', box).addEventListener('change', (e) => {
        const nuevo = e.target.value.trim().slice(0, 40);
        if (!nuevo || nuevo === g || grupos[nuevo]) { e.target.value = g; return; }
        const orden = Object.keys(grupos);
        const copia = {};
        orden.forEach((k) => { copia[k === g ? nuevo : k] = grupos[k]; });
        Object.keys(grupos).forEach((k) => delete grupos[k]);
        Object.assign(grupos, copia);
        g = nuevo;
        box.dataset.g = nuevo;
      });
      $$('[data-k]', box).forEach((inp) => inp.addEventListener('input', () => { grupos[box.dataset.g][inp.dataset.k][0] = inp.value; }));
      $$('[data-v]', box).forEach((inp) => inp.addEventListener('input', () => { grupos[box.dataset.g][inp.dataset.v][1] = inp.value; }));
      $$('[data-delr]', box).forEach((b) => b.addEventListener('click', () => { grupos[box.dataset.g].splice(Number(b.dataset.delr), 1); editorFicha(cont, st); }));
      $('[data-addr]', box).addEventListener('click', () => { grupos[box.dataset.g].push(['', '']); editorFicha(cont, st); });
      $('[data-delg]', box).addEventListener('click', () => { if (window.confirm('¿Quitar esta sección de la ficha?')) { delete grupos[box.dataset.g]; editorFicha(cont, st); } });
    });
  }
  const fichaLimpia = (f) => {
    const out = {};
    Object.keys(f).forEach((g) => {
      const filas = f[g].map(([k, v]) => [String(k).trim(), String(v).trim()]).filter(([k, v]) => k && v);
      if (filas.length) out[g] = filas;
    });
    return out;
  };

  function editor360(cont, st, carpeta) {
    const v = st.vista360;
    cont.innerHTML = `
      ${v ? `<p class="hint">Activa: ${esc(v.cuadros)} cuadros · ${esc(v.ancho)}×${esc(v.alto)} px.</p>` : '<p class="hint">Esta moto no tiene vista 360°.</p>'}
      <div class="grid2">
        <label class="field">Cuadros<input type="number" min="6" max="72" value="${esc(v ? v.cuadros : 24)}" data-n></label>
        <label class="field">Ancho de cada cuadro<input type="number" min="100" max="2000" value="${esc(v ? v.ancho : 960)}" data-w></label>
        <label class="field">Alto de cada cuadro<input type="number" min="100" max="2000" value="${esc(v ? v.alto : 720)}" data-h></label>
      </div>
      <div class="grid2">
        <label class="upload">Archivo liviano (360-sm)<input type="file" accept="image/webp,image/jpeg" data-sm></label>
        <label class="upload">Archivo alta resolución (360-lg)<input type="file" accept="image/webp,image/jpeg" data-lg></label>
      </div>
      ${v ? '<button class="btn btn--ghost btn--sm" type="button" data-quitar360>Quitar vista 360°</button>' : ''}`;
    const archivos = {};
    ['sm', 'lg'].forEach((k) => $(`[data-${k}]`, cont).addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!/^image\/(webp|jpeg)$/.test(f.type) || f.size > 6 * 1024 * 1024) { toast('Usá los archivos .webp o .jpg que genera la herramienta (máx. 6 MB).', true); return; }
      loading(true);
      try {
        archivos[k] = await subir(carpeta(), f, f.type === 'image/webp' ? 'webp' : 'jpg');
        toast(`Archivo ${k === 'sm' ? 'liviano' : 'de alta resolución'} subido.`);
      } catch (err) { toast(explicar(err), true); }
      loading(false);
      if (archivos.sm || (st.vista360 && st.vista360.sm)) {
        st.vista360 = {
          cuadros: Number($('[data-n]', cont).value), ancho: Number($('[data-w]', cont).value), alto: Number($('[data-h]', cont).value),
          sm: archivos.sm || st.vista360.sm, lg: archivos.lg || (st.vista360 && st.vista360.lg) || archivos.sm
        };
        toast('Vista 360° lista. Recordá guardar.');
      }
    }));
    ['n', 'w', 'h'].forEach((k) => $(`[data-${k}]`, cont).addEventListener('change', () => {
      if (st.vista360) st.vista360 = { ...st.vista360, cuadros: Number($('[data-n]', cont).value), ancho: Number($('[data-w]', cont).value), alto: Number($('[data-h]', cont).value) };
    }));
    const q = $('[data-quitar360]', cont);
    if (q) q.addEventListener('click', () => { st.vista360 = null; editor360(cont, st, carpeta); toast('Se quitará al guardar.'); });
  }

  /* ======================================================================
     INICIO
     ====================================================================== */
  (async function iniciar() {
    // Errores que vienen en el link del email (vencido, ya usado, etc.)
    const params = new URLSearchParams(location.search + location.hash.replace(/^#/, '&'));
    const errLink = params.get('error_description');
    const { data } = await sb.auth.getSession();
    if (location.search || location.hash) history.replaceState(null, '', location.pathname);
    if (recuperando) return;
    if (data && data.session) {
      if (!localStorage.getItem(`${KEY}:inicio`)) localStorage.setItem(`${KEY}:inicio`, String(Date.now()));
      segundoFactor();
      return;
    }
    if (errLink) { step('login', 'El link venció o ya fue usado. Iniciá sesión o pedí uno nuevo.'); return; }
    if (params.get('code')) { step('login', 'Email confirmado. Ya podés iniciar sesión.', true); return; }
    step('login');
  })();
})();
