# API · 0.3.0

Contrato completo: [openapi.yaml](openapi.yaml), OpenAPI 3.1.
Base `/api/v1`. JSON salvo el formulario de login. No hay CORS global ni JWT.

## Acceso de navegador

1. GET `/auth/csrf` devuelve `token`, `headerName` y `parameterName`; puede crear
   una sesión anónima. Conserva la cookie de sesión.
2. POST `/auth/login`, Content-Type `application/x-www-form-urlencoded`, campos
   `email` y `password`, más la cabecera CSRF devuelta. Un acceso correcto es
   204; credenciales incorrectas reciben 401 genérico y no crean autenticación.
3. GET `/me` devuelve identidad y rol. No devuelve hashes ni contraseñas.
4. Solicita un nuevo CSRF tras autenticar: Spring invalida el anterior. Usa la
   nueva cabecera en cada POST/PATCH. Un token ausente/obsoleto recibe 403.
5. POST `/auth/logout` con CSRF invalida sesión y cookie; responde 204. La
   cookie anterior no permite volver a entrar. No se ofrece logout por GET.

Cookies: HttpOnly, SameSite=Strict; 30 minutos de inactividad. Para HTTPS se
configura SESSION_COOKIE_SECURE=true. Límite local: 10 intentos/IP/minuto,
429 con Retry-After: 60. El contador está en memoria y se reinicia con Java.

## Rutas y permisos

| Método / ruta | Uso | Permiso |
|---|---|---|
| GET /health | Estado real de Java/PostgreSQL | Público |
| GET /auth/csrf | Obtener token CSRF | Público |
| POST /auth/login | Iniciar sesión | Público con CSRF |
| POST /auth/logout | Invalidar sesión | CSRF |
| GET /me | Identidad actual | Autenticado |
| GET /products | Listar/buscar productos | Cualquier rol |
| GET /products/{id} | Detalle | Cualquier rol |
| POST /products | Crear | ADMIN / MANAGER |
| PATCH /products/{id} | Editar / desactivar | ADMIN / MANAGER |
| GET /categories | Todas las categorías | Cualquier rol |
| POST /categories | Crear | ADMIN / MANAGER |
| PATCH /categories/{id} | Editar / desactivar | ADMIN / MANAGER |
| GET /customers | Listar/buscar clientes | Cualquier rol |
| GET /customers/{id} | Detalle | Cualquier rol |
| POST /customers | Crear | ADMIN / MANAGER |
| PATCH /customers/{id} | Editar / desactivar | ADMIN / MANAGER |
| GET /users | Listar hasta 200 cuentas | ADMIN |
| POST /users | Crear cuenta con rol | ADMIN |

Las rutas restantes se deniegan por defecto. No hay DELETE físico, edición
parcial de un solo campo ni operaciones de inventario/ventas todavía.
PATCH recibe todos los campos editables y `version`: esto permite validar
el formulario completo y detectar ediciones obsoletas.

## Listados

Productos y clientes aceptan `q`, `active`, `page` (desde 0), `size` (1–100),
`sort` y `direction` (`asc`/`desc`). Productos además aceptan `category` (UUID).
Orden de productos: name, sku, price, createdAt; clientes: name, createdAt.
`q` busca nombre/SKU de producto o nombre/correo de cliente. Porcentaje y guion
bajo se buscan literalmente. Un orden inválido recibe 400.

Respuesta: `items`, `page`, `size`, `totalElements`, `totalPages`.
Los filtros quedan en la URL de React y se recuperan con atrás/adelante.

## Crear / editar producto

```json
{
  "sku": "DEMO-001",
  "name": "Producto ficticio",
  "categoryId": "10000000-0000-0000-0000-000000000001",
  "cost": "10.00",
  "price": "19.90",
  "minStock": 2,
  "active": true
}
```

El SKU se normaliza a mayúsculas y es único. Precios/costos son no negativos,
con hasta diez cifras enteras y dos decimales. Stock mínimo es entero no
negativo; no representa existencias disponibles. Para editar, agrega la
`version` de la última lectura. Una respuesta correcta devuelve la nueva
versión. Un 409 requiere recargar antes de volver a editar.

Clientes: name, email opcional, phone opcional y active. Categorías: name y
active; su nombre es único sin distinguir mayúsculas. No se pueden crear
productos dentro de una categoría inactiva, pero se conservan las referencias
ya existentes. Usuarios: displayName, email, password y role. Contraseñas de
12 a 72 caracteres y máximo 72 bytes UTF-8; se almacenan con BCrypt.

## Errores

Se usa application/problem+json. Incluye status, title, detail cuando procede,
code y fields para validación de formularios. No incluye SQL, conexiones,
hashes ni stacktrace. Los rechazos del filtro de seguridad no incluyen fields.

| HTTP | Significado |
|---|---|
| 400 | Validación, formato, referencia inactiva u orden/página inválidos |
| 401 | No autenticado o credenciales inválidas |
| 403 | Rol sin permiso o CSRF ausente/obsoleto |
| 404 | Registro no encontrado |
| 409 | Duplicado, integridad o versión obsoleta |
| 429 | Límite de intentos de acceso |
| 503 | PostgreSQL dejó de estar disponible tras arrancar Java, en health |

Health informa versión 0.3.0, phase F3, moneda PEN, timezone America/Lima y
checkedAt en UTC. Siempre consulta SELECT 1. Si PostgreSQL no está accesible
al arrancar, Flyway impide el inicio y el frontend informa error de conexión.

## Inventario, ventas y reportes

| Método / ruta | Uso | Permiso |
|---|---|---|
| GET /inventory | Saldo por producto; q, active, category UUID, lowOnly, page, size | Todos los roles |
| GET /inventory/movements | Historial; productId, type, from, to, page, size | Todos los roles |
| POST /inventory/adjustments | Ingreso o ajuste firmado | ADMIN / MANAGER |
| GET /sales | Listado; q (código/cliente), status, customer UUID, from, to, page, size | Todos los roles |
| POST /sales | Confirmar venta atómica | ADMIN / MANAGER |
| GET /sales/{id} | Líneas y precios históricos | Todos los roles |
| POST /sales/{id}/cancel | Anulación con devolución única | ADMIN |
| GET /dashboard/summary | Indicadores; from/to inclusivos Lima | Todos los roles |

Listados: página desde 0, máximo 100 filas, orden estable. Fechas ISO YYYY-MM-DD.
Dashboard: por defecto últimos 30 días, rango máximo 366 días. Las anuladas se
excluyen del reporte. Los importes son cadenas decimales; la moneda es PEN.
`lowStockCount`/`lowStock` representan productos activos actuales, sin fecha de corte.
`demoData` indica la presencia del dataset ficticio. No existe endpoint público de seed.

Ingreso/ajuste (POST con CSRF):

```json
{"productId":"UUID","type":"ENTRY","quantity":5,"reason":"Reposición","requestKey":"UUID"}
```

ENTRY requiere cantidad positiva; ADJUSTMENT acepta signo positivo/negativo.
La cantidad es entera, distinta de cero, entre -1000000 y 1000000. El saldo
nunca es negativo; el motivo es obligatorio y admite hasta 250 caracteres.

Venta:

```json
{"customerId":null,"items":[{"productId":"UUID","quantity":2}],"requestKey":"UUID"}
```

Entre 1 y 100 productos distintos, cantidades de 1 a 1000000. El cliente es
opcional; si se incluye debe estar activo. El servidor determina precios,
costos, autor y fecha, y revierte la transacción entera ante stock insuficiente.
Los campos de precio enviados por un consumidor no sustituyen al catálogo.

Ambas creaciones responden 201 inicialmente y 200 al repetir la misma clave
con idéntico contenido por el mismo usuario. Una clave reutilizada con otros
datos recibe 409 `IDEMPOTENCY_CONFLICT`. La aplicación no reintenta escrituras
por sí sola. Conserva la clave ante errores de red sin cambiar el formulario.

Anulación: `{"reason":"Devolución por error de registro"}`. Siempre responde
200 con el detalle resultante, incluso si ya estaba anulada. No añade una
segunda devolución ni reemplaza el primer motivo. No hay PATCH/DELETE de
ventas, líneas o movimientos. Se puede anular aunque el producto esté inactivo.

Errores: 400 datos/fechas inválidos, 401 sesión ausente, 403 rol/CSRF,
404 registro ausente, 409 stock/conflicto/idempotencia/operación ocupada.
Durante la carga inicial opcional del dataset health responde 503 `INITIALIZING`.
Los importes se limitan a 9999999999.99; el saldo al entero positivo de 32 bits.
