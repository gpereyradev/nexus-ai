# ADR-002 · Sesiones, CSRF y catálogos

Estado: adoptada para 0.2.0. Fecha: 22 de octubre de 2026.

Se usan sesiones de servidor y cookies HttpOnly/SameSite=Strict. La aplicación
de demostración tiene un único frontend del mismo origen y no requiere JWT.
Esto permite invalidar el acceso al cerrar sesión sin crear una lista de
revocación propia. Reiniciar Java invalida las sesiones en memoria.

Spring Security procesa el formulario de login, rota el identificador de sesión
y el token CSRF al autenticar, guarda el contexto y maneja el logout. React
solicita el token a GET /auth/csrf, envía su cabecera en escrituras y descarta
el valor tras login/logout. No se guardan tokens ni contraseñas en localStorage.
No se reintentan automáticamente escrituras rechazadas.

Los permisos se aplican por ruta y por método del servicio de catálogos.
ADMIN/MANAGER escriben; ANALYST/VIEWER leen. Solo ADMIN crea y lista usuarios.
No hay edición de roles ni desactivación de usuarios en esta entrega: antes
de añadirla se deberá invalidar o refrescar las sesiones afectadas.

Los catálogos usan JPA/Hibernate, transacciones, UUID y versiones optimistas.
Una edición recibe todos los campos editables y la versión que el usuario
leyó; una versión obsoleta responde 409. El borrado funcional es desactivación.
Precios y costos se almacenan en DECIMAL(12,2); el JSON de salida usa cadenas.

El servicio de cuentas usa consultas JDBC parametrizadas pequeñas para
autenticación y bootstrap. BCrypt de coste 12 guarda hashes, nunca contraseñas.
El bootstrap de demostración es opcional y solo crea cuentas ausentes con
credenciales de variables locales. No hay cuentas con contraseña fija en SQL.

La limitación de acceso es local en memoria y por IP del socket. No se confían
cabeceras de IP proporcionadas por el cliente. Un despliegue futuro deberá
definir su proxy de confianza, HTTPS y límites distribuidos antes de ampliar
el uso fuera de la demostración local.

Referencias: [sesiones Spring Security](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
y [CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).
