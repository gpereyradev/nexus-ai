# Despliegue público · Render + Neon

Esta configuración conserva React, Java/Spring Boot, Python/FastAPI y
PostgreSQL. Los visitantes solo necesitan un navegador. No necesitan Docker,
Node, Java ni Python. El repositorio preparado no implica que ya exista un
servidor publicado: consultar el estado de Render y su URL real.

## Diseño y coste

- Un Web Service **Free** de Render construye `infra/public/Dockerfile`.
- Spring sirve la interfaz compilada y `/api/v1` en el mismo origen. No se
  habilita CORS ni se incluyen claves en el JavaScript del navegador.
- FastAPI escucha únicamente en `127.0.0.1:8001` dentro del contenedor.
- PostgreSQL está en un proyecto **Free** de Neon exclusivo para esta demo.
  No usar bases locales, escolares o con información personal.
- Render termina HTTPS; la cookie de sesión es Secure, HttpOnly y SameSite=Strict.
- La imagen no ejecuta como root. Las variables sensibles no se copian al build.
- El perfil `public` verifica certificado y hostname de PostgreSQL usando el
  almacén de confianza de Java. No desactivar TLS al conectarse a Neon.

No activar tarjeta, suscripción, prueba facturable, disco de pago ni ampliación
automática de recursos. Los límites gratuitos pueden cambiar: comprobarlos
antes de crear servicios. Render Free duerme tras 15 minutos sin tráfico,
comparte 750 horas mensuales por workspace y tiene 512 MB de RAM. Neon Free
tiene cuotas de almacenamiento y cómputo. Al superar cuotas, la demo puede
quedar temporalmente sin servicio; no se promete disponibilidad continua.
No se usa la base gratuita de Render: caduca a los 30 días.

## Publicación inicial

1. En Neon, crear un proyecto nuevo `nexus-ai-public`, PostgreSQL 17, preferentemente
   en una región cercana a Virginia (la región declarada para Render). Conservar
   la base y el rol creados. Usar la conexión **directa**, sin `-pooler`, para que
   Flyway pueda usar su bloqueo de sesión durante las migraciones.
2. En Render, crear un Blueprint desde `gpereyradev/nexus-ai`, rama `main`.
   Render lee `render.yaml`: **un solo Web Service, plan Free y ningún otro
   recurso facturable**. También se puede crear un Web Service Docker con
   contexto raíz y Dockerfile `infra/public/Dockerfile`, copiando sus variables.
3. Guardar la conexión PostgreSQL de Neon como `DATABASE_URL` en el entorno
   privado de Render. La forma es `postgresql://rol:contraseña@host/base`.
   Nunca pegarla en issues, README, capturas públicas ni variables `VITE_*`.
   El lanzador decodifica usuario/contraseña y no imprime la conexión.
4. El Blueprint genera cinco secretos aleatorios: clave interna de Python y
   contraseñas ADMIN, MANAGER, ANALYST y VIEWER. No reutiliza el `.env` local.
5. Desplegar y esperar a que `/api/v1/health` responda 200. Flyway aplica V1–V5
   y se cargan cuentas y datos ficticios una sola vez. El seed no modifica una
   base existente ni duplica registros.
6. Abrir la URL HTTPS que devuelve Render. Ingresar con `admin@nexus.demo` y
   el valor privado `DEMO_ADMIN_PASSWORD` del entorno de Render. La cuenta
   `analyst@nexus.demo` permite enseñar reportes y pronósticos sin escribir
   ventas ni catálogos; `viewer@nexus.demo` solo permite consultas sin analítica.

Los secretos quedan en el proveedor. No hay credenciales universales ni acceso
anónimo a los datos. Para compartir una demo con un evaluador, entregar solo
la cuenta del rol necesario por un canal privado.

## Comprobaciones antes de compartir

- Abrir desde otra conexión/equipo; comprobar inicio, cierre y expiración de sesión.
- Comprobar panel y «Ver período demo»: los datos ficticios tienen fechas fijas.
- En Análisis, usar el período demo y generar 7/14 días; consultar el resultado
  guardado. Un error de Python debe dejar operativos inventario y ventas.
- Verificar en el navegador que JSESSIONID tiene Secure, HttpOnly y SameSite=Strict.
- Comprobar que API sin sesión devuelve 401, escrituras sin CSRF 403 y VIEWER no
  puede escribir ni acceder a analítica. `.env`, `/actuator/env` y rutas de Python
  no deben devolver información.
- Revisar memoria y logs sanitizados del proveedor. La prueba de CI usa 512 MiB
  y 1 CPU; no representa el rendimiento de la CPU fraccionada de Render Free.

## Actualizaciones, persistencia y fallos

Render está configurado para desplegar `main` cuando sus checks aprueben.
Actualizar el código no requiere reinstalar nada en el equipo de los visitantes.
Los datos permanecen en Neon; el filesystem de Render es efímero. No guardar
backups, archivos de usuario o la base dentro del contenedor.

Cambiar una variable `DEMO_*_PASSWORD` **no rota** la contraseña de una cuenta
ya creada: el bootstrap conserva los hashes existentes. La recuperación y
rotación de cuentas existentes siguen pendientes. No borrar datos para resolverlo.
Un redeploy/reinicio pierde las sesiones de memoria; el usuario vuelve a ingresar.

Si Python termina, el supervisor intenta reiniciarlo sin cerrar Java. Si Java
termina, el proceso principal cierra los hijos y permite reiniciar el servicio.
Si todo el contenedor agota memoria, puede reiniciarse completo. No ampliar a
un plan de pago automáticamente. Investigar primero logs/memoria y cuotas.

Rollback de código: elegir el último deploy correcto en Render. Nunca revertir
una migración aplicada ni eliminar la base. Los futuros cambios de esquema
deben añadir V6 o posteriores. Para datos valiosos, preparar y verificar un
backup separado; esta configuración es una demo de portafolio.

## Evidencia reproducible

El job `public-container` construye la imagen real, PostgreSQL 17 aislado,
proxy HTTPS de prueba y navegador Chromium. Ejecuta los recorridos de venta,
anulación, lectura móvil y analítica, además de la sesión Secure y rutas cerradas.
Solo utiliza fixtures de CI; nunca apuntar estas pruebas a la base publicada.
El certificado autofirmado y `DB_SSL_MODE=disable` son exclusivamente para la
red Docker aislada de CI. El Blueprint publicado mantiene `verify-full`.
Resultados ejecutados y límites: [VALIDACION.md](VALIDACION.md).

Referencias oficiales consultadas el 22/10/2026:

- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/web-services
- https://neon.com/pricing
- https://jdbc.postgresql.org/documentation/ssl/
