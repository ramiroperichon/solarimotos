/* ==========================================================================
   SOLARI MOTOS — Ficha de moto (detalle.html?moto=<id>)
   ========================================================================== */

(function () {
  'use strict';

  const S = window.Solari;
  if (!S) return;
  const { DATA, CFG, $, $$, esc, pad, motionOK } = S;
  const MOTOS = DATA.motos;

  const id = new URLSearchParams(location.search).get('moto');
  const idx = MOTOS.findIndex((m) => m.id === id);
  const wrap = $('[data-product]');

  /* ---------- Moto inexistente ---------- */
  if (idx < 0) {
    document.title = 'Moto no encontrada — Solari Motos';
    wrap.innerHTML = `
      <div class="container product__missing">
        <p class="label">Ficha no encontrada</p>
        <h1 class="title">Esta moto ya no está <em>en el catálogo.</em></h1>
        <p class="head__intro">Puede que se haya vendido o que el enlace esté incompleto. Mirá las motos disponibles o consultanos.</p>
        <div class="product__missing-actions">
          <a class="btn btn--dark btn--lg" href="catalogo.html"><span>Ver catálogo</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>
          <a class="btn btn--line btn--lg" href="#" data-wa target="_blank" rel="noopener"><svg class="icon icon--wa" aria-hidden="true"><use href="#i-wa"/></svg><span>Consultar</span></a>
        </div>
      </div>`;
    $('[data-related-wrap]').remove();
    S.boot();
    return;
  }

  const m = MOTOS[idx];
  const name = S.fullName(m);
  const prev = MOTOS[(idx - 1 + MOTOS.length) % MOTOS.length];
  const next = MOTOS[(idx + 1) % MOTOS.length];
  const imgs = m.imagenes || [];

  /* ---------- SEO básico ---------- */
  document.title = `${name} ${m.cilindrada} cc — Solari Motos`;
  const desc = `${name} 0km (${m.cilindrada} cc). ${m.resumen || ''} Precio de contado y alternativas de financiación en Solari Motos.`;
  $('meta[name="description"]').setAttribute('content', desc);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    brand: { '@type': 'Brand', name: m.marca },
    description: m.resumen || '',
    ...(S.hasPrice(m) && !CFG.demo ? { offers: { '@type': 'Offer', priceCurrency: 'ARS', price: m.precio } } : {})
  });
  document.head.appendChild(ld);

  /* ---------- Ficha técnica: admite lista simple o grupos { 'Motor': [[k, v]] } ---------- */
  function specsHTML(moto) {
    const rows = (list) => list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const general = [['Marca', moto.marca], ['Modelo', moto.modelo], ['Cilindrada', `${moto.cilindrada} cc`], ['Año', String(moto.anio)]];
    const f = moto.ficha || [];
    if (Array.isArray(f)) return `<dl class="specs">${rows(general.concat(f))}</dl>`;
    return `<section class="specs-group"><h3>General</h3><dl class="specs">${rows(general)}</dl></section>` +
      Object.keys(f).map((g) => `<section class="specs-group"><h3>${esc(g)}</h3><dl class="specs">${rows(f[g])}</dl></section>`).join('');
  }

  /* ---------- Ficha ---------- */
  const thumbs = imgs.length > 1
    ? `<div class="gallery__thumbs" role="group" aria-label="Fotos de la ${esc(name)}">
        ${imgs.map((x, i) => `<button type="button" data-thumb="${i}" aria-label="Foto ${i + 1}" aria-current="${i === 0}"><img class="${S.imgClass(x)}" src="${esc(S.imgSrc(x))}" alt="" loading="lazy"></button>`).join('')}
      </div>`
    : '';

  wrap.innerHTML = `
    <div class="container">
      <div class="product__top" data-in style="--d:0">
        <nav class="crumbs" aria-label="Ruta de navegación">
          <a href="index.html">Inicio</a><span aria-hidden="true">/</span>
          <a href="catalogo.html">Catálogo</a><span aria-hidden="true">/</span>
          <span aria-current="page">${esc(name)}</span>
        </nav>
        <div class="product__pager">
          <a class="icon-btn" href="${S.detailURL(prev)}" aria-label="Anterior: ${esc(S.fullName(prev))}"><svg class="icon" aria-hidden="true"><use href="#i-prev"/></svg></a>
          <span>${pad(idx + 1)} / ${pad(MOTOS.length)}</span>
          <a class="icon-btn" href="${S.detailURL(next)}" aria-label="Siguiente: ${esc(S.fullName(next))}"><svg class="icon" aria-hidden="true"><use href="#i-next"/></svg></a>
        </div>
      </div>

      <div class="product__grid">
        <div class="product__gallery">
          ${m.vista360 ? `
          <div class="gallery-tabs" role="tablist" aria-label="Ver la moto">
            <button type="button" role="tab" class="tab-360" id="tab-360" aria-controls="panel-360" aria-selected="true" data-tab="360"><b>360°</b> Girala</button>
            <button type="button" role="tab" id="tab-fotos" aria-controls="panel-fotos" aria-selected="false" data-tab="fotos">Fotos (${imgs.length})</button>
          </div>
          <div class="product__spin" id="panel-360" role="tabpanel" aria-labelledby="tab-360" data-panel="360"></div>` : ''}
          <div id="panel-fotos" ${m.vista360 ? 'role="tabpanel" aria-labelledby="tab-fotos" hidden' : ''} data-panel="fotos">
          <figure class="gallery__main product__photo" data-gallery>
            ${S.mediaHTML(m, 0, { eager: true })}
            ${m.etiqueta ? `<span class="moto__badge">${esc(m.etiqueta)}</span>` : ''}
            ${!imgs.length ? '<figcaption class="product__soon"><svg class="icon" aria-hidden="true"><use href="#i-camera"/></svg>Fotos del modelo próximamente</figcaption>' : ''}
          </figure>
          ${thumbs}
          </div>
        </div>

        <div class="product__info">
          <div class="product__brand" data-in style="--d:2">
            <span class="label">${esc(m.marca)} · ${esc(m.categoria)}</span>
            ${S.statusHTML(m.disponibilidad)}
          </div>
          <h1 class="product__title"><span class="ln"><span class="ln__in">${esc(m.modelo)}</span></span></h1>
          <ul class="product__chips" data-in style="--d:3">
            <li>${m.cilindrada} cc</li><li>${esc(m.categoria)}</li><li>${m.anio}</li><li>0 km</li>
          </ul>
          <p class="product__summary" data-in style="--d:4">${esc(m.resumen || '')}</p>

          <div class="product__price" data-in style="--d:5">
            <small>Precio de contado</small>
            <strong>${S.priceText(m.precio)}</strong>
            <p>${CFG.demo && S.hasPrice(m) ? 'Valor de referencia, sujeto a cambios. ' : ''}Confirmá el precio final al consultar.</p>
          </div>

          <div class="product__actions" data-in style="--d:6">
            <a class="btn btn--accent btn--lg btn--block" href="${S.waLink(S.motoMsg(m))}" target="_blank" rel="noopener" data-magnetic>
              <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg><span>Consultar por esta moto</span>
            </a>
          </div>

          <div class="product__fin" data-in style="--d:7">
            <div>
              <h2>¿Querés financiarla?</h2>
              <p>${esc(m.financiacion || 'Consultá alternativas de financiación')}. Te contamos las opciones vigentes según tu caso: crédito personal, tarjetas o entrega más cuotas.</p>
            </div>
            <div class="product__fin-links">
              <a class="link-arrow" href="${S.waLink(`Hola ${CFG.nombre}, quiero saber cómo financiar la ${name}.`)}" target="_blank" rel="noopener">
                <svg class="icon icon--wa" aria-hidden="true"><use href="#i-wa"/></svg> Consultar financiación
              </a>
              <a class="link-arrow" href="index.html?moto=${encodeURIComponent(m.id)}#financiacion">Armar mi plan</a>
            </div>
          </div>

          <div class="product__specs" data-in style="--d:8">
            <h2 class="product__specs-title">Ficha técnica</h2>
            ${specsHTML(m)}
          </div>
          <p class="product__note">Ficha técnica según la información oficial publicada por ${esc(m.marca)}. Confirmá especificaciones y colores disponibles con nosotros.</p>
        </div>
      </div>
    </div>`;

  S.guardAll(wrap);

  /* Galería: cambio de foto con fundido */
  const main = $('[data-gallery]', wrap);
  $$('[data-thumb]', wrap).forEach((b) => b.addEventListener('click', () => {
    const x = imgs[Number(b.dataset.thumb)];
    $$('[data-thumb]', wrap).forEach((x) => x.setAttribute('aria-current', String(x === b)));
    const old = $('img', main);
    const img = new Image();
    img.alt = name;
    img.className = S.imgClass(x);
    img.src = S.imgSrc(x);
    S.guard(img);
    if (motionOK()) img.classList.add('is-out');
    main.appendChild(img);
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.remove('is-out')));
    if (old) { old.classList.add('is-out'); setTimeout(() => old.remove(), motionOK() ? 600 : 0); }
  }));

  /* Vista 360° y pestañas */
  if (m.vista360 && window.Visor360) {
    window.Visor360.mount($('[data-panel="360"]', wrap), m.vista360, { nombre: name });
    const tabs = $$('[data-tab]', wrap);
    const select = (key) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === key)));
      $$('[data-panel]', wrap).forEach((p) => { p.hidden = p.dataset.panel !== key; });
    };
    tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.tab)));
    $('.gallery-tabs', wrap).addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const i = tabs.indexOf(document.activeElement);
      const nx = tabs[(i + 1) % tabs.length];
      nx.focus();
      select(nx.dataset.tab);
    });
  }

  /* El acceso fijo de WhatsApp consulta directamente por este modelo */
  const dockWa = $('[data-dock-wa]');
  if (dockWa) { dockWa.removeAttribute('data-wa'); dockWa.href = S.waLink(S.motoMsg(m)); }

  /* ---------- Relacionadas: misma marca o categoría primero ---------- */
  const related = MOTOS.filter((x) => x.id !== m.id)
    .map((x) => ({ x, score: (x.marca === m.marca ? 2 : 0) + (x.categoria === m.categoria ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.x);
  const rel = $('[data-related]');
  if (related.length) {
    rel.innerHTML = related.map((x, i) => S.motoCard(x, i, 'grid')).join('');
    S.guardAll(rel);
    S.reveal($$('.moto', rel), { threshold: 0.08 });
  } else {
    $('[data-related-wrap]').remove();
  }

  S.boot();
})();
