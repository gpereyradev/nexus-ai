# ADR-001 · Fundación simple, local y modular

Estado: adoptada para 0.1.0. Fecha: 22 de octubre de 2026.

El proyecto debe demostrar ingeniería full stack con presupuesto externo S/0.
Se adopta un monorepo: React/TypeScript, un monolito modular Java y PostgreSQL.
Python tendrá una frontera separada solo desde F4. No se añade un servidor de
IA vacío ni datos de negocio simulados a la pantalla principal.

Se usan Java 17 y Spring Boot 3.5.16 por compatibilidad. Se fija Node.js 24 para
frontend y scripts. Vite hace proxy de `/api` en desarrollo, evitando abrir
CORS a cualquier origen. Compose es una alternativa a la instalación manual,
no un requisito del dominio. No hay hosting en esta entrega.

F0 deniega las rutas operativas. Health es la única ruta pública y consulta
PostgreSQL antes de responder. No es autenticación terminada: la política de
sesiones, logout, protección CSRF y RBAC se decidirá y probará en F1.

Flyway es la fuente del esquema. V1 crea roles y categorías; V2 instala datos
de referencia. No se edita una migración ya aplicada: se crea V3 o posterior.
JPA no crea ni altera tablas automáticamente. IDs UUID y fechas TIMESTAMPTZ;
los importes de los futuros módulos se guardarán en DECIMAL(12,2).

La primera versión no obliga a instalar Python. Esta decisión reduce el
número de servicios necesarios para verificar el primer arranque. El costo es
que el nombre AI expresa el objetivo y no una función disponible todavía.
