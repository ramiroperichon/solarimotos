/* ==========================================================================
   SOLARI MOTOS — Lógica de la página principal
   JavaScript puro, sin dependencias.
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
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const waLink = (msg = CFG.mensajeWhatsApp) =>
    `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}`;

  const motoMessage = (m) =>
    `Hola ${CFG.nombre}, quiero consultar por la ${m.marca} ${m.modelo} (${m.cilindrada} cc, ${m.anio}). ¿Está disponible y qué planes de financiación tienen?`;

  const STATUS = {
    disponible: 'Disponible',
    ultimas: 'Últimas unidades',
    pedido: 'A pedido',
    reservada: 'Reservada'
  };

  /* Imágenes: si una foto no carga, se muestra la ilustración de respaldo */
  function guardImage(img) {
    const fail = () => img.classList.add('is-broken');
    img.addEventListener('error', fail, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
  }

  /* ---------- Contenido dinámico ---------- */
  function fillContactInfo() {
    $$('[data-wa]').forEach((a) => { a.href = waLink(); });
    $$('[data-wa-visible]').forEach((el) => { el.textContent = CFG.whatsappVisible; });
    $$('[data-address]').forEach((el) => { el.textContent = `${CFG.direccion}, ${CFG.localidad}`; });
    $$('[data-phone]').forEach((a) => { a.href = `tel:${CFG.telefono.replace(/[^\d+]/g, '')}`; });
    $$('[data-email]').forEach((a) => { a.href = `mailto:${CFG.email}`; });
    $$('[data-email-text]').forEach((a) => { a.textContent = CFG.email; });
    $$('[data-social]').forEach((a) => { a.href = CFG.redes[a.dataset.social] || '#'; });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

    $$('[data-src-key]').forEach((img) => {
      const src = DATA.photos[img.dataset.srcKey] || (img.dataset.srcKey === 'shop' ? DATA.nosotros.fotos[0] : '');
      if (src) { guardImage(img); img.src = src; }
    });
  }

  function fillHero() {
    const m = DATA.motos.find((x) => x.destacada) || DATA.motos[0];
    const img = $('[data-hero-img]');
    if (img && m) {
      guardImage(img);
      img.src = m.imagenes[0];
      img.alt = `${m.marca} ${m.modelo}`;
      $('[data-hero-model]').textContent = `${m.marca} ${m.modelo}`;
      $('[data-hero-specs]').textContent = `${m.cilindrada} cc · ${m.anio} · ${m.categoria}`;
      $('[data-hero-price]').textContent = fmt(m.precio);
    }
  }

  function renderMarquee() {
    const track = $('[data-marquee]');
    if (!track) return;
    const items = DATA.marcas.map((b) => `<span class="marquee__item">${escapeHTML(b)}</span>`).join('');
    // Se duplica el contenido para que el desplazamiento sea continuo
    track.innerHTML = `<div class="marquee__group" style="display:flex">${items}</div><div class="marquee__group" style="display:flex" aria-hidden="true">${items}</div>`;
  }

  /* ---------- Tarjetas de motos ---------- */
  function cardHTML(m, i) {
    const cuotas = m.financiacion && m.financiacion.cuotas;
    return `
      <article class="moto-card" style="--i:${i}" data-tilt>
        <div class="moto-card__media">
          <img src="${escapeHTML(m.imagenes[0])}" alt="${escapeHTML(`${m.marca} ${m.modelo}`)}" loading="lazy" decoding="async" width="800" height="600">
          <span class="moto-card__status status--${m.disponibilidad}">${STATUS[m.disponibilidad] || ''}</span>
          ${m.etiqueta ? `<span class="moto-card__ribbon">${escapeHTML(m.etiqueta)}</span>` : ''}
          <span class="moto-card__cc" aria-hidden="true">${m.cilindrada}<small>cc</small></span>
        </div>
        <div class="moto-card__body">
          <div>
            <p class="moto-card__brand">${escapeHTML(m.marca)}</p>
            <h3 class="moto-card__title">${escapeHTML(m.modelo)}</h3>
          </div>
          <ul class="moto-card__specs" aria-label="Características">
            <li>${m.cilindrada} cc</li>
            <li>${m.anio}</li>
            <li>${escapeHTML(m.categoria)}</li>
          </ul>
          <div class="moto-card__foot">
            <p class="moto-card__price">
              <small>Precio de contado</small>
              <strong>${fmt(m.precio)}</strong>
              ${cuotas ? `<span class="moto-card__fin">Hasta ${cuotas} cuotas · ver planes</span>` : ''}
            </p>
            <a class="moto-card__cta" href="${waLink(motoMessage(m))}" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp por la ${escapeHTML(`${m.marca} ${m.modelo}`)}">
              <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg>
            </a>
          </div>
        </div>
      </article>`;
  }

  function initFeatured() {
    const grid = $('[data-featured-grid]');
    const tabsEl = $('[data-filter-tabs]');
    if (!grid || !tabsEl) return;

    const featured = DATA.motos.filter((m) => m.destacada);
    const cats = ['Todas', ...DATA.categorias.filter((c) => featured.some((m) => m.categoria === c))];
    const indicator = $('.filter-tabs__indicator', tabsEl);

    cats.forEach((c, i) => {
      const n = c === 'Todas' ? featured.length : featured.filter((m) => m.categoria === c).length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.dataset.cat = c;
      b.innerHTML = `${c}<span class="filter-tab__count">${String(n).padStart(2, '0')}</span>`;
      tabsEl.appendChild(b);
    });

    const moveIndicator = () => {
      const active = $('.filter-tab[aria-selected="true"]', tabsEl);
      if (!active) return;
      indicator.style.setProperty('--x', `${active.offsetLeft}px`);
      indicator.style.setProperty('--w', `${active.offsetWidth}px`);
    };

    let current = 'Todas';
    let busy = false;

    const draw = (cat, animate) => {
      const list = cat === 'Todas' ? featured : featured.filter((m) => m.categoria === cat);
      grid.classList.toggle('moto-grid--editorial', cat === 'Todas' && list.length > 3);
      grid.innerHTML = list.length
        ? list.map(cardHTML).join('')
        : '<p class="moto-grid__empty">No hay motos en esta categoría por ahora.</p>';
      $$('img', grid).forEach(guardImage);
      if (animate && motionOK()) {
        $$('.moto-card', grid).forEach((card) => {
          card.classList.add('is-entering');
          card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
        });
      }
      bindTilt(grid);
    };

    tabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-tab');
      if (!btn || btn.dataset.cat === current || busy) return;
      current = btn.dataset.cat;
      $$('.filter-tab', tabsEl).forEach((t) => t.setAttribute('aria-selected', String(t === btn)));
      moveIndicator();
      btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: motionOK() ? 'smooth' : 'auto' });

      if (!motionOK()) { draw(current, false); return; }
      busy = true;
      $$('.moto-card', grid).forEach((c) => c.classList.add('is-leaving'));
      setTimeout(() => { draw(current, true); busy = false; }, 280);
    });

    // Navegación con flechas entre pestañas
    tabsEl.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const tabs = $$('.filter-tab', tabsEl);
      const idx = tabs.indexOf(document.activeElement);
      if (idx < 0) return;
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });

    draw(current, false);
    // Entrada escalonada la primera vez que la grilla aparece
    grid.classList.add('reveal-stagger');
    $$('.moto-card', grid).forEach((c, i) => c.style.setProperty('--i', i));
    observeOnce(grid, () => grid.classList.add('is-in'), 0.08);

    requestAnimationFrame(moveIndicator);
    window.addEventListener('resize', moveIndicator, { passive: true });
    if (document.fonts) document.fonts.ready.then(moveIndicator);
  }

  /* ---------- Estadísticas con contador ---------- */
  function initStats() {
    const wrap = $('[data-stats]');
    if (!wrap) return;
    wrap.innerHTML = DATA.nosotros.stats.map((s, i) => `
      <div class="stat" data-reveal style="--i:${i}">
        <p class="stat__value"><span class="stat__num" data-count="${s.valor}">0</span><span>${escapeHTML(s.sufijo)}</span></p>
        <p class="stat__label">${escapeHTML(s.etiqueta)}</p>
      </div>`).join('');

    const nf = new Intl.NumberFormat('es-AR');
    $$('[data-count]', wrap).forEach((el) => {
      const target = Number(el.dataset.count);
      if (!motionOK()) { el.textContent = nf.format(target); return; }
      observeOnce(el, () => {
        const dur = 1800;
        const t0 = performance.now();
        const tick = (now) => {
          const p = clamp((now - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = nf.format(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 0.6);
    });
  }

  /* ---------- Financiación ---------- */
  function initFinance() {
    const F = DATA.financiacion;

    const steps = $('[data-steps]');
    if (steps) {
      steps.classList.add('reveal-stagger');
      steps.innerHTML = F.pasos.map((p, i) => `
        <li class="step" style="--i:${i}">
          <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
          <h3>${escapeHTML(p.titulo)}</h3>
          <p>${escapeHTML(p.texto)}</p>
          <span class="step__bar" aria-hidden="true"></span>
        </li>`).join('');
      observeOnce(steps, () => {
        steps.classList.add('is-in');
        $$('.step', steps).forEach((s) => s.classList.add('is-in'));
      }, 0.2);
    }

    const req = $('[data-requisitos]');
    if (req) req.innerHTML = F.requisitos.map((r) => `<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>${escapeHTML(r)}</span></li>`).join('');

    const med = $('[data-medios]');
    if (med) med.innerHTML = F.medios.map((m) => `<li>${escapeHTML(m)}</li>`).join('');

    const note = $('[data-finance-note]');
    if (note) note.textContent = F.aviso;

    // Simulador
    const sel = $('[data-sim-moto]');
    const range = $('[data-sim-entrega]');
    const plansEl = $('[data-sim-plans]');
    if (!sel || !range || !plansEl) return;

    sel.innerHTML = DATA.motos.map((m) => `<option value="${m.id}">${escapeHTML(`${m.marca} ${m.modelo}`)} — ${fmt(m.precio)}</option>`).join('');
    range.min = F.entregaMinima;
    range.max = F.entregaMaxima;
    range.value = Math.max(F.entregaMinima, 30);

    let plan = F.planes.includes(12) ? 12 : F.planes[0];
    plansEl.innerHTML = F.planes.map((n) => `<button type="button" class="chip" data-plan="${n}" aria-pressed="${n === plan}">${n}</button>`).join('');

    const out = {
      entregaPct: $('[data-sim-entrega-out]'),
      cuota: $('[data-sim-cuota]'),
      entrega: $('[data-sim-entrega-monto]'),
      saldo: $('[data-sim-saldo]'),
      wa: $('[data-sim-wa]')
    };

    let shown = 0;
    let raf = 0;
    const animateValue = (to) => {
      cancelAnimationFrame(raf);
      if (!motionOK()) { shown = to; out.cuota.innerHTML = `${fmt(to)}<small>/ mes</small>`; return; }
      const from = shown;
      const t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / 600, 0, 1);
        shown = lerp(from, to, 1 - Math.pow(1 - p, 3));
        out.cuota.innerHTML = `${fmt(shown)}<small>/ mes</small>`;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const update = () => {
      const m = DATA.motos.find((x) => x.id === sel.value) || DATA.motos[0];
      const pct = Number(range.value);
      const entrega = m.precio * pct / 100;
      const saldo = m.precio - entrega;
      const coef = F.coeficientesDemo[plan] || 1;
      const cuota = saldo * coef / plan;

      const fill = ((pct - range.min) / (range.max - range.min)) * 100;
      range.style.setProperty('--fill', `${fill}%`);
      out.entregaPct.textContent = `${pct}%`;
      out.entrega.textContent = fmt(entrega);
      out.saldo.textContent = fmt(saldo);
      animateValue(cuota);

      out.wa.href = waLink(`Hola ${CFG.nombre}, simulé un plan para la ${m.marca} ${m.modelo}: entrega del ${pct}% (${fmt(entrega)}) y ${plan} cuotas. ¿Me pasan las condiciones vigentes?`);
    };

    plansEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-plan]');
      if (!b) return;
      plan = Number(b.dataset.plan);
      $$('[data-plan]', plansEl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      update();
    });
    sel.addEventListener('change', update);
    range.addEventListener('input', update);
    update();
  }

  /* ---------- Promociones ---------- */
  function initPromos() {
    const wrap = $('[data-promos]');
    if (!wrap) return;
    wrap.classList.add('reveal-stagger');
    wrap.innerHTML = DATA.promociones.map((p, i) => `
      <article class="promo ${p.destacada ? 'promo--hot' : ''}" style="--i:${i}">
        <div class="promo__top">
          <span class="promo__tag">${escapeHTML(p.etiqueta)}</span>
          <span class="promo__index">${String(i + 1).padStart(2, '0')} / ${String(DATA.promociones.length).padStart(2, '0')}</span>
        </div>
        <div>
          <h3>${escapeHTML(p.titulo)}</h3>
          <p>${escapeHTML(p.bajada)}</p>
        </div>
        <div class="promo__foot">
          <span>${escapeHTML(p.vigencia)}</span>
          <a class="promo__go" href="${waLink(`Hola ${CFG.nombre}, quiero información sobre la promoción "${p.titulo}".`)}" target="_blank" rel="noopener" aria-label="Consultar por la promoción ${escapeHTML(p.titulo)}">
            <svg class="icon" aria-hidden="true"><use href="#i-arrow-ur"/></svg>
          </a>
        </div>
      </article>`).join('');
    observeOnce(wrap, () => wrap.classList.add('is-in'), 0.15);
  }

  /* ---------- Horarios y estado "abierto ahora" ---------- */
  function initHours() {
    const dl = $('[data-hours]');
    const status = $('[data-open-status]');
    const now = new Date();
    const day = now.getDay();
    const todayGroup = day === 0 ? 2 : day === 6 ? 1 : 0;

    if (dl) {
      dl.innerHTML = CFG.horariosTexto.map(([d, h], i) =>
        `<div class="${i === todayGroup ? 'is-today' : ''}"><dt>${escapeHTML(d)}</dt><dd>${escapeHTML(h)}</dd></div>`).join('');
    }
    if (status) {
      const mins = now.getHours() * 60 + now.getMinutes();
      const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const open = (CFG.horarios[day] || []).some(([a, b]) => mins >= toMin(a) && mins < toMin(b));
      status.textContent = open ? 'Abierto ahora' : 'Cerrado ahora';
      status.classList.toggle('is-open', open);
    }
  }

  /* ---------- Mapa (se carga bajo demanda para no frenar la página) ---------- */
  function initMap() {
    const frame = $('[data-map]');
    const btn = $('[data-map-load]');
    if (!frame || !btn) return;
    const load = () => {
      if (frame.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.title = `Ubicación de ${CFG.nombre} en el mapa`;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(CFG.mapaQuery)}&output=embed`;
      frame.appendChild(iframe);
      btn.remove();
    };
    btn.addEventListener('click', load);
    // También se carga solo cuando el usuario llega cerca de la sección
    observeOnce(frame, load, 0.01, '200px');
  }

  /* ---------- Observador genérico ---------- */
  function observeOnce(el, cb, threshold = 0.15, rootMargin = '0px 0px -8% 0px') {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); }
      });
    }, { threshold, rootMargin });
    io.observe(el);
  }

  function initReveal() {
    const els = $$('[data-reveal]');
    if (!motionOK() || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    // Los títulos con máscara (clip-path) tienen área visible nula al inicio,
    // por lo que el observador no los detecta: se observa su contenedor.
    const proxied = new Map();
    const ioProxy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        (proxied.get(en.target) || []).forEach((el) => el.classList.add('is-in'));
        ioProxy.unobserve(en.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

    els.forEach((el) => {
      if (el.dataset.reveal === 'clip') {
        const parent = el.parentElement;
        if (!proxied.has(parent)) { proxied.set(parent, []); ioProxy.observe(parent); }
        proxied.get(parent).push(el);
      } else {
        io.observe(el);
      }
    });
  }

  /* ---------- Header, progreso y botón flotante ---------- */
  function initHeader() {
    const header = $('[data-header]');
    const bar = $('.scroll-progress');
    const wa = $('.wa-float');
    const hero = $('.hero');
    const navLinks = $$('.nav__link');
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);

      header.classList.toggle('is-scrolled', y > 40);
      const goingDown = y > lastY;
      const menuOpen = document.body.classList.contains('menu-open');
      header.classList.toggle('is-hidden', goingDown && y > 400 && !menuOpen);
      lastY = y;

      if (wa && hero) wa.classList.toggle('is-visible', y > hero.offsetHeight * 0.6);
    };

    // Resaltado de la sección activa en la navegación
    if ('IntersectionObserver' in window) {
      const map = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const link = map.get(en.target.id);
          if (link && en.isIntersecting) {
            navLinks.forEach((l) => l.classList.toggle('is-active', l === link));
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    const btn = $('[data-menu-toggle]');
    const menu = $('[data-mobile-menu]');
    if (!btn || !menu) return;
    $$('.mobile-menu__list a', menu).forEach((a, i) => a.style.setProperty('--i', i));
    const focusables = () => $$('a, button', menu).concat(btn);

    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      $('.visually-hidden', btn).textContent = open ? 'Cerrar menú' : 'Abrir menú';
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) setTimeout(() => { const f = $('a', menu); if (f) f.focus({ preventScroll: true }); }, 350);
    };

    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); btn.focus(); }
      if (e.key === 'Tab') {
        const f = focusables();
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Movimiento ligado al scroll (parallax, marquee, texto cinético) ---------- */
  function initScrollMotion() {
    if (!motionOK()) return;
    const parallax = $$('[data-parallax]');
    const kinetic = $$('[data-kinetic]');
    const track = $('[data-marquee]');
    let marqueeX = 0;
    let velocity = 0;
    let lastY = window.scrollY;
    let skew = 0;

    const loop = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const delta = y - lastY;
      lastY = y;
      velocity = lerp(velocity, delta, 0.1);

      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = Number(el.dataset.parallax) || 0.1;
        const center = r.top + r.height / 2 - vh / 2;
        el.style.translate = `0 ${(center * speed).toFixed(1)}px`;
      });

      kinetic.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const progress = (vh - r.top) / (vh + r.height);
        const dir = Number(el.dataset.kinetic);
        el.style.setProperty('--kx', `${(dir * (progress * 40 - 20)).toFixed(2)}%`);
      });

      if (track) {
        const half = track.scrollWidth / 2;
        // Velocidad base + impulso según la velocidad del scroll
        marqueeX -= 0.6 + Math.abs(velocity) * 0.5;
        if (half > 0 && -marqueeX >= half) marqueeX += half;
        skew = lerp(skew, clamp(velocity * -0.4, -10, 10), 0.12);
        track.style.setProperty('--mx', `${marqueeX.toFixed(2)}px`);
        track.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Interacciones con el puntero ---------- */
  function initHeroTilt() {
    const media = $('[data-tilt-hero]');
    if (!media || !motionOK() || !finePointer.matches) return;
    const frame = $('.hero__frame', media);
    const img = $('.hero__img', media);
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.setProperty('--rx', `${(x * 8).toFixed(2)}deg`);
      frame.style.setProperty('--ry', `${(-y * 6).toFixed(2)}deg`);
      img.style.setProperty('--px', `${(-x * 22).toFixed(1)}px`);
      img.style.setProperty('--py', `${(-y * 16).toFixed(1)}px`);
    });
    hero.addEventListener('pointerleave', () => {
      ['--rx', '--ry'].forEach((p) => frame.style.setProperty(p, '0deg'));
      ['--px', '--py'].forEach((p) => img.style.setProperty(p, '0px'));
    });
  }

  function bindTilt(ctx = document) {
    if (!motionOK() || !finePointer.matches) return;
    $$('[data-tilt]', ctx).forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = '1';
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ty', `${((x - 0.5) * 6).toFixed(2)}deg`);
        card.style.setProperty('--tx', `${((0.5 - y) * 6).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tx', '0deg');
        card.style.setProperty('--ty', '0deg');
      });
    });
  }

  function initMagnetic() {
    if (!motionOK() || !finePointer.matches) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.translate = `${(x * 0.18).toFixed(1)}px ${(y * 0.3).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ---------- Preloader + inicio ---------- */
  function startIntro() {
    const pre = $('.preloader');
    const count = $('[data-preloader-count]');
    const reveal = () => {
      if (pre) pre.classList.add('is-done');
      requestAnimationFrame(() => root.classList.add('is-ready'));
    };

    if (!pre || !motionOK()) { reveal(); return; }

    // Contador breve (máx. ~1,1 s) para no demorar la navegación
    const t0 = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      if (count) count.textContent = String(Math.round(p * 100)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(reveal, 120);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Arranque ---------- */
  function init() {
    fillContactInfo();
    fillHero();
    renderMarquee();
    initFeatured();
    initStats();
    initFinance();
    initPromos();
    initHours();
    initMap();
    initReveal();
    initHeader();
    initMenu();
    initScrollMotion();
    initHeroTilt();
    initMagnetic();
    startIntro();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
