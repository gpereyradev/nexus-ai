# Validación · 0.2.0

Fecha: 22 de octubre de 2026. No se atribuyen pruebas de Windows ni de Compose
local a los resultados obtenidos en GitHub Actions.

## Evidencia de la fundación

[Run 39738272579](https://github.com/gpereyradev/nexus-ai/actions/runs/39738272579),
commit 41b54a6, terminó con web y api aprobados. Sus logs muestran Java conectado
a PostgreSQL 17.11, V1/V2 aplicadas, una segunda migración sin cambios, HTTP real,
4 pruebas Java, 3 de integración y build JAR correctos. F0 ya no está bloqueada
por la falta de PostgreSQL en el entorno de preparación.

## Evidencia de F1

[Primera validación F1](https://github.com/gpereyradev/nexus-ai/actions/runs/39740808315),
commit cf277bd, aprobó web y api: 10 pruebas web, 5 unitarias/MVC Java y 14 de
integración contra PostgreSQL. V3 se aplicó correctamente. El flujo de login,
rotación de sesión, CSRF obsoleto, logout y rechazo de la cookie invalidada se
probó por HTTP real. Las pruebas de catálogos usan MockMvc con JPA y PostgreSQL
reales y revierten sus cambios al terminar.

[Validación ampliada F1](https://github.com/gpereyradev/nexus-ai/actions/runs/39741657057),
commit 6fca270, aprobó ambos jobs. Resultado: 10 pruebas web, 5 unitarias/MVC
Java y 16 de integración PostgreSQL, todas sin fallos: **31 pruebas en total**.
Incluye bootstrap demo idempotente sin sobrescribir hashes, categorías
inactivas/duplicadas y alta de usuarios restringida a administrador.

El estado exacto de la última revisión se consulta en
[Actions de la rama](https://github.com/gpereyradev/nexus-ai/actions?query=branch%3Afeat%2Ff1-auth-catalogs)
y los checks del PR. Un resultado de un commit anterior no sustituye la
validación del código posterior.

## Comprobaciones locales ejecutadas

- npm run typecheck: aprobado.
- npm test: 10 pruebas aprobadas.
- npm run build: bundle generado.
- mvn test: 5 pruebas aprobadas y suites de integración compiladas.
- git diff --check: sin errores de espacios.
- Setup ejecutado dos veces: claves existentes conservadas; secretos fuera de Git.
- Navegador: acceso válido/inválido, alta de producto, conflicto de edición,
  alta de cliente, categorías, alta de usuario, logout y controles de lector.
- Revisión visual en 1440 px y 390 px, sin errores JavaScript ni desbordamiento
  horizontal del documento; tablas móviles tienen desplazamiento propio.

La revisión de navegador interceptó la API con fixtures controlados para
comprobar estados y formularios. No equivale a E2E de React contra PostgreSQL.
La integración Java/PostgreSQL sí se probó en CI por separado. Las capturas
se usaron para revisión interna y no se publican como si fueran una demo real.

## Cobertura funcional relevante

- Solo ADMIN/MANAGER escriben catálogos. Todos los roles pueden leer.
- Solo ADMIN lista y crea usuarios, incluso con llamadas API directas.
- Login incorrecto, falta de CSRF y cookie de sesión cerrada se rechazan.
- SKU duplicado, precio negativo, correo inválido y referencia inexistente.
- Costos/precios persistidos; categoría legible mediante asociación JPA.
- Conflicto de versión y preservación de la edición ya guardada.
- Clientes desactivados siguen consultables con el filtro correspondiente.
- Búsqueda literal de comodines y límites de tamaño/orden.
- Las contraseñas nunca se devuelven en respuestas de cuentas.

## Pendiente

- Arranque local en Windows/Git Bash del usuario.
- Build y ejecución del Compose de la aplicación.
- E2E de navegador contra backend real, prueba de carga y auditoría exhaustiva.
- Inventario, ventas, dashboard e IA: aún no implementados.
- Edición de roles, desactivación de usuarios y recuperación de contraseña.

No se activaron pagos, hosting, suscripciones ni APIs facturables.
