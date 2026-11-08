# Solari Motos — Sitio web

Sitio estático (HTML5 + CSS3 + JavaScript puro). No requiere compilación: se abre
`index.html` en el navegador o se sube tal cual a cualquier hosting estático.

## Identidad visual

- **Dirección:** editorial premium + boutique urbana, sobre fondos claros.
- **Paleta:** blanco cálido `#fcfaf6` · marfil `#f4efe6` · piedra `#e7e2d9` · grafito `#1f1e1c` · azul Francia `#1b4db8`.
- **Tipografías:** Dela Gothic One (titulares) · Instrument Sans (textos y datos).
- **Logo:** recreado en vector a partir del cartel del local (`assets/images/logo/`): versión grafito con la O en azul (web), blanca (fondos oscuros) y naranja original del cartel.

### Usar Brekid (tipografía comercial)

Brekid es una fuente paga de Erifqi Zefont. Si se compra la licencia con uso web:

1. Copiar los archivos `.woff2` a `assets/fonts/`.
2. Agregar al inicio de `css/styles.css`:
   ```css
   @font-face {
     font-family: 'Brekid';
     src: url('../assets/fonts/Brekid.woff2') format('woff2');
     font-display: swap;
   }
   ```
3. En `:root`, cambiar `--f-display` a `'Brekid', 'Archivo', 'Arial Black', sans-serif;`.

Recomendación: usarla solo en titulares grandes (hero, títulos de sección, logo) y mantener Dela Gothic One o Instrument Sans para el resto.

## Estructura

```
/
├── index.html            Inicio (hero, marcas, colección, financiación, cascos, nosotros, contacto)
├── catalogo.html         Catálogo con filtros (marca, categoría, cilindrada, precio, disponibilidad) y cascos
├── detalle.html          Ficha de cada moto: detalle.html?moto=<id>
├── css/
│   ├── styles.css        Tokens y componentes (mobile-first)
│   ├── animations.css    Entradas, revelados al scroll, hover, prefers-reduced-motion
│   └── responsive.css    Breakpoints 640 / 900 / 1200 px
├── js/
│   ├── data.js           ÚNICA fuente de contenido
│   ├── common.js         Encabezado, menú, pie, tarjetas y utilidades compartidas
│   ├── main.js           Inicio
│   ├── catalogo.js       Filtros, orden y resultados (el estado queda en la URL)
│   ├── visor360.js       Visor 360° (arrastre, teclado, carga progresiva)
│   └── detalle.js        Ficha de moto
└── assets/
    ├── images/           Ilustraciones de respaldo (moto y casco)
    └── icons/            favicon.svg
```

## Ver localmente

```bash
python3 -m http.server 8000
```

## Cómo cargar contenido (js/data.js)

- **Motos:** agregar un objeto al arreglo `motos`. La marca aparece sola en "Marcas" y en el filtro; la grilla editorial reparte los tamaños automáticamente.
- **Precio:** `precio: null` muestra "Consultar precio". Con `config.demo: false` desaparecen las marcas "Referencia".
- **Cascos:** arreglo `cascos`; con `imagenes: []` se muestra un espacio preparado.
- **Financiación:** textos genéricos a validar. `coeficientes` en `null` no muestra montos estimados; solo cargar valores reales.
- **Promociones:** arreglo vacío oculta el bloque. `demo: true` muestra la marca "Ejemplo".
- **Contacto:** WhatsApp, dirección (Av. San Martín entre Tucumán y Rioja, Local 2, Mariano I. Loza), horarios (lunes a sábado 8–12 y 16:30–20:30) y marcas del local en `config`. Instagram y Facebook se muestran solo si se completan.
- **Fotos de motos:** hoy son el material oficial que publica cada marca (Honda Motos Argentina, Zanella, Corven y Guerrero), optimizado en WebP dentro de `assets/images/motos/<id>/`. Conviene confirmar con cada distribuidor el uso comercial, o reemplazarlas por fotos propias. En `imagenes`, `estudio('ruta')` muestra la foto entera sobre blanco; una ruta simple la recorta para llenar el marco. Sin fotos se muestra un marcador con el nombre del modelo.
- **Ficha de cada moto:** `detalle.html?moto=<id>`. Los enlaces viejos `index.html#moto-<id>` redirigen solos.

## Vista 360°

Los modelos con `vista360` en `js/data.js` se pueden girar con el dedo, el mouse o las flechas del teclado
(ficha de la moto y bloque "Girala" del inicio). Hoy la publican Honda (XR 150L y Wave 110 S).

Cada vista es una tira horizontal de 12 cuadros en dos tamaños:

- `360-sm.webp` (~100 KB): se carga primero, con indicador de progreso.
- `360-lg.webp` (~230 KB): se descarga después solo si la pantalla la aprovecha y la conexión no es lenta.

Para sumar otra moto: conseguir 12 fotos de estudio tomadas girando la moto (mismo encuadre y fondo blanco),
unirlas en una tira con el mismo orden y agregar `vista360: vista360('<id>', ancho, alto)`.
