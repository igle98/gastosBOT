# GastosBOTijo

App web de gestión de gastos personales conectada a Google Sheets. Desplegada en GitHub Pages como PWA instalable.

---

## Cómo subir la app a GitHub Pages (primera vez)

### Paso 1 — Averigua la URL que tendrá tu app

La URL de GitHub Pages sigue siempre este formato:
```
https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/
```

Para saber cuál es la tuya, entra en tu repositorio en GitHub y fíjate en la URL del navegador:
```
https://github.com/TU-USUARIO/NOMBRE-DEL-REPOSITORIO
```
Esos dos datos (usuario y nombre del repo) son los que necesitas.

---

### Paso 2 — Añade la URL de GitHub Pages en Google Cloud Console

Antes de subir nada, tienes que decirle a Google que tu app también puede hacer login desde esa URL.

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Menú → **APIs y servicios** → **Credenciales**
3. Haz clic en tu cliente OAuth (el que creaste para esta app)
4. En **Orígenes de JavaScript autorizados**, añade:
   ```
   https://TU-USUARIO.github.io
   ```
   (solo el dominio, sin la ruta del repositorio)
5. Haz clic en **Guardar**

> Los cambios en Google Cloud pueden tardar hasta 5 minutos en aplicarse.

---

### Paso 3 — Sube los archivos con Git GUI

1. Abre **Git GUI** en la carpeta del proyecto
2. Pulsa **Rescan** (o F5) para ver los archivos modificados
3. Haz clic en **Stage Changed** para preparar todos los cambios
4. En el campo **Commit Message** escribe algo como: `Primera versión`
5. Pulsa **Commit**
6. Pulsa **Push** (menú Remote → Push o botón Push)
7. Confirma y espera a que termine

---

### Paso 4 — Activa GitHub Pages en tu repositorio

1. Ve a tu repositorio en [github.com](https://github.com)
2. Haz clic en **Settings** (pestaña de arriba a la derecha)
3. En el menú lateral izquierdo, haz clic en **Pages**
4. En **Source**, selecciona:
   - Branch: `main`
   - Carpeta: `/ (root)`
5. Haz clic en **Save**

GitHub te mostrará un mensaje con tu URL:
```
Your site is live at https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/
```

> Puede tardar 1-2 minutos en estar disponible la primera vez.

---

### Paso 5 — Abre la app y comprueba que funciona

Entra en la URL de GitHub Pages desde el navegador. Si el login no funciona, espera unos minutos más a que Google aplique el cambio del origen autorizado.

---

## Cómo actualizar la app (cuando hagas cambios)

Cada vez que modifiques algo y quieras que se refleje en la web:

1. Abre **Git GUI**
2. **Rescan** → **Stage Changed**
3. Escribe un mensaje de commit → **Commit** → **Push**

GitHub Pages se actualiza automáticamente en ~2 minutos tras el push.

---

## Probar en local (durante el desarrollo)

Usa la extensión **Live Server** de VS Code: botón "Go Live" en la barra inferior.

La app local estará en `http://127.0.0.1:5500` — asegúrate de que ese origen también está en los Orígenes autorizados de Google Cloud Console.

---

## Instalar como app en el móvil (PWA)

Una vez la app esté en GitHub Pages:

**Android (Chrome):**
1. Abre la URL en Chrome
2. Menú (⋮) → "Añadir a pantalla de inicio"
3. Confirma

**iOS (Safari):**
1. Abre la URL en Safari
2. Botón compartir (□↑) → "Añadir a pantalla de inicio"
3. Confirma

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| Login falla en GitHub Pages | Añade `https://TU-USUARIO.github.io` en Orígenes autorizados de Google Cloud Console |
| Login falla en local | Añade `http://127.0.0.1:5500` en Orígenes autorizados |
| No aparecen datos | Revisa que el Spreadsheet ID y OAuth Client ID en `js/config.js` son correctos |
| Los datos no se actualizan tras un push | Espera 2 min o abre DevTools → Application → Service Workers → "Update" |
| Error 401 persistente | Cierra sesión y vuelve a entrar |
