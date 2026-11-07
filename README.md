# Solari Motos — Sitio web

Sitio estático (HTML5 + CSS3 + JavaScript puro). No requiere compilación: se abre
`index.html` en el navegador o se sube tal cual a cualquier hosting estático.

## Identidad visual

- **Dirección:** editorial premium + boutique urbana, sobre fondos claros.
- **Paleta:** blanco cálido `#fcfaf6` · marfil `#f4efe6` · piedra `#e7e2d9` · grafito `#1f1e1c` · acento arcilla `#d24a1e`.
- **Tipografías:** Bricolage Grotesque (titulares, ancho condensado) · Instrument Sans (textos).
- **Marca:** sol con dos cortes horizontales + palabra "Solari".

## Estructura

```
/
├── index.html            Página principal (hero, marcas, colección, financiación, cascos, nosotros, contacto)
├── css/
│   ├── styles.css        Tokens y componentes (mobile-first)
│   ├── animations.css    Entradas, revelados al scroll, hover, prefers-reduced-motion
│   └── responsive.css    Breakpoints 640 / 900 / 1200 px
├── js/
│   ├── data.js           ÚNICA fuente de contenido
│   └── main.js           Render y comportamiento
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
- **Contacto:** WhatsApp, dirección, localidad, horarios y redes en `config` (hoy son provisorios).
- **Ficha de cada moto:** se abre en un panel; también por enlace directo `index.html#moto-<id>`.
