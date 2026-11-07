/* ==========================================================================
   SOLARI MOTOS — Catálogo
   Filtros: marca, categoría, cilindrada, precio máximo y disponibilidad.
   El estado se refleja en la URL (?marca=Honda&cat=Calle…) para poder
   compartir una búsqueda.
   ========================================================================== */

(function () {
  'use strict';

  const S = window.Solari;
  if (!S) return;
  const { DATA, $, $$, esc, fmt, pad, motionOK } = S;
  const MOTOS = DATA.motos;

  /* Rangos de cilindrada: solo se muestran los que tienen motos */
  const CC = [
    { key: 'hasta125', label: 'Hasta 125 cc', test: (cc) => cc <= 125 },
    { key: '126a250', label: '126 a 250 cc', test: (cc) => cc > 125 && cc <= 250 },
    { key: 'mas250', label: 'Más de 250 cc', test: (cc) => cc > 250 }
  ].filter((r) => MOTOS.some((m) => r.test(m.cilindrada)));

  const CATS = Array.from(new Set(MOTOS.map((m) => m.categoria)));
  const prices = MOTOS.filter(S.hasPrice).map((m) => m.precio);
  const STEP = 50000;
  const P_MIN = prices.length ? Math.floor(Math.min(...prices) / STEP) * STEP : 0;
  const P_MAX = prices.length ? Math.ceil(Math.max(...prices) / STEP) * STEP : 0;

  const state = { marca: 'Todas', cats: new Set(), cc: new Set(), max: P_MAX, disp: false, orden: 'destacadas' };

  const el = {
    brands: $('[data-f-brands]'),
    toggle: $('[data-f-toggle]'),
    count: $('[data-f-count]'),
    panel: $('[data-filters]'),
    cats: $('[data-f-cats]'),
    cc: $('[data-f-cc]'),
    price: $('[data-f-price]'),
    priceOut: $('[data-f-price-out]'),
    disp: $('[data-f-available]'),
    sort: $('[data-f-sort]'),
    results: $('[data-results]'),
    rCount: $('[data-r-count]'),
    rLabel: $('[data-r-label]'),
    tags: $('[data-active-tags]'),
    empty: $('[data-empty]')
  };

  /* ---------- URL ⇄ estado ---------- */
  function readURL() {
    const q = new URLSearchParams(location.search);
    const marca = q.get('marca');
    if (marca && MOTOS.some((m) => m.marca === marca)) state.marca = marca;
    (q.get('cat') || '').split(',').filter((c) => CATS.includes(c)).forEach((c) => state.cats.add(c));
    (q.get('cc') || '').split(',').filter((k) => CC.some((r) => r.key === k)).forEach((k) => state.cc.add(k));
    const max = Number(q.get('max'));
    if (max && max >= P_MIN && max < P_MAX) state.max = max;
    state.disp = q.get('disp') === '1';
    const orden = q.get('orden');
    if (orden && $(`option[value="${CSS.escape(orden)}"]`, el.sort)) state.orden = orden;
  }

  function writeURL() {
    const q = new URLSearchParams();
    if (state.marca !== 'Todas') q.set('marca', state.marca);
    if (state.cats.size) q.set('cat', [...state.cats].join(','));
    if (state.cc.size) q.set('cc', [...state.cc].join(','));
    if (state.max < P_MAX) q.set('max', state.max);
    if (state.disp) q.set('disp', '1');
    if (state.orden !== 'destacadas') q.set('orden', state.orden);
    const qs = q.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }

  /* ---------- Filtrado ---------- */
  function apply() {
    let list = MOTOS.filter((m) =>
      (state.marca === 'Todas' || m.marca === state.marca) &&
      (!state.cats.size || state.cats.has(m.categoria)) &&
      (!state.cc.size || CC.some((r) => state.cc.has(r.key) && r.test(m.cilindrada))) &&
      (state.max >= P_MAX || (S.hasPrice(m) && m.precio <= state.max)) &&
      (!state.disp || m.disponibilidad === 'disponible' || m.disponibilidad === 'ultima'));

    const byPrice = (d) => (a, b) => {
      if (!S.hasPrice(a)) return 1;
      if (!S.hasPrice(b)) return -1;
      return d * (a.precio - b.precio);
    };
    const sorters = {
      'precio-asc': byPrice(1),
      'precio-desc': byPrice(-1),
      'cc-asc': (a, b) => a.cilindrada - b.cilindrada,
      'cc-desc': (a, b) => b.cilindrada - a.cilindrada
    };
    if (sorters[state.orden]) list = [...list].sort(sorters[state.orden]);
    return list;
  }

  function extraCount() {
    return state.cats.size + state.cc.size + (state.max < P_MAX ? 1 : 0) + (state.disp ? 1 : 0);
  }

  /* ---------- Render ---------- */
  let shown = -1;
  function animateCount(n) {
    if (!motionOK() || shown < 0) { el.rCount.textContent = n; shown = n; return; }
    const from = shown;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 400);
      el.rCount.textContent = Math.round(from + (n - from) * p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    shown = n;
  }

  function renderTags() {
    const tags = [];
    if (state.marca !== 'Todas') tags.push(['marca', state.marca, state.marca]);
    state.cats.forEach((c) => tags.push(['cat', c, c]));
    state.cc.forEach((k) => tags.push(['cc', k, CC.find((r) => r.key === k).label]));
    if (state.max < P_MAX) tags.push(['max', '', `Hasta ${fmt(state.max)}`]);
    if (state.disp) tags.push(['disp', '', 'Disponibles hoy']);
    el.tags.innerHTML = tags.map(([type, val, label]) =>
      `<button type="button" class="tag" data-tag="${type}" data-val="${esc(val)}" aria-label="Quitar filtro ${esc(label)}">${esc(label)}<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>`).join('') +
      (tags.length > 1 ? '<button type="button" class="tag tag--clear" data-tag="all">Limpiar todo</button>' : '');
  }

  function syncControls() {
    $$('[data-chip]', el.brands).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chip === state.marca)));
    $$('[data-cat]', el.cats).forEach((c) => c.setAttribute('aria-pressed', String(state.cats.has(c.dataset.cat))));
    $$('[data-cc]', el.cc).forEach((c) => c.setAttribute('aria-pressed', String(state.cc.has(c.dataset.cc))));
    el.price.value = state.max;
    el.priceOut.textContent = state.max >= P_MAX ? 'Sin límite' : fmt(state.max);
    el.price.style.setProperty('--fill', `${((state.max - P_MIN) / ((P_MAX - P_MIN) || 1)) * 100}%`);
    el.disp.checked = state.disp;
    el.sort.value = state.orden;
    const n = extraCount();
    el.count.hidden = !n;
    el.count.textContent = n;
  }

  let timer = 0;
  function render(animate = true) {
    const list = apply();
    syncControls();
    renderTags();
    writeURL();
    animateCount(list.length);
    el.rLabel.textContent = list.length === 1 ? 'moto' : 'motos';
    el.empty.hidden = list.length > 0;

    const draw = () => {
      el.results.innerHTML = list.map((m, i) => S.motoCard(m, i, 'grid')).join('');
      S.guardAll(el.results);
      const cards = $$('.moto', el.results);
      if (animate) requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => c.classList.add('is-in'))));
      else S.reveal(cards, { threshold: 0.05 });
    };

    clearTimeout(timer);
    if (!animate || !motionOK() || !el.results.children.length) { draw(); return; }
    el.results.classList.add('is-leaving');
    timer = setTimeout(() => { el.results.classList.remove('is-leaving'); draw(); }, 260);
  }

  /* ---------- Controles ---------- */
  function buildControls() {
    const brands = S.brandList();
    el.brands.innerHTML = [{ marca: 'Todas', n: MOTOS.length }, ...brands].map((b) =>
      `<button type="button" class="chip" data-chip="${esc(b.marca)}">${esc(b.marca)}<sup>${pad(b.n)}</sup></button>`).join('');
    el.cats.innerHTML = CATS.map((c) => `<button type="button" class="chip chip--sm" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    el.cc.innerHTML = CC.map((r) => `<button type="button" class="chip chip--sm" data-cc="${r.key}">${r.label}</button>`).join('');

    el.price.min = P_MIN;
    el.price.max = P_MAX;
    el.price.step = STEP;
    if (!prices.length) el.price.closest('.filters__group').hidden = true;

    el.brands.addEventListener('click', (e) => {
      const c = e.target.closest('[data-chip]');
      if (!c || c.dataset.chip === state.marca) return;
      state.marca = c.dataset.chip;
      render();
    });
    const toggleSet = (set, val) => { if (set.has(val)) set.delete(val); else set.add(val); render(); };
    el.cats.addEventListener('click', (e) => { const c = e.target.closest('[data-cat]'); if (c) toggleSet(state.cats, c.dataset.cat); });
    el.cc.addEventListener('click', (e) => { const c = e.target.closest('[data-cc]'); if (c) toggleSet(state.cc, c.dataset.cc); });

    el.price.addEventListener('input', () => {
      state.max = Number(el.price.value);
      syncControls();
    });
    el.price.addEventListener('change', () => render());
    el.disp.addEventListener('change', () => { state.disp = el.disp.checked; render(); });
    el.sort.addEventListener('change', () => { state.orden = el.sort.value; render(); });

    el.tags.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tag]');
      if (!t) return;
      const { tag, val } = t.dataset;
      if (tag === 'marca') state.marca = 'Todas';
      if (tag === 'cat') state.cats.delete(val);
      if (tag === 'cc') state.cc.delete(val);
      if (tag === 'max') state.max = P_MAX;
      if (tag === 'disp') state.disp = false;
      if (tag === 'all') reset(false);
      render();
    });
    $$('[data-f-reset]').forEach((b) => b.addEventListener('click', () => { reset(false); render(); }));

    // Panel de filtros: se despliega con animación de altura
    el.panel.hidden = false;
    el.panel.inert = true;
    el.toggle.addEventListener('click', () => {
      const open = el.toggle.getAttribute('aria-expanded') !== 'true';
      el.toggle.setAttribute('aria-expanded', String(open));
      el.panel.classList.toggle('is-open', open);
      el.panel.inert = !open;
    });
  }

  function reset() {
    state.marca = 'Todas';
    state.cats.clear();
    state.cc.clear();
    state.max = P_MAX;
    state.disp = false;
  }

  function fillStats() {
    $('[data-stat-total]').textContent = pad(MOTOS.length);
    $('[data-stat-brands]').textContent = pad(S.brandList().length);
    $('[data-stat-available]').textContent = pad(MOTOS.filter((m) => m.disponibilidad === 'disponible' || m.disponibilidad === 'ultima').length);
  }

  /* La barra de filtros toma sombra cuando queda fija */
  function stickyShadow() {
    const bar = $('[data-catalog-bar]');
    if (!bar || !('IntersectionObserver' in window)) return;
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    bar.before(sentinel);
    new IntersectionObserver(([en]) => bar.classList.toggle('is-stuck', !en.isIntersecting), { rootMargin: '-90px 0px 0px 0px' }).observe(sentinel);
  }

  readURL();
  buildControls();
  fillStats();
  render(false);
  stickyShadow();
  S.renderHelmets($('[data-helmets]'));
  S.boot();
})();
