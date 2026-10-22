# NEXUS AI

Plataforma de gestión empresarial con inteligencia artificial aplicada.
Proyecto de portafolio de **Guillermo Pereyra · Ingeniería de Software con IA**.

**Entrega 0.2.0: seguridad y catálogos.** Incluye login/logout real con sesiones,
cuatro roles, productos, categorías, clientes y alta de usuarios por administrador.
Los catálogos persisten en PostgreSQL y aplican permisos en la API. No hay ventas,
inventario disponible, dashboard de indicadores ni IA todavía.

F0 quedó validada en GitHub Actions con PostgreSQL real. Los resultados y límites
actuales están en [docs/VALIDACION.md](docs/VALIDACION.md). La especificación original
se conserva en [docs/NEXUS_AI_Especificacion_Maestra.pdf](docs/NEXUS_AI_Especificacion_Maestra.pdf).

**Si vienes de v0.1.0:** sigue [docs/ACTUALIZAR.md](docs/ACTUALIZAR.md) para conservar
la base y las variables existentes. La nueva migración V3 se aplica automáticamente.

## Empezar por el frontend

Requisito: Node.js 24.x con npm. Ejecuta desde la carpeta que contiene este README:

```bash
npm install
npm run setup
npm run dev
```

Abre http://localhost:5173. Puedes revisar la interfaz sin Java ni PostgreSQL;
en ese caso verás el acceso, pero no podrás iniciar sesión. Usa «Comprobar estado del entorno» para verificar la conexión.
`npm run setup` genera `.env` con contraseñas aleatorias locales y añade variables
ausentes sin reemplazar las existentes. No imprime las contraseñas. Nunca subas
`.env` ni la salida de `npm run accounts` a GitHub.

## Conectar el backend

Elige **A o B**. No ejecutes ambas APIs a la vez en el mismo puerto.
La primera instalación descarga dependencias y requiere conexión a internet.

### A. Docker para PostgreSQL y Java

Requisito: Docker Engine con Compose v2, o un entorno Docker compatible.
Esta ruta evita instalar Java, Maven y PostgreSQL por separado.
Node.js sigue ejecutando el frontend fuera de Docker.

Desde la raíz, después de `npm run setup`:

```bash
docker compose --env-file .env -f infra/compose.yaml up -d --build
docker compose --env-file .env -f infra/compose.yaml logs -f api
```

Cuando Java haya arrancado, vuelve a comprobar la conexión desde la interfaz.
Para detener servicios conservando los datos:

```bash
docker compose --env-file .env -f infra/compose.yaml down
```

El volumen `nexus_data` conserva la BD entre arranques. Cambiar la contraseña de
`.env` no cambia la de un volumen ya inicializado. No elimines ese volumen para
resolver errores sin revisar primero su contenido. Docker/Compose no se ha
podido ejecutar en el entorno de preparación de esta entrega.

### B. Sin Docker: Java y PostgreSQL instalados

Requisitos: JDK 17+, Maven 3.9+ y PostgreSQL 17. Comprueba:

```bash
java -version
mvn -v
psql --version
```

1. Ejecuta `npm run setup` y abre `.env` localmente.
2. En pgAdmin, crea un rol de login `nexus` con la contraseña `DB_PASSWORD` de
   tu `.env`. No necesita ser superusuario. Crea una base `nexus`, propiedad
   de ese rol. Si utilizas otros nombres, ajusta `DB_USER` y `DB_NAME`.
3. Comprueba que PostgreSQL escuche en `127.0.0.1:5432`, o ajusta `DB_PORT`.
4. En otra terminal situada en la raíz:

```bash
npm run api
```

Este comando carga el `.env` raíz y ejecuta Maven en `services/api-java`.
Flyway crea o actualiza las tablas e instala cuatro roles y ocho categorías.
Con `DEMO_ENABLED=true`, Java crea cuatro cuentas demo en el primer arranque;
no cambia contraseñas ni duplica registros en los siguientes arranques.

Prueba en el navegador http://127.0.0.1:8080/api/v1/health o en Git Bash:

```bash
curl http://127.0.0.1:8080/api/v1/health
```

Debe devolver HTTP 200, `status: UP` y `database: UP`. Si la conexión inicial a
PostgreSQL falla, Spring Boot no termina de arrancar: revisa el log y `.env`.
Si falla después del arranque, health devuelve 503 sin revelar la conexión.

## Validación

```bash
npm run typecheck
npm test
npm run build
mvn -B -f services/api-java/pom.xml test
```

La integración necesita **una base de pruebas independiente y vacía**; no la
ejecutes sobre datos de trabajo. Ejemplo en Git Bash después de crear en
PostgreSQL un rol y base `nexus_test`:

```bash
export DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=nexus_test DB_USER=nexus_test
read -s -p 'Contraseña de la BD de pruebas: ' DB_PASSWORD
export DB_PASSWORD
mvn -B -f services/api-java/pom.xml verify -Pintegration
unset DB_PASSWORD
```

Prueba HTTP real, migraciones, datos de referencia sin duplicaciones y bloqueo
de rutas operativas. El workflow de GitHub usa PostgreSQL efímero propio.
Consulta [docs/VALIDACION.md](docs/VALIDACION.md) para distinguir pruebas
ejecutadas de las pendientes. La presencia del workflow no significa que haya
sido ejecutado en GitHub.

## Estructura

| Ruta | Responsabilidad |
|---|---|
| `apps/web` | React, TypeScript, CSS, contrato de conectividad y pruebas |
| `services/api-java` | Spring Boot, seguridad por defecto y Flyway |
| `services/analytics-python` | Reserva documentada para F4; sin servicio aún |
| `infra` | Compose local para Java y PostgreSQL |
| `scripts` | Configuración local y arranque de Java desde la raíz |
| `docs` | Plan, contrato, decisiones y validación |
| `.github/workflows` | Pruebas y builds en push / pull request |

React → `/api/v1` en Java → PostgreSQL. Vite reenvía `/api` al backend durante
desarrollo. No se habilita CORS global. Python se incorporará detrás de Java
cuando el MVP esté estable. No hay despliegue ni integración de servicios pagos.

El contrato se documenta en [docs/API.md](docs/API.md) y
[docs/openapi.yaml](docs/openapi.yaml). Los listados de productos y clientes
usarán búsqueda, filtros, orden y páginas con un máximo de 100 filas.
La edición de catálogos requiere la versión leída: un cambio obsoleto recibe 409.

## Primer push y siguientes versiones

Sigue [docs/GITHUB.md](docs/GITHUB.md). Sube los archivos extraídos del ZIP,
incluido `.github`, y conserva `.gitignore`. No subas el ZIP, `node_modules`,
`target`, `dist` ni `.env`. Cuando exista el repo, los cambios siguientes se
harán sobre su versión actual y se registrarán con commits.

## Entrar y comprobar roles

Después de iniciar Java, consulta las credenciales únicamente en tu terminal local:

```bash
npm run accounts
```

| Cuenta | Permisos |
|---|---|
| `admin@nexus.demo` | Catálogos, consulta y creación de usuarios |
| `manager@nexus.demo` | Crear, editar y desactivar catálogos |
| `analyst@nexus.demo` | Consultar catálogos, sin edición |
| `viewer@nexus.demo` | Consultar catálogos, sin edición |

No existe una contraseña pública fija. El comando lee tu `.env`; los valores
solo se usan al crear cuentas que todavía no existen. Modificar después una
variable `DEMO_*_PASSWORD` no cambia la contraseña guardada en PostgreSQL.
Para deshabilitar la creación automática usa `DEMO_ENABLED=false`; eso no
elimina ni desactiva cuentas ya existentes.

El administrador también puede crear cuentas desde Usuarios. La edición de
roles, desactivación de usuarios y reinicio de contraseñas aún están pendientes;
no se ofrecen botones que aparenten ejecutar esas operaciones.

## Próximo módulo

**F2: inventario y ventas.** Movimientos trazables, control de concurrencia,
ventas atómicas y anulación única. Consulta [docs/ROADMAP.md](docs/ROADMAP.md).
No hay importación de datos reales, cobros ni emisión fiscal.

## Notas de seguridad y costo

- Proyecto local de demostración, sin información personal real.
- Health y CSRF son públicos. El resto aplica autorización por ruta y, en
  catálogos, también por servicio. Login y logout requieren CSRF; las sesiones
  duran 30 minutos de inactividad y el cierre invalida la cookie anterior.
- Las cookies son HttpOnly y SameSite=Strict. En un eventual entorno HTTPS
  debe configurarse `SESSION_COOKIE_SECURE=true`. Esta entrega es local.
- Límite local de 10 intentos de acceso por IP y minuto. No es un limitador
  distribuido; detrás de Vite todas las peticiones comparten la IP del proxy.
- Migraciones versionadas, zona horaria de almacenamiento UTC; interfaz Lima,
  moneda PEN. Los importes usarán DECIMAL cuando se implemente operación.
- No se activaron cargos, hosting, suscripciones ni APIs facturables.
- CI no publica el proyecto. Revisa la disponibilidad y cuota de Actions de
  tu cuenta antes de usarlo en un repositorio privado.

Referencias de compatibilidad consultadas: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html)
y [Vite](https://vite.dev/guide/). Las versiones del frontend quedan fijadas
en `package-lock.json`. Usa `npm ci` para reproducirlas después del primer clon.
