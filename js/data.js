/* ==========================================================================
   SOLARI MOTOS — Datos del sitio
   --------------------------------------------------------------------------
   ⚠️  CONTENIDO DE DEMOSTRACIÓN
   Todos los precios, condiciones de financiación, promociones, datos de
   contacto y fotografías de este archivo son PROVISORIOS y sirven solo
   para evaluar el diseño. Reemplazarlos por la información real antes de
   publicar el sitio.

   Este archivo es la única fuente de contenido del sitio. En la Etapa 4
   el administrador local podrá sobrescribir estos valores mediante
   localStorage (solo en el navegador donde se edite).
   ========================================================================== */

(function () {
  'use strict';

  /* Fotografías de referencia (Unsplash). Reemplazar por fotos propias
     guardadas en /assets/images/ cuando estén disponibles. */
  const img = (id, w = 1200) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`;

  const PHOTOS = {
    hero: img('photo-1558981806-ec527fa84c39', 1600),
    a: img('photo-1568772585407-9361f9bf3a87'),
    b: img('photo-1609630875171-b1321377ee65'),
    c: img('photo-1558981403-c5f9899a28bc'),
    d: img('photo-1591637333184-19aa84b3e01f'),
    e: img('photo-1449426468159-d96dbf08f19f'),
    f: img('photo-1580310614729-ccd69652491d'),
    g: img('photo-1622185135505-2d795003994a'),
    h: img('photo-1558980664-769d59546b3d'),
    i: img('photo-1547549082-6bc09f2049ae'),
    road: img('photo-1525160354320-d8e92641c563', 1600),
    shop: img('photo-1517846693594-1567da72af75'),
    shop2: img('photo-1571068316344-75bc76f77890')
  };

  const config = {
    nombre: 'Solari Motos',
    eslogan: 'Tu próxima moto te está esperando',
    // Número en formato internacional, sin "+" ni espacios (DEMO)
    whatsapp: '5491100000000',
    whatsappVisible: '+54 9 11 0000-0000',
    telefono: '+54 11 0000-0000',
    email: 'hola@solarimotos.com.ar',
    direccion: 'Av. Ejemplo 1234',
    localidad: 'Ciudad Autónoma de Buenos Aires',
    mapaQuery: 'Obelisco, Buenos Aires',
    // Horarios: 0 = domingo … 6 = sábado. Rangos en formato 24 h.
    horarios: {
      1: [['09:00', '13:00'], ['15:30', '19:30']],
      2: [['09:00', '13:00'], ['15:30', '19:30']],
      3: [['09:00', '13:00'], ['15:30', '19:30']],
      4: [['09:00', '13:00'], ['15:30', '19:30']],
      5: [['09:00', '13:00'], ['15:30', '19:30']],
      6: [['09:00', '13:30']],
      0: []
    },
    horariosTexto: [
      ['Lunes a viernes', '9:00 – 13:00 · 15:30 – 19:30'],
      ['Sábados', '9:00 – 13:30'],
      ['Domingos y feriados', 'Cerrado']
    ],
    redes: {
      instagram: 'https://instagram.com/',
      facebook: 'https://facebook.com/',
      tiktok: 'https://tiktok.com/'
    },
    mensajeWhatsApp: 'Hola Solari Motos, quiero hacer una consulta.'
  };

  const categorias = ['Calle', 'Sport', 'Naked', 'Trail', 'Scooter', 'Custom'];

  const motos = [
    {
      id: 'benelli-trk-251',
      marca: 'Benelli', modelo: 'TRK 251', categoria: 'Trail',
      cilindrada: 249, anio: 2026, precio: 7890000,
      disponibilidad: 'disponible', destacada: true, etiqueta: 'Más elegida',
      imagenes: [PHOTOS.hero, PHOTOS.road, PHOTOS.e],
      resumen: 'Aventura liviana para ruta y ciudad, con postura cómoda y gran autonomía.',
      financiacion: { cuotas: 24, texto: 'Hasta 24 cuotas fijas con DNI (demo)' }
    },
    {
      id: 'yamaha-mt-03',
      marca: 'Yamaha', modelo: 'MT-03', categoria: 'Naked',
      cilindrada: 321, anio: 2026, precio: 11950000,
      disponibilidad: 'ultimas', destacada: true, etiqueta: 'Bicilíndrica',
      imagenes: [PHOTOS.a, PHOTOS.b],
      resumen: 'Bicilíndrica de carácter urbano, ágil y con respuesta inmediata.',
      financiacion: { cuotas: 18, texto: 'Hasta 18 cuotas con tarjeta (demo)' }
    },
    {
      id: 'ktm-duke-390',
      marca: 'KTM', modelo: '390 Duke', categoria: 'Naked',
      cilindrada: 399, anio: 2026, precio: 12400000,
      disponibilidad: 'disponible', destacada: true, etiqueta: 'Nuevo modelo',
      imagenes: [PHOTOS.d, PHOTOS.c],
      resumen: 'Liviana, filosa y equipada. La naked para quienes buscan sensaciones.',
      financiacion: { cuotas: 12, texto: 'Hasta 12 cuotas sin interés (demo)' }
    },
    {
      id: 'honda-xr-150l',
      marca: 'Honda', modelo: 'XR 150L', categoria: 'Trail',
      cilindrada: 149, anio: 2026, precio: 4350000,
      disponibilidad: 'disponible', destacada: true, etiqueta: '',
      imagenes: [PHOTOS.f, PHOTOS.e],
      resumen: 'Robusta, económica y lista para cualquier camino.',
      financiacion: { cuotas: 36, texto: 'Hasta 36 cuotas con DNI (demo)' }
    },
    {
      id: 'royal-enfield-classic-350',
      marca: 'Royal Enfield', modelo: 'Classic 350', categoria: 'Custom',
      cilindrada: 349, anio: 2025, precio: 8990000,
      disponibilidad: 'pedido', destacada: true, etiqueta: 'Clásica',
      imagenes: [PHOTOS.g, PHOTOS.h],
      resumen: 'Estilo clásico, andar sereno y presencia en cada esquina.',
      financiacion: { cuotas: 24, texto: 'Hasta 24 cuotas fijas (demo)' }
    },
    {
      id: 'bajaj-rouser-ns-200',
      marca: 'Bajaj', modelo: 'Rouser NS 200', categoria: 'Sport',
      cilindrada: 199, anio: 2026, precio: 5290000,
      disponibilidad: 'disponible', destacada: true, etiqueta: 'Promo',
      imagenes: [PHOTOS.i, PHOTOS.c],
      resumen: 'Deportiva accesible con chasis perimetral y gran rendimiento.',
      financiacion: { cuotas: 24, texto: 'Anticipo + 24 cuotas (demo)' }
    },
    {
      id: 'zanella-styler-150',
      marca: 'Zanella', modelo: 'Styler 150 Exclusive', categoria: 'Scooter',
      cilindrada: 150, anio: 2026, precio: 3180000,
      disponibilidad: 'disponible', destacada: false, etiqueta: '',
      imagenes: [PHOTOS.b],
      resumen: 'Scooter urbano con estilo retro y bajo consumo.',
      financiacion: { cuotas: 18, texto: 'Hasta 18 cuotas (demo)' }
    },
    {
      id: 'honda-wave-110',
      marca: 'Honda', modelo: 'Wave 110 S', categoria: 'Calle',
      cilindrada: 109, anio: 2026, precio: 2650000,
      disponibilidad: 'reservada', destacada: false, etiqueta: '',
      imagenes: [PHOTOS.c],
      resumen: 'La compañera de todos los días: simple, confiable y económica.',
      financiacion: { cuotas: 36, texto: 'Hasta 36 cuotas con DNI (demo)' }
    }
  ];

  const promociones = [
    {
      id: 'promo-casco',
      titulo: 'Casco de regalo',
      bajada: 'Llevate un casco certificado con la compra de cualquier 0km seleccionada.',
      etiqueta: 'Regalo',
      vigencia: 'Demo · Vigencia a definir',
      destacada: true
    },
    {
      id: 'promo-patentamiento',
      titulo: 'Patentamiento bonificado',
      bajada: 'Bonificamos un porcentaje del patentamiento en modelos de 150 a 250 cc.',
      etiqueta: 'Ahorro',
      vigencia: 'Demo · Condiciones a confirmar',
      destacada: false
    },
    {
      id: 'promo-permuta',
      titulo: 'Tu usada vale más',
      bajada: 'Tomamos tu moto usada como parte de pago con tasación en el momento.',
      etiqueta: 'Permuta',
      vigencia: 'Demo · Sujeto a evaluación',
      destacada: false
    }
  ];

  const financiacion = {
    aviso: 'Contenido de demostración. Las condiciones, coeficientes y requisitos son ilustrativos y deben reemplazarse por las condiciones reales vigentes.',
    pasos: [
      { titulo: 'Elegí tu moto', texto: 'Recorré el catálogo y marcá el modelo que te gusta.' },
      { titulo: 'Consultá por WhatsApp', texto: 'Te enviamos un plan a medida con entrega y cuotas.' },
      { titulo: 'Presentá tu DNI', texto: 'Evaluamos tu solicitud de forma rápida y sin vueltas.' },
      { titulo: 'Retirá y rodá', texto: 'Firmás, patentamos y te llevás tu moto lista para salir.' }
    ],
    requisitos: [
      'DNI vigente (titular mayor de 18 años)',
      'Comprobante de ingresos o recibo de sueldo',
      'Servicio a nombre del titular',
      'Sin informes negativos (según entidad)'
    ],
    medios: ['Efectivo', 'Transferencia', 'Tarjeta de débito', 'Tarjetas de crédito', 'Crédito con DNI', 'Permuta'],
    entregaMinima: 20,   // % (demo)
    entregaMaxima: 70,   // % (demo)
    planes: [6, 12, 18, 24, 36],
    // Coeficiente total sobre el saldo financiado. SOLO DEMOSTRATIVO.
    coeficientesDemo: { 6: 1.18, 12: 1.36, 18: 1.55, 24: 1.74, 36: 2.12 }
  };

  const nosotros = {
    desde: 2009,
    stats: [
      { valor: 17, sufijo: '', etiqueta: 'años en el camino' },
      { valor: 3200, sufijo: '+', etiqueta: 'motos entregadas' },
      { valor: 12, sufijo: '', etiqueta: 'marcas disponibles' },
      { valor: 48, sufijo: 'h', etiqueta: 'para tu aprobación*' }
    ],
    fotos: [PHOTOS.shop, PHOTOS.shop2, PHOTOS.road]
  };

  const marcas = ['Honda', 'Yamaha', 'KTM', 'Benelli', 'Royal Enfield', 'Bajaj', 'Zanella', 'Motomel', 'Corven', 'Keller', 'Gilera', 'Suzuki'];

  const defaults = { config, categorias, motos, promociones, financiacion, nosotros, marcas, photos: PHOTOS };

  /* Punto único de acceso a los datos. En la Etapa 4 se sumará la lectura
     de cambios guardados localmente por el administrador. */
  window.SolariData = {
    get() { return defaults; }
  };
})();
