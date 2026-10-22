# Cambios

## 0.3.0 · 22/10/2026

- Inventario paginado con búsqueda, categorías, activos y alertas de stock bajo.
- Historial inmutable de ingresos, ajustes, ventas y reversiones con autor,
  motivo, fecha y saldos anterior/posterior; saldo validado también en PostgreSQL.
- Ventas con precios/costos históricos del servidor, total decimal exacto,
  validación de disponibilidad y rollback de toda la operación si una línea falla.
- Bloqueos ordenados para operaciones simultáneas, claves idempotentes y
  anulación ADMIN que devuelve unidades una sola vez.
- Panel desde consultas SQL: ventas, ticket promedio, unidades, evolución diaria,
  categorías, top 5 y stock bajo actual; filtros de fecha en horario de Lima.
- Dataset ficticio opcional e idempotente: 30 productos, 20 clientes, 226 ventas
  y 485 movimientos iniciales. No reemplaza los catálogos del usuario.
- Migración V4, suite de concurrencia y pruebas de reportes/seed en PostgreSQL.
- Pruebas Playwright contra React, API y BD reales en CI aislada; revisión móvil.
- JAR estable `target/nexus-api.jar` y guía de actualización sin recrear la BD.

## 0.2.0 · 22/10/2026

- Login/logout mediante sesiones de servidor: cookie HttpOnly/SameSite,
  rotación de sesión y de CSRF, y límite de intentos de acceso por IP.
- Cuatro roles autorizados en API. Lectura para todos; escritura de catálogos
  para ADMIN/MANAGER; creación y consulta de usuarios solo para ADMIN.
- Productos, categorías y clientes persistidos; búsqueda, filtros, orden,
  paginación, errores de validación y desactivación lógica.
- Conflictos de edición con versión optimista; SKU normalizado y único;
  nombres de categoría únicos sin distinguir mayúsculas.
- Migración V3; las migraciones V1 y V2 permanecen intactas.
- Cuentas demo opcionales con contraseñas locales aleatorias y bootstrap
  idempotente. Setup actualiza claves ausentes sin reemplazar valores existentes.
- Interfaz responsive, formularios accesibles y controles según rol.
- Documentación de actualización, contrato OpenAPI y pruebas de sesión,
  permisos, persistencia, conflictos y datos inválidos.
- F0 comprobada con PostgreSQL real y build JAR en GitHub Actions.

## 0.1.0 · 22/10/2026

- Monorepo inicial con React/TypeScript y API Spring Boot.
- Pantalla responsive de entorno y roadmap, sin indicadores de negocio falsos.
- Consulta de salud con timeout, reintento y validación de contrato.
- Configuración local con contraseña aleatoria, fuera de Git.
- Migraciones iniciales de roles y categorías; health consulta PostgreSQL.
- Política inicial de rutas cerradas y errores sin información de conexión.
- Pruebas web, pruebas Java y suite de integración PostgreSQL preparadas.
- Workflow CI, Compose opcional, guía GitHub y criterios de fases.

Los resultados ejecutados y las limitaciones constan en docs/VALIDACION.md.
