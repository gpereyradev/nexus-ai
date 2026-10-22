# Validación · 0.1.0

Fecha: 22 de octubre de 2026. **F0 permanece en validación** hasta comprobar
la integración real y el workflow en el repositorio del usuario.

## Ejecutado con resultado correcto

| Comprobación | Resultado y alcance |
|---|---|
| `npm install` | Dependencias instaladas y package-lock generado |
| `npm ci --ignore-scripts` | Reinstalación desde lock completada; se verificó build después |
| `npm run typecheck` | TypeScript sin errores |
| `npm test` | 6 pruebas aprobadas: contrato válido, señal de cancelación, error HTTP y respuestas incompatibles |
| `npm run build` | Compilación y bundle de producción generados por Vite |
| `mvn -B -f services/api-java/pom.xml test` | 4 pruebas aprobadas; compilación Java y tests MVC/Security con HealthService sustituido por un mock |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades reportadas para dependencias de ejecución en esa consulta |
| Revisión de navegador | Interfaz visible a 1440 px y 390 px; navegación Entorno/Roadmap, estado API desconectada, sin errores JS ni desbordamiento horizontal |
| Estado conectado en navegador | Verificado interceptando health con una respuesta de contrato válida; NO constituye integración real con PostgreSQL |

La aplicación entregada no contiene datos de salud simulados: consulta la API.
La intercepción de respuesta se usó únicamente en la revisión de interfaz.
Las capturas de revisión son evidencia interna y no se incluyen en el paquete.

Para Maven se utilizó una instalación temporal 3.9.11 y resolución de
dependencias adaptada a la red del entorno. La última ejecución fue offline
contra la caché ya descargada; no se trasladan esas configuraciones al proyecto.
El mock maker de tests usa subclases: no requiere adjuntar un agente a la JVM
ni simular clases finales.

## Pendiente: no afirmar como aprobado

- `mvn verify -Pintegration` contra PostgreSQL real. El entorno no dispone de
  Docker y no permitió ejecutar PostgreSQL con un usuario compatible. Los
  tests de integración están incluidos, pero no se han ejecutado.
- Aplicación de V1/V2 y consulta health sobre una conexión Java/PostgreSQL real.
- Build de imagen Docker y arranque de Compose. Los archivos están preparados;
  su ejecución no fue posible en este entorno.
- Ejecución de GitHub Actions: requiere el primer push al nuevo repositorio.
- Arranque en Windows/Git Bash: instrucciones preparadas, sin ejecución en
  Windows disponible durante esta entrega.
- Empaquetado JAR de producción: el código compila y pasa tests; no se verificó
  la imagen final ni un despliegue del JAR.

No se implementaron ni probaron funciones de negocio: autenticación, RBAC,
CRUD, stock, ventas, indicadores y analítica pertenecen a fases posteriores.

## Cómo cerrar F0

1. Arranca PostgreSQL y Java siguiendo README.md.
2. Comprueba health y que la interfaz confirme conexión.
3. Reinicia Java: Flyway no debe duplicar roles ni categorías.
4. Ejecuta la integración contra una BD aislada de pruebas.
5. Sube al repo y revisa los dos jobs de CI. Guarda los resultados y actualiza
   este archivo y ROADMAP antes de marcar la fase como terminada.
