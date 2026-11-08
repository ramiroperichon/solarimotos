/* ==========================================================================
   SOLARI MOTOS — Visor 360°
   Gira una moto a partir de una tira de cuadros (sprite horizontal).
   - Mouse, dedo y teclado (flechas). El gesto vertical sigue haciendo scroll.
   - Carga progresiva: primero la versión liviana (con indicador de progreso)
     y, si la pantalla lo aprovecha, la de alta resolución en segundo plano.
   - Fundido entre cuadros para que el giro se vea continuo.
   - Respeta prefers-reduced-motion (sin giro automático ni inercia).
   Uso: Visor360.mount(elemento, moto.vista360, { nombre: 'Honda XR 150L' })
   ========================================================================== */

(function () {
  'use strict';

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mod = (n, m) => ((n % m) + m) % m;
  const ANGLES = ['frente', 'frente izquierdo', 'lateral izquierdo', 'trasera izquierda', 'trasera', 'trasera derecha', 'lateral derecho', 'frente derecho'];

  /* Descarga con progreso real cuando el navegador lo permite */
  function loadImage(url, onProgress) {
    const viaImg = () => new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(url);
      img.onerror = reject;
      img.src = url;
    });
    if (!window.fetch || !window.ReadableStream || location.protocol === 'file:') return viaImg();
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error(res.status);
      const total = Number(res.headers.get('content-length')) || 0;
      if (!total || !res.body) return res.blob();
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      const pump = () => reader.read().then(({ done, value }) => {
        if (done) return new Blob(chunks, { type: 'image/webp' });
        chunks.push(value);
        got += value.length;
        onProgress(got / total);
        return pump();
      });
      return pump();
    }).then((blob) => {
      const u = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(u);
        img.onerror = () => resolve(url);
        img.src = u;
      });
    }).catch(viaImg);
  }

  function mount(root, v, opts = {}) {
    if (!root || !v) return null;
    const n = v.cuadros || 12;
    const name = opts.nombre || 'la moto';

    root.classList.add('v360');
    root.innerHTML = `
      <div class="v360__stage" style="aspect-ratio:${v.ancho} / ${v.alto}" tabindex="0" role="slider"
           aria-label="Vista 360° de ${name}. Usá las flechas o arrastrá para girar."
           aria-valuemin="0" aria-valuemax="${n - 1}" aria-valuenow="0" aria-valuetext="Vista de frente">
        <div class="v360__frame" data-a></div>
        <div class="v360__frame" data-b></div>
        <div class="v360__floor" aria-hidden="true"></div>
        <div class="v360__loader" aria-hidden="true">
          <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" class="v360__track"/><circle cx="24" cy="24" r="20" class="v360__bar" data-bar/></svg>
          <span data-pct>0%</span>
        </div>
        <span class="v360__hint" aria-hidden="true">
          <svg viewBox="0 0 48 24" class="v360__hint-icon"><path d="M6 12h36M12 6l-6 6 6 6M36 6l6 6-6 6"/></svg>
          Arrastrá para girar
        </span>
        <span class="v360__badge" aria-hidden="true">360°</span>
      </div>
      <div class="v360__ui">
        <button type="button" class="v360__btn" data-prev aria-label="Girar a la izquierda"><svg class="icon" aria-hidden="true"><use href="#i-prev"/></svg></button>
        <div class="v360__dial" role="group" aria-label="Ángulos">
          ${Array.from({ length: n }, (_, i) => `<button type="button" data-go="${i}" aria-label="Ángulo ${i + 1} de ${n}"></button>`).join('')}
        </div>
        <button type="button" class="v360__btn" data-next aria-label="Girar a la derecha"><svg class="icon" aria-hidden="true"><use href="#i-next"/></svg></button>
        <button type="button" class="v360__btn v360__btn--play" data-play aria-label="Girar automáticamente" aria-pressed="false">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path data-play-icon d="M8 5v14l11-7z" fill="currentColor"/></svg>
        </button>
      </div>`;

    const stage = root.querySelector('.v360__stage');
    const A = root.querySelector('[data-a]');
    const B = root.querySelector('[data-b]');
    const bar = root.querySelector('[data-bar]');
    const pctEl = root.querySelector('[data-pct]');
    const dots = Array.from(root.querySelectorAll('[data-go]'));
    const playBtn = root.querySelector('[data-play]');
    const playIcon = root.querySelector('[data-play-icon]');

    let pos = 0;             // posición continua en cuadros (0..n)
    let target = null;       // destino de una animación
    let vel = 0;             // velocidad (cuadros por frame) para la inercia
    let playing = false;
    let raf = 0;
    let ready = false;
    let interacted = false;
    let visible = true;

    const setSprite = (url) => {
      const css = `url("${url}")`;
      [A, B].forEach((el) => {
        el.style.backgroundImage = css;
        el.style.backgroundSize = `${n * 100}% 100%`;
      });
    };

    const frameX = (i) => `${(i / (n - 1)) * 100}% 0`;

    function render() {
      const p = mod(pos, n);
      const i = Math.floor(p);
      const f = p - i;
      // Fundido corto en el medio del tramo: mantiene nitidez y suaviza el salto
      const t = clamp((f - 0.25) / 0.5, 0, 1);
      A.style.backgroundPosition = frameX(i);
      B.style.backgroundPosition = frameX((i + 1) % n);
      B.style.opacity = t.toFixed(3);
      const near = Math.round(p) % n;
      dots.forEach((d, k) => d.classList.toggle('is-on', k === near));
      stage.setAttribute('aria-valuenow', near);
      stage.setAttribute('aria-valuetext', `Vista ${ANGLES[Math.round((near / n) * ANGLES.length) % ANGLES.length]}`);
    }

    function loop() {
      raf = 0;
      if (!visible) return;
      if (playing) {
        pos += 0.06;
      } else if (target !== null) {
        const d = target - pos;
        pos += d * 0.18;
        if (Math.abs(d) < 0.01) { pos = target; target = null; }
      } else if (Math.abs(vel) > 0.002) {
        pos += vel;
        vel *= 0.92;
      } else if (vel !== 0) {
        vel = 0;
        target = Math.round(pos); // al frenar, se acomoda en el cuadro más cercano
      }
      render();
      if (playing || target !== null || vel !== 0 || dragging) raf = requestAnimationFrame(loop);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const goTo = (i) => {
      const cur = mod(pos, n);
      let d = i - cur;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      target = pos + d;
      vel = 0;
      if (reduceMotion()) { pos = target; target = null; render(); return; }
      kick();
    };
    const step = (s) => goTo(mod(Math.round(pos) + s, n));

    const setPlaying = (on) => {
      playing = on && !reduceMotion();
      playBtn.setAttribute('aria-pressed', String(playing));
      playIcon.setAttribute('d', playing ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5v14l11-7z');
      if (playing) { target = null; vel = 0; kick(); } else target = Math.round(pos);
      kick();
    };

    const markInteracted = () => {
      if (interacted) return;
      interacted = true;
      root.classList.add('is-touched');
    };

    /* ---------- Arrastre (mouse y dedo) ---------- */
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPos = 0;
    let lastX = 0;
    let lastT = 0;
    let decided = false;

    stage.addEventListener('pointerdown', (e) => {
      if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
      dragging = true;
      decided = e.pointerType === 'mouse';
      startX = lastX = e.clientX;
      startY = e.clientY;
      startPos = pos;
      lastT = performance.now();
      vel = 0;
      target = null;
      if (playing) setPlaying(false);
      if (decided) { stage.setPointerCapture(e.pointerId); root.classList.add('is-dragging'); }
    });

    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // En pantallas táctiles: si el gesto es vertical, se deja hacer scroll
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }
        decided = true;
        stage.setPointerCapture(e.pointerId);
        root.classList.add('is-dragging');
      }
      e.preventDefault();
      const w = stage.clientWidth || 1;
      // Un ancho y medio de arrastre equivale a una vuelta completa
      pos = startPos - (dx / (w * 1.5)) * n;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      vel = (-(e.clientX - lastX) / (w * 1.5)) * n * (16 / dt);
      lastX = e.clientX;
      lastT = now;
      markInteracted();
      render();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-dragging');
      if (reduceMotion()) { vel = 0; target = Math.round(pos); pos = target; target = null; render(); return; }
      vel = clamp(vel, -0.6, 0.6);
      kick();
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('lostpointercapture', endDrag);

    /* ---------- Teclado y botones ---------- */
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); markInteracted(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); markInteracted(); step(-1); }
      if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    });
    root.querySelector('[data-prev]').addEventListener('click', () => { markInteracted(); setPlaying(false); step(-1); });
    root.querySelector('[data-next]').addEventListener('click', () => { markInteracted(); setPlaying(false); step(1); });
    dots.forEach((d) => d.addEventListener('click', () => { markInteracted(); setPlaying(false); goTo(Number(d.dataset.go)); }));
    playBtn.addEventListener('click', () => { markInteracted(); setPlaying(!playing); });

    /* ---------- Carga diferida ---------- */
    function start() {
      root.classList.add('is-loading');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const conn = navigator.connection || {};
      const slow = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || '');
      const smWidth = v.ancho * 0.6;
      const wantsLG = !slow && v.lg && stage.clientWidth * dpr > smWidth * 1.25;

      loadImage(v.sm, (p) => {
        bar.style.strokeDashoffset = String(126 * (1 - p));
        pctEl.textContent = `${Math.round(p * 100)}%`;
      }).then((url) => {
        setSprite(url);
        ready = true;
        root.classList.remove('is-loading');
        root.classList.add('is-ready');
        render();
        // Una vuelta de presentación para mostrar que se puede girar
        if (!reduceMotion() && opts.intro !== false) {
          const from = performance.now();
          const spin = (t) => {
            if (interacted) return;
            const k = Math.min(1, (t - from) / 2600);
            const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            pos = ease * n;
            render();
            if (k < 1) requestAnimationFrame(spin);
            else { pos = 0; render(); }
          };
          requestAnimationFrame(spin);
        }
        // Versión de alta resolución en segundo plano
        if (wantsLG) {
          const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 600));
          idle(() => loadImage(v.lg, () => {}).then((hi) => { setSprite(hi); root.classList.add('is-hd'); }).catch(() => {}));
        }
      }).catch(() => {
        root.classList.remove('is-loading');
        root.classList.add('is-error');
        pctEl.textContent = 'No se pudo cargar la vista 360°';
      });
    }

    if ('IntersectionObserver' in window) {
      let started = false;
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          visible = en.isIntersecting;
          if (visible && !started) { started = true; start(); }
          if (!visible && playing) setPlaying(false);
        });
      }, { rootMargin: '200px' }).observe(root);
    } else {
      start();
    }

    render();
    return { goTo, destroy() { cancelAnimationFrame(raf); root.innerHTML = ''; } };
  }

  window.Visor360 = { mount };
})();
