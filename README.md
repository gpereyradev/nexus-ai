# NEXUS AI

Plataforma de gestión empresarial con inteligencia artificial aplicada.
Proyecto de portafolio de **Guillermo Pereyra · Ingeniería de Software con IA**.

**Entrega 0.1.0: fundación F0, en validación.** Incluye estructura ejecutable,
pantalla de entorno React, API de salud Java, migraciones iniciales PostgreSQL
y un workflow de CI. Todavía no incluye login, CRUD, ventas, dashboard ni IA.
La pantalla consulta conexiones reales; no muestra ventas ni métricas ficticias.
El [documento maestro original](docs/NEXUS_AI_Especificacion_Maestra.pdf) está incluido como referencia del alcance.

## Empezar por el frontend

Requisito: Node.js 24.x con npm. Ejecuta desde la carpeta que contiene este README:

```bash
npm install
npm run setup
npm run dev
```

Abre http://localhost:5173. Puedes revisar la interfaz sin Java ni PostgreSQL;
en ese caso se mostrará que la API está desconectada. Eso es esperado.
`npm run setup` genera `.env` con una contraseña aleatoria local; si ya existe,
lo conserva. No imprime la contraseña y no debes subir ese archivo a GitHub.

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
Flyway crea las tablas e instala cuatro roles y ocho categorías. No crea
cuentas de usuario todavía. Un segundo arranque no repite la inserción.

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

## Primer push y siguientes versiones

Sigue [docs/GITHUB.md](docs/GITHUB.md). Sube los archivos extraídos del ZIP,
incluido `.github`, y conserva `.gitignore`. No subas el ZIP, `node_modules`,
`target`, `dist` ni `.env`. Cuando exista el repo, los cambios siguientes se
harán sobre su versión actual y se registrarán con commits.

## Próximo módulo

**F1: autenticación, cuatro roles y catálogos.** Antes de aceptarlo hay que
cerrar la validación F0 en tu equipo y en GitHub. El roadmap está en
[docs/ROADMAP.md](docs/ROADMAP.md). El documento maestro del usuario conserva
la autoridad sobre alcance y criterios; esta entrega no reemplaza el MVP.

## Notas de seguridad y costo

- Proyecto local de demostración, sin información personal real.
- Health público solo expone estado y metadatos mínimos. Rutas restantes
  denegadas hasta F1; no hay login, credenciales por defecto ni RBAC terminado.
- Migraciones versionadas, zona horaria de almacenamiento UTC; interfaz Lima,
  moneda PEN. Los importes usarán DECIMAL cuando se implemente operación.
- No se activaron cargos, hosting, suscripciones ni APIs facturables.
- CI no publica el proyecto. Revisa la disponibilidad y cuota de Actions de
  tu cuenta antes de usarlo en un repositorio privado.

Referencias de compatibilidad consultadas: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html)
y [Vite](https://vite.dev/guide/). Las versiones del frontend quedan fijadas
en `package-lock.json`. Usa `npm ci` para reproducirlas después del primer clon.
