# Solari Motos — Sitio web

Sitio estático (HTML5 + CSS3 + JavaScript puro) para una concesionaria de motocicletas.
No requiere compilación: se abre `index.html` en el navegador o se sube tal cual a cualquier hosting estático.

## Estado: Etapa 1 — Diseño y boceto visual

Página principal completa con contenido **de demostración**.

```
/
├── index.html            Página principal
├── css/
│   ├── styles.css        Tokens, componentes y secciones (mobile-first)
│   ├── animations.css    Keyframes, revelados al scroll, hover y prefers-reduced-motion
│   └── responsive.css    Breakpoints 600 / 900 / 1100 px
├── js/
│   ├── data.js           ÚNICA fuente de contenido (motos, precios, promos, financiación, contacto)
│   └── main.js           Render de secciones, filtros, simulador, animaciones
└── assets/
    ├── images/           moto-placeholder.svg (respaldo cuando una foto no carga)
    ├── icons/            favicon.svg
    └── fonts/            (vacío: las fuentes se cargan desde Google Fonts)
```

## Ver el sitio localmente

```bash
python3 -m http.server 8000
```

Luego abrir <http://localhost:8000>.

## Contenido a reemplazar antes de publicar

Todo está en `js/data.js`:

- `config`: número de WhatsApp, dirección, horarios, redes, consulta del mapa.
- `motos`: modelos, precios, disponibilidad y fotos.
- `financiacion`: pasos, requisitos, medios de pago y **coeficientes demostrativos** del simulador.
- `promociones` y `nosotros`.
- Fotografías: hoy se usan fotos de referencia enlazadas desde Unsplash. Reemplazarlas por fotos propias en `assets/images/`.
