# Analítica local · 0.4.0 · método 1.0.0

Python 3.12, FastAPI y scikit-learn. Funciona en CPU, sin GPU, LLM ni API
comercial. `requirements.txt` fija el entorno de ejecución y pruebas.

Desde la raíz configura `.venv`, instala los requisitos, ejecuta `npm run setup`
y `npm run analytics`. Consulta el README principal para Windows/Linux y Compose.
La clave `ANALYTICS_API_KEY` debe tener al menos 32 caracteres y no ser un
placeholder. El servicio rechaza arrancar si falta. No imprime esa clave ni
habilita logs de acceso. Bind local por defecto: `127.0.0.1:8001`.

## Frontera de datos

Java autoriza al usuario, agrega PostgreSQL y llama a `POST /v1/forecast` con
`X-Analytics-Key`. Se recibe una serie diaria consecutiva, horizonte, productos
con stock/unidades agregadas, ventana de demanda y marcador demo. No hay
usuarios, correos, clientes, cookies, contraseñas ni conexiones en el payload.
No se hace acceso a red o BD desde el cálculo. `GET /health` es público y mínimo;
Swagger/OpenAPI interactivo y CORS están deshabilitados en este servicio interno.

## Pronóstico

Métrica: importe diario de ventas confirmadas en PEN, según días de Lima.
Java completa los huecos con cero y excluye anulaciones. Python elimina ceros
anteriores a la primera venta: no son prueba de historia disponible. Requiere
84 días restantes y 28 con ventas; de lo contrario responde 422, sin predicciones.

- `seasonal_naive_v1`: repite los últimos siete días, también para horizonte 14.
- `ridge_calendar_v1`: regresión Ridge alpha=1, índice temporal y seis indicadores
  de día de semana, con StandardScaler ajustado solo sobre el pasado disponible.
  La salida se limita numéricamente a [0, 10^18] PEN; no se infieren efectos causales.

Los últimos 28 días se dividen en dos bloques consecutivos de 14. Primero se
ajusta con los días anteriores a ambos bloques y se evalúa el primero. Después
se reajusta incluyendo ese primer bloque y se evalúa el segundo. Cada bloque
se pronostica completo desde su corte, sin actualizar con valores futuros de
ese mismo bloque. Ridge se conserva solo si mejora MAE al menos 10% frente al
baseline **en ambos**; empate o baseline perfecto conservan la referencia.

MAE = media de |observado − estimado|. Los dos bloques se usan para decidir si
conservar Ridge: no constituyen una evaluación independiente posterior a dicha
decisión. No se muestra MAPE ante ceros ni intervalos de confianza sin calibrar.
Tras decidir se ajusta de nuevo con todo el historial para predecir los días
inmediatamente posteriores al cierre elegido. Una fecha antigua genera una
estimación a partir de ese cierre, con advertencia; no avanza a hoy.

## Alertas y reposición

Desde el día 29 se compara cada venta diaria con la mediana de los 28 días
anteriores. Se marca si el desvío absoluto supera:

`max(3.5 × 1.4826 × MAD, 0.20 × |mediana|, S/1)`.

MAD es la mediana de desviaciones absolutas. Se muestran hasta diez alertas
recientes. Son reglas estadísticas, pueden producir falsos positivos y no
explican el origen de un cambio.

Para cada producto: promedio = unidades confirmadas / días de ventana (últimos
28 del período, o los disponibles). Cobertura = stock actual / promedio; si
el promedio es cero la cobertura es nula, no infinita ni inventada. Objetivo =
ceil(promedio × 14); sugerencia = max(0, objetivo − stock). Se incluyen faltantes
y productos bajo mínimo, ordenados por sugerencia, stock y SKU, hasta diez.
Java envía un máximo de 1000 productos activos priorizados por stock bajo y SKU;
se advierte si el universo es mayor. No se conocen plazos de proveedor, demanda
perdida, agotamientos ni promociones. No se registran órdenes ni movimientos.

## Evidencia y persistencia

Java termina su transacción de lectura antes de esperar a Python. Usa timeout
por defecto de ocho segundos, cancela la solicitud y permite hasta dos cálculos
concurrentes. No reintenta automáticamente. Si Python falla devuelve 503 y las
ventas siguen funcionando, pues no invocan analítica.

Solo los resultados correctos se guardan en `analytics_runs` (V5), junto con los
agregados originales, huella SHA-256, autor y fecha. La huella omite el instante
variable `stockAsOf`, sustituyéndolo por epoch para comparar datos iguales.
El resultado conserva el instante real. Los registros no se editan ni eliminan
mediante la aplicación. Abrirlos no recalcula ni solicita Python. Para reproducir
un experimento se usa su `input_snapshot`, el método/versión correspondiente y
las dependencias fijadas en ese commit; los datos operativos actuales pueden
haber cambiado. No implica almacenar un artefacto de modelo entrenado reutilizable.

Pruebas: `python -m pytest -q services/analytics-python/tests` desde la raíz con
el entorno preparado. Cubren estacionalidad, tendencia, ausencia de fuga del
holdout, datos escasos, cálculos, auth y validación sin reflejar datos recibidos.
