/* ==========================================================================
   SOLARI MOTOS — Recibo de pago en PDF (se genera en el navegador)
   · Tamaño A5, con número correlativo que asigna la base de datos.
   · Enviar: en el celular abre "Compartir" con el PDF adjunto (WhatsApp);
     en la computadora descarga el PDF y abre el chat para adjuntarlo.
   ========================================================================== */
(function () {
  'use strict';

  const AZUL = [27, 77, 184];
  const GRAFITO = [31, 30, 28];
  const GRIS = [106, 101, 93];
  const LINEA = [216, 209, 197];
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const $m = (n) => money.format(Math.round(Number(n) || 0)).replace(/ /g, ' ');
  const fFecha = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercadopago: 'Mercado Pago', debito: 'Tarjeta de débito', credito: 'Tarjeta de crédito', otro: 'Otro' };

  /* Logo: se rasteriza una vez para incrustarlo en el PDF */
  let logo = null;
  (function cargarLogo() {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 720; c.height = Math.round(720 * (img.naturalHeight / img.naturalWidth || 69 / 180));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        logo = { data: c.toDataURL('image/png'), ratio: c.height / c.width };
      } catch (e) { logo = null; }
    };
    img.src = 'logo.svg';
  })();

  /* Importe en letras (pesos argentinos) */
  function letras(valor) {
    let n = Math.round(Number(valor) || 0);
    if (n === 0) return 'cero';
    const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    const corto = (s) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
    const m100 = (x) => (x < 30 ? U[x] : D[Math.floor(x / 10)] + (x % 10 ? ` y ${U[x % 10]}` : ''));
    const m1000 = (x) => (x === 100 ? 'cien' : `${C[Math.floor(x / 100)]} ${x % 100 ? m100(x % 100) : ''}`.trim());
    const miles = (x) => {
      if (x < 1000) return m1000(x);
      const k = Math.floor(x / 1000); const r = x % 1000;
      return `${k === 1 ? 'mil' : `${corto(m1000(k))} mil`}${r ? ` ${m1000(r)}` : ''}`;
    };
    if (n < 1e6) return miles(n);
    const mm = Math.floor(n / 1e6); n %= 1e6;
    return `${mm === 1 ? 'un millón' : `${corto(miles(mm))} millones`}${n ? ` ${miles(n)}` : ''}`;
  }

  const numero = (n) => `0001-${String(n || 0).padStart(8, '0')}`;
  const nombreArchivo = (d) => `Recibo-${numero(d.cuota.recibo_numero)}-${String(d.cliente.nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;

  /* d = { negocio, cliente, plan, cuota } */
  function generar(d) {
    if (!window.jspdf) throw new Error('No se pudo cargar el generador de PDF.');
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a5', compress: true });
    const W = 148; const M = 12; const AN = W - M * 2;
    const c = d.cuota; const p = d.plan; const n = d.negocio;
    const pagoEste = Number(c.ultimo_pago || c.pagado);
    doc.setProperties({ title: `Recibo ${numero(c.recibo_numero)} · ${n.nombre}`, author: n.nombre, creator: 'Panel Solari Motos' });
    const col = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const linea = (y) => { doc.setDrawColor(LINEA[0], LINEA[1], LINEA[2]); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); };

    // Encabezado
    let y = 12;
    if (logo) doc.addImage(logo.data, 'PNG', M, y, 38, 38 * logo.ratio);
    else { doc.setFont('helvetica', 'bold'); doc.setFontSize(16); col(GRAFITO); doc.text(n.nombre.toUpperCase(), M, y + 8); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); col(AZUL);
    doc.text('RECIBO DE PAGO', W - M, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); col(GRAFITO);
    doc.text(`N.º ${numero(c.recibo_numero)}`, W - M, y + 9.5, { align: 'right' });
    doc.text(`Fecha: ${fFecha(c.fecha_pago)}`, W - M, y + 14, { align: 'right' });
    y += 22;
    doc.setFontSize(7.5); col(GRIS);
    const datosLocal = [n.direccion, [n.localidad, n.provincia].filter(Boolean).join(', '), n.whatsapp ? `WhatsApp ${n.whatsapp}` : ''].filter(Boolean).join(' · ');
    doc.text(doc.splitTextToSize(datosLocal, AN), M, y);
    y += 5;
    doc.setDrawColor(AZUL[0], AZUL[1], AZUL[2]); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
    y += 8;

    // Cliente
    const etiqueta = (t, x, yy) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(7); col(GRIS); doc.text(t.toUpperCase(), x, yy); };
    const valor = (t, x, yy, size = 10, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); col(GRAFITO); doc.text(String(t), x, yy); };
    etiqueta('Recibimos de', M, y);
    if (d.cliente.dni) etiqueta('DNI', W - M - 32, y);
    y += 5;
    valor(d.cliente.nombre, M, y, 11, true);
    if (d.cliente.dni) valor(d.cliente.dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), W - M - 32, y, 10);
    y += 8;

    // Importe destacado
    doc.setFillColor(244, 239, 230);
    doc.roundedRect(M, y, AN, 22, 2, 2, 'F');
    etiqueta('La suma de', M + 5, y + 6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); col(AZUL);
    doc.text($m(pagoEste), M + 5, y + 14);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); col(GRIS);
    doc.text(doc.splitTextToSize(`Son pesos ${letras(pagoEste)}.`, AN - 10), M + 5, y + 19);
    y += 30;

    // Concepto
    etiqueta('En concepto de', M, y);
    y += 5;
    valor(`Cuota ${c.numero} de ${p.cantidad_cuotas} · ${p.nombreMoto}`, M, y, 10, true);
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); col(GRIS);
    doc.text(`Vencimiento de la cuota: ${fFecha(c.vencimiento)}`, M, y);
    y += 7;

    // Detalle
    linea(y); y += 5;
    const filas = [
      ['Importe de la cuota', $m(c.monto)],
      ['Pagado en este recibo', $m(pagoEste)],
      ...(Number(c.pagado) !== pagoEste ? [['Total pagado de la cuota', $m(c.pagado)]] : []),
      ['Saldo de la cuota', $m(Math.max(0, Number(c.monto) - Number(c.pagado)))],
      ['Medio de pago', MEDIOS[c.medio_pago] || c.medio_pago || '-']
    ];
    filas.forEach(([k, v]) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); col(GRIS); doc.text(k, M, y);
      doc.setFont('helvetica', 'bold'); col(GRAFITO); doc.text(v, W - M, y, { align: 'right' });
      y += 5.5;
    });
    if (c.nota) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); col(GRIS);
      const t = doc.splitTextToSize(`Nota: ${c.nota}`, AN);
      doc.text(t, M, y); y += t.length * 3.6 + 1;
    }
    linea(y); y += 6;

    // Estado del plan
    etiqueta('Estado del plan', M, y);
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); col(GRAFITO);
    doc.text(`Cuotas pagas: ${p.pagas} de ${p.cantidad_cuotas}  ·  Restan: ${p.debe}  ·  Saldo del plan: ${$m(p.saldo)}`, M, y);
    y += 4;
    const barra = AN; const pct = p.cantidad_cuotas ? p.pagas / p.cantidad_cuotas : 0;
    doc.setFillColor(231, 226, 217); doc.roundedRect(M, y, barra, 2, 1, 1, 'F');
    if (pct > 0) { doc.setFillColor(45, 127, 74); doc.roundedRect(M, y, Math.max(2, barra * pct), 2, 1, 1, 'F'); }

    // Firma y pie
    const yf = 180;
    doc.setDrawColor(GRAFITO[0], GRAFITO[1], GRAFITO[2]); doc.setLineWidth(0.3);
    doc.line(W - M - 52, yf, W - M, yf);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); col(GRIS);
    doc.text(`Firma y aclaración · ${n.nombre}`, W - M - 26, yf + 4, { align: 'center' });
    linea(194);
    doc.setFontSize(7); col(GRIS);
    doc.text('Documento no válido como factura. Comprobante interno de pago de cuota.', M, 198.5);
    doc.text(`Emitido el ${new Date(c.recibo_fecha || Date.now()).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`, M, 202);
    return doc;
  }

  function blob(d) { return generar(d).output('blob'); }

  function descargar(d, imprimir) {
    const doc = generar(d);
    if (imprimir) doc.autoPrint();
    const b = doc.output('blob');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = nombreArchivo(d);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  /* Devuelve 'compartido' | 'cancelado' | 'descargado' */
  async function enviar(d, tel, texto) {
    const nombre = nombreArchivo(d);
    const archivo = new File([blob(d)], nombre, { type: 'application/pdf' });
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], text: texto, title: `Recibo ${numero(d.cuota.recibo_numero)}` });
        return 'compartido';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelado';
      }
    }
    descargar(d);
    if (tel) window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    return 'descargado';
  }

  window.SolariRecibo = { generar, blob, descargar, enviar, letras, numero, nombreArchivo };
})();
