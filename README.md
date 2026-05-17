# GastosBOTijo

> App web de gestión de gastos personales, sin backend propio, instalable como PWA y desplegada en GitHub Pages.

GastosBOTijo es una aplicación de finanzas personales que usa **Google Sheets como base de datos** y se autentica directamente contra la API de Google desde el navegador. No hay servidor intermedio: todo el código es estático y se ejecuta en el cliente.

El proyecto nace para resolver un caso real: registrar gastos rápidamente desde el móvil (vía un bot de Telegram que escribe en la hoja) y poder consultarlos en una interfaz cómoda con presupuestos, reportes y gráficas.

---

## Demo

🔗 **Demo en vivo:** *pendiente de publicar en GitHub Pages*

---

## Características

- **PWA instalable** en Android e iOS, con service worker y soporte offline para la shell de la app.
- **Autenticación con Google OAuth 2.0** (Google Identity Services) directamente desde el navegador.
- **Lectura/escritura sobre Google Sheets** usando la API REST v4 sin librerías intermedias.
- **4 vistas principales:**
  - Transacciones del mes con filtro por categoría.
  - Presupuestos mensuales con progreso por categoría y total agregado.
  - Reportes comparativos entre meses.
  - Gráficas (evolución 6 meses + distribución por categoría) con Chart.js.
- **Selector de mes** que permite navegar histórico (incluye snapshots de presupuestos pasados).
- **Diseño responsive** móvil → tablet → escritorio (layout de 3 columnas en pantallas grandes).
- **Tema oscuro** con sistema de variables CSS.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Vanilla JavaScript (ES Modules), sin framework |
| Estilos | CSS puro con custom properties y arquitectura por capas (`reset` → `variables` → `layout` → `components`) |
| Datos | Google Sheets API v4 |
| Auth | Google Identity Services (OAuth 2.0 implicit flow) |
| Gráficas | Chart.js 4 (vía CDN) |
| PWA | Manifest + Service Worker |
| Hosting | GitHub Pages |

**Decisión de diseño clave:** cero dependencias `npm`, cero build step. El proyecto se sirve tal cual desde GitHub Pages y se puede abrir con un Live Server en local. Esto simplifica el despliegue y mantiene el repo legible.

---

## Estructura del proyecto

```
.
├── index.html              # Shell de la app, todas las vistas
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache de la shell)
├── css/
│   ├── reset.css
│   ├── variables.css       # Tokens de diseño (colores, espaciado, breakpoints)
│   ├── layout.css          # Grid, header, bottom-nav, responsive
│   └── components.css      # Cards, botones, listas, gráficos
├── js/
│   ├── app.js              # Entry point, router de vistas
│   ├── auth.js             # OAuth flow con GIS
│   ├── sheets.js           # Cliente de Google Sheets API
│   ├── state.js            # Estado global (mes actual, datos cacheados)
│   ├── config.js           # IDs de hoja y OAuth (rellenar con tus valores)
│   ├── utils/              # Formateadores, colores, helpers DOM
│   └── views/              # Renderizado de cada pestaña
│       ├── transactions.js
│       ├── budgets.js
│       ├── reports.js
│       └── charts.js
└── icons/                  # Iconos PWA
```

El modelo de datos vive en 4 hojas de cálculo: `TRANSACTIONS`, `BUDGET_KEYS`, `MERCHANT_MAP` y `BUDGET_HISTORY`. Los índices de columna están centralizados en [`js/config.js`](js/config.js) para que cambiar la estructura de la hoja sea un único punto de edición.

---

## Configuración

Para ejecutar tu propia instancia necesitas:

1. **Una hoja de Google Sheets** con las pestañas `TRANSACTIONS`, `BUDGET_KEYS`, `MERCHANT_MAP` y `BUDGET_HISTORY` (ver índices de columna en [`js/config.js`](js/config.js)).
2. **Un OAuth Client ID** creado en [Google Cloud Console](https://console.cloud.google.com) (tipo *Web application*), con tu origen autorizado:
   - `http://127.0.0.1:5500` para desarrollo local.
   - `https://TU-USUARIO.github.io` para producción en GitHub Pages.
3. Rellenar en [`js/config.js`](js/config.js):
   ```js
   export const SPREADSHEET_ID  = 'tu-spreadsheet-id';
   export const OAUTH_CLIENT_ID = 'tu-client-id.apps.googleusercontent.com';
   ```

---

## Ejecutar en local

No hay build. Cualquier servidor estático sirve — recomendado **Live Server** de VS Code:

1. Abre la carpeta en VS Code.
2. Botón **Go Live** en la barra inferior.
3. App disponible en `http://127.0.0.1:5500`.

---

## Desplegar en GitHub Pages

1. Push del repo a GitHub.
2. **Settings → Pages → Source:** branch `main`, carpeta `/ (root)`.
3. Añadir el origen `https://TU-USUARIO.github.io` en los **Orígenes autorizados** del OAuth Client en Google Cloud Console.
4. La app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

---

## Licencia

Proyecto personal de aprendizaje. Úsalo libremente como referencia.
