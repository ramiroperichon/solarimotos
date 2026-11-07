/* ==========================================================================
   SOLARI MOTOS — Datos del sitio
   --------------------------------------------------------------------------
   Este archivo es la ÚNICA fuente de contenido. El diseño se arma solo a
   partir de estos datos: agregar una moto, una marca o un casco nuevo no
   requiere tocar HTML ni CSS.

   ⚠️  CONTENIDO PROVISORIO
   - Precios: valores de referencia para evaluar el diseño (config.demo).
   - Financiación y promociones: textos genéricos. Reemplazar por las
     condiciones REALES que defina el negocio antes de publicar.
   - Fotos de motos: imágenes de referencia (Unsplash). Reemplazar por fotos
     propias en /assets/images/ cuando estén disponibles.
   - Cascos y local: sin fotos todavía → se muestran espacios preparados.
   ========================================================================== */

(function () {
  'use strict';

  const img = (id, w = 1400) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=74`;

  const config = {
    nombre: 'Solari Motos',
    // Muestra la marca "Referencia" junto a precios y condiciones de ejemplo.
    demo: true,
    // WhatsApp en formato internacional, sin "+" ni espacios (PROVISORIO)
    whatsapp: '5493790000000',
    whatsappVisible: '+54 9 379 000-0000',
    telefono: '+54 379 000-0000',
    email: 'hola@solarimotos.com.ar',
    direccion: 'Dirección a confirmar',
    localidad: 'Tu localidad',
    provincia: 'Corrientes',
    mapaQuery: 'Corrientes, Argentina',
    // 0 = domingo … 6 = sábado. Rangos en formato 24 h.
    horarios: {
      1: [['08:00', '12:00'], ['16:30', '20:30']],
      2: [['08:00', '12:00'], ['16:30', '20:30']],
      3: [['08:00', '12:00'], ['16:30', '20:30']],
      4: [['08:00', '12:00'], ['16:30', '20:30']],
      5: [['08:00', '12:00'], ['16:30', '20:30']],
      6: [['08:30', '12:30']],
      0: []
    },
    horariosTexto: [
      ['Lunes a viernes', '8:00–12:00 · 16:30–20:30'],
      ['Sábados', '8:30–12:30'],
      ['Domingos', 'Cerrado']
    ],
    redes: {
      instagram: 'https://instagram.com/',
      facebook: 'https://facebook.com/'
    },
    mensajeWhatsApp: 'Hola Solari Motos, quiero hacer una consulta.'
  };

  /* ---------- Motos ----------
     disponibilidad: 'disponible' | 'ultima' | 'pedido' | 'reservada'
     precio: número (contado) o null para mostrar "Consultar precio".
     imagenes: la primera es la principal. */
  const motos = [
    {
      id: 'honda-xr-150l',
      marca: 'Honda', modelo: 'XR 150L', categoria: 'Trail',
      cilindrada: 149, anio: 2026, precio: 4350000,
      disponibilidad: 'disponible', etiqueta: 'Para todo camino',
      imagenes: [img('photo-1558981806-ec527fa84c39'), img('photo-1449426468159-d96dbf08f19f'), img('photo-1525160354320-d8e92641c563')],
      resumen: 'Robusta y simple de mantener. Va igual de bien en el asfalto del centro que en el camino de tierra.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Ciudad, ruta y tierra'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'honda-wave-110-s',
      marca: 'Honda', modelo: 'Wave 110 S', categoria: 'Calle',
      cilindrada: 109, anio: 2026, precio: 2650000,
      disponibilidad: 'disponible', etiqueta: 'La de todos los días',
      imagenes: [img('photo-1609630875171-b1321377ee65'), img('photo-1558981403-c5f9899a28bc')],
      resumen: 'Económica, liviana y confiable. La compañera ideal para ir al trabajo, al colegio o hacer mandados.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'zanella-zb-110',
      marca: 'Zanella', modelo: 'ZB 110', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1890000,
      disponibilidad: 'ultima', etiqueta: '',
      imagenes: [img('photo-1568772585407-9361f9bf3a87'), img('photo-1580310614729-ccd69652491d')],
      resumen: 'Práctica y accesible, pensada para moverse por la ciudad gastando poco.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'corven-energy-110',
      marca: 'Corven', modelo: 'Energy 110', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1790000,
      disponibilidad: 'disponible', etiqueta: '',
      imagenes: [img('photo-1622185135505-2d795003994a'), img('photo-1558980664-769d59546b3d')],
      resumen: 'Una opción económica y rendidora para dar el primer paso a tu propia moto.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'guerrero-trip-110',
      marca: 'Guerrero', modelo: 'Trip 110', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1750000,
      disponibilidad: 'pedido', etiqueta: '',
      imagenes: [img('photo-1547549082-6bc09f2049ae'), img('photo-1591637333184-19aa84b3e01f')],
      resumen: 'Sencilla y resistente. Ideal para el uso diario con un costo de mantenimiento bajo.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    }
  ];

  /* ---------- Cascos ----------
     Sin fotos propias todavía: imagenes vacías muestran un espacio preparado. */
  const cascos = [
    { id: 'casco-integral', tipo: 'Integral', nombre: 'Casco integral', talles: 'S · M · L · XL', precio: null, disponibilidad: 'disponible', imagenes: [], detalle: 'Protección completa con visor. Para ruta y uso diario.' },
    { id: 'casco-rebatible', tipo: 'Rebatible', nombre: 'Casco rebatible', talles: 'M · L · XL', precio: null, disponibilidad: 'disponible', imagenes: [], detalle: 'Mentonera que se levanta: comodidad de un abierto con protección de un integral.' },
    { id: 'casco-abierto', tipo: 'Abierto', nombre: 'Casco abierto (jet)', talles: 'S · M · L', precio: null, disponibilidad: 'disponible', imagenes: [], detalle: 'Liviano y fresco, ideal para la ciudad y el calor.' }
  ];

  /* ---------- Financiación ----------
     Textos GENÉRICOS a validar. No incluir tasas, montos ni promesas de
     aprobación que no hayan sido confirmados por el negocio. */
  const financiacion = {
    alternativas: [
      {
        titulo: 'Crédito personal',
        bajada: 'Con tu DNI',
        texto: 'Financiá tu moto en cuotas fijas a través de una entidad crediticia. Sujeto a evaluación y aprobación de la entidad.',
        consulta: 'quiero consultar por crédito personal con DNI'
      },
      {
        titulo: 'Tarjetas de crédito',
        bajada: 'Bancarias',
        texto: 'Pagá en cuotas con tu tarjeta. La cantidad de cuotas depende del banco y de las promociones vigentes.',
        consulta: 'quiero saber en cuántas cuotas puedo pagar con tarjeta'
      },
      {
        titulo: 'Entrega + cuotas',
        bajada: 'A tu medida',
        texto: 'Si contás con un anticipo, lo tomamos como entrega y financiamos el saldo para que la cuota sea menor.',
        consulta: 'tengo un anticipo y quiero saber cómo financiar el resto'
      },
      {
        titulo: 'Contado',
        bajada: 'Efectivo o transferencia',
        texto: 'Pagás una sola vez y te llevás la moto. Consultá si hay un precio especial de contado.',
        consulta: 'quiero consultar el precio de contado'
      }
    ],
    requisitos: [
      'DNI vigente',
      'Comprobante de ingresos',
      'Servicio o comprobante de domicilio',
      'Otros requisitos según la entidad'
    ],
    medios: ['Efectivo', 'Transferencia', 'Débito', 'Tarjetas de crédito', 'Crédito personal'],
    // Opciones que la persona puede elegir al armar su consulta.
    entregaOpciones: ['Sin entrega', 'Con entrega'],
    cuotasOpciones: [6, 12, 18, 24],
    // Coeficientes REALES por plan, ej.: { 12: 1.45 }. En null no se muestra
    // ningún monto estimado: la cuota se informa por WhatsApp.
    coeficientes: null,
    aviso: 'Toda financiación está sujeta a evaluación crediticia. Las condiciones, cuotas y requisitos se confirman al momento de la consulta.'
  };

  /* ---------- Promociones ----------
     demo: true muestra la marca "Ejemplo". Dejar el arreglo vacío para
     ocultar el bloque. */
  const promociones = [
    { id: 'promo-casco', titulo: 'Tu 0km con casco', texto: 'Consultá por el casco incluido en la compra de modelos seleccionados.', vigencia: 'Vigencia a confirmar', demo: true },
    { id: 'promo-contado', titulo: 'Beneficio de contado', texto: 'Precio especial pagando en efectivo o transferencia.', vigencia: 'Vigencia a confirmar', demo: true }
  ];

  window.SolariData = {
    get() { return { config, motos, cascos, financiacion, promociones }; }
  };
})();
