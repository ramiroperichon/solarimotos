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
     disponibilidad: 'disponible' | 'ultima' | 'pedido' | 'reservada' | 'consultar'
     precio: número (contado) o null para mostrar "Consultar precio".
     imagenes: la primera es la principal. Cada foto puede ser:
       - un texto con la ruta → se recorta para llenar el espacio (fotos de
         ambiente y detalles);
       - estudio('ruta') → se muestra entera sobre fondo blanco (fotos de
         producto con fondo blanco o transparente).
     vista360 (opcional): tira de cuadros para girar la moto. Hoy solo la
       publican Honda (12 cuadros). Ver README para generarla.
     ficha: ficha técnica oficial agrupada por secciones.
     Fotos y fichas: material oficial publicado por cada marca. */
  const dir = (id) => (n) => `assets/images/motos/${id}/${n}.webp`;
  const estudio = (src) => ({ src, ajuste: 'contener' });
  const vista360 = (id, ancho, alto) => ({
    cuadros: 12,
    ancho,
    alto,
    sm: `assets/images/motos/${id}/360-sm.webp`,
    lg: `assets/images/motos/${id}/360-lg.webp`
  });

  const xr = dir('honda-xr-150l');
  const wave = dir('honda-wave-110-s');
  const zb = dir('zanella-zb-110');
  const energy = dir('corven-energy-110');
  const trip = dir('guerrero-trip-110');
  const ld = dir('mondial-ld-110-max-rt');
  const ns = dir('bajaj-rouser-ns200');
  const crono = dir('keller-crono-classic-110');
  const agility = dir('kymco-agility-125');

  const motos = [
    {
      id: 'honda-xr-150l',
      marca: 'Honda', modelo: 'XR 150L', categoria: 'Trail',
      cilindrada: 149, anio: 2026, precio: 4350000,
      disponibilidad: 'disponible', etiqueta: 'Para todo camino',
      imagenes: [estudio(xr('01')), xr('02'), xr('03'), xr('04'), xr('05')],
      vista360: vista360('honda-xr-150l', 652, 477),
      resumen: 'Robusta y simple de mantener. Va igual de bien en el asfalto del centro que en el camino de tierra.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', '4 tiempos, 2 válvulas, monocilíndrico, OHC, refrigerado por aire'],
          ['Cilindrada', '149 cc'],
          ['Relación de compresión', '9,5:1'],
          ['Alimentación', 'Carburador'],
          ['Arranque', 'Eléctrico y a patada'],
          ['Transmisión', 'Cadena, 5 velocidades']
        ],
        'Chasis y frenos': [
          ['Freno delantero', 'Disco de 240 mm con ABS'],
          ['Freno trasero', 'Tambor de 110 mm'],
          ['Suspensión delantera', 'Horquilla telescópica, 160 mm de recorrido'],
          ['Suspensión trasera', 'Monoshock, 149 mm de recorrido'],
          ['Neumáticos', '90/90-19 adelante · 110/90-17 atrás']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '2.098 × 813 × 1.129 mm'],
          ['Distancia entre ejes', '1.363 mm'],
          ['Altura del asiento', '834 mm'],
          ['Peso en orden de marcha', '131 kg'],
          ['Tanque', '12 litros']
        ],
        Otros: [['Colores', 'Negro, rojo y blanco'], ['Origen', 'Argentina']]
      }
    },
    {
      id: 'honda-wave-110-s',
      marca: 'Honda', modelo: 'Wave 110 S', categoria: 'Calle',
      cilindrada: 109, anio: 2026, precio: 2650000,
      disponibilidad: 'disponible', etiqueta: 'La de todos los días',
      imagenes: [estudio(wave('01')), estudio(wave('02')), wave('03')],
      vista360: vista360('honda-wave-110-s', 621, 457),
      resumen: 'Económica, liviana y confiable. La compañera ideal para ir al trabajo, al colegio o hacer mandados.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', '4 tiempos, 2 válvulas, monocilíndrico, OHC, refrigerado por aire'],
          ['Cilindrada', '109 cc'],
          ['Relación de compresión', '9,0:1'],
          ['Alimentación', 'Carburador'],
          ['Arranque', 'Eléctrico'],
          ['Transmisión', 'Cadena, 4 velocidades']
        ],
        'Chasis y frenos': [
          ['Freno delantero', 'Disco de 220 mm'],
          ['Freno trasero', 'Tambor de 110 mm, sistema CBS'],
          ['Suspensión delantera', 'Horquilla telescópica, 81 mm de recorrido'],
          ['Suspensión trasera', 'Doble amortiguador hidráulico, 81 mm de recorrido'],
          ['Neumáticos', '70/90-17 adelante · 80/90-17 atrás']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '1.898 × 702 × 1.086 mm'],
          ['Distancia entre ejes', '1.227 mm'],
          ['Altura del asiento', '763 mm'],
          ['Peso en orden de marcha', '102 kg'],
          ['Tanque', '3,7 litros']
        ],
        Otros: [['Colores', 'Negro, blanco, rojo y gris'], ['Origen', 'Argentina']]
      }
    },
    {
      id: 'zanella-zb-110',
      marca: 'Zanella', modelo: 'ZB 110 ST', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: 1890000,
      disponibilidad: 'ultima', etiqueta: '',
      imagenes: [estudio(zb('01')), estudio(zb('02')), estudio(zb('03')), estudio(zb('04')), zb('05'), zb('06'), zb('07')],
      resumen: 'Práctica y accesible, pensada para moverse por la ciudad gastando poco. Trae puertos USB y porta celular.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'Monocilíndrico 4 tiempos, refrigerado por aire'],
          ['Cilindrada', '107 cc'],
          ['Potencia', '6,5 HP'],
          ['Transmisión', 'Manual'],
          ['Arranque', 'Eléctrico y a patada']
        ],
        'Chasis y frenos': [
          ['Frenos', 'Tambor adelante y atrás, sistema CBS'],
          ['Suspensión delantera', 'Horquilla telescópica hidráulica'],
          ['Suspensión trasera', 'Doble amortiguador hidráulico'],
          ['Neumáticos', '2,50-17" adelante · 2,75-14" atrás'],
          ['Llantas', 'Rayos']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '1.860 × 680 × 1.075 mm'],
          ['Distancia al suelo', '190 mm'],
          ['Peso en vacío', '88 kg'],
          ['Capacidad de carga', '140 kg'],
          ['Tanque', '3,2 litros']
        ],
        Otros: [
          ['Velocidad máxima', '82 km/h'],
          ['Consumo', '1,8 L cada 100 km'],
          ['Equipamiento', 'Puertos USB A y C, porta celular, asiento memory foam'],
          ['Colores', 'Azul, rojo, blanco perla y gris oscuro']
        ]
      }
    },
    {
      id: 'corven-energy-110',
      marca: 'Corven', modelo: 'Energy 110 RT', categoria: 'Calle',
      cilindrada: 110, anio: 2026, precio: 1790000,
      disponibilidad: 'disponible', etiqueta: '',
      imagenes: [estudio(energy('01')), estudio(energy('02')), energy('03'), energy('04')],
      resumen: 'Una opción económica y rendidora para dar el primer paso a tu propia moto, con baúl bajo el asiento.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'Monocilíndrico 4 tiempos, refrigerado por aire, CDI con avance electrónico'],
          ['Cilindrada', '110 cc'],
          ['Arranque', 'Eléctrico y a pedal'],
          ['Transmisión', '4 velocidades, embrague húmedo multidisco']
        ],
        'Chasis y frenos': [
          ['Frenos', 'Tambor adelante y atrás, sistema CBS'],
          ['Suspensión delantera', 'Horquilla hidráulica'],
          ['Suspensión trasera', 'Doble amortiguador hidráulico'],
          ['Neumáticos', '2,50-17 adelante · 80/100-14 atrás, llantas de rayos']
        ],
        'Capacidad': [['Tanque', '4 litros'], ['Guardado', 'Baúl bajo el asiento, biplaza']],
        Otros: [
          ['Instrumental', 'Indicador de marcha y de nivel de combustible'],
          ['Garantía', '12 meses o 12.000 km'],
          ['Colores', 'Negro, blanco, rojo y azul']
        ]
      }
    },
    {
      id: 'guerrero-trip-110',
      marca: 'Guerrero', modelo: 'Trip 110 Full', categoria: 'Calle',
      cilindrada: 108, anio: 2026, precio: 1750000,
      disponibilidad: 'pedido', etiqueta: '',
      imagenes: [estudio(trip('01')), trip('02'), trip('03'), trip('04'), trip('05'), trip('06')],
      resumen: 'Sencilla y resistente, con frenos a disco adelante y atrás. Ideal para el uso diario con bajo costo de mantenimiento.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'Monocilíndrico 4 tiempos, refrigerado por aire, 4 marchas'],
          ['Cilindrada', '108 cc'],
          ['Arranque', 'Patada y eléctrico'],
          ['Encendido', 'CDI']
        ],
        'Chasis y frenos': [['Frenos', 'Disco adelante y atrás, sistema de freno combinado']],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '1.900 × 660 × 1.070 mm'],
          ['Peso en seco', '100 kg'],
          ['Tanque', '4 litros']
        ]
      }
    },
    {
      id: 'mondial-ld-110-max-rt',
      marca: 'Mondial', modelo: 'LD 110 Max RT', categoria: 'Calle',
      cilindrada: 110, anio: 2026, precio: null,
      disponibilidad: 'consultar', etiqueta: '',
      imagenes: [estudio(ld('01')), estudio(ld('02')), ld('03'), ld('04'), ld('05')],
      resumen: 'Diseño moderno, bajo consumo y un andar suave. Trae baúl amplio, puerto USB, frenos CBS y luces LED.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'Monocilíndrico 4 tiempos, CDI con avance electrónico'],
          ['Cilindrada', '110 cc'],
          ['Potencia máxima', '7 HP a 7.500 rpm'],
          ['Refrigeración', 'Aire'],
          ['Alimentación', 'Carburador, Euro 2'],
          ['Transmisión', '4 velocidades, embrague semiautomático'],
          ['Arranque', 'Eléctrico y pedal de arranque']
        ],
        'Chasis y frenos': [
          ['Frenos', 'Tambor adelante y atrás, sistema CBS'],
          ['Neumáticos', '2,25-17 adelante · 80/100-14 atrás, llantas de rayos']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '1.900 × 660 × 1.070 mm'],
          ['Despeje del piso', '140 mm'],
          ['Peso neto', '92 kg'],
          ['Tanque', '3 litros']
        ],
        Otros: [
          ['Equipamiento', 'Baúl bajo asiento, puerto USB A-C, luces LED'],
          ['Colores', 'Gris nardo, azul, blanco y negro']
        ]
      }
    },
    {
      id: 'bajaj-rouser-ns200',
      marca: 'Bajaj', modelo: 'Rouser NS200', categoria: 'Naked',
      cilindrada: 200, anio: 2026, precio: null,
      disponibilidad: 'consultar', etiqueta: 'Más potencia',
      imagenes: [estudio(ns('01')), estudio(ns('02')), ns('03'), ns('04'), ns('05')],
      resumen: 'La naked deportiva de Bajaj: motor de refrigeración líquida, frenos a disco, luces full LED y tablero con Bluetooth y GPS giro a giro.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'Monocilíndrico 4 tiempos, SOHC, 4 válvulas, triple bujía, refrigeración líquida'],
          ['Cilindrada', '200 cc'],
          ['Potencia', '23,5 HP a 9.500 rpm'],
          ['Torque', '18,3 Nm a 8.000 rpm'],
          ['Embrague', 'Antirrebote']
        ],
        'Chasis y frenos': [
          ['Freno delantero', 'Disco de 300 mm'],
          ['Freno trasero', 'Disco de 230 mm'],
          ['Suspensión delantera', 'Horquilla telescópica'],
          ['Suspensión trasera', 'Monoshock nitrox'],
          ['Neumáticos', '100/80-17 adelante · 130/70-17 atrás']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '2.017 × 803 × 1.195 mm'],
          ['Distancia entre ejes', '1.363 mm'],
          ['Peso neto', '158 kg'],
          ['Tanque', '12 litros']
        ],
        Otros: [['Tablero', 'Digital con Bluetooth, GPS giro a giro y puerto USB'], ['Iluminación', 'Full LED']]
      }
    },
    {
      id: 'keller-crono-classic-110',
      marca: 'Keller', modelo: 'Crono Classic Full 110', categoria: 'Calle',
      cilindrada: 107, anio: 2026, precio: null,
      disponibilidad: 'consultar', etiqueta: '',
      imagenes: [estudio(crono('01')), estudio(crono('02')), estudio(crono('03')), estudio(crono('04')), crono('05'), crono('06'), crono('07')],
      resumen: 'Clásica, liviana y con freno a disco hidráulico adelante. Llantas de aleación y capacidad de carga de 150 kg.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'SOHC, refrigerado por aire'],
          ['Cilindrada', '107 cc'],
          ['Potencia neta', '7 HP a 8.000 rpm'],
          ['Alimentación', 'Carburador de 19 mm'],
          ['Arranque', 'Eléctrico y a patada'],
          ['Transmisión', '4 velocidades, cadena, embrague semiautomático'],
          ['Emisiones', 'Euro 2']
        ],
        'Chasis y frenos': [
          ['Freno delantero', 'Disco de 220 mm, hidráulico'],
          ['Freno trasero', 'Tambor de 110 mm'],
          ['Suspensión delantera', 'Horquilla telescópica hidráulica'],
          ['Suspensión trasera', 'Doble amortiguador'],
          ['Neumáticos', '2,50-17" adelante · 80/100-14" atrás'],
          ['Llantas', 'Aleación liviana']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '1.860 × 700 × 1.100 mm'],
          ['Distancia entre ejes', '1.260 mm'],
          ['Altura del asiento', '760 mm'],
          ['Peso en seco', '89 kg'],
          ['Capacidad de carga', '150 kg'],
          ['Tanque', '4 litros']
        ],
        Otros: [['Colores', 'Rojo, negro, azul y plata']]
      }
    },
    {
      id: 'kymco-agility-125',
      marca: 'Kymco', modelo: 'Agility 125', categoria: 'Scooter',
      cilindrada: 125, anio: 2026, precio: null,
      disponibilidad: 'consultar', etiqueta: 'Automática',
      imagenes: [estudio(agility('01')), agility('02'), agility('03'), agility('04'), agility('05')],
      resumen: 'Scooter automático, cómodo y fácil de manejar. Freno a disco hidráulico, baulera bajo el asiento y 2 años de garantía.',
      financiacion: 'Con alternativas de financiación',
      ficha: {
        Motor: [
          ['Tipo', 'OHC 4 tiempos, monocilíndrico, refrigeración por aire forzado'],
          ['Cilindrada', '125 cc'],
          ['Potencia máxima', '8,4 HP a 7.500 rpm'],
          ['Alimentación', 'Carburador'],
          ['Transmisión', 'Automática CVT'],
          ['Arranque', 'Eléctrico']
        ],
        'Chasis y frenos': [
          ['Freno delantero', 'Disco hidráulico'],
          ['Freno trasero', 'Tambor de 110 mm'],
          ['Neumáticos', '90/90-12 adelante · 3,50-10 atrás']
        ],
        'Dimensiones y peso': [
          ['Largo × ancho × alto', '1.860 × 670 × 1.130 mm'],
          ['Altura del asiento', '760 mm'],
          ['Peso', '96 kg'],
          ['Tanque', '5,5 litros']
        ],
        Otros: [['Asiento', 'Biplaza con baulera'], ['Garantía', '2 años o 20.000 km, transferible']]
      }
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
