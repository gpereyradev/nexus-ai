# Validación · 0.3.0

Fecha: 22 de octubre de 2026. Se distingue ejecución en Linux/CI de arranque
Windows o Compose local. No se activaron pagos, hosting ni APIs facturables.

## Evidencia de F2/F3

[Run 39748889174](https://github.com/gpereyradev/nexus-ai/actions/runs/39748889174),
commit `4c0729d`, aprobó web, API y E2E con PostgreSQL 17.11 real:

| Suite | Pruebas aprobadas |
|---|---:|
| Web: contrato de salud y cliente de sesión/CSRF | 10 |
| Java: salud, rate limit y reglas exactas de venta | 9 |
| FoundationIT | 3 |
| AuthCatalogIT | 13 |
| OperationsIT | 16 |
| DemoDatasetIT | 1 |
| DashboardIT | 3 |
| Playwright: operación completa y lector móvil/API | 2 |
| Total | 57 |

Los logs confirman ambos casos E2E aprobados en 14.7 segundos (incluido el
arranque de los servidores). No se interceptaron peticiones de API. Este run
valida el código operativo; la actualización posterior de este documento solo
registra su evidencia. El estado de cada commit se consulta en
[Actions de la rama](https://github.com/gpereyradev/nexus-ai/actions?query=branch%3Afeat%2Ff2-inventory-sales).
Un resultado de un commit anterior no sustituye la revisión posterior.

## Casos relevantes probados con PostgreSQL

- V1–V4 aplicadas y segunda ejecución de Flyway sin cambios.
- Login real, rotación de sesión/CSRF, logout y rechazo de cookie invalidada.
- Roles, escrituras sin CSRF, categorías inactivas, valores inválidos y edición
  obsoleta; cuentas demo idempotentes sin sobrescribir hashes.
- Importes exactos y precios del servidor aunque el cliente envíe otro precio.
- Snapshots de líneas y cliente persistidos, incluso al renombrar un producto.
- Fallo en una línea revierte cabecera, líneas y movimientos completos.
- Cantidades, saldo negativo, límite de enteros y de total decimal rechazados.
- Reintento idéntico de venta/ajuste no duplica registros. Clave con datos
  diferentes produce conflicto.
- Dos ventas concurrentes no sobrevendieron stock; la misma clave simultánea
  produjo una sola venta; orden inverso de líneas no produjo deadlock.
- Anulación repetida y simultánea no duplicó reversiones; devuelve stock de un
  producto inactivo y conserva las líneas originales.
- UPDATE/DELETE de historial y saldo anterior inventado rechazados por la BD.
- Búsqueda literal, paginación acotada y bordes de fechas en horario de Lima.
- Seed repetido produce una sola carga, sin saldos negativos, con 30 productos,
  20 clientes, 226 ventas, tres alertas iniciales y más de 90 días de historia.
- Total de reportes coincide con SQL independiente; sumas diarias/categorías
  coinciden, períodos vacíos dan cero y anulaciones se excluyen.

## Comprobaciones locales

TypeScript, 10 pruebas web, build de Vite, 9 pruebas Java y compilación de las
suites de integración aprobados. `git diff --check` sin errores. OpenAPI YAML
analizado y referencias locales resueltas. Setup conserva las claves existentes;
credenciales fuera de Git.

Revisión visual con Chromium a 1440, 1280, 768 y 390 px: panel, inventario, formulario
de movimiento y venta. Sin errores JavaScript ni desbordamiento horizontal del
documento. Esta revisión visual usó fixtures de API controlados, distinta de
la suite E2E real de GitHub. Sus capturas son internas, no evidencia de BD real.

## Cómo repetir E2E

OperationsIT también rechaza bases cuyo nombre no termine en `_test` o `_ci`
antes de ejecutar las pruebas que limpian tablas.

La configuración Playwright exige una BD aislada con nombre terminado en
`_e2e`; crea registros. Arranca JAR y Vite en 18080/15173, sin reutilizar
servidores existentes ni leer `.env`. Consulta [README](../README.md).

La suite recorre alta de producto, ingreso de cinco unidades, venta de dos,
descuento a tres, reporte +39.80, anulación, devolución a cinco, historial y
reporte restaurado. Otro caso consulta en móvil como VIEWER y comprueba 403
al intentar vender mediante la API con CSRF válido. No hay interceptación HTTP
en esos casos y no se exportan trazas, vídeos ni capturas de sesiones.

## Evidencia anterior

- [F0](https://github.com/gpereyradev/nexus-ai/actions/runs/39738272579): migraciones,
  HTTP real, health, PostgreSQL y build JAR.
- [F1](https://github.com/gpereyradev/nexus-ai/actions/runs/39741657057): 31 pruebas
  de acceso, catálogos, bootstrap y permisos aprobadas.
- [F2 inicial](https://github.com/gpereyradev/nexus-ai/actions/runs/39744797176):
  51 pruebas antes de agregar el dataset y reportes.

## Pendientes y límites

- Windows/Git Bash y build/ejecución del Compose completo de la aplicación.
- Carga, auditoría exhaustiva, accesibilidad completa y otros navegadores.
- Edición de roles, desactivación de usuarios y recuperación de contraseña.
- Python/IA, importación, exportación y emisión tributaria sin implementar.
- El dataset ficticio usa fechas fijas, no sustituye ventas recientes. El botón
  «Ver período demo» permite consultarlo en cualquier fecha.
