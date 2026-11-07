/* ==========================================================================
   SOLARI MOTOS — Lógica del sitio
   JavaScript puro, sin dependencias. Todo el contenido sale de js/data.js.
   ========================================================================== */

(function () {
  'use strict';

  const DATA = window.SolariData.get();
  const CFG = DATA.config;
  const root = document.documentElement;

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
  const priceText = (p) => (typeof p === 'number' ? fmt(p) : 'Consultar precio');

  const STATUS = { disponible: 'Disponible', ultima: 'Última unidad', pedido: 'A pedido', reservada: 'Reservada' };
  const statusHTML = (s) => `<span class="status status--${esc(s)}">${esc(STATUS[s] || s)}</span>`;

  /* Si una foto no carga, se oculta y queda la ilustración de fondo */
  function guard(img) {
    const fail = () => img.classList.add('is-broken');
    img.addEventListener('error', fail, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
  }

  function observe(els, cb, opts = {}) {
    const list = Array.isArray(els) ? els : [els];
    if (!('IntersectionObserver' in window) || !motionOK()) { list.forEach(cb); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } });
    }, { threshold: opts.threshold ?? 0.12, rootMargin: opts.rootMargin ?? '0px 0px -8% 0px' });
    list.forEach((el) => el && io.observe(el));
  }
  const reveal = (els, opts) => observe(els, (el) => el.classList.add('is-in'), opts);

  /* ---------- Datos fijos (contacto, lugar, horarios) ---------- */
  function schedule() {
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const ranges = CFG.horarios[day] || [];
    const open = ranges.some(([a, b]) => mins >= toMin(a) && mins < toMin(b));
    const today = ranges.length ? ranges.map(([a, b]) => `${a}–${b}`).join(' · ') : 'cerrado';
    const group = day === 0 ? 2 : day === 6 ? 1 : 0;
    return { open, today, group };
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
    const note = $('[data-demo-note]');
    if (note) note.hidden = !CFG.demo;

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
    if (fh) fh.innerHTML = CFG.horariosTexto.map(([d, h]) => `<li>${esc(d)}<br><span style="opacity:.6">${esc(h)}</span></li>`).join('');
  }

  /* ---------- Titulares divididos en palabras ---------- */
  function splitWords() {
    $$('[data-split]').forEach((el) => {
      let wi = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const parts = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
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
    reveal($$('[data-split]'), { threshold: 0.2 });
  }

  /* ---------- Hero ---------- */
  function initHero() {
    const m = DATA.motos[0];
    if (!m) return;
    const img = $('[data-hero-img]');
    guard(img);
    img.src = m.imagenes[0] || '';
    img.alt = fullName(m);
    $('[data-hero-status]').outerHTML = statusHTML(m.disponibilidad);
    $('[data-hero-name]').textContent = fullName(m);
    $('[data-hero-meta]').textContent = `${m.cilindrada} cc · ${typeof m.precio === 'number' ? `Contado ${fmt(m.precio)}` : 'Consultar precio'}`;
    $('[data-hero-open]').addEventListener('click', () => Sheet.open(m.id));
  }

  /* ---------- Marcas (se generan desde el inventario) ---------- */
  function brandList() {
    const map = new Map();
    DATA.motos.forEach((m) => map.set(m.marca, (map.get(m.marca) || 0) + 1));
    return Array.from(map, ([marca, n]) => ({ marca, n }));
  }

  function initBrands() {
    const ul = $('[data-brands]');
    if (!ul) return;
    ul.innerHTML = brandList().map((b, i) => `
      <li class="brand-item" style="--i:${i}">
        <button type="button" data-brand="${esc(b.marca)}" aria-label="Ver motos ${esc(b.marca)}">
          <span class="brand-item__name">${esc(b.marca)}</span>
          <span class="brand-item__count">${pad(b.n)} ${b.n === 1 ? 'modelo' : 'modelos'}</span>
        </button>
      </li>`).join('');
    ul.addEventListener('click', (e) => {
      const b = e.target.closest('[data-brand]');
      if (!b) return;
      Collection.filter(b.dataset.brand);
      $('#coleccion').scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' });
    });
    reveal($('.brands'), { threshold: 0.2 });
  }

  /* ---------- Colección ---------- */
  /* Asigna tamaños editoriales distintos según la posición y la cantidad. */
  function layoutSizes(n) {
    if (n === 1) return ['wide'];
    const sizes = ['xl', 'md'];
    let rest = n - 2;
    while (rest > 0) {
      if (rest >= 3) { sizes.push('sm', 'sm', 'sm'); rest -= 3; }
      else if (rest === 2) { sizes.push('half', 'half'); rest = 0; }
      else { sizes.push('wide'); rest = 0; }
    }
    return sizes;
  }

  function motoCard(m, i, size, total) {
    const name = fullName(m);
    return `
      <article class="moto moto--${size}" style="--i:${i % 3}" data-id="${esc(m.id)}">
        <a class="moto__media" href="#moto-${esc(m.id)}" data-open="${esc(m.id)}" aria-label="Ver ficha de la ${esc(name)}">
          ${m.imagenes[0] ? `<img src="${esc(m.imagenes[0])}" alt="${esc(name)}" loading="lazy" decoding="async" width="900" height="1000">` : ''}
          <span class="moto__num" aria-hidden="true">${pad(i + 1)}<span style="font-size:.4em;opacity:.8">/${pad(total)}</span></span>
          ${m.etiqueta ? `<span class="moto__badge">${esc(m.etiqueta)}</span>` : ''}
          <span class="moto__view" aria-hidden="true">Ver ficha <svg class="icon"><use href="#i-arrow"/></svg></span>
        </a>
        <div class="moto__info">
          <p class="moto__brand">${esc(m.marca)} <span>${statusHTML(m.disponibilidad)}</span></p>
          <h3 class="moto__model"><button type="button" data-open="${esc(m.id)}">${esc(m.modelo)}</button></h3>
          <p class="moto__meta">${m.cilindrada} cc · ${esc(m.categoria)} · ${m.anio}</p>
          <div class="moto__row">
            <div class="moto__price">
              <small>Precio de contado</small>
              <strong>${priceText(m.precio)}</strong>${typeof m.precio === 'number' ? refTag() : ''}
              <p class="moto__fin">${esc(m.financiacion || 'Consultá alternativas de financiación')}</p>
            </div>
            <div class="moto__actions">
              <button type="button" class="link-arrow moto__more" data-open="${esc(m.id)}">Ver ficha</button>
              <a class="wa-round" href="${waLink(motoMsg(m))}" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp por la ${esc(name)}">
                <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg>
              </a>
            </div>
          </div>
        </div>
      </article>`;
  }

  const Collection = {
    grid: null,
    chips: null,
    current: 'Todas',

    init() {
      this.grid = $('[data-collection]');
      this.chips = $('[data-filter]');
      if (!this.grid) return;

      const brands = brandList();
      if (this.chips) {
        if (brands.length > 1) {
          this.chips.innerHTML = [{ marca: 'Todas', n: DATA.motos.length }, ...brands].map((b) =>
            `<button type="button" class="chip" data-chip="${esc(b.marca)}" aria-pressed="${b.marca === 'Todas'}">${esc(b.marca)}<sup>${pad(b.n)}</sup></button>`).join('');
          this.chips.addEventListener('click', (e) => {
            const c = e.target.closest('[data-chip]');
            if (c) this.filter(c.dataset.chip);
          });
        } else {
          this.chips.remove();
        }
      }

      this.grid.addEventListener('click', (e) => {
        const t = e.target.closest('[data-open]');
        if (!t) return;
        e.preventDefault();
        Sheet.open(t.dataset.open);
      });

      this.render(false);
    },

    list() {
      return this.current === 'Todas' ? DATA.motos : DATA.motos.filter((m) => m.marca === this.current);
    },

    render(animate) {
      const list = this.list();
      const sizes = layoutSizes(list.length);
      this.grid.innerHTML = list.length
        ? list.map((m, i) => motoCard(m, i, sizes[i], list.length)).join('')
        : '<p class="collection__empty">No hay motos de esta marca por ahora.</p>';
      $$('img', this.grid).forEach(guard);
      const cards = $$('.moto', this.grid);
      if (animate) {
        requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => c.classList.add('is-in'))));
      } else {
        reveal(cards, { threshold: 0.08 });
      }
    },

    filter(brand) {
      if (brand === this.current) return;
      this.current = brand;
      if (this.chips) $$('[data-chip]', this.chips).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chip === brand)));
      if (!motionOK()) { this.render(true); return; }
      this.grid.classList.add('is-leaving');
      setTimeout(() => { this.grid.classList.remove('is-leaving'); this.render(true); }, 320);
    }
  };

  /* ---------- Ficha de moto (dialog) ---------- */
  const Sheet = {
    el: null,
    idx: -1,

    init() {
      this.el = $('[data-sheet]');
      if (!this.el || typeof this.el.showModal !== 'function') return;
      $('[data-sheet-close]', this.el).addEventListener('click', () => this.close());
      $('[data-sheet-prev]', this.el).addEventListener('click', () => this.step(-1));
      $('[data-sheet-next]', this.el).addEventListener('click', () => this.step(1));
      this.el.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
      this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
      this.el.addEventListener('keydown', (e) => {
        if (e.target.matches('select, input')) return;
        if (e.key === 'ArrowRight') this.step(1);
        if (e.key === 'ArrowLeft') this.step(-1);
      });

      // Enlace directo: index.html#moto-honda-xr-150l
      const m = location.hash.match(/^#moto-(.+)$/);
      if (m && DATA.motos.some((x) => x.id === m[1])) setTimeout(() => this.open(m[1]), 400);
    },

    render(swap) {
      const m = DATA.motos[this.idx];
      const total = DATA.motos.length;
      const name = fullName(m);
      $('[data-sheet-count]', this.el).textContent = `${pad(this.idx + 1)} / ${pad(total)}`;
      const imgs = m.imagenes.length ? m.imagenes : [''];
      const content = $('[data-sheet-content]', this.el);
      content.innerHTML = `
        <div class="sheet__layout ${swap ? 'is-swapping' : ''}">
          <div class="gallery">
            <div class="gallery__main">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(name)}" decoding="async">` : ''}</div>
            ${imgs.length > 1 ? `<div class="gallery__thumbs" role="group" aria-label="Fotos">
              ${imgs.map((src, i) => `<button type="button" data-thumb="${i}" aria-label="Foto ${i + 1}" aria-current="${i === 0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}
            </div>` : ''}
          </div>
          <div class="sheet__body">
            <div class="sheet__brand">
              <span class="label">${esc(m.marca)} · ${esc(m.categoria)}</span>
              ${statusHTML(m.disponibilidad)}
            </div>
            <h2 class="sheet__title" id="sheet-title">${esc(m.modelo)}</h2>
            <p class="sheet__summary">${esc(m.resumen || '')}</p>

            <div class="sheet__price">
              <small>Precio de contado</small>
              <strong>${priceText(m.precio)}</strong>
              <p>${CFG.demo ? 'Valor de referencia, sujeto a cambios. ' : ''}Confirmá el precio final al consultar.</p>
            </div>

            <div class="sheet__fin">
              <h3>¿Querés financiarla?</h3>
              <p>${esc(m.financiacion || 'Consultá alternativas de financiación')}. Te contamos las opciones vigentes según tu caso.</p>
              <a class="link-arrow" href="${waLink(`Hola ${CFG.nombre}, quiero saber cómo financiar la ${name}.`)}" target="_blank" rel="noopener">
                <svg class="icon icon--wa" aria-hidden="true"><use href="#i-wa"/></svg> Consultar financiación
              </a>
            </div>

            <dl class="specs">
              <div><dt>Marca</dt><dd>${esc(m.marca)}</dd></div>
              <div><dt>Modelo</dt><dd>${esc(m.modelo)}</dd></div>
              <div><dt>Cilindrada</dt><dd>${m.cilindrada} cc</dd></div>
              <div><dt>Año</dt><dd>${m.anio}</dd></div>
              ${(m.ficha || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
            </dl>
            <p class="sheet__note">Datos orientativos. Confirmá especificaciones y colores disponibles con nosotros.</p>

            <div class="sheet__actions">
              <a class="btn btn--accent btn--lg btn--block" href="${waLink(motoMsg(m))}" target="_blank" rel="noopener">
                <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg><span>Consultar por esta moto</span>
              </a>
              <a class="btn btn--line btn--block" href="#financiacion" data-sheet-fin>Ver alternativas de financiación</a>
            </div>
          </div>
        </div>`;
      $$('img', content).forEach(guard);
      content.scrollTop = 0;

      const main = $('.gallery__main', content);
      $$('[data-thumb]', content).forEach((b) => b.addEventListener('click', () => {
        const src = imgs[Number(b.dataset.thumb)];
        $$('[data-thumb]', content).forEach((x) => x.setAttribute('aria-current', String(x === b)));
        const old = $('img', main);
        const next = new Image();
        next.alt = name;
        next.src = src;
        guard(next);
        next.classList.add('is-out');
        main.appendChild(next);
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('is-out')));
        if (old) { old.classList.add('is-out'); setTimeout(() => old.remove(), 600); }
      }));
      $('[data-sheet-fin]', content).addEventListener('click', () => this.close());
    },

    open(id) {
      const i = DATA.motos.findIndex((m) => m.id === id);
      if (i < 0 || !this.el) return;
      this.idx = i;
      this.render(false);
      if (!this.el.open) {
        this.el.classList.remove('is-closing');
        this.el.showModal();
        document.body.style.overflow = 'hidden';
      }
      history.replaceState(null, '', `#moto-${id}`);
    },

    step(d) {
      const n = DATA.motos.length;
      this.idx = (this.idx + d + n) % n;
      this.render(true);
      history.replaceState(null, '', `#moto-${DATA.motos[this.idx].id}`);
    },

    close() {
      if (!this.el || !this.el.open || this.el.classList.contains('is-closing')) return;
      const done = () => {
        this.el.classList.remove('is-closing');
        this.el.close();
        document.body.style.overflow = '';
        history.replaceState(null, '', location.pathname + location.search);
      };
      if (!motionOK()) { done(); return; }
      this.el.classList.add('is-closing');
      setTimeout(done, 440);
    }
  };

  /* ---------- Financiación ---------- */
  function initFinance() {
    const F = DATA.financiacion;

    const ways = $('[data-ways]');
    if (ways) {
      ways.innerHTML = F.alternativas.map((a, i) => `
        <li class="way" style="--i:${i}">
          <div class="way__top"><span class="way__n">${pad(i + 1)}</span><span class="way__tag">${esc(a.bajada)}</span></div>
          <h3>${esc(a.titulo)}</h3>
          <p>${esc(a.texto)}</p>
          <a class="link-arrow way__cta" href="${waLink(`Hola ${CFG.nombre}, ${a.consulta}.`)}" target="_blank" rel="noopener">
            <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Consultar
          </a>
        </li>`).join('');
      reveal($$('.way', ways), { threshold: 0.2 });
    }

    const req = $('[data-requisitos]');
    if (req) req.innerHTML = F.requisitos.map((r) => `<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>${esc(r)}</span></li>`).join('');
    const med = $('[data-medios]');
    if (med) med.innerHTML = F.medios.map((m) => `<li>${esc(m)}</li>`).join('');
    const notice = $('[data-finance-notice]');
    if (notice) notice.textContent = F.aviso;

    initBuilder(F);
    initPromos();
  }

  function initBuilder(F) {
    const form = $('[data-builder]');
    if (!form) return;
    const sel = $('[data-b-moto]', form);
    const entregaEl = $('[data-b-entrega]', form);
    const cuotasEl = $('[data-b-cuotas]', form);
    const preview = $('[data-b-preview]', form);
    const send = $('[data-b-send]', form);
    const estimate = $('[data-b-estimate]', form);

    sel.innerHTML = DATA.motos.map((m) => `<option value="${esc(m.id)}">${esc(fullName(m))}</option>`).join('') +
      '<option value="">Todavía no lo decidí</option>';

    const state = { entrega: F.entregaOpciones[0], cuotas: F.cuotasOpciones.includes(12) ? 12 : F.cuotasOpciones[0] };
    const seg = (el, opts, key, fmtLabel) => {
      el.innerHTML = opts.map((o) => `<button type="button" data-v="${esc(o)}" aria-pressed="${String(o) === String(state[key])}">${esc(fmtLabel(o))}</button>`).join('');
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        state[key] = isNaN(Number(b.dataset.v)) ? b.dataset.v : Number(b.dataset.v);
        $$('[data-v]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        update();
      });
    };
    seg(entregaEl, F.entregaOpciones, 'entrega', (o) => o);
    seg(cuotasEl, F.cuotasOpciones, 'cuotas', (o) => `${o}`);

    function update() {
      const m = DATA.motos.find((x) => x.id === sel.value);
      const withEntrega = state.entrega !== F.entregaOpciones[0];
      const msg = `Hola ${CFG.nombre}. ${m ? `Me interesa la ${fullName(m)}.` : 'Estoy buscando una moto y todavía no decidí el modelo.'} ` +
        `${withEntrega ? 'Tengo una entrega' : 'No tengo entrega'} y me gustaría pagar en ${state.cuotas} cuotas. ` +
        '¿Qué alternativas de financiación tienen y qué requisitos necesito?';
      preview.textContent = msg;
      send.href = waLink(msg);

      // Estimación solo si el negocio cargó coeficientes reales y no hay entrega.
      const coef = F.coeficientes && F.coeficientes[state.cuotas];
      if (coef && m && typeof m.precio === 'number' && !withEntrega) {
        estimate.hidden = false;
        estimate.innerHTML = `<span class="builder__preview-label" style="color:inherit;opacity:.6">Cuota estimada</span>
          <div style="font-family:var(--f-display);font-weight:650;font-stretch:85%;font-size:2rem;line-height:1.1">${fmt(m.precio * coef / state.cuotas)} <small style="font-size:.9rem;opacity:.6">/ mes</small></div>
          <small style="opacity:.6">Referencia sujeta a aprobación y condiciones vigentes.</small>`;
      } else {
        estimate.hidden = true;
      }
    }
    sel.addEventListener('change', update);
    update();
  }

  function initPromos() {
    const wrap = $('[data-promos-wrap]');
    const list = $('[data-promos]');
    if (!wrap || !list || !DATA.promociones.length) return;
    wrap.hidden = false;
    list.innerHTML = DATA.promociones.map((p, i) => `
      <article class="ticket" style="--i:${i}">
        <div>
          <h4>${esc(p.titulo)}</h4>
          <p>${esc(p.texto)}</p>
          <div class="ticket__meta"><span>${esc(p.vigencia)}</span>${p.demo ? '<span class="ref">Ejemplo</span>' : ''}</div>
        </div>
        <a class="ticket__go wa-round" href="${waLink(`Hola ${CFG.nombre}, quiero información sobre "${p.titulo}".`)}" target="_blank" rel="noopener" aria-label="Consultar por ${esc(p.titulo)}" style="border:0">
          <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg>
        </a>
      </article>`).join('');
    reveal($$('.ticket', list), { threshold: 0.2 });
  }

  /* ---------- Cascos ---------- */
  function initHelmets() {
    const rail = $('[data-helmets]');
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
          <h3 style="margin-top:8px">${esc(c.nombre)}</h3>
          <p class="helmet__meta">Talles ${esc(c.talles)}</p>
          <p class="helmet__detail">${esc(c.detalle)}</p>
        </div>
        <div class="helmet__row">
          <span class="helmet__price">${priceText(c.precio)}</span>
          <a class="link-arrow" href="${waLink(`Hola ${CFG.nombre}, quiero consultar por el ${c.nombre.toLowerCase()}: talles y colores disponibles.`)}" target="_blank" rel="noopener">Consultar talles</a>
        </div>
      </article>`).join('');
    $$('img', rail).forEach(guard);
    reveal($$('.helmet', rail), { threshold: 0.15 });
  }

  /* ---------- Mapa bajo demanda ---------- */
  function initMap() {
    const frame = $('[data-map]');
    const btn = $('[data-map-load]');
    if (!frame || !btn) return;
    const load = () => {
      if ($('iframe', frame)) return;
      const f = document.createElement('iframe');
      f.title = `Ubicación de ${CFG.nombre}`;
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.src = `https://www.google.com/maps?q=${encodeURIComponent(CFG.mapaQuery)}&output=embed`;
      frame.appendChild(f);
      btn.remove();
    };
    btn.addEventListener('click', load);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '300px' });
      io.observe(frame);
    }
  }

  /* ---------- Header, progreso, dock y navegación activa ---------- */
  function initHeader() {
    const header = $('[data-header]');
    const dock = $('[data-dock]');
    const hero = $('.hero');
    const links = $$('.nav__link');
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
      header.classList.toggle('is-solid', y > 12);
      const menuOpen = document.body.classList.contains('menu-open');
      header.classList.toggle('is-hidden', y > lastY && y > 520 && !menuOpen);
      lastY = y;
      if (dock && hero) dock.classList.toggle('is-visible', y > hero.offsetHeight * 0.55);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    if ('IntersectionObserver' in window) {
      const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) links.forEach((l) => l.classList.toggle('is-active', l === byId.get(en.target.id)));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    const btn = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    const label = $('[data-menu-label]');
    if (!btn || !menu) return;
    $$('.menu__list a', menu).forEach((a, i) => a.style.setProperty('--i', i));

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

  /* ---------- Movimiento ligado al scroll ---------- */
  function initScrollMotion() {
    if (!motionOK()) return;
    const hero = $('.hero');
    const img = $('.hero__photo img');
    const parallax = $$('[data-parallax]');
    let ticking = false;

    const frame = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (hero && img && y < hero.offsetHeight) {
        const p = y / hero.offsetHeight;
        img.style.setProperty('--py', `${(y * 0.14).toFixed(1)}px`);
        img.style.setProperty('--ps', (1.08 + p * 0.06).toFixed(3));
      }
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * Number(el.dataset.parallax)).toFixed(1)}px`;
      });
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    frame();
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

  /* ---------- Revelados genéricos ---------- */
  function initReveal() {
    reveal($$('[data-reveal]'), { threshold: 0.15 });
  }

  /* ---------- Inicio: espera breve a las fuentes para evitar saltos ---------- */
  function start() {
    const go = () => requestAnimationFrame(() => root.classList.add('is-ready'));
    if (!motionOK() || !document.fonts) { go(); return; }
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(go);
  }

  function init() {
    fillStatic();
    splitWords();
    initHero();
    initBrands();
    Collection.init();
    Sheet.init();
    initFinance();
    initHelmets();
    initMap();
    initReveal();
    initHeader();
    initMenu();
    initScrollMotion();
    initMagnetic();
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
