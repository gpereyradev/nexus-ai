# Actualizar de 0.1.0 a 0.2.0

Trabaja dentro de tu copia existente. No necesitas descargar otro ZIP ni
recrear la base de datos. Los cambios están en `feat/f1-auth-catalogs` para
revisión antes de integrarse en `main`.

## 1. Traer el módulo

Comprueba `git status`. Si tienes cambios de código propios, guárdalos en un
commit antes de cambiar de rama. `.env` es local y está excluido de Git.

```bash
git fetch origin
git switch --track origin/feat/f1-auth-catalogs
npm ci
npm run setup
```

Si ya tienes esa rama local, usa `git switch feat/f1-auth-catalogs` y después
`git pull --ff-only`. Cuando el PR se integre, podrás volver a `main` y hacer
`git pull --ff-only`.

Setup conserva tu DB_PASSWORD y añade contraseñas demo aleatorias si faltan.
No reemplaza valores existentes. No compartas `.env` ni las credenciales.

## 2. Actualizar Java y la base

Con Docker/Compose:

```bash
docker compose --env-file .env -f infra/compose.yaml up -d --build
docker compose --env-file .env -f infra/compose.yaml logs -f api
```

Sin Docker, detén Java con Ctrl+C y vuelve a iniciarlo:

```bash
npm run api
```

La migración V3 agrega cuentas y catálogos sin eliminar roles ni categorías.
V1 y V2 permanecen intactas. No borres volúmenes ni tablas para actualizar.

## 3. Ingresar

En otra terminal de la raíz:

```bash
npm run accounts
npm run dev
```

Abre http://localhost:5173 e ingresa con una cuenta y su contraseña local.
La cuenta se crea en el primer arranque de Java con `DEMO_ENABLED=true`.
No existen contraseñas universales incluidas en el código.

## 4. Recorrido de comprobación

1. Entra como admin o manager. Crea un producto con categoría, costo y precio.
2. Busca por nombre/SKU; cambia estado, orden y filtro de categoría.
3. Edita y desactiva un registro; confirma que sigue en el listado de inactivos.
4. Crea un cliente ficticio, edítalo y comprueba la validación de correo.
5. Entra como viewer: puedes leer, pero no aparecen acciones de escritura.
6. Cierra sesión y verifica que las rutas protegidas dejan de ser accesibles.

Un 409 durante una edición significa que otra operación cambió ese registro.
Cierra el formulario, actualiza el listado y abre su versión más reciente.
No se sobrescribe silenciosamente la edición de otra persona.

Inventario, ventas, dashboard e IA siguen pendientes de fases posteriores.
