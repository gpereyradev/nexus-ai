# Validación · 0.4.1

Fecha: 22 de octubre de 2026. Se distingue ejecución en Linux/CI de arranque
Windows o Compose local. No se activaron pagos ni APIs facturables.

## Preparación de despliegue público

Se añadieron imagen única, perfil `public`, Blueprint Render Free, configuración
Neon, supervisor y guía. TypeScript, 10 pruebas web, build y 4 pruebas del
lanzador aprobaron localmente. La ejecución local de pruebas Java sigue
bloqueada al resolver dependencias de Surefire; no se presenta como aprobada.

[Run 39820450428](https://github.com/gpereyradev/nexus-ai/actions/runs/39820450428),
commit operativo `866789e`, aprobó los cinco jobs: web, api, analytics, e2e y
public-container. La revisión posterior solo registra evidencia en documentación.

| Suite | Pruebas aprobadas |
|---|---:|
| Web | 10 |
| Java unitarias/MVC | 19 |
| Integración PostgreSQL | 46 |
| Python analítica | 10 |
| Configuración del lanzador público | 4 |
| Playwright con procesos de desarrollo reales | 3 |
| Playwright contra imagen construida y proxy HTTPS | 4 |
| Total de ejecuciones aprobadas | 96 |

Las cuatro pruebas de la imagen aprobaron en 12.0 segundos. Comprueban sesión
Secure/HttpOnly/SameSite, recarga autenticada, cierre sin acceso residual,
CSRF/rutas cerradas, venta/anulación, lectura móvil y pronósticos reales. No se
interceptaron peticiones de API. La imagen quedó ejecutándose, `oom=false`, con
349.1 MiB de uso puntual sobre 512 MiB. Es una muestra al terminar, no un pico
medido ni una prueba de carga. Se corrigió el scroll de la barra lateral después
de que el primer intento detectara el cierre de sesión fuera del viewport.

El proveedor usa CPU fraccionada, distinta del límite de 1 CPU de CI. No se
afirma rendimiento público certificado. Se creó el proyecto exclusivo Neon Free
con PostgreSQL 17; Render está preparado en Free. Queda pendiente guardar la
conexión como secreto, publicar y comprobar la URL real del proveedor. La
configuración y CI no sustituyen esa verificación pública.

## Evidencia de F4

[Run 39813560775](https://github.com/gpereyradev/nexus-ai/actions/runs/39813560775),
commit `3080294`, aprobó los cuatro jobs: web, analytics, api y e2e.

| Suite | Pruebas aprobadas |
|---|---:|
| Web | 10 |
| Java unitarias/MVC | 17 |
| Integración PostgreSQL | 46 |
| Python | 10 |
| Playwright con React/Java/Python/PostgreSQL reales | 3 |
| Total | 86 |

Los logs de navegador confirman venta/anulación, lector móvil con bloqueo de
analítica, pronósticos a 7/14 días, contraste del total con el Panel, historial
insuficiente sin curva y apertura del snapshot original sin recalcular. Los tres
casos aprobaron en 14.3 segundos. No se interceptaron peticiones de la API.
La revisión final posterior solo actualiza documentación y evidencia.

Cobertura nueva:

- Baseline perfecto conserva referencia semanal; una tendencia reproducible
  permite elegir Ridge solo al mejorar ambos bloques.
- Al perturbar únicamente objetivos de holdout, las predicciones previas de
  selección/confirmación no cambian. Ajuste y futuro no se superponen.
- Series escasas, largas secuencias previas de cero, auth interna, fechas
  repetidas y validación sin reflejar datos recibidos.
- Resumen decimal, alertas y cobertura/reposición con regla explícita; sin
  inventar cobertura cuando no hay unidades vendidas.
- Cliente HTTP Java: éxito tipado, respuestas erróneas/malformadas, 422, timeout,
  URL no autorizada y servicio deshabilitado sin filtrar detalles upstream.
- Agregados SQL y exclusión inmediata de anulaciones. Payload sin clientes,
  cuentas, contraseñas o cookies. Roles/CSRF/anonimato aplicados en Java.
- Experimentos con entrada/resultado y huella; misma fuente conserva huella;
  snapshot sobrevive a cambios de nombre y rechaza borrado por trigger.
- Con Python inaccesible, analítica devuelve 503 y una venta real confirma stock;
  health responde 200 en la misma comprobación de integración PostgreSQL.

Revisión visual nueva con Chromium en 1440, 1280, 768 y 390 px: formulario,
resultado, estado insuficiente y apertura de snapshot; sin errores JavaScript ni
desbordamiento del documento. La revisión visual usó una API Java interceptada
con fixture calculado por Python real; se distingue del E2E completo en CI.
TypeScript, pruebas web/Python y build local aprobados. Java compiló localmente;
la resolución local de dependencias de Surefire falló, por lo que la evidencia
de ejecución Java es la de GitHub Actions, no una ejecución local atribuida.

No se afirma Windows, Compose completo o carga certificados a partir de estos resultados.
`pip check` aprobó la coherencia de dependencias. FastAPI/TestClient emite una
advertencia de deprecación para httpx 0.28.1; las 10 pruebas pasan y no se
presenta esa advertencia como un error funcional.

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
- Chatbot/LLM, importación, exportación y emisión tributaria sin implementar.
- El dataset ficticio usa fechas fijas, no sustituye ventas recientes. El botón
  «Ver período demo» permite consultarlo en cualquier fecha.
