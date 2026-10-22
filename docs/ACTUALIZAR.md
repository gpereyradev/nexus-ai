# Actualizar a 0.3.0

Trabaja dentro de tu copia existente. No necesitas otro ZIP ni recrear la base.
Revisa `git status`; guarda tus cambios de código antes de actualizar. `.env`
sigue siendo local y está excluido de Git.

```bash
git switch main
git pull --ff-only
npm ci
npm run setup
```

Si consultas la versión antes de integrar el PR, la rama es
`feat/f2-inventory-sales`. Después de la integración usa `main`.

Setup conserva claves existentes y añade las ausentes. Esta versión añade
`DEMO_DATA_ENABLED=true`: prepara datos ficticios al siguiente arranque. Si
prefieres mantener tus catálogos sin añadir el dataset, cambia a `false` antes
de iniciar Java. No compartas `.env` ni `npm run accounts`.

Detén Java con Ctrl+C y vuelve a iniciarlo:

```bash
npm run api
```

O, si usas Compose, reconstruye conservando el volumen:

```bash
docker compose --env-file .env -f infra/compose.yaml up -d --build
docker compose --env-file .env -f infra/compose.yaml logs -f api
```

Flyway aplica V4 sobre V1–V3 sin borrar usuarios, clientes ni productos.
V4 añade ventas, líneas, movimientos, vista de saldos y protección del historial.
El dataset opcional se carga después de las cuentas demo en una transacción.
La primera carga puede tardar unos segundos; health devuelve 503 mientras se prepara.
Deshabilitar el dataset no elimina datos previamente cargados.

En otra terminal:

```bash
npm run accounts
npm run dev
```

Abre http://localhost:5173. Comprueba Panel, Inventario y Ventas. Con ADMIN:
crea un producto, ingresa cinco unidades, vende dos y anula; el saldo vuelve a
cinco y el historial conserva tres movimientos. Con VIEWER puedes consultar,
pero la API y la interfaz impiden escribir. Solo ADMIN puede anular ventas.

Un 409 por stock significa que otra operación cambió las existencias; revisa
el inventario antes de crear un nuevo intento. Un fallo de red al confirmar no
permite asumir que la venta falló: reintenta desde el mismo formulario, que
conserva la clave de solicitud mientras no cambies sus datos. Si cerraste el
formulario, consulta el listado de ventas antes de repetirla. Nunca borres el
volumen o las tablas para resolver una actualización.
