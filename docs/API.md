# Contrato implementado en 0.1.0

## GET /api/v1/health

Público, sin sesión. Ejecuta `SELECT 1` contra PostgreSQL. Respuesta 200:

```json
{
  "status": "UP",
  "application": "nexus-api",
  "version": "0.1.0",
  "phase": "F0",
  "database": "UP",
  "currency": "PEN",
  "timezone": "America/Lima",
  "checkedAt": "2026-10-22T10:00:00Z"
}
```

`checkedAt` es una marca real UTC, convertida a Lima en el frontend. El ejemplo
no implica que el backend haya arrancado en el entorno de preparación.

Si pierde conexión después del arranque, devuelve 503, Content-Type
`application/problem+json`, código `DATABASE_UNAVAILABLE`, sin host, usuario,
contraseña, SQL ni stacktrace. Si PostgreSQL no está disponible al iniciar,
Flyway impide el arranque completo; el navegador verá un error de conexión.

Las rutas operativas quedan bloqueadas: GET /api/v1/products sin credenciales
devuelve 401. POST sin token CSRF devuelve 403. No hay endpoints de negocio
ni login implementados. En F1 se añadirá OpenAPI para los contratos operativos.

El frontend usa `/api/v1/health` relativo al mismo origen. Vite lo reenvía al
valor `VITE_API_PROXY` de `.env`; solamente variables con prefijo `VITE_` pueden
quedar expuestas al cliente. Nunca uses ese prefijo para secretos.
