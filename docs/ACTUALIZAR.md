# Actualizar a 0.5.0

Si utilizas la [demo pública](https://nexus-ai-gpereyradev.onrender.com/),
recarga la página e ingresa con tu cuenta habitual. El selector de apariencia
está arriba a la derecha. El tema inicial es oscuro morado y negro; tu elección
se conserva en ese navegador.

Esta versión mejora la interfaz y los flujos de uso, sin nuevas migraciones.
Si vienes de 0.4.1, basta actualizar el código y reiniciar los servicios.

Desde tu copia existente revisa `git status` y guarda tus cambios de código.
No necesitas otro ZIP ni recrear la BD. `.env` permanece fuera de Git.

```bash
git switch main
git pull --ff-only
npm ci
npm run setup
```

Si vienes de una versión anterior a 0.4.0, prepara también la analítica:
Setup conserva valores existentes y añade `ANALYTICS_ENABLED`, `ANALYTICS_URL`,
`ANALYTICS_TIMEOUT_MS` y una `ANALYTICS_API_KEY` aleatoria. No publica ni imprime
la clave. Si copiaste el placeholder manualmente, elimina solo esa línea de tu
`.env` y repite setup para generar una clave; no compartas su contenido.

Detén Java y reinícialo:

```bash
npm run api
```

Si aún falta, Flyway aplica V5 para snapshots de análisis. V1–V4 siguen intactas y no se
borran usuarios, ventas ni stock. Las versiones antiguas aplican V3/V4 primero
si aún faltan. No elimines tablas ni volúmenes para actualizar.

## Activar Python sin Docker

Instala Python 3.12. En Windows/Git Bash, desde la raíz:

```bash
py -3.12 -m venv services/analytics-python/.venv
services/analytics-python/.venv/Scripts/python.exe -m pip install -r services/analytics-python/requirements.txt
npm run analytics
```

En Linux/macOS usa `python3.12 -m venv` y `.venv/bin/python`.
Mantén `npm run api`, `npm run analytics` y `npm run dev` en tres terminales.
Entra como ADMIN, MANAGER o ANALYST y abre Análisis. Usa las fechas demo para
el dataset opcional; genera 7/14 días, revisa método/MAE y abre el resultado
conservado en Análisis guardados. VIEWER no tiene acceso a analítica.

Si Python no está instalado o está detenido, ventas/inventario continúan
operando. Analítica devuelve un error recuperable. Para deshabilitarla usa
`ANALYTICS_ENABLED=false`; los snapshots anteriores siguen consultables por
roles autorizados. La generación necesita la clave coincidente en Java/Python.
El backend no permite URL arbitraria fuera de loopback/hostname `analytics`.

## Con Compose

```bash
docker compose --env-file .env -f infra/compose.yaml --profile analytics up -d --build
docker compose --env-file .env -f infra/compose.yaml logs -f api analytics
```

El perfil añade Python a la red interna sin exponer su puerto. No es obligatorio
para la operación principal. Conservar `nexus_data` mantiene los datos. La
receta Compose y el arranque Windows siguen pendientes de verificación manual.

## Qué comprobar

1. Confirmar/anular una venta mantiene saldos e historial.
2. En Análisis, generar con 84+ días y 28+ días con ventas; con pocos datos se
   muestra «Historial insuficiente» sin curva.
3. Comparar el total observado con Panel en el mismo período; comprobar MAE,
   fechas de entrenamiento/evaluación, versión y advertencias.
4. Detener Python: la generación falla de forma recuperable; se siguen abriendo
   análisis guardados y registrando ventas. Reiniciar Python permite reintentar.

Las sugerencias son orientativas, sin órdenes de compra automáticas ni garantía
de demanda. No se implementó chatbot, LLM ni API comercial.
