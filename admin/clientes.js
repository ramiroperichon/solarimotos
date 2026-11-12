/* ==========================================================================
   SOLARI MOTOS — Panel · Clientes y cuotas
   · Registro de clientes, planes de financiación y cuotas.
   · Estados calculados en hora argentina: vencida, por vencer, al día.
   · Recordatorios por WhatsApp (uno o varios en cola) con mensajes editables.
   · Los datos personales solo los ve un admin con doble factor (RLS AAL2).
   ========================================================================== */
(function () {
  'use strict';
  window.SolariModulos = window.SolariModulos || {};

  window.SolariModulos.clientes = function (api) {
    const { sb, $, $$, esc, toast, loading, explicar, abrirEditor, cerrarEditor, campo, area, selector, boton, leerForm } = api;

    /* ---------- Utilidades ---------- */
    const TZ = 'America/Argentina/Buenos_Aires';
    const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
    const $m = (n) => money.format(Math.round(Number(n) || 0));
    const diaAR = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const hoyISO = () => diaAR(new Date());
    const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const sumarMes = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const ult = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, m - 1 + n, Math.min(d, ult))).toISOString().slice(0, 10); };
    const difDias = (a, b) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
    const fFecha = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
    const fCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
    const hace = (iso) => { const n = difDias(hoyISO(), iso); return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`; };
    const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercadopago: 'Mercado Pago', debito: 'Débito', credito: 'Crédito', otro: 'Otro' };
    const ESTADOS = {
      todos: 'Todos', vencida: 'Con cuotas vencidas', por_vencer: 'Por vencer', al_dia: 'Al día', finalizado: 'Plan terminado', sin_plan: 'Sin plan'
    };
    const BADGE = { vencida: 'badge--off', por_vencer: 'badge--warn', al_dia: 'badge--ok', finalizado: '', sin_plan: '' };
    const VARIABLES = '{nombre} {moto} {cuota} {total} {vencimiento} {monto} {vencidas} {adeudado} {restantes} {pagado} {fecha_pago} {recibo}';
    const PLANTILLAS = {
      recordatorio: 'Hola {nombre}! Te escribimos de Solari Motos para recordarte que la cuota {cuota} de {total} de tu {moto} vence el {vencimiento} ({monto}). Podés acercarte al local o consultarnos por transferencia. Gracias por estar al día. Saludos!',
      vencida: 'Hola {nombre}, ¿cómo estás? Te escribimos de Solari Motos porque la cuota {cuota} de {total} de tu {moto} venció el {vencimiento}. Tenés {vencidas} cuota(s) pendiente(s) por {adeudado}. Cuando puedas acercate al local o avisanos si necesitás coordinar. Saludos!',
      pago: 'Hola {nombre}! Registramos tu pago de {pagado} correspondiente a la cuota {cuota} de {total} de tu {moto} ({fecha_pago}). Te enviamos el recibo N.º {recibo}. Te quedan {restantes} cuota(s). Muchas gracias! Solari Motos.'
    };

    /* Teléfono argentino → número de WhatsApp (549 + área + número, sin 0 ni 15) */
    function normTel(v) {
      let d = String(v || '').replace(/\D/g, '');
      if (!d) return '';
      if (d.startsWith('00')) d = d.slice(2);
      if (d.startsWith('54')) { d = d.slice(2); if (d.startsWith('9')) d = d.slice(1); }
      if (d.startsWith('0')) d = d.slice(1);
      if (d.length === 12) {
        for (const a of [4, 3, 2]) { if (d.substr(a, 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break; } }
      }
      return d.length === 10 ? `549${d}` : null;
    }
    const verTel = (t) => (t ? `+54 9 ${t.slice(3)}` : '');
    const waUrl = (tel, txt) => `https://wa.me/${tel}${txt ? `?text=${encodeURIComponent(txt)}` : ''}`;
    const abrirWA = (tel, txt) => { window.open(waUrl(tel, txt), '_blank', 'noopener'); };

    /* ---------- Datos ---------- */
    const st = {
      clientes: [], planes: [], cuotas: [], motos: [], cfg: { dias_aviso: 5, plantillas: {} },
      f: { q: '', estado: 'todos', moto: '', orden: 'atraso', ocultarAvisados: false },
      sel: new Set(), cargado: false, ultimoPago: null
    };

    async function todo(tabla, orden) {
      const out = [];
      for (let i = 0; ; i += 1000) {
        const { data, error } = await sb.from(tabla).select('*').order(orden).range(i, i + 999);
        if (error) throw error;
        out.push(...data);
        if (data.length < 1000) break;
      }
      return out;
    }

    async function cargar() {
      loading(true);
      try {
        const [clientes, planes, cuotas, motos, cfg, sitio] = await Promise.all([
          todo('clientes', 'nombre'), todo('planes', 'creado'), todo('cuotas', 'numero'),
          sb.from('motos').select('id,marca,modelo,precio').order('orden'),
          sb.from('cobranza').select('dias_aviso,plantillas').eq('id', 1).maybeSingle(),
          sb.from('sitio').select('config').eq('id', 1).maybeSingle()
        ]);
        if (motos.error) throw motos.error;
        Object.assign(st, { clientes, planes, cuotas, motos: motos.data || [], cargado: true });
        if (cfg.data) st.cfg = cfg.data;
        const sc = (sitio.data && sitio.data.config) || {};
        st.negocio = { nombre: 'Solari Motos', direccion: sc.direccion || '', localidad: sc.localidad || '', provincia: sc.provincia || '', whatsapp: sc.whatsappVisible || sc.whatsapp || '' };
        calcular();
        return true;
      } catch (e) {
        toast(explicar(e), true);
        return false;
      } finally { loading(false); }
    }

    /* Estados de cuotas, planes y clientes */
    function calcular() {
      const hoy = hoyISO();
      const limite = sumarDias(hoy, Number(st.cfg.dias_aviso) || 0);
      const motoNombre = (p) => {
        if (p.vehiculo) return p.vehiculo;
        const m = st.motos.find((x) => x.id === p.moto_id);
        return m ? `${m.marca} ${m.modelo}` : 'moto';
      };
      const porPlan = new Map(st.planes.map((p) => [p.id, []]));
      st.cuotas.forEach((c) => {
        c.saldo = Math.max(0, Number(c.monto) - Number(c.pagado));
        c.estado = c.saldo <= 0 ? 'pagada' : c.vencimiento < hoy ? 'vencida' : c.vencimiento <= limite ? 'por_vencer' : 'pendiente';
        c.parcial = Number(c.pagado) > 0 && c.saldo > 0;
        c.atraso = c.estado === 'vencida' ? difDias(hoy, c.vencimiento) : 0;
        if (porPlan.has(c.plan_id)) porPlan.get(c.plan_id).push(c);
      });
      st.planes.forEach((p) => {
        p.cuotas = (porPlan.get(p.id) || []).sort((a, b) => a.numero - b.numero);
        p.nombreMoto = motoNombre(p);
        p.pagas = p.cuotas.filter((c) => c.estado === 'pagada').length;
        p.debe = p.cuotas.length - p.pagas;
        p.vencidas = p.cuotas.filter((c) => c.estado === 'vencida');
        p.proxima = p.cuotas.find((c) => c.estado !== 'pagada') || null;
        p.saldo = p.cuotas.reduce((a, c) => a + c.saldo, 0);
        p.estadoReal = p.estado === 'cancelado' ? 'cancelado' : p.debe === 0 ? 'finalizado' : 'activo';
      });
      const planesDe = new Map(st.clientes.map((c) => [c.id, []]));
      st.planes.forEach((p) => { if (planesDe.has(p.cliente_id)) planesDe.get(p.cliente_id).push(p); });
      st.clientes.forEach((cli) => {
        cli.planes = planesDe.get(cli.id) || [];
        const activos = cli.planes.filter((p) => p.estadoReal === 'activo');
        cli.vencidas = activos.flatMap((p) => p.vencidas).sort((a, b) => (a.vencimiento < b.vencimiento ? -1 : 1));
        const pendientes = activos.map((p) => p.proxima).filter(Boolean).sort((a, b) => (a.vencimiento < b.vencimiento ? -1 : 1));
        cli.proxima = pendientes[0] || null;
        cli.adeudado = cli.vencidas.reduce((a, c) => a + c.saldo, 0);
        cli.saldo = activos.reduce((a, p) => a + p.saldo, 0);
        cli.atraso = cli.vencidas.length ? cli.vencidas[0].atraso : 0;
        cli.pagas = activos.reduce((a, p) => a + p.pagas, 0);
        cli.totalCuotas = activos.reduce((a, p) => a + p.cuotas.length, 0);
        cli.estado = cli.vencidas.length ? 'vencida'
          : pendientes.some((c) => c.estado === 'por_vencer') ? 'por_vencer'
          : activos.length ? 'al_dia'
          : cli.planes.some((p) => p.estadoReal === 'finalizado') ? 'finalizado' : 'sin_plan';
        const avisos = cli.planes.flatMap((p) => p.cuotas).map((c) => c.ultimo_aviso).filter(Boolean).sort();
        cli.ultimoAviso = avisos.length ? diaAR(new Date(avisos[avisos.length - 1])) : null;
        cli.motos = cli.planes.map((p) => p.nombreMoto).join(', ');
        cli.buscar = `${cli.nombre} ${cli.dni} ${cli.telefono} ${cli.motos} ${cli.localidad}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      });
      actualizarBadge();
    }

    function actualizarBadge() {
      const b = $('[data-tab="clientes"]');
      if (!b) return;
      const n = st.clientes.filter((c) => c.estado === 'vencida').length;
      let s = $('.tab-alerta', b);
      if (!n) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('span'); s.className = 'tab-alerta'; b.appendChild(s); }
      s.textContent = n;
      s.title = `${n} cliente(s) con cuotas vencidas`;
    }

    /* ---------- Mensajes ---------- */
    const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';
    function tipoMensaje(cli) { return cli.estado === 'vencida' ? 'vencida' : cli.proxima ? 'recordatorio' : null; }
    function cuotaDeMensaje(cli, tipo) { return tipo === 'vencida' ? cli.vencidas[0] : tipo === 'recordatorio' ? cli.proxima : null; }
    function mensaje(cli, tipo, cuota) {
      if (!tipo) return `Hola ${primerNombre(cli.nombre)}! Te escribimos de Solari Motos.`;
      const c = cuota || cuotaDeMensaje(cli, tipo);
      const p = c && st.planes.find((x) => x.id === c.plan_id);
      const tpl = (st.cfg.plantillas && st.cfg.plantillas[tipo]) || PLANTILLAS[tipo];
      const vars = {
        nombre: primerNombre(cli.nombre), moto: p ? p.nombreMoto : 'moto',
        cuota: c ? c.numero : '', total: p ? p.cantidad_cuotas : '',
        vencimiento: c ? fFecha(c.vencimiento) : '', monto: c ? $m(c.saldo || c.monto) : '',
        vencidas: cli.vencidas.length, adeudado: $m(cli.adeudado),
        restantes: p ? p.debe : '', pagado: c ? $m(c.ultimo_pago || c.pagado) : '', fecha_pago: c ? fFecha(c.fecha_pago) : '',
        recibo: c && c.recibo_numero ? window.SolariRecibo.numero(c.recibo_numero) : ''
      };
      return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    }
    async function marcarAviso(cuota) {
      if (!cuota) return;
      const ahora = new Date().toISOString();
      const { data, error } = await sb.from('cuotas').update({ ultimo_aviso: ahora, avisos: (cuota.avisos || 0) + 1 }).eq('id', cuota.id).select('id');
      if (error || !data || !data.length) { toast(error ? explicar(error) : 'No se pudo registrar el aviso.', true); return; }
      cuota.ultimo_aviso = ahora;
      cuota.avisos = (cuota.avisos || 0) + 1;
      calcular();
    }

    /* ======================================================================
       LISTADO
       ====================================================================== */
    async function ver() {
      const c = $('[data-content]');
      if (!st.cargado) c.innerHTML = '<p class="hint">Cargando clientes…</p>';
      if (!(await cargar())) { c.innerHTML = '<p class="hint">No se pudieron leer los clientes.</p>'; return; }
      render();
    }

    function filtrados() {
      const f = st.f;
      const q = f.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      const hoy = hoyISO();
      let l = st.clientes.filter((cli) =>
        (f.estado === 'todos' || cli.estado === f.estado) &&
        (!q || q.split(/\s+/).every((w) => cli.buscar.includes(w))) &&
        (!f.moto || cli.planes.some((p) => p.moto_id === f.moto)) &&
        (!f.ocultarAvisados || cli.ultimoAviso !== hoy));
      const venc = (cli) => (cli.proxima ? cli.proxima.vencimiento : '9999');
      const ord = {
        atraso: (a, b) => b.atraso - a.atraso || (venc(a) < venc(b) ? -1 : venc(a) > venc(b) ? 1 : 0),
        vencimiento: (a, b) => (venc(a) < venc(b) ? -1 : venc(a) > venc(b) ? 1 : 0),
        nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
        deuda: (a, b) => b.adeudado - a.adeudado || b.saldo - a.saldo,
        aviso: (a, b) => (a.ultimoAviso || '') < (b.ultimoAviso || '') ? -1 : 1
      };
      return l.sort(ord[f.orden] || ord.atraso);
    }

    function resumen() {
      const hoy = hoyISO();
      const mes = hoy.slice(0, 7);
      const activas = st.planes.filter((p) => p.estadoReal === 'activo').flatMap((p) => p.cuotas);
      const conVencidas = st.clientes.filter((c) => c.estado === 'vencida');
      const porVencer = activas.filter((c) => c.estado === 'por_vencer');
      const cobradas = st.cuotas.filter((c) => c.fecha_pago && c.fecha_pago.slice(0, 7) === mes && Number(c.pagado) > 0);
      const aCobrar = activas.filter((c) => c.vencimiento.slice(0, 7) === mes && c.saldo > 0);
      const nombreMes = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: TZ }).format(new Date());
      return `
        <div class="kpis">
          <button type="button" class="kpi kpi--danger" data-kpi="vencida">
            <span>Con cuotas vencidas</span><b>${conVencidas.length}</b><small>${esc($m(conVencidas.reduce((a, c) => a + c.adeudado, 0)))} atrasado</small></button>
          <button type="button" class="kpi kpi--warn" data-kpi="por_vencer">
            <span>Vencen en ${esc(st.cfg.dias_aviso)} días</span><b>${porVencer.length}</b><small>${esc($m(porVencer.reduce((a, c) => a + c.saldo, 0)))}</small></button>
          <div class="kpi"><span>Cobrado en ${esc(nombreMes)}</span><b>${esc($m(cobradas.reduce((a, c) => a + Number(c.pagado), 0)))}</b><small>${cobradas.length} pago(s)</small></div>
          <div class="kpi"><span>Falta cobrar en ${esc(nombreMes)}</span><b>${esc($m(aCobrar.reduce((a, c) => a + c.saldo, 0)))}</b><small>${aCobrar.length} cuota(s)</small></div>
        </div>`;
    }

    function render() {
      const c = $('[data-content]');
      const motosUsadas = [...new Set(st.planes.map((p) => p.moto_id).filter(Boolean))];
      const cuenta = (e) => (e === 'todos' ? st.clientes.length : st.clientes.filter((x) => x.estado === e).length);
      c.innerHTML = `
        <div class="head"><h1>Clientes <span class="badge">${st.clientes.length}</span></h1>
          <div class="head__btns">
            <button class="btn btn--ghost btn--sm" type="button" data-cfg>Mensajes</button>
            <button class="btn btn--ghost btn--sm" type="button" data-csv>Exportar</button>
            <button class="btn btn--primary btn--sm" type="button" data-new>+ Cliente</button>
          </div></div>
        ${resumen()}
        <div class="filtros">
          <input class="search" type="search" placeholder="Buscar por nombre, DNI, teléfono o moto" value="${esc(st.f.q)}" data-q aria-label="Buscar clientes">
          <div class="chips" role="group" aria-label="Estado">
            ${Object.entries(ESTADOS).map(([k, t]) => `<button type="button" class="chip ${st.f.estado === k ? 'is-on' : ''}" data-estado="${k}" aria-pressed="${st.f.estado === k}">${esc(t)} <span>${cuenta(k)}</span></button>`).join('')}
          </div>
          <div class="filtros__row">
            <select data-moto aria-label="Filtrar por moto"><option value="">Todas las motos</option>
              ${motosUsadas.map((id) => { const m = st.motos.find((x) => x.id === id); return `<option value="${esc(id)}" ${st.f.moto === id ? 'selected' : ''}>${esc(m ? `${m.marca} ${m.modelo}` : id)}</option>`; }).join('')}</select>
            <select data-orden aria-label="Ordenar">
              ${Object.entries({ atraso: 'Más atrasados primero', vencimiento: 'Próximo vencimiento', deuda: 'Mayor deuda', aviso: 'Avisados hace más tiempo', nombre: 'Nombre (A-Z)' }).map(([k, t]) => `<option value="${k}" ${st.f.orden === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
            <label class="check check--sm"><input type="checkbox" data-ocultar ${st.f.ocultarAvisados ? 'checked' : ''}> Ocultar avisados hoy</label>
          </div>
        </div>
        <div class="selbar"><label class="check check--sm"><input type="checkbox" data-all> <span data-all-txt>Seleccionar todos</span></label></div>
        <div class="list" data-list></div>
        <div class="bulk" data-bulk hidden>
          <span data-bulk-n></span>
          <button type="button" class="link" data-bulk-clear>Quitar selección</button>
          <button type="button" class="btn btn--wa btn--sm" data-bulk-send>Enviar recordatorios</button>
        </div>`;
      $('[data-new]', c).addEventListener('click', () => editarCliente(null));
      $('[data-cfg]', c).addEventListener('click', editarMensajes);
      $('[data-csv]', c).addEventListener('click', exportar);
      $$('[data-kpi]', c).forEach((b) => b.addEventListener('click', () => { st.f.estado = b.dataset.kpi; render(); }));
      $('[data-q]', c).addEventListener('input', (e) => { st.f.q = e.target.value; pintarLista(); });
      $$('[data-estado]', c).forEach((b) => b.addEventListener('click', () => { st.f.estado = b.dataset.estado; render(); }));
      $('[data-moto]', c).addEventListener('change', (e) => { st.f.moto = e.target.value; pintarLista(); });
      $('[data-orden]', c).addEventListener('change', (e) => { st.f.orden = e.target.value; pintarLista(); });
      $('[data-ocultar]', c).addEventListener('change', (e) => { st.f.ocultarAvisados = e.target.checked; pintarLista(); });
      $('[data-all]', c).addEventListener('change', (e) => {
        filtrados().filter((x) => x.telefono).forEach((x) => (e.target.checked ? st.sel.add(x.id) : st.sel.delete(x.id)));
        pintarLista();
      });
      $('[data-bulk-clear]', c).addEventListener('click', () => { st.sel.clear(); pintarLista(); });
      $('[data-bulk-send]', c).addEventListener('click', () => {
        const orden = filtrados();
        cola(orden.filter((x) => st.sel.has(x.id)).concat(st.clientes.filter((x) => st.sel.has(x.id) && !orden.includes(x))));
      });
      pintarLista();
    }

    function pintarLista() {
      const c = $('[data-content]');
      const l = filtrados();
      const lista = $('[data-list]', c);
      if (!st.clientes.length) {
        lista.innerHTML = `<div class="vacio"><b>Todavía no hay clientes cargados.</b>
          <p class="hint">Tocá "+ Cliente", cargá sus datos y después creá su plan de cuotas: las cuotas se generan solas.</p></div>`;
      } else if (!l.length) {
        lista.innerHTML = '<p class="hint">Ningún cliente coincide con los filtros.</p>';
      } else {
        lista.innerHTML = l.map(item).join('');
      }
      $$('[data-pct]', lista).forEach((el) => { el.style.width = `${el.dataset.pct}%`; });
      $$('[data-sel]', lista).forEach((el) => el.addEventListener('change', () => {
        if (el.checked) st.sel.add(el.dataset.sel); else st.sel.delete(el.dataset.sel);
        barra();
      }));
      $$('[data-ver]', lista).forEach((b) => b.addEventListener('click', () => ficha(b.dataset.ver)));
      $$('[data-wa]', lista).forEach((b) => b.addEventListener('click', () => {
        const cli = st.clientes.find((x) => x.id === b.dataset.wa);
        const tipo = tipoMensaje(cli);
        abrirWA(cli.telefono, mensaje(cli, tipo));
        marcarAviso(cuotaDeMensaje(cli, tipo)).then(pintarLista);
      }));
      barra();
    }

    function barra() {
      const c = $('[data-content]');
      const n = st.sel.size;
      const bulk = $('[data-bulk]', c);
      if (!bulk) return;
      bulk.hidden = !n;
      $('[data-bulk-n]', c).textContent = `${n} seleccionado${n === 1 ? '' : 's'}`;
      const conTel = filtrados().filter((x) => x.telefono);
      const all = $('[data-all]', c);
      all.checked = conTel.length > 0 && conTel.every((x) => st.sel.has(x.id));
      $('[data-all-txt]', c).textContent = `Seleccionar los ${conTel.length} de la lista`;
      document.body.classList.toggle('con-bulk', !!n);
    }

    function estadoTexto(cli) {
      if (cli.estado === 'vencida') return `Vencida · ${cli.atraso} día${cli.atraso === 1 ? '' : 's'}`;
      if (cli.estado === 'por_vencer') { const d = difDias(cli.proxima.vencimiento, hoyISO()); return d === 0 ? 'Vence hoy' : `Vence en ${d} día${d === 1 ? '' : 's'}`; }
      return ESTADOS[cli.estado];
    }

    function item(cli) {
      const pct = cli.totalCuotas ? Math.round((cli.pagas / cli.totalCuotas) * 100) : 0;
      const tel = !!cli.telefono;
      return `
        <article class="item item--cli ${cli.estado === 'vencida' ? 'is-vencida' : ''}">
          <label class="item__sel"><input type="checkbox" data-sel="${esc(cli.id)}" ${st.sel.has(cli.id) ? 'checked' : ''} ${tel ? '' : 'disabled'} aria-label="Seleccionar ${esc(cli.nombre)}"></label>
          <div class="item__body">
            <div class="item__title">${esc(cli.nombre)} <span class="badge ${BADGE[cli.estado]}">${esc(estadoTexto(cli))}</span></div>
            <div class="item__meta">${esc(cli.motos || 'Sin plan de cuotas')}</div>
            ${cli.totalCuotas ? `
              <div class="avance"><span data-pct="${pct}"></span></div>
              <div class="item__meta"><b>${cli.pagas}</b> de ${cli.totalCuotas} cuotas pagas · debe <b>${cli.totalCuotas - cli.pagas}</b>${cli.vencidas.length ? ` · <b class="txt-danger">${cli.vencidas.length} vencida(s): ${esc($m(cli.adeudado))}</b>` : ''}</div>` : ''}
            <div class="item__meta">${[
              cli.proxima ? `Próxima: ${esc(fFecha(cli.proxima.vencimiento))} · ${esc($m(cli.proxima.saldo))}` : '',
              cli.ultimoAviso ? `<span class="avisado">Avisado ${esc(hace(cli.ultimoAviso))}</span>` : '',
              tel ? '' : '<span class="txt-danger">Sin WhatsApp cargado</span>'
            ].filter(Boolean).join(' · ')}</div>
          </div>
          <div class="item__actions">
            <button class="btn btn--wa btn--sm" type="button" data-wa="${esc(cli.id)}" ${tel ? '' : 'disabled'}>WhatsApp</button>
            <button class="btn btn--dark btn--sm" type="button" data-ver="${esc(cli.id)}">Ver ficha</button>
          </div>
        </article>`;
    }

    /* ---------- Envío en cola (varios clientes) ---------- */
    function cola(lista) {
      const items = lista.filter((x) => x.telefono).map((cli) => {
        const tipo = tipoMensaje(cli);
        return { cli, tipo, cuota: cuotaDeMensaje(cli, tipo), texto: mensaje(cli, tipo), hecho: null };
      });
      if (!items.length) { toast('Ningún cliente seleccionado tiene WhatsApp.', true); return; }
      let i = 0;
      const guardando = [];
      const paso = async () => {
        if (i >= items.length) {
          if (guardando.length) { loading(true); await Promise.all(guardando); loading(false); }
          const env = items.filter((x) => x.hecho === 'enviado').length;
          abrirEditor('Recordatorios', `
            <div class="cola-fin"><b>Listo.</b><p>Abriste ${env} conversación(es) de WhatsApp${items.length - env ? ` y salteaste ${items.length - env}` : ''}.</p>
            <p class="hint">Quedó registrado el aviso en cada cliente ("Avisado hoy").</p></div>`,
          [boton('Cerrar', 'btn--primary', () => { st.sel.clear(); cerrarEditor(); render(); })], { sinFoco: true });
          return;
        }
        const it = items[i];
        abrirEditor(`Recordatorio ${i + 1} de ${items.length}`, `
          <div class="cola">
            <div class="cola__barra"><span data-pct="${Math.round((i / items.length) * 100)}"></span></div>
            <div><div class="item__title">${esc(it.cli.nombre)} <span class="badge ${BADGE[it.cli.estado]}">${esc(estadoTexto(it.cli))}</span></div>
              <div class="item__meta">${esc(verTel(it.cli.telefono))}${it.cli.ultimoAviso ? ` · avisado ${esc(hace(it.cli.ultimoAviso))}` : ''}</div></div>
            <label class="field">Mensaje (podés editarlo antes de enviar)<textarea data-txt maxlength="1000" rows="7">${esc(it.texto)}</textarea></label>
            <p class="hint">Se abre WhatsApp con el mensaje escrito: tocá <b>Enviar</b> allá y volvé a esta pantalla para seguir con el próximo.</p>
          </div>`,
        [
          boton('Terminar', 'btn--ghost', () => { i = items.length; paso(); }),
          boton('Saltear', 'btn--ghost', () => { it.hecho = 'salteado'; i++; paso(); }),
          boton('Abrir WhatsApp y seguir', 'btn--wa', () => {
            it.texto = $('[data-txt]').value;
            abrirWA(it.cli.telefono, it.texto);
            it.hecho = 'enviado';
            const c = it.cuota;
            guardando.push(marcarAviso(c));
            i++;
            return paso();
          })
        ], { sinFoco: true });
        $$('.cola [data-pct]').forEach((el) => { el.style.width = `${el.dataset.pct}%`; });
      };
      paso();
    }

    /* ======================================================================
       FICHA DEL CLIENTE
       ====================================================================== */
    function camposCliente(d) {
      return `
        <form data-form novalidate>
          <div class="grid2">
            ${campo('Nombre y apellido', 'nombre', d.nombre, { req: 1, max: 120 })}
            ${campo('DNI (solo números)', 'dni', d.dni, { max: 11 })}
            <label class="field">WhatsApp
              <input name="telefono" type="tel" value="${esc(d.telefono ? d.telefono.slice(3) : '')}" maxlength="20" placeholder="3773 450740" inputmode="tel" autocomplete="off" data-tel>
              <small class="hint" data-tel-ok>Código de área + número, sin 0 ni 15.</small></label>
            ${campo('Email', 'email', d.email, { type: 'email', max: 120 })}
            ${campo('Dirección', 'direccion', d.direccion, { max: 160 })}
            ${campo('Localidad', 'localidad', d.localidad, { max: 80 })}
          </div>
          ${area('Notas internas', 'notas', d.notas, 1000)}
        </form>`;
    }
    function activarTel() {
      const i = $('[data-tel]');
      const out = $('[data-tel-ok]');
      const upd = () => {
        const t = normTel(i.value);
        out.textContent = t === '' ? 'Código de área + número, sin 0 ni 15.' : t ? `Se enviará a ${verTel(t)}` : 'Número incompleto: poné código de área + número (10 dígitos).';
        out.classList.toggle('txt-danger', t === null);
      };
      i.addEventListener('input', upd);
      upd();
    }
    function leerCliente() {
      const v = leerForm($('[data-form]'));
      const telefono = normTel(v.telefono);
      if (!v.nombre) { toast('Completá el nombre.', true); return null; }
      if (telefono === null) { toast('Revisá el WhatsApp: código de área + número.', true); return null; }
      const dni = v.dni.replace(/\D/g, '');
      return { nombre: v.nombre, dni, telefono, email: v.email, direccion: v.direccion, localidad: v.localidad, notas: v.notas };
    }

    function editarCliente(cli) {
      const d = cli || { nombre: '', dni: '', telefono: '', email: '', direccion: '', localidad: '', notas: '' };
      abrirEditor(cli ? `Editar · ${cli.nombre}` : 'Nuevo cliente', camposCliente(d), [
        cli && boton('Volver', 'btn--ghost', () => ficha(cli.id)),
        boton(cli ? 'Guardar' : 'Crear cliente', 'btn--primary', async () => {
          const fila = leerCliente();
          if (!fila) return;
          loading(true);
          const q = cli ? sb.from('clientes').update(fila).eq('id', cli.id).select('id') : sb.from('clientes').insert(fila).select('id');
          const { data, error } = await q;
          loading(false);
          if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso para guardar.', true); return; }
          toast(cli ? 'Cliente actualizado.' : 'Cliente creado. Ahora podés cargar su plan de cuotas.');
          await cargar();
          render();
          ficha(data[0].id);
        })
      ]);
      activarTel();
    }

    function ficha(id) {
      const cli = st.clientes.find((x) => x.id === id);
      if (!cli) { cerrarEditor(); return; }
      const scroll = $('[data-drawer-body]') ? $('[data-drawer-body]').scrollTop : 0;
      const mismo = ficha.abierta === id;
      ficha.abierta = id;
      const tipo = tipoMensaje(cli);
      const pagoRec = st.ultimoPago && st.cuotas.find((c) => c.id === st.ultimoPago);
      abrirEditor(cli.nombre, `
        <div class="cli-top">
          <div><span class="badge ${BADGE[cli.estado]}">${esc(estadoTexto(cli))}</span>
            ${cli.saldo ? `<span class="badge">Saldo total ${esc($m(cli.saldo))}</span>` : ''}
            ${cli.adeudado ? `<span class="badge badge--off">Atrasado ${esc($m(cli.adeudado))}</span>` : ''}</div>
          <div class="item__meta">${cli.telefono ? esc(verTel(cli.telefono)) : '<span class="txt-danger">Sin WhatsApp</span>'}${cli.dni ? ` · DNI ${esc(cli.dni)}` : ''}${cli.localidad ? ` · ${esc(cli.localidad)}` : ''}</div>
          ${cli.notas ? `<p class="nota">${esc(cli.notas)}</p>` : ''}
          <div class="cli-top__btns">
            ${cli.telefono && tipo ? `<button type="button" class="btn btn--wa btn--sm" data-f-wa>${tipo === 'vencida' ? 'Avisar cuota vencida' : 'Recordar próxima cuota'}</button>` : ''}
            ${cli.telefono ? '<button type="button" class="btn btn--ghost btn--sm" data-f-chat>Abrir chat</button>' : ''}
            <button type="button" class="btn btn--ghost btn--sm" data-f-edit>Editar datos</button>
          </div>
          ${pagoRec ? `<div class="aviso-ok"><span>Pago registrado: cuota ${pagoRec.numero} por ${esc($m(pagoRec.ultimo_pago || pagoRec.pagado))}${pagoRec.recibo_numero ? ` · recibo ${esc(window.SolariRecibo.numero(pagoRec.recibo_numero))}` : ''}.</span>
            <span class="aviso-ok__btns">${cli.telefono ? '<button type="button" class="btn btn--wa btn--sm" data-f-recibo>Enviar recibo PDF por WhatsApp</button>' : ''}
            <button type="button" class="btn btn--ghost btn--sm" data-f-pdf>Descargar / imprimir PDF</button></span></div>` : ''}
        </div>
        <div class="head"><h3>Planes de cuotas</h3><button type="button" class="btn btn--primary btn--sm" data-f-plan>+ Nuevo plan</button></div>
        ${cli.planes.length ? cli.planes.map(planHTML).join('') : '<p class="hint">Sin planes. Creá uno con "+ Nuevo plan": las cuotas se generan solas, una por mes.</p>'}`,
      [
        boton('Eliminar cliente', 'btn--quiet btn--sm', async () => {
          if (cli.planes.length) { toast('Primero eliminá sus planes (solo se puede si no tienen pagos).', true); return; }
          if (!window.confirm(`¿Eliminar a ${cli.nombre}?`)) return;
          loading(true);
          const { data, error } = await sb.from('clientes').delete().eq('id', cli.id).select('id');
          loading(false);
          if (error || !data || !data.length) { toast(error ? explicar(error) : 'No se pudo eliminar.', true); return; }
          toast('Cliente eliminado.');
          ficha.abierta = null;
          await cargar();
          render();
          cerrarEditor();
        }),
        boton('Cerrar', 'btn--dark', () => { ficha.abierta = null; st.ultimoPago = null; cerrarEditor(); render(); })
      ], { sinFoco: true });
      const body = $('[data-drawer-body]');
      if (mismo) body.scrollTop = scroll;
      $$('[data-pct]', body).forEach((el) => { el.style.width = `${el.dataset.pct}%`; });
      const on = (sel, fn) => { const el = $(sel, body); if (el) el.addEventListener('click', fn); };
      on('[data-f-wa]', () => { abrirWA(cli.telefono, mensaje(cli, tipo)); marcarAviso(cuotaDeMensaje(cli, tipo)).then(() => ficha(id)); });
      on('[data-f-chat]', () => abrirWA(cli.telefono, `Hola ${primerNombre(cli.nombre)}! `));
      on('[data-f-edit]', () => editarCliente(cli));
      on('[data-f-plan]', () => nuevoPlan(cli));
      on('[data-f-recibo]', () => enviarRecibo(cli, pagoRec));
      on('[data-f-pdf]', () => pdfRecibo(pagoRec));
      $$('[data-c-pagar]', body).forEach((b) => b.addEventListener('click', () => formCuota(b.dataset.cPagar, 'pagar')));
      $$('[data-c-editar]', body).forEach((b) => b.addEventListener('click', () => formCuota(b.dataset.cEditar, 'editar')));
      $$('[data-c-anular]', body).forEach((b) => b.addEventListener('click', () => anularPago(b.dataset.cAnular)));
      $$('[data-c-recibo]', body).forEach((b) => b.addEventListener('click', () => enviarRecibo(cli, st.cuotas.find((x) => x.id === b.dataset.cRecibo))));
      $$('[data-c-pdf]', body).forEach((b) => b.addEventListener('click', () => pdfRecibo(st.cuotas.find((x) => x.id === b.dataset.cPdf))));
      $$('[data-c-rapido]', body).forEach((b) => b.addEventListener('click', () => pagoRapido(b.dataset.cRapido)));
      $$('[data-p-estado]', body).forEach((b) => b.addEventListener('click', () => estadoPlan(b.dataset.pEstado)));
      $$('[data-p-borrar]', body).forEach((b) => b.addEventListener('click', () => borrarPlan(b.dataset.pBorrar)));
      $$('[data-p-mas]', body).forEach((b) => b.addEventListener('click', () => {
        $$(`[data-plan="${b.dataset.pMas}"] .cuota.is-pagada`, body).forEach((r) => { r.hidden = false; });
        b.remove();
      }));
    }

    function planHTML(p) {
      const pct = p.cuotas.length ? Math.round((p.pagas / p.cuotas.length) * 100) : 0;
      const pagosHechos = p.cuotas.some((c) => Number(c.pagado) > 0);
      const ocultas = p.cuotas.filter((c) => c.estado === 'pagada').length > 3 && p.estadoReal === 'activo';
      const pagadasMostrar = new Set(p.cuotas.filter((c) => c.estado === 'pagada').slice(-2).map((c) => c.id));
      const EST = { activo: ['Activo', 'badge--ok'], finalizado: ['Terminado', ''], cancelado: ['Cancelado', 'badge--off'] }[p.estadoReal];
      return `
        <section class="plan" data-plan="${esc(p.id)}">
          <div class="plan__head">
            <div><div class="item__title">${esc(p.nombreMoto)} <span class="badge ${EST[1]}">${EST[0]}</span></div>
              <div class="item__meta">${p.cantidad_cuotas} cuotas de ${esc($m(p.monto_cuota))}${p.precio_total ? ` · precio ${esc($m(p.precio_total))}` : ''}${Number(p.entrega) ? ` · entrega ${esc($m(p.entrega))}` : ''}</div>
              ${p.notas ? `<div class="item__meta">${esc(p.notas)}</div>` : ''}</div>
          </div>
          <div class="avance"><span data-pct="${pct}"></span></div>
          <div class="item__meta"><b>${p.pagas}</b> pagas · debe <b>${p.debe}</b> · saldo ${esc($m(p.saldo))}${p.vencidas.length ? ` · <b class="txt-danger">${p.vencidas.length} vencida(s)</b>` : ''}</div>
          <div class="cuotas">
            ${p.cuotas.map((c) => cuotaHTML(c, ocultas && c.estado === 'pagada' && !pagadasMostrar.has(c.id))).join('')}
          </div>
          ${ocultas ? `<button type="button" class="link" data-p-mas="${esc(p.id)}">Ver todas las cuotas pagas</button>` : ''}
          <div class="plan__btns">
            ${p.estadoReal !== 'finalizado' ? `<button type="button" class="btn btn--ghost btn--sm" data-p-estado="${esc(p.id)}">${p.estado === 'cancelado' ? 'Reactivar plan' : 'Cancelar plan'}</button>` : ''}
            ${pagosHechos ? '' : `<button type="button" class="btn btn--ghost btn--sm txt-danger" data-p-borrar="${esc(p.id)}">Eliminar plan</button>`}
          </div>
        </section>`;
    }

    function cuotaHTML(c, oculta) {
      const T = {
        pagada: ['Pagada', 'badge--ok'], vencida: [`Vencida · ${c.atraso} d`, 'badge--off'],
        por_vencer: ['Por vencer', 'badge--warn'], pendiente: ['Pendiente', '']
      }[c.estado];
      return `
        <div class="cuota is-${c.estado}" data-cuota="${esc(c.id)}" ${oculta ? 'hidden' : ''}>
          <span class="cuota__n">${c.numero}</span>
          <span class="cuota__info"><b>${esc(fFecha(c.vencimiento))}</b> · ${esc($m(c.monto))}
            <small>${c.estado === 'pagada' ? `Pagó ${esc(fFecha(c.fecha_pago))}${c.medio_pago ? ` · ${esc(MEDIOS[c.medio_pago] || c.medio_pago)}` : ''}`
              : c.parcial ? `Pagó ${esc($m(c.pagado))} · falta ${esc($m(c.saldo))}` : ''}${c.ultimo_aviso ? ` · avisado ${esc(hace(diaAR(new Date(c.ultimo_aviso))))}` : ''}${c.nota ? ` · ${esc(c.nota)}` : ''}</small></span>
          <span class="badge ${T[1]}">${esc(T[0])}${c.parcial ? ' · parcial' : ''}</span>
          <span class="cuota__btns">
            ${c.estado !== 'pagada' ? `<button type="button" class="mini mini--ok" data-c-rapido="${esc(c.id)}" title="Registra el pago completo por transferencia con fecha de hoy">Pagó ${esc($m(c.saldo))} (transf.)</button>
              <button type="button" class="mini" data-c-pagar="${esc(c.id)}">Otro monto / medio</button><button type="button" class="mini" data-c-editar="${esc(c.id)}">Editar</button>` : ''}
            ${c.recibo_numero ? `<button type="button" class="mini mini--wa" data-c-recibo="${esc(c.id)}" title="Enviar el recibo en PDF por WhatsApp">Enviar recibo</button>
              <button type="button" class="mini" data-c-pdf="${esc(c.id)}" title="Descargar o imprimir el recibo">PDF</button>` : ''}
            ${Number(c.pagado) > 0 ? `<button type="button" class="mini" data-c-anular="${esc(c.id)}">Anular pago</button>` : ''}
          </span>
        </div>`;
    }

    /* Formulario en línea: registrar pago o editar cuota */
    function formCuota(id, modo) {
      const c = st.cuotas.find((x) => x.id === id);
      const fila = $(`[data-cuota="${id}"]`);
      $$('.cuota-form').forEach((x) => x.remove());
      const f = document.createElement('form');
      f.className = 'cuota-form';
      f.noValidate = true;
      f.innerHTML = modo === 'pagar' ? `
        <div class="grid3">
          ${campo('Monto recibido', 'monto', Math.round(c.saldo), { type: 'number', min: 1, req: 1 })}
          ${campo('Fecha', 'fecha', hoyISO(), { type: 'date', req: 1 })}
          ${selector('Medio de pago', 'medio', 'efectivo', MEDIOS)}
        </div>
        ${campo('Nota (opcional)', 'nota', '', { max: 300 })}
        <div class="cuota-form__btns"><button type="button" class="link" data-x>Cancelar</button><button type="submit" class="btn btn--primary btn--sm">Confirmar pago</button></div>` : `
        <div class="grid3">
          ${campo('Vencimiento', 'vencimiento', c.vencimiento, { type: 'date', req: 1 })}
          ${campo('Monto de la cuota', 'monto', Math.round(c.monto), { type: 'number', min: 1, req: 1 })}
        </div>
        ${campo('Nota (opcional)', 'nota', c.nota, { max: 300 })}
        <div class="cuota-form__btns"><button type="button" class="link" data-x>Cancelar</button><button type="submit" class="btn btn--primary btn--sm">Guardar cuota</button></div>`;
      fila.after(f);
      $('input', f).focus();
      $('[data-x]', f).addEventListener('click', () => f.remove());
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('[type=submit]', f);
        const v = leerForm(f);
        const monto = Math.round(Number(v.monto));
        let cambio;
        if (modo === 'pagar') {
          if (!(monto > 0)) { toast('Revisá el monto.', true); return; }
          if (monto > c.saldo && !window.confirm(`El monto supera lo que falta pagar (${$m(c.saldo)}). ¿Registrarlo igual?`)) return;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) { toast('Revisá la fecha.', true); return; }
          cambio = { pagado: Number(c.pagado) + monto, fecha_pago: v.fecha, medio_pago: v.medio, nota: v.nota || c.nota };
        } else {
          if (!(monto > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(v.vencimiento)) { toast('Revisá la fecha y el monto.', true); return; }
          cambio = { vencimiento: v.vencimiento, monto, nota: v.nota };
        }
        btn.disabled = true;
        loading(true);
        const { data, error } = await sb.from('cuotas').update(cambio).eq('id', id).select('id');
        loading(false);
        btn.disabled = false;
        if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso para guardar.', true); return; }
        toast(modo === 'pagar' ? 'Pago registrado.' : 'Cuota actualizada.');
        if (modo === 'pagar') st.ultimoPago = id;
        const cli = ficha.abierta;
        await cargar();
        ficha(cli);
      });
    }

    /* ---------- Recibos ---------- */
    function datosRecibo(c) {
      const p = st.planes.find((x) => x.id === c.plan_id);
      const cli = st.clientes.find((x) => x.id === p.cliente_id);
      return { negocio: st.negocio, cliente: cli, plan: p, cuota: c };
    }
    function pdfRecibo(c) {
      if (!c || !c.recibo_numero) { toast('Esta cuota no tiene recibo.', true); return; }
      try { window.SolariRecibo.descargar(datosRecibo(c), true); toast('Recibo descargado: abrilo para imprimir.'); }
      catch (e) { toast('No se pudo generar el PDF.', true); }
    }
    function enviarRecibo(cli, c) {
      if (!c || !c.recibo_numero) { toast('Esta cuota no tiene recibo.', true); return; }
      let r;
      try { r = window.SolariRecibo.enviar(datosRecibo(c), cli.telefono, mensaje(cli, 'pago', c)); }
      catch (e) { toast('No se pudo generar el PDF.', true); return; }
      r.then((res) => {
        if (res === 'descargado') toast('Se descargó el PDF y se abrió el chat: adjuntalo con el clip.');
        else if (res === 'compartido') toast('Recibo compartido.');
        if (res !== 'cancelado' && st.ultimoPago === c.id) { st.ultimoPago = null; ficha(cli.id); }
      });
    }
    async function pagoRapido(id) {
      const c = st.cuotas.find((x) => x.id === id);
      if (!window.confirm(`¿Registrar el pago de la cuota ${c.numero} por ${$m(c.saldo)} (transferencia, con fecha de hoy)?`)) return;
      loading(true);
      const { data, error } = await sb.from('cuotas').update({ pagado: Number(c.pagado) + c.saldo, fecha_pago: hoyISO(), medio_pago: 'transferencia' }).eq('id', id).select('id');
      loading(false);
      if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso para guardar.', true); return; }
      toast('Pago registrado.');
      st.ultimoPago = id;
      const cli = ficha.abierta;
      await cargar();
      ficha(cli);
    }

    async function anularPago(id) {
      const c = st.cuotas.find((x) => x.id === id);
      if (!window.confirm(`¿Anular el pago de la cuota ${c.numero}? Vuelve a quedar pendiente.`)) return;
      loading(true);
      const { data, error } = await sb.from('cuotas').update({ pagado: 0, fecha_pago: null, medio_pago: '' }).eq('id', id).select('id');
      loading(false);
      if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso.', true); return; }
      toast('Pago anulado.');
      const cli = ficha.abierta;
      await cargar();
      ficha(cli);
    }

    async function estadoPlan(id) {
      const p = st.planes.find((x) => x.id === id);
      const nuevo = p.estado === 'cancelado' ? 'activo' : 'cancelado';
      if (nuevo === 'cancelado' && !window.confirm('¿Cancelar este plan? Sus cuotas dejan de contar como deuda y no se envían avisos.')) return;
      loading(true);
      const { data, error } = await sb.from('planes').update({ estado: nuevo }).eq('id', id).select('id');
      loading(false);
      if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso.', true); return; }
      toast(nuevo === 'cancelado' ? 'Plan cancelado.' : 'Plan reactivado.');
      const cli = ficha.abierta;
      await cargar();
      ficha(cli);
    }

    async function borrarPlan(id) {
      if (!window.confirm('¿Eliminar este plan y todas sus cuotas? No tiene pagos registrados.')) return;
      loading(true);
      const { data, error } = await sb.from('planes').delete().eq('id', id).select('id');
      loading(false);
      if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso.', true); return; }
      toast('Plan eliminado.');
      const cli = ficha.abierta;
      await cargar();
      ficha(cli);
    }

    /* ---------- Nuevo plan ---------- */
    function nuevoPlan(cli) {
      const hoy = hoyISO();
      const motos = Object.fromEntries([['', 'Otra / usada (escribir abajo)'], ...st.motos.map((m) => [m.id, `${m.marca} ${m.modelo}`])]);
      abrirEditor(`Nuevo plan · ${cli.nombre}`, `
        <form data-form novalidate>
          <div class="grid2">
            ${selector('Moto del catálogo', 'moto_id', '', motos)}
            ${campo('Descripción (color, dominio, usada…)', 'vehiculo', '', { max: 160 })}
            ${campo('Precio total (opcional)', 'precio_total', '', { type: 'number', min: 0 })}
            ${campo('Entrega / anticipo', 'entrega', '', { type: 'number', min: 0 })}
            ${campo('Cantidad de cuotas', 'cantidad_cuotas', 12, { type: 'number', min: 1, maxn: 120, req: 1 })}
            <label class="field">Monto de cada cuota
              <input name="monto_cuota" type="number" min="1" inputmode="numeric" required>
              <button type="button" class="link link--sm" data-calc>Calcular sin interés: (precio − entrega) ÷ cuotas</button></label>
            ${campo('Vence la primera cuota', 'primer_vencimiento', sumarMes(hoy, 1), { type: 'date', req: 1 })}
          </div>
          ${area('Notas del plan', 'notas', '', 600)}
          <p class="preview" data-prev></p>
        </form>`,
      [
        boton('Volver', 'btn--ghost', () => ficha(cli.id)),
        boton('Crear plan y cuotas', 'btn--primary', async () => {
          const v = leerForm($('[data-form]'));
          const n = Math.round(Number(v.cantidad_cuotas));
          const monto = Math.round(Number(v.monto_cuota));
          if (!(n >= 1 && n <= 120)) { toast('La cantidad de cuotas va de 1 a 120.', true); return; }
          if (!(monto > 0)) { toast('Completá el monto de la cuota.', true); return; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v.primer_vencimiento)) { toast('Completá la fecha de la primera cuota.', true); return; }
          const m = st.motos.find((x) => x.id === v.moto_id);
          const fila = {
            cliente_id: cli.id, moto_id: v.moto_id || null,
            vehiculo: v.vehiculo || (m ? `${m.marca} ${m.modelo}` : ''),
            precio_total: v.precio_total === '' ? null : Math.round(Number(v.precio_total)),
            entrega: Math.round(Number(v.entrega) || 0),
            cantidad_cuotas: n, monto_cuota: monto, primer_vencimiento: v.primer_vencimiento, notas: v.notas
          };
          if (!fila.vehiculo) { toast('Elegí la moto o escribí la descripción.', true); return; }
          loading(true);
          const { error } = await sb.from('planes').insert(fila);
          loading(false);
          if (error) { toast(explicar(error), true); return; }
          toast(`Plan creado con ${n} cuotas.`);
          await cargar();
          ficha(cli.id);
        })
      ], { sinFoco: true });
      const f = $('[data-form]');
      const prev = () => {
        const v = leerForm(f);
        const n = Math.round(Number(v.cantidad_cuotas)) || 0;
        const m = Math.round(Number(v.monto_cuota)) || 0;
        const p = $('[data-prev]');
        if (!(n > 0 && m > 0 && v.primer_vencimiento)) { p.textContent = 'Completá cuotas, monto y primer vencimiento para ver el resumen.'; return; }
        const total = n * m + (Math.round(Number(v.entrega)) || 0);
        p.textContent = `${n} cuotas de ${$m(m)} (${$m(n * m)} financiado${Number(v.entrega) ? ` + ${$m(v.entrega)} de entrega = ${$m(total)}` : ''}). Vencen todos los meses del ${fCorta(v.primer_vencimiento)} al ${fFecha(sumarMes(v.primer_vencimiento, n - 1))}.`;
      };
      f.moto_id.addEventListener('change', () => {
        const m = st.motos.find((x) => x.id === f.moto_id.value);
        if (m && m.precio && !f.precio_total.value) f.precio_total.value = Math.round(m.precio);
        prev();
      });
      $('[data-calc]', f).addEventListener('click', () => {
        const v = leerForm(f);
        const n = Math.round(Number(v.cantidad_cuotas));
        const neto = (Number(v.precio_total) || 0) - (Number(v.entrega) || 0);
        if (!(n > 0 && neto > 0)) { toast('Cargá precio total, entrega y cantidad de cuotas.', true); return; }
        f.monto_cuota.value = Math.ceil(neto / n);
        prev();
      });
      f.addEventListener('input', prev);
      prev();
    }

    /* ---------- Mensajes y días de aviso ---------- */
    function editarMensajes() {
      const pl = { ...PLANTILLAS, ...(st.cfg.plantillas || {}) };
      abrirEditor('Mensajes de WhatsApp', `
        <form data-form novalidate>
          ${campo('Avisar como "por vencer" con cuántos días de anticipación', 'dias_aviso', st.cfg.dias_aviso, { type: 'number', min: 0, maxn: 30 })}
          <p class="hint">Podés usar estas palabras entre llaves y se reemplazan solas: <code>${esc(VARIABLES)}</code></p>
          ${area('Recordatorio (cuota por vencer o próxima)', 'recordatorio', pl.recordatorio, 1000)}
          ${area('Cuota vencida', 'vencida', pl.vencida, 1000)}
          ${area('Recibo de pago (acompaña al PDF)', 'pago', pl.pago, 1000)}
          <button type="button" class="link" data-restaurar>Volver a los mensajes originales</button>
        </form>`,
      [
        boton('Cancelar', 'btn--ghost', () => { cerrarEditor(); }),
        boton('Guardar mensajes', 'btn--primary', async () => {
          const v = leerForm($('[data-form]'));
          const dias = Math.round(Number(v.dias_aviso));
          if (!(dias >= 0 && dias <= 30)) { toast('Los días de aviso van de 0 a 30.', true); return; }
          const plantillas = { recordatorio: v.recordatorio || PLANTILLAS.recordatorio, vencida: v.vencida || PLANTILLAS.vencida, pago: v.pago || PLANTILLAS.pago };
          loading(true);
          const { data, error } = await sb.from('cobranza').update({ dias_aviso: dias, plantillas }).eq('id', 1).select('id');
          loading(false);
          if (error || !data || !data.length) { toast(error ? explicar(error) : 'Sin permiso.', true); return; }
          st.cfg = { dias_aviso: dias, plantillas };
          calcular();
          toast('Mensajes guardados.');
          cerrarEditor();
          render();
        })
      ], { sinFoco: true });
      $('[data-restaurar]').addEventListener('click', () => {
        const f = $('[data-form]');
        Object.keys(PLANTILLAS).forEach((k) => { f[k].value = PLANTILLAS[k]; });
      });
    }

    /* ---------- Exportar a Excel (CSV) ---------- */
    function exportar() {
      const l = filtrados();
      const cab = ['Cliente', 'DNI', 'WhatsApp', 'Localidad', 'Estado', 'Moto(s)', 'Cuotas pagas', 'Cuotas que debe', 'Cuotas vencidas', 'Monto atrasado', 'Saldo total', 'Próximo vencimiento', 'Último aviso'];
      const filas = l.map((c) => [c.nombre, c.dni, c.telefono ? verTel(c.telefono) : '', c.localidad, ESTADOS[c.estado], c.motos, c.pagas, c.totalCuotas - c.pagas,
        c.vencidas.length, Math.round(c.adeudado), Math.round(c.saldo), c.proxima ? fFecha(c.proxima.vencimiento) : '', c.ultimoAviso ? fFecha(c.ultimoAviso) : '']);
      const celda = (v) => {
        let s = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(s)) s = `'${s}`; // evita fórmulas al abrir en Excel
        return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = '﻿' + [cab, ...filas].map((r) => r.map(celda).join(';')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `clientes-solari-${hoyISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast(`Exportados ${l.length} cliente(s).`);
    }

    return {
      ver,
      precargar: async () => { if (await cargar()) actualizarBadge(); },
      _normTel: normTel
    };
  };
})();
