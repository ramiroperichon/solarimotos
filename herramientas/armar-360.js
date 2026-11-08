/* ==========================================================================
   SOLARI MOTOS — Herramienta interna: armar vista 360° con fotos propias
   Todo se procesa en el navegador (canvas). No se sube nada a internet.
   Salida: dos tiras de cuadros (liviana y alta resolución) + línea para data.js
   ========================================================================== */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const DATA = window.SolariData.get();

  const FRAME_W = 960;         // ancho de cada cuadro en la versión alta
  const FRAME_H = 720;         // 4:3, como las fotos de celular
  const SM = 0.6;              // la versión liviana es 60% del tamaño

  let photos = [];             // { name, img, url }
  let viewer = null;
  let previewUrl = null;

  const fileInput = $('[data-files]');
  const drop = $('[data-drop]');

  /* ---------- Selector de moto ---------- */
  $('[data-moto]').innerHTML = DATA.motos.map((m) => `<option value="${m.id}">${m.marca} ${m.modelo}</option>`).join('') +
    '<option value="nueva-moto">Otra (moto nueva)</option>';

  /* ---------- Carga de fotos ---------- */
  const natural = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

  function readFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    Promise.all(list.map((f) => new Promise((resolve) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => resolve({ name: f.name, img, url });
      img.onerror = () => resolve(null);
      img.src = url;
    }))).then((loaded) => {
      photos = photos.concat(loaded.filter(Boolean)).sort(natural);
      refresh();
    });
  }

  fileInput.addEventListener('change', (e) => readFiles(e.target.files));
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => readFiles(e.dataTransfer.files));

  $('[data-reverse]').addEventListener('click', () => { photos.reverse(); refresh(); });
  $('[data-clear]').addEventListener('click', () => { photos = []; refresh(); });

  $('[data-thumbs]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mv]');
    if (!b) return;
    const i = Number(b.dataset.i);
    const j = i + Number(b.dataset.mv);
    if (j < 0 || j >= photos.length) return;
    [photos[i], photos[j]] = [photos[j], photos[i]];
    refresh();
  });

  /* ---------- Dibujo de un cuadro con recorte, zoom y brillo ---------- */
  function drawFrame(ctx, img, w, h, s) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * s.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2 + (s.offy / 100) * h;
    ctx.filter = `brightness(${s.bright})`;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  }

  const settings = () => ({
    zoom: Number($('[data-zoom]').value) / 100,
    offy: Number($('[data-offy]').value),
    bright: Number($('[data-bright]').value) / 100
  });

  function buildStrip(frameW, frameH, type, quality) {
    const s = settings();
    const canvas = document.createElement('canvas');
    canvas.width = frameW * photos.length;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    const tmp = document.createElement('canvas');
    tmp.width = frameW;
    tmp.height = frameH;
    const tctx = tmp.getContext('2d');
    photos.forEach((p, i) => {
      drawFrame(tctx, p.img, frameW, frameH, s);
      ctx.drawImage(tmp, i * frameW, 0);
    });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
  }

  /* WebP si el navegador lo soporta (Safari antiguo no): si no, JPG */
  const webpOK = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  })();

  /* ---------- Vista previa ---------- */
  let previewTimer = 0;
  function preview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      if (photos.length < 2) return;
      const w = 480;
      const h = Math.round((w * FRAME_H) / FRAME_W);
      const blob = await buildStrip(w, h, 'image/jpeg', 0.8);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      if (viewer) viewer.destroy();
      viewer = window.Visor360.mount($('[data-preview]'), {
        cuadros: photos.length, ancho: w, alto: h, sm: previewUrl, lg: null
      }, { nombre: 'la moto', intro: false, lazy: false });
    }, 250);
  }

  ['data-zoom', 'data-offy', 'data-bright'].forEach((k) => {
    const el = $(`[${k}]`);
    el.addEventListener('input', () => {
      const out = $(`[${k}-out]`);
      out.textContent = k === 'data-offy' ? el.value : `${el.value}%`;
      $('[data-result]').hidden = true;
      preview();
    });
  });

  /* ---------- Generar archivos ---------- */
  $('[data-build]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Generando…';
    const type = webpOK ? 'image/webp' : 'image/jpeg';
    const ext = webpOK ? 'webp' : 'jpg';
    const lg = await buildStrip(FRAME_W, FRAME_H, type, 0.68);
    const sm = await buildStrip(Math.round(FRAME_W * SM), Math.round(FRAME_H * SM), type, 0.6);
    const id = $('[data-moto]').value;
    const a1 = $('[data-dl-sm]');
    const a2 = $('[data-dl-lg]');
    a1.href = URL.createObjectURL(sm);
    a1.download = `360-sm.${ext}`;
    a2.href = URL.createObjectURL(lg);
    a2.download = `360-lg.${ext}`;
    $('[data-sizes]').textContent = `${photos.length} cuadros · liviana ${Math.round(sm.size / 1024)} KB · alta ${Math.round(lg.size / 1024)} KB`;
    $('[data-folder]').textContent = `assets/images/motos/${id}/`;
    $('[data-code]').textContent = `vista360: vista360('${id}', ${FRAME_W}, ${FRAME_H}, ${photos.length}${ext === 'webp' ? '' : ", 'jpg'"}),`;
    $('[data-result]').hidden = false;
    btn.textContent = label;
    btn.disabled = false;
  });

  /* ---------- Interfaz ---------- */
  function refresh() {
    const has = photos.length > 0;
    $$('[data-work]').forEach((el) => { el.hidden = !has; });
    $('[data-count]').textContent = has ? `(${photos.length})` : '';
    $('[data-thumbs]').innerHTML = photos.map((p, i) => `
      <div class="thumb">
        <img src="${p.url}" alt="Foto ${i + 1}">
        <span>${i + 1}</span>
        <div class="mv">
          <button type="button" data-mv="-1" data-i="${i}" aria-label="Mover antes">‹</button>
          <button type="button" data-mv="1" data-i="${i}" aria-label="Mover después">›</button>
        </div>
      </div>`).join('');
    const warn = $('[data-warn]');
    const n = photos.length;
    warn.hidden = !(n && (n < 12 || n > 36));
    warn.textContent = n < 12 ? `Cargaste ${n} fotos. Con menos de 12 el giro se ve a saltos: conviene sacar más.` : `Cargaste ${n} fotos. Con más de 36 el archivo pesa más de lo necesario.`;
    $('[data-result]').hidden = true;
    if (n >= 2) preview();
  }
})();
