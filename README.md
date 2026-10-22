# NEXUS AI

Plataforma de gestión empresarial con inteligencia artificial aplicada.
Proyecto de portafolio de **Guillermo Pereyra · Ingeniería de Software con IA**.

**Entrega 0.3.0: inventario, ventas y reportes.** Incluye acceso por roles,
catálogos persistidos, ingresos y ajustes de stock, ventas atómicas y anulación
con devolución única. El panel calcula indicadores desde PostgreSQL y permite
filtrar por fechas de Lima. La IA se implementará en F4.

La evidencia y sus límites están en [docs/VALIDACION.md](docs/VALIDACION.md).
La especificación original se conserva en
[docs/NEXUS_AI_Especificacion_Maestra.pdf](docs/NEXUS_AI_Especificacion_Maestra.pdf).

**Si ya tienes el proyecto:** sigue [docs/ACTUALIZAR.md](docs/ACTUALIZAR.md).
No hace falta otro ZIP ni recrear la base. V4 conserva los catálogos existentes.

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
ejecutes sobre datos de trabajo. OperationsIT exige el sufijo `_test` o `_ci`
y limpia tablas de operación. Ejemplo en Git Bash después de crear en
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
usan búsqueda, filtros, orden y páginas con un máximo de 100 filas.
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
| `admin@nexus.demo` | Catálogos, movimientos, ventas, anulaciones, reportes y alta de usuarios |
| `manager@nexus.demo` | Catálogos, movimientos y ventas; consulta de reportes |
| `analyst@nexus.demo` | Consultar catálogos, inventario, ventas y reportes |
| `viewer@nexus.demo` | Consultar catálogos, inventario, ventas y reportes |

No existe una contraseña pública fija. El comando lee tu `.env`; los valores
solo se usan al crear cuentas que todavía no existen. Modificar después una
variable `DEMO_*_PASSWORD` no cambia la contraseña guardada en PostgreSQL.
Para deshabilitar la creación automática usa `DEMO_ENABLED=false`; eso no
elimina ni desactiva cuentas ya existentes.

El administrador también puede crear cuentas desde Usuarios. La edición de
roles, desactivación de usuarios y reinicio de contraseñas aún están pendientes;
no se ofrecen botones que aparenten ejecutar esas operaciones.

## Probar la operación

1. Entra como administrador y abre el Panel. «Ver período demo» muestra los
   datos ficticios de julio a octubre de 2026; el período inicial son los últimos 30 días.
2. En Inventario, busca un producto y abre Historial. Usa Movimiento para
   ingresar unidades o registrar una diferencia de conteo con motivo obligatorio.
3. En Ventas, agrega productos disponibles y cantidades. El servidor toma los
   precios del catálogo, comprueba stock y confirma todo en una transacción.
4. Abre el detalle para consultar las líneas y precios históricos. Solo ADMIN
   puede anular con motivo: recupera las unidades una sola vez y conserva el historial.
5. Actualiza el Panel. Las ventas anuladas se excluyen de los importes; el
   stock bajo representa existencias actuales, independiente del período elegido.

No hay cobros, impuestos, descuentos, importación real ni emisión tributaria.

## Datos ficticios opcionales

`npm run setup` añade `DEMO_DATA_ENABLED=true` si falta. En el siguiente arranque,
Java crea una sola vez 30 productos `DEMO-001`…`DEMO-030`, 20 clientes ficticios,
226 ventas entre 01/07/2026 y 21/10/2026 y movimientos de stock consistentes.
Tres productos iniciales ejemplifican stock bajo. El panel identifica el dataset.

Para empezar sin ellos, establece `DEMO_DATA_ENABLED=false` **antes** de arrancar
Java. Requiere `DEMO_ENABLED=true` o una cuenta activa `admin@nexus.demo` ya creada.
El seed es transaccional e idempotente: no duplica ni sobrescribe registros.
Un SKU `DEMO-*` ya ocupado provoca rollback; deshabilita el seed para continuar.
Deshabilitar la variable después no borra datos ya creados. No elimines tablas
ni volúmenes para actualizar. Los registros demo pueden modificarse desde la
aplicación con los mismos permisos y reglas que cualquier registro.

## Pruebas de navegador

CI ejecuta Playwright contra React, el JAR real y PostgreSQL en una BD separada.
Para repetirlo localmente, crea un rol y BD exclusivos cuyo nombre termine en
`_e2e`, exporta `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y ejecuta:

```bash
mvn -B -f services/api-java/pom.xml package -DskipTests
npx playwright install chromium
npm run test:e2e
```

La suite crea datos, usa puertos 18080/15173 y rechaza nombres de BD que no
terminen en `_e2e`. No reutiliza servidores existentes. Las contraseñas de fixtures
son exclusivas de ese entorno efímero. No lee tu `.env` ni tus cuentas locales.
No activa capturas, vídeos o trazas con credenciales.

## Próximo módulo

**F4: análisis y pronósticos con Python.** Se abordará con baseline, evaluación
MAE y tratamiento de fallos del servicio. Consulta [docs/ROADMAP.md](docs/ROADMAP.md).

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
  moneda PEN. Los importes se guardan en DECIMAL(12,2) y se calculan con BigDecimal.
- No se activaron cargos, hosting, suscripciones ni APIs facturables.
- CI no publica el proyecto. Revisa la disponibilidad y cuota de Actions de
  tu cuenta antes de usarlo en un repositorio privado.

Referencias de compatibilidad consultadas: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html)
y [Vite](https://vite.dev/guide/). Las versiones del frontend quedan fijadas
en `package-lock.json`. Usa `npm ci` para reproducirlas después del primer clon.
