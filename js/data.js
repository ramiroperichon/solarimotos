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
   - Contacto, dirección y horarios: datos reales del local.
   - Fotos de motos: material oficial publicado por cada marca (Honda
     Motos Argentina, Zanella, Corven y Guerrero), guardado en
     /assets/images/motos/<id>/. Confirmar con cada distribuidor el uso
     comercial de las imágenes, o reemplazarlas por fotos propias.
     Si `imagenes` está vacío se muestra un marcador con el nombre.
   ========================================================================== */

(function () {
  'use strict';

  const config = {
    nombre: 'Solari Motos',
    eslogan: 'Tu moto en cuotas',
    // Muestra la marca "Referencia" junto a precios y condiciones de ejemplo.
    demo: true,
    // WhatsApp de la encargada, en formato internacional sin "+" ni espacios
    whatsapp: '5493773450740',
    whatsappVisible: '+54 9 3773 45-0740',
    telefono: '+54 9 3773 45-0740',
    direccion: 'Av. San Martín, entre Tucumán y Rioja · Local 2',
    localidad: 'Mariano I. Loza',
    departamento: 'Mercedes',
    provincia: 'Corrientes',
    mapaQuery: 'Avenida San Martín y Tucumán, Mariano I. Loza, Corrientes, Argentina',
    // 0 = domingo … 6 = sábado. Rangos en formato 24 h.
    horarios: {
      1: [['08:00', '12:00'], ['16:30', '20:30']],
      2: [['08:00', '12:00'], ['16:30', '20:30']],
      3: [['08:00', '12:00'], ['16:30', '20:30']],
      4: [['08:00', '12:00'], ['16:30', '20:30']],
      5: [['08:00', '12:00'], ['16:30', '20:30']],
      6: [['08:00', '12:00'], ['16:30', '20:30']],
      0: []
    },
    // Texto de horarios: `dias` indica qué días resalta como "hoy".
    horariosTexto: [
      { dias: [1, 2, 3, 4, 5, 6], texto: 'Lunes a sábado', horario: '8:00–12:00 · 16:30–20:30' },
      { dias: [0], texto: 'Domingos', horario: 'Cerrado' }
    ],
    // Completar con las direcciones reales; si quedan vacías no se muestran.
    redes: {
      instagram: '',
      facebook: ''
    },
    // Marcas con las que trabaja el local (vidriera). Las marcas de las motos
    // cargadas en el catálogo se suman solas.
    marcas: ['Honda', 'Zanella', 'Corven', 'Keller', 'Bajaj', 'Kymco', 'Mondial'],
    mensajeWhatsApp: 'Hola Solari Motos, quiero hacer una consulta.',
    // Foto vertical del inicio (opcional). Si falta, se usa la principal de la primera moto.
    heroImagen: 'assets/images/motos/honda-xr-150l/hero.webp'
  };

  /* ---------- Motos ----------
     disponibilidad: 'disponible' | 'ultima' | 'pedido' | 'reservada'
     precio: número (contado) o null para mostrar "Consultar precio".
     imagenes: la primera es la principal. Cada foto puede ser:
       - un texto con la ruta → se recorta para llenar el espacio (fotos de
         ambiente y detalles);
       - estudio('ruta') → se muestra entera sobre fondo blanco (fotos de
         producto con fondo blanco o transparente).
     Fotos actuales: material oficial publicado por cada marca. */
  const dir = (id) => (n) => `assets/images/motos/${id}/${n}.webp`;
  const estudio = (src) => ({ src, ajuste: 'contener' });

  const xr = dir('honda-xr-150l');
  const wave = dir('honda-wave-110-s');
  const zb = dir('zanella-zb-110');
  const energy = dir('corven-energy-110');
  const trip = dir('guerrero-trip-110');

  const motos = [
    {
      id: 'honda-xr-150l',
      marca: 'Honda', modelo: 'XR 150L', categoria: 'Trail',
      cilindrada: 149, anio: 2026, precio: 4350000,
      disponibilidad: 'disponible', etiqueta: 'Para todo camino',
      imagenes: [estudio(xr('01')), xr('02'), xr('03'), xr('04'), xr('05')],
      resumen: 'Robusta y simple de mantener. Va igual de bien en el asfalto del centro que en el camino de tierra.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Ciudad, ruta y tierra'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'honda-wave-110-s',
      marca: 'Honda', modelo: 'Wave 110 S', categoria: 'Calle',
      cilindrada: 109, anio: 2026, precio: 2650000,
      disponibilidad: 'disponible', etiqueta: 'La de todos los días',
      imagenes: [estudio(wave('01')), estudio(wave('02')), wave('03')],
      resumen: 'Económica, liviana y confiable. La compañera ideal para ir al trabajo, al colegio o hacer mandados.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'zanella-zb-110',
      marca: 'Zanella', modelo: 'ZB 110 ST', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1890000,
      disponibilidad: 'ultima', etiqueta: '',
      imagenes: [estudio(zb('01')), estudio(zb('02')), estudio(zb('03')), estudio(zb('04')), zb('05'), zb('06'), zb('07')],
      resumen: 'Práctica y accesible, pensada para moverse por la ciudad gastando poco.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'corven-energy-110',
      marca: 'Corven', modelo: 'Energy 110 RT', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1790000,
      disponibilidad: 'disponible', etiqueta: '',
      imagenes: [estudio(energy('01')), estudio(energy('02')), energy('03'), energy('04')],
      resumen: 'Una opción económica y rendidora para dar el primer paso a tu propia moto.',
      financiacion: 'Con alternativas de financiación',
      ficha: [['Motor', '4 tiempos, monocilíndrico'], ['Uso', 'Urbano'], ['Garantía', 'Oficial de fábrica']]
    },
    {
      id: 'guerrero-trip-110',
      marca: 'Guerrero', modelo: 'Trip 110 Full', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1750000,
      disponibilidad: 'pedido', etiqueta: '',
      imagenes: [estudio(trip('01')), trip('02'), trip('03'), trip('04'), trip('05'), trip('06')],
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
    // Monto sugerido al elegir "Con entrega" (se puede escribir cualquier valor).
    entregaSugerida: 500000,
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
