# Cambios

## 0.5.0 · 22/10/2026

- Tema oscuro morado y negro por defecto y tema claro; selector en acceso y
  aplicación con preferencia persistida en el navegador, incluso al recargar.
- Paleta compartida en formularios, tablas, gráficos, alertas y diálogos.
- Accesos directos del panel a nueva venta, stock bajo y pronósticos según rol.
- Períodos Hoy / últimos 7 / últimos 30 días y limpieza de filtros en un clic.
- Menú móvil en diálogo con Escape y retorno de foco; acceso a contenido por teclado.
- Venta guiada con productos agregados visibles y cliente opcional desplegable.
- Mostrar/ocultar contraseña, foco inicial en formularios y textos más claros.
- No cambia el modelo analítico, las migraciones ni los datos existentes.
- Publicada en la URL existente; cinco suites de CI con 102 comprobaciones
  aprobadas. Evidencia y límites en docs/VALIDACION.md.

## 0.4.1 · 22/10/2026

- Imagen pública única con React compilado servido por Spring y FastAPI
  privado en loopback; conserva el stack y la base PostgreSQL externa.
- Blueprint Render Free + Neon Free, secretos aleatorios privados, cookies
  Secure y TLS PostgreSQL con validación de certificado y hostname.
- Supervisor con cierre de hijos y reinicio independiente de Python; ajustes
  de memoria y conexiones para una demo gratuita con recursos limitados.
- Rutas estáticas GET explícitas, CSP y pruebas para conservar API y archivos
  internos cerrados. Interfaz pública sin instrucciones de terminal locales.
- CI de la imagen real con HTTPS, 512 MiB y recorridos completos de navegador.
- Barra lateral desplazable en pantallas bajas para mantener accesible el
  cierre de sesión con todos los módulos visibles.
- Demo publicada en Render Free + Neon Free y verificada por HTTPS: sesiones,
  roles/CSRF, reportes, pronóstico real guardado y cierre de sesión.
- Guía de publicación, actualización y persistencia. Estado y evidencia exactos
  en docs/VALIDACION.md; no confundir configuración con publicación completada.

## 0.4.0 · 22/10/2026

- Servicio Python local con FastAPI y scikit-learn, autenticado mediante clave
  interna aleatoria; recibe agregados de Java sin clientes, usuarios ni cookies.
- Pronóstico de 1–14 días, referencia semanal y regresión Ridge con calendario.
  Compara dos bloques cronológicos de 14 días, reporta MAE y conserva el baseline
  si Ridge no mejora al menos 10% en ambos. No afirma evaluación independiente.
- Historial mínimo de 84 días y 28 con ventas, rechazo de días incompletos/futuros,
  alertas por mediana/MAD y cálculo explícito de cobertura/reposición.
- Pantalla de análisis con estados vacíos/insuficientes, errores recuperables,
  tabla de cifras, versión, períodos, advertencias y apertura de análisis guardados.
- V5 guarda snapshots agregados y resultados inmutables con huella SHA-256.
  Las migraciones V1–V4 permanecen intactas.
- Timeouts, cancelación HTTP, límite de dos cálculos simultáneos y rutas por rol.
  Una caída de Python no bloquea health, inventario ni confirmación de ventas.
- Lanzador npm, perfil Compose opcional y dependencias Python fijadas.
- Pruebas Python, HTTP Java, agregados/roles/resiliencia PostgreSQL y E2E con
  React, Java y Python reales. Evidencia exacta en docs/VALIDACION.md.

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
