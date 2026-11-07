/* ==========================================================================
   SOLARI MOTOS — Página de inicio
   Usa los componentes compartidos de js/common.js (window.Solari).
   ========================================================================== */

(function () {
  'use strict';

  const S = window.Solari;
  if (!S) return;
  const { DATA, CFG, $, $$, esc, fmt, pad, motionOK } = S;

  /* ---------- Hero ---------- */
  function initHero() {
    const m = DATA.motos[0];
    const photo = $('[data-hero-photo]');
    if (!m || !photo) return;
    photo.innerHTML = CFG.heroImagen
      ? `<span class="ph" aria-hidden="true"></span><img class="img--foto" src="${esc(CFG.heroImagen)}" alt="${esc(S.fullName(m))}" fetchpriority="high" decoding="async" width="600" height="1300">`
      : S.mediaHTML(m, 0, { eager: true });
    S.guardAll(photo);
    $('[data-hero-status]').outerHTML = S.statusHTML(m.disponibilidad);
    $('[data-hero-name]').textContent = S.fullName(m);
    $('[data-hero-meta]').textContent = `${m.cilindrada} cc · ${S.hasPrice(m) ? `Contado ${fmt(m.precio)}` : 'Consultar precio'}`;
    $('[data-hero-link]').href = S.detailURL(m);
  }

  /* ---------- Marcas ---------- */
  function initBrands() {
    const ul = $('[data-brands]');
    if (!ul) return;
    // Marcas con motos cargadas: filtran la colección.
    // Marcas sin motos en la web: abren una consulta por WhatsApp.
    ul.innerHTML = S.allBrands().map((b, i) => b.n
      ? `<li class="brand-item" style="--i:${i}">
          <button type="button" data-brand="${esc(b.marca)}" aria-label="Ver motos ${esc(b.marca)}">
            <span class="brand-item__name">${esc(b.marca)}</span>
            <span class="brand-item__count">${pad(b.n)} ${b.n === 1 ? 'modelo' : 'modelos'}</span>
          </button>
        </li>`
      : `<li class="brand-item brand-item--ask" style="--i:${i}">
          <a href="${S.waLink(`Hola ${CFG.nombre}, ¿qué modelos de ${b.marca} tienen disponibles?`)}" target="_blank" rel="noopener" aria-label="Consultar modelos ${esc(b.marca)} por WhatsApp">
            <span class="brand-item__name">${esc(b.marca)}</span>
            <span class="brand-item__count">Consultar</span>
          </a>
        </li>`).join('');
    ul.addEventListener('click', (e) => {
      const b = e.target.closest('[data-brand]');
      if (!b) return;
      Collection.filter(b.dataset.brand);
      $('#coleccion').scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' });
    });
    S.reveal($('.brands'), { threshold: 0.2 });
  }

  /* ---------- Colección editorial ---------- */
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

  const Collection = {
    grid: null, chips: null, current: 'Todas',

    init() {
      this.grid = $('[data-collection]');
      this.chips = $('[data-filter]');
      if (!this.grid) return;
      const brands = S.brandList();
      if (this.chips && brands.length > 1) {
        this.chips.innerHTML = [{ marca: 'Todas', n: DATA.motos.length }, ...brands].map((b) =>
          `<button type="button" class="chip" data-chip="${esc(b.marca)}" aria-pressed="${b.marca === 'Todas'}">${esc(b.marca)}<sup>${pad(b.n)}</sup></button>`).join('');
        this.chips.addEventListener('click', (e) => { const c = e.target.closest('[data-chip]'); if (c) this.filter(c.dataset.chip); });
      } else if (this.chips) {
        this.chips.remove();
      }
      this.render(false);
    },

    render(animate) {
      const list = this.current === 'Todas' ? DATA.motos : DATA.motos.filter((m) => m.marca === this.current);
      const sizes = layoutSizes(list.length);
      this.grid.innerHTML = list.map((m, i) => S.motoCard(m, i, sizes[i], list.length)).join('');
      S.guardAll(this.grid);
      const cards = $$('.moto', this.grid);
      if (animate) requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => c.classList.add('is-in'))));
      else S.reveal(cards, { threshold: 0.08 });
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
          <a class="link-arrow way__cta" href="${S.waLink(`Hola ${CFG.nombre}, ${a.consulta}.`)}" target="_blank" rel="noopener">
            <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Consultar
          </a>
        </li>`).join('');
      S.reveal($$('.way', ways), { threshold: 0.2 });
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
    const preview = $('[data-b-preview]', form);
    const send = $('[data-b-send]', form);
    const estimate = $('[data-b-estimate]', form);

    sel.innerHTML = DATA.motos.map((m) => `<option value="${esc(m.id)}">${esc(S.fullName(m))}</option>`).join('') +
      '<option value="">Todavía no lo decidí</option>';

    const state = { entrega: F.entregaOpciones[0], cuotas: F.cuotasOpciones.includes(12) ? 12 : F.cuotasOpciones[0] };
    const seg = (el, opts, key) => {
      el.innerHTML = opts.map((o) => `<button type="button" data-v="${esc(o)}" aria-pressed="${String(o) === String(state[key])}">${esc(o)}</button>`).join('');
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        state[key] = isNaN(Number(b.dataset.v)) ? b.dataset.v : Number(b.dataset.v);
        $$('[data-v]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        update();
      });
    };
    seg($('[data-b-entrega]', form), F.entregaOpciones, 'entrega');
    seg($('[data-b-cuotas]', form), F.cuotasOpciones, 'cuotas');

    /* Monto de la entrega: se escribe libre y se formatea con puntos de miles */
    const amountWrap = $('[data-b-amount-wrap]', form);
    const amount = $('[data-b-amount]', form);
    const hint = $('[data-b-amount-hint]', form);
    const quick = $('[data-b-quick]', form);
    const nameInput = $('[data-b-name]', form);
    const nf = new Intl.NumberFormat('es-AR');
    const readAmount = () => Number(amount.value.replace(/\D/g, '')) || 0;

    const quickValues = () => {
      const m = DATA.motos.find((x) => x.id === sel.value);
      if (m && S.hasPrice(m)) {
        return [0.2, 0.3, 0.5].map((p) => ({ v: Math.round((m.precio * p) / 50000) * 50000, label: `${p * 100}%` }));
      }
      return [300000, 500000, 1000000].map((v) => ({ v, label: '' }));
    };
    const renderQuick = () => {
      quick.innerHTML = quickValues().map((q) =>
        `<button type="button" class="chip chip--sm" data-q="${q.v}">${fmt(q.v)}${q.label ? ` <sup>${q.label}</sup>` : ''}</button>`).join('');
    };
    quick.addEventListener('click', (e) => {
      const b = e.target.closest('[data-q]');
      if (!b) return;
      amount.value = nf.format(Number(b.dataset.q));
      update();
    });
    amount.addEventListener('input', () => {
      const n = readAmount();
      amount.value = n ? nf.format(n) : '';
      update();
    });
    nameInput.addEventListener('input', update);

    function update() {
      const m = DATA.motos.find((x) => x.id === sel.value);
      const withEntrega = state.entrega !== F.entregaOpciones[0];
      amountWrap.hidden = !withEntrega;
      const monto = withEntrega ? readAmount() : 0;

      // Referencia del monto respecto del precio de contado
      if (withEntrega && m && S.hasPrice(m) && monto) {
        const pct = Math.round((monto / m.precio) * 100);
        hint.textContent = monto >= m.precio
          ? 'El monto cubre el precio de contado de referencia.'
          : `Equivale al ${pct}% del precio de contado de referencia. Saldo aproximado a financiar: ${fmt(m.precio - monto)}.`;
      } else {
        hint.textContent = withEntrega ? 'Escribí el monto aproximado o elegí una opción rápida.' : '';
      }

      const nombre = nameInput.value.trim();
      const entregaTxt = !withEntrega
        ? 'No tengo entrega'
        : monto ? `Tengo ${fmt(monto)} para entregar` : 'Tengo una entrega (monto a definir)';
      const msg = `Hola ${CFG.nombre}${nombre ? `, soy ${nombre}` : ''}. ` +
        `${m ? `Me interesa la ${S.fullName(m)}.` : 'Estoy buscando una moto y todavía no decidí el modelo.'} ` +
        `${entregaTxt} y me gustaría pagar el resto en ${state.cuotas} cuotas. ` +
        '¿Qué plan de financiación me pueden armar y qué requisitos necesito?';
      preview.textContent = msg;
      send.href = S.waLink(msg);

      // Estimación solo si el negocio cargó coeficientes reales
      const coef = F.coeficientes && F.coeficientes[state.cuotas];
      if (coef && m && S.hasPrice(m) && monto < m.precio) {
        estimate.hidden = false;
        estimate.innerHTML = `<span class="builder__preview-label">Cuota estimada</span>
          <strong class="builder__amount">${fmt(((m.precio - monto) * coef) / state.cuotas)} <small>/ mes</small></strong>
          <small>Referencia sujeta a aprobación y condiciones vigentes.</small>`;
      } else {
        estimate.hidden = true;
      }
    }

    // Moto preseleccionada desde la ficha: index.html?moto=<id>#financiacion
    const pre = new URLSearchParams(location.search).get('moto');
    if (pre && DATA.motos.some((x) => x.id === pre)) sel.value = pre;

    sel.addEventListener('change', () => { renderQuick(); update(); });
    renderQuick();
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
        <a class="wa-round" href="${S.waLink(`Hola ${CFG.nombre}, quiero información sobre "${p.titulo}".`)}" target="_blank" rel="noopener" aria-label="Consultar por ${esc(p.titulo)}">
          <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg>
        </a>
      </article>`).join('');
    S.reveal($$('.ticket', list), { threshold: 0.2 });
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

  /* ---------- Movimiento ligado al scroll ---------- */
  function initScrollMotion() {
    if (!motionOK()) return;
    const hero = $('.hero');
    const photo = $('[data-hero-photo]');
    const parallax = $$('[data-parallax]');
    let ticking = false;
    const frame = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (hero && photo && y < hero.offsetHeight) {
        photo.style.setProperty('--py', `${(y * 0.12).toFixed(1)}px`);
        photo.style.setProperty('--ps', (1.04 + (y / hero.offsetHeight) * 0.06).toFixed(3));
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

  initHero();
  initBrands();
  Collection.init();
  initFinance();
  S.renderHelmets($('[data-helmets]'));
  initMap();
  initScrollMotion();
  S.boot();
})();
