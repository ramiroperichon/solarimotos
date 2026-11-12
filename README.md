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
├── herramientas/
│   └── armar-360.html    Herramienta interna para armar el 360° con fotos propias
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

Para sumar el giro a cualquier otra moto (las demás marcas no publican estas fotos):

1. Sacar 12 a 36 fotos (ideal 24) caminando alrededor de la moto, a la misma distancia y altura, siempre en el mismo sentido.
2. Abrir `herramientas/armar-360.html` (no aparece en la web pública), cargar las fotos, ajustar el encuadre y tocar **Generar archivos**.
3. Subir los dos archivos a `assets/images/motos/<id>/` y pegar en la moto de `js/data.js` la línea que muestra la herramienta, por ejemplo:
   `vista360: vista360('zanella-zb-110', 960, 720, 24),`

Todo se procesa en el navegador: las fotos no se envían a ningún servidor.

## Panel de administración (`admin/`)

Panel interno para editar motos, cascos, promociones y datos del local. Hoy se publica en
`https://ramiroperichon.github.io/solarimotos/admin/` (GitHub Pages). Con dominio propio se puede pasar al
subdominio `admin.solarimotos.com.ar` (ver `vercel.json`) cambiando `panel` en `js/config-supabase.js`. En la web pública hay un acceso casi invisible
(candado en el pie de página).

### Seguridad

- **Contraseñas**: las gestiona Supabase Auth (bcrypt con sal por usuario). El código nunca las guarda.
- **Lista blanca**: solo los emails de `privado.emails_autorizados` pueden crear cuenta (lo bloquea la base).
- **Doble factor obligatorio (TOTP)**: sin código del autenticador la base rechaza toda escritura (RLS nivel AAL2).
- **RLS forzado** en todas las tablas: el público solo lee lo publicado; la auditoría no se puede editar ni borrar.
- **Sesión**: flujo PKCE, cierre a los 15 min de inactividad y vida máxima de 8 h.
- **Navegador**: CSP estricta, sin scripts de terceros (supabase-js incluido en `admin/vendor/` con SRI), HSTS,
  `frame-ancestors 'none'`, `noindex`.

### Base de datos (`supabase/`)

- `migrations/001_esquema_seguridad_base.sql` — aplicada.
- `migrations/002_permisos_en_esquema_privado.sql` — aplicada: lectura pública del catálogo y funciones de permisos fuera de la API.
- `migrations/003_admin_lista_fotos.sql` — aplicada: permite al admin borrar fotos del almacenamiento.
- `migrations/004_clientes_cuotas.sql` — aplicada: clientes, planes de financiación, cuotas y mensajes de cobranza.
- `seed.sql` — carga inicial del contenido (ya aplicada).

La web pública lee el catálogo de Supabase; si no responde usa la última copia del navegador o `js/data.js`.

### Sumar otra persona al panel

En Supabase → SQL Editor:

```sql
insert into privado.emails_autorizados (email, nombre) values ('email@ejemplo.com', 'Nombre');
```

Después esa persona entra al panel, toca "Crear mi cuenta" y activa su doble factor.
Para quitarle el acceso: `update privado.admins set activo = false where email = 'email@ejemplo.com';`

## Clientes y cuotas (pestaña "Clientes" del panel)

- **Clientes**: nombre, DNI, WhatsApp (se escribe con código de área, sin 0 ni 15; el panel muestra cómo queda), email, dirección y notas internas.
- **Planes**: moto del catálogo o descripción libre, precio, entrega, cantidad de cuotas, monto y fecha de la primera cuota. Las cuotas mensuales se generan solas.
  "Calcular sin interés" divide (precio − entrega) por la cantidad de cuotas; si hay interés, se escribe el monto a mano.
- **Cuotas**: registrar pago (monto, fecha, medio, nota; acepta pagos parciales), anular un pago o editar vencimiento y monto.
  Un plan sin pagos se puede eliminar; con pagos solo se puede cancelar.
- **Estados** (hora argentina): vencida, por vencer (dentro de los días de aviso, 5 por defecto), al día, plan terminado o sin plan.
  La pestaña muestra en rojo cuántos clientes tienen cuotas vencidas.
- **Resumen**: clientes atrasados y monto, cuotas por vencer, cobrado en el mes y lo que falta cobrar en el mes.
- **Filtros**: búsqueda por nombre, DNI, teléfono o moto; estado; moto; orden (más atrasados, próximo vencimiento, mayor deuda, avisados hace más tiempo, nombre); "ocultar avisados hoy".
- **WhatsApp**: botón por cliente con el mensaje ya escrito (recordatorio o cuota vencida) y comprobante de pago.
  Con varios seleccionados, "Enviar recordatorios" los recorre en cola: se abre cada conversación, se envía y se vuelve para seguir con el próximo.
  WhatsApp no permite envíos masivos automáticos desde un link; para eso hace falta la API de WhatsApp Business (paga).
  Cada aviso queda registrado ("Avisado hoy").
- **Mensajes**: editables en "Mensajes", con variables `{nombre} {moto} {cuota} {total} {vencimiento} {monto} {vencidas} {adeudado} {restantes} {pagado} {fecha_pago}`.
- **Exportar**: descarga la lista filtrada como CSV para Excel.

**Privacidad**: estos datos personales solo los lee y modifica un administrador con doble factor (RLS AAL2). No llegan a la web pública ni
se guardan en el navegador, y cada cambio queda en la Actividad. Al guardar datos de clientes rige la Ley 25.326 de Protección de Datos Personales.
