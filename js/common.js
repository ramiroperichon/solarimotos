/* ==========================================================================
   SOLARI MOTOS — Código compartido por todas las páginas
   - Inserta el "chrome" común (íconos, encabezado, menú, pie y accesos fijos)
     para no repetir HTML en cada página.
   - Expone utilidades y componentes en window.Solari.
   Cada página declara <body data-page="home|catalogo|detalle">.
   ========================================================================== */

(function () {
  'use strict';

  const DATA = window.SolariData.get();
  const CFG = DATA.config;
  const root = document.documentElement;
  const page = document.body.dataset.page || 'home';
  const isHome = page === 'home';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionOK = () => !reduceMotion.matches;

  /* ---------- Utilidades ---------- */
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmt = (n) => money.format(Math.round(n)).replace(/\s/g, ' ');
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const waLink = (msg = CFG.mensajeWhatsApp) => `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}`;
  const fullName = (m) => `${m.marca} ${m.modelo}`;
  const motoMsg = (m) => `Hola ${CFG.nombre}, me interesa la ${fullName(m)} (${m.cilindrada} cc). ¿Está disponible? ¿Qué alternativas de financiación tienen?`;
  const refTag = () => (CFG.demo ? '<span class="ref">Referencia</span>' : '');
  const hasPrice = (m) => typeof m.precio === 'number';
  const priceText = (p) => (typeof p === 'number' ? fmt(p) : 'Consultar precio');
  const detailURL = (m) => `detalle.html?moto=${encodeURIComponent(m.id)}`;
  const link = (hash) => (isHome ? `#${hash}` : `index.html#${hash}`);

  const STATUS = { disponible: 'Disponible', ultima: 'Última unidad', pedido: 'A pedido', reservada: 'Reservada' };
  const statusHTML = (s) => `<span class="status status--${esc(s)}">${esc(STATUS[s] || s)}</span>`;

  /* Si una foto no carga, se oculta y queda el marcador de fondo */
  function guard(img) {
    const fail = () => img.classList.add('is-broken');
    img.addEventListener('error', fail, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
  }
  const guardAll = (ctx) => $$('img', ctx).forEach(guard);

  /* Foto de una moto, o marcador con el nombre si todavía no hay foto */
  function mediaHTML(m, i = 0, opts = {}) {
    const src = m.imagenes && m.imagenes[i];
    return `
      <span class="ph" aria-hidden="true"><span class="ph__name">${esc(m.modelo)}</span><span class="ph__brand">${esc(m.marca)}</span></span>
      ${src ? `<img src="${esc(src)}" alt="${esc(fullName(m))}" ${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="1200" height="1000">` : ''}`;
  }

  function observe(els, cb, opts = {}) {
    const list = (Array.isArray(els) ? els : [els]).filter(Boolean);
    if (!('IntersectionObserver' in window) || !motionOK()) { list.forEach(cb); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } });
    }, { threshold: opts.threshold ?? 0.12, rootMargin: opts.rootMargin ?? '0px 0px -8% 0px' });
    list.forEach((el) => io.observe(el));
  }
  const reveal = (els, opts) => observe(els, (el) => el.classList.add('is-in'), opts);

  function brandList(list = DATA.motos) {
    const map = new Map();
    list.forEach((m) => map.set(m.marca, (map.get(m.marca) || 0) + 1));
    return Array.from(map, ([marca, n]) => ({ marca, n }));
  }

  /* ---------- Tarjeta de moto ----------
     size: xl | md | sm | half | wide | grid  */
  function motoCard(m, i, size = 'grid', total = 0) {
    const name = fullName(m);
    return `
      <article class="moto moto--${size}" style="--i:${i % 3}" data-id="${esc(m.id)}">
        <a class="moto__media" href="${detailURL(m)}" aria-label="Ver ficha de la ${esc(name)}">
          ${mediaHTML(m)}
          ${total ? `<span class="moto__num" aria-hidden="true">${pad(i + 1)}<small>/${pad(total)}</small></span>` : ''}
          ${m.etiqueta ? `<span class="moto__badge">${esc(m.etiqueta)}</span>` : ''}
          <span class="moto__view" aria-hidden="true">Ver ficha <svg class="icon"><use href="#i-arrow"/></svg></span>
        </a>
        <div class="moto__info">
          <p class="moto__brand">${esc(m.marca)} ${statusHTML(m.disponibilidad)}</p>
          <h3 class="moto__model"><a href="${detailURL(m)}">${esc(m.modelo)}</a></h3>
          <p class="moto__meta">${m.cilindrada} cc · ${esc(m.categoria)} · ${m.anio}</p>
          <div class="moto__row">
            <div class="moto__price">
              <small>Precio de contado</small>
              <strong>${priceText(m.precio)}</strong>${hasPrice(m) ? refTag() : ''}
              <p class="moto__fin">${esc(m.financiacion || 'Consultá alternativas de financiación')}</p>
            </div>
            <div class="moto__actions">
              <a class="link-arrow moto__more" href="${detailURL(m)}">Ver ficha</a>
              <a class="wa-round" href="${waLink(motoMsg(m))}" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp por la ${esc(name)}">
                <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg>
              </a>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* ---------- Cascos (inicio y catálogo) ---------- */
  function renderHelmets(rail) {
    if (!rail) return;
    rail.innerHTML = DATA.cascos.map((c, i) => `
      <article class="helmet" style="--i:${i}">
        <div class="helmet__media">
          ${c.imagenes && c.imagenes[0]
            ? `<img src="${esc(c.imagenes[0])}" alt="${esc(c.nombre)}" loading="lazy" width="800" height="800">`
            : '<span class="helmet__soon"><svg class="icon" aria-hidden="true"><use href="#i-camera"/></svg>Foto próximamente</span>'}
          <span class="helmet__type">${statusHTML(c.disponibilidad)}</span>
        </div>
        <div>
          <p class="label">${esc(c.tipo)}</p>
          <h3>${esc(c.nombre)}</h3>
          <p class="helmet__meta">Talles ${esc(c.talles)}</p>
          <p class="helmet__detail">${esc(c.detalle)}</p>
        </div>
        <div class="helmet__row">
          <span class="helmet__price">${priceText(c.precio)}</span>
          <a class="link-arrow" href="${waLink(`Hola ${CFG.nombre}, quiero consultar por el ${c.nombre.toLowerCase()}: talles y colores disponibles.`)}" target="_blank" rel="noopener">Consultar talles</a>
        </div>
      </article>`).join('');
    guardAll(rail);
    reveal($$('.helmet', rail), { threshold: 0.15 });
  }

  /* ---------- Chrome común ---------- */
  const SPRITE = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.14.17-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4 12h16M14 6l6 6-6 6"/></symbol>
    <symbol id="i-arrow-ur" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 7v5l3 2"/></symbol>
    <symbol id="i-phone" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
    <symbol id="i-ig" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></symbol>
    <symbol id="i-fb" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.3 4.3c-2.3 0-3.8 1.4-3.8 3.96v2.24H8v3h2.5V21h3Z"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></symbol>
    <symbol id="i-prev" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></symbol>
    <symbol id="i-next" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></symbol>
    <symbol id="i-camera" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></symbol>
    <symbol id="i-sliders" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/></symbol>
  </svg>`;

  function renderChrome() {
    document.body.insertAdjacentHTML('afterbegin', SPRITE);

    const nav = [
      ['catalogo.html', 'Catálogo', 'catalogo'],
      [link('financiacion'), 'Financiación', 'financiacion'],
      ['catalogo.html#cascos', 'Cascos', 'cascos'],
      [link('nosotros'), 'Nosotros', 'nosotros'],
      [link('contacto'), 'Contacto', 'contacto']
    ];

    const header = $('[data-slot="header"]');
    if (header) header.outerHTML = `
      <a class="skip-link" href="#main">Saltar al contenido</a>
      <header class="site-header" data-header>
        <div class="container header__inner">
          <a class="brand" href="${isHome ? '#inicio' : 'index.html'}" aria-label="Solari Motos, ir al inicio">
            <span class="brand__mark" aria-hidden="true"></span>
            <span class="brand__word">Solari<small>Motos</small></span>
          </a>
          <nav class="nav" aria-label="Navegación principal">
            <ul class="nav__list">
              ${nav.map(([href, t, key]) => `<li><a class="nav__link${(page === 'catalogo' || page === 'detalle') && key === 'catalogo' ? ' is-current' : ''}" href="${href}" data-key="${key}">${t}</a></li>`).join('')}
            </ul>
          </nav>
          <div class="header__end">
            <span class="open-chip" data-open-status hidden></span>
            <a class="btn btn--dark btn--sm header__wa" href="#" data-wa target="_blank" rel="noopener">
              <svg class="icon icon--wa" aria-hidden="true"><use href="#i-wa"/></svg><span>WhatsApp</span>
            </a>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle>
              <span data-menu-label>Menú</span>
              <span class="menu-toggle__icon" aria-hidden="true"><span></span><span></span></span>
            </button>
          </div>
        </div>
      </header>
      <div class="menu" id="menu" data-menu aria-hidden="true">
        <div class="menu__inner container">
          <nav aria-label="Navegación móvil">
            <ol class="menu__list">
              ${nav.map(([href, t], i) => `<li><a href="${href}" style="--i:${i}"><span class="menu__n">${pad(i + 1)}</span><span class="menu__t">${t}</span></a></li>`).join('')}
            </ol>
          </nav>
          <div class="menu__foot">
            <a class="btn btn--dark btn--block" href="#" data-wa target="_blank" rel="noopener">
              <svg class="icon icon--wa" aria-hidden="true"><use href="#i-wa"/></svg><span>Escribinos por WhatsApp</span>
            </a>
            <p class="menu__meta"><span data-place></span><br><span data-today-hours></span></p>
          </div>
        </div>
      </div>`;

    const footer = $('[data-slot="footer"]');
    if (footer) footer.outerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer__cta">
            <p class="footer__ask" data-split>¿Ya tenés en mente <em>tu próxima moto?</em></p>
            <a class="btn btn--accent btn--lg" href="#" data-wa target="_blank" rel="noopener" data-magnetic>
              <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg><span>Hablemos por WhatsApp</span>
            </a>
          </div>
          <div class="footer__cols">
            <div>
              <h3 class="footer__h">Explorar</h3>
              <ul>${nav.map(([href, t]) => `<li><a href="${href}">${t}</a></li>`).join('')}</ul>
            </div>
            <div>
              <h3 class="footer__h">Visitanos</h3>
              <ul><li data-address></li><li data-place></li></ul>
            </div>
            <div>
              <h3 class="footer__h">Horarios</h3>
              <ul data-footer-hours></ul>
            </div>
            <div>
              <h3 class="footer__h">Seguinos</h3>
              <ul>
                <li><a href="#" data-social="instagram" target="_blank" rel="noopener">Instagram</a></li>
                <li><a href="#" data-social="facebook" target="_blank" rel="noopener">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div class="footer__word" aria-hidden="true"><span class="footer__sun"></span>Solari</div>
          <div class="footer__legal">
            <p>© <span data-year></span> Solari Motos · <span data-province></span>, Argentina</p>
            <p>Precios y condiciones sujetos a cambios.</p>
          </div>
        </div>
      </footer>
      <nav class="dock" aria-label="Accesos rápidos" data-dock>
        <a class="dock__fin" href="${link('financiacion')}">Financiación</a>
        <a class="dock__wa" href="#" data-wa data-dock-wa target="_blank" rel="noopener">
          <svg class="icon icon--wa" aria-hidden="true"><use href="#i-wa"/></svg><span>WhatsApp</span>
        </a>
      </nav>`;
  }

  /* ---------- Datos fijos ---------- */
  function schedule() {
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const ranges = CFG.horarios[day] || [];
    const open = ranges.some(([a, b]) => mins >= toMin(a) && mins < toMin(b));
    const today = ranges.length ? ranges.map(([a, b]) => `${a}–${b}`).join(' · ') : 'cerrado';
    return { open, today, group: day === 0 ? 2 : day === 6 ? 1 : 0 };
  }

  function fillStatic() {
    const place = `${CFG.localidad}, ${CFG.provincia}`;
    $$('[data-wa]').forEach((a) => { a.href = waLink(); });
    $$('[data-wa-visible]').forEach((el) => { el.textContent = CFG.whatsappVisible; });
    $$('[data-address]').forEach((el) => { el.textContent = CFG.direccion; });
    $$('[data-place]').forEach((el) => { el.textContent = place; });
    $$('[data-place-short]').forEach((el) => { el.textContent = CFG.localidad; });
    $$('[data-province]').forEach((el) => { el.textContent = CFG.provincia; });
    $$('[data-phone]').forEach((a) => { a.href = `tel:${CFG.telefono.replace(/[^\d+]/g, '')}`; });
    $$('[data-phone-text]').forEach((a) => { a.textContent = CFG.telefono; });
    $$('[data-social]').forEach((a) => { a.href = CFG.redes[a.dataset.social] || '#'; });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    $$('[data-count-motos]').forEach((el) => { el.textContent = `${DATA.motos.length} ${DATA.motos.length === 1 ? 'moto' : 'motos'}`; });
    $$('[data-demo-note]').forEach((el) => { el.hidden = !CFG.demo; });

    const s = schedule();
    $$('[data-open-status]').forEach((el) => {
      el.hidden = false;
      el.textContent = s.open ? 'Abierto ahora' : 'Cerrado ahora';
      el.classList.toggle('is-open', s.open);
    });
    $$('[data-today-hours]').forEach((el) => { el.textContent = `Hoy: ${s.today}`; });
    const dl = $('[data-hours]');
    if (dl) dl.innerHTML = CFG.horariosTexto.map(([d, h], i) => `<div class="${i === s.group ? 'is-today' : ''}"><dt>${esc(d)}</dt><dd>${esc(h)}</dd></div>`).join('');
    const fh = $('[data-footer-hours]');
    if (fh) fh.innerHTML = CFG.horariosTexto.map(([d, h]) => `<li>${esc(d)}<br><span class="footer__dim">${esc(h)}</span></li>`).join('');
  }

  /* ---------- Titulares divididos en palabras ---------- */
  function splitWords(ctx = document) {
    const els = $$('[data-split]', ctx).filter((el) => !el.dataset.splitDone);
    els.forEach((el) => {
      el.dataset.splitDone = '1';
      let wi = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.innerHTML = `<span class="w__in" style="--wi:${wi++}">${esc(p)}</span>`;
          frag.appendChild(w);
        });
        node.parentNode.replaceChild(frag, node);
      });
    });
    reveal(els, { threshold: 0.2 });
  }

  /* ---------- Header, progreso, dock y navegación activa ---------- */
  function initHeader() {
    const header = $('[data-header]');
    const dock = $('[data-dock]');
    const firstSection = $('main > section');
    const links = $$('.nav__link');
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
      header.classList.toggle('is-solid', y > 12);
      header.classList.toggle('is-hidden', y > lastY && y > 520 && !document.body.classList.contains('menu-open'));
      lastY = y;
      const threshold = firstSection ? Math.min(firstSection.offsetHeight * 0.55, 600) : 300;
      if (dock) dock.classList.toggle('is-visible', y > threshold);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    if (isHome && 'IntersectionObserver' in window) {
      const byId = new Map(links.map((a) => [a.dataset.key, a]));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) links.forEach((l) => l.classList.toggle('is-active', l === byId.get(en.target.id === 'coleccion' ? 'catalogo' : en.target.id)));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['coleccion', 'financiacion', 'cascos', 'nosotros', 'contacto'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    const btn = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    const label = $('[data-menu-label]');
    if (!btn || !menu) return;

    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Cerrar' : 'Menú';
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) setTimeout(() => { const a = $('a', menu); if (a) a.focus({ preventScroll: true }); }, 400);
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { set(false); btn.focus(); }
      if (e.key === 'Tab') {
        const f = [btn, ...$$('a, button', menu)];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  function initMagnetic() {
    if (!motionOK() || !finePointer.matches) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = clamp(e.clientX - (r.left + r.width / 2), -40, 40);
        const y = clamp(e.clientY - (r.top + r.height / 2), -20, 20);
        el.style.translate = `${(x * 0.16).toFixed(1)}px ${(y * 0.28).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* Entrada: espera breve a las fuentes para evitar saltos */
  function start() {
    const go = () => requestAnimationFrame(() => root.classList.add('is-ready'));
    if (!motionOK() || !document.fonts) { go(); return; }
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(go);
  }

  /* Enlaces viejos de la vista rápida (#moto-id) → ficha completa */
  const oldHash = location.hash.match(/^#moto-(.+)$/);
  if (oldHash && DATA.motos.some((m) => m.id === oldHash[1])) {
    location.replace(`detalle.html?moto=${encodeURIComponent(oldHash[1])}`);
    return;
  }

  renderChrome();

  window.Solari = {
    DATA, CFG, page, $, $$, esc, fmt, pad, clamp, motionOK, finePointer,
    waLink, fullName, motoMsg, refTag, hasPrice, priceText, detailURL, link,
    STATUS, statusHTML, guard, guardAll, mediaHTML, observe, reveal, brandList,
    motoCard, renderHelmets, splitWords,
    /* Llamar al final de cada página, después de renderizar su contenido */
    boot() {
      fillStatic();
      splitWords();
      reveal($$('[data-reveal]'), { threshold: 0.15 });
      initHeader();
      initMenu();
      initMagnetic();
      start();
    }
  };
})();
