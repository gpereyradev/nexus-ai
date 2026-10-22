# ADR-004 · Analítica local y evidencia temporal

Estado: adoptada para 0.4.0. Fecha: 22 de octubre de 2026.

Se añade un servicio FastAPI en CPU. Java conserva autorización, PostgreSQL y
operación; solo envía agregados. Una clave interna aleatoria compartida se
configura fuera de Git. Python no recibe acceso a BD ni identidad del usuario.
El navegador nunca posee la clave interna y consume únicamente `/api/v1`.
Solo ADMIN/MANAGER/ANALYST generan y consultan análisis, con CSRF en POST.

Se elige Ridge con calendario como candidato pequeño y una referencia semanal
como baseline. El método, ventanas, comparación y limitaciones se describen en
[analítica](../services/analytics-python/README.md). Los bloques cronológicos
no mezclan futuro al ajustar, pero ambos participan en decidir si retener Ridge;
no se presenta el MAE como evaluación independiente de esa decisión. Si no mejora
al menos 10% en ambos, se conserva el baseline. No se inventan intervalos de confianza.

La serie usa días completos de Lima; los ceros antes de la primera venta no
aportan antigüedad probada. Un historial insuficiente tiene estado explícito 422.
Las estimaciones financieras son orientativas; ninguna modifica stock, ventas,
usuarios o compras. Anomalías/reposición son reglas transparentes, no modelos
complejos. El sistema no observa demanda perdida ni causalidad.

La lectura agregada usa REPEATABLE READ. Su transacción termina antes del HTTP
para no retener conexión de BD durante la espera. HttpClient Java limita dos
cálculos, cancela por timeout y no sigue redirecciones. La URL viene de config,
no de solicitudes; solo acepta loopback o el hostname interno `analytics`.
Los fallos se traducen a 503 genérico sin exponer URL, clave ni body upstream.
Las ventas jamás llaman al servicio Python y health no depende de él.

V5 añade experimentos inmutables con entrada agregada, resultado, huella de fuente,
autor y fecha. Las lecturas de experimentos usan PostgreSQL y siguen disponibles
sin Python. No se guarda información de clientes en snapshots. Se conserva el
instante de stock y no se interpreta como saldo actual al abrir un análisis viejo.
No se añade limpieza automática ni borrado de evidencia; el tamaño deberá medirse
si se amplía el uso más allá del portfolio.

El perfil Compose es opcional y no expone el puerto Python al host. Los
requisitos incluyen tzdata para fechas de Lima también en Windows. Los hilos
numéricos se limitan a uno en el lanzador/contenedor para esta demostración.
Pruebas E2E arrancan Java, Python y Vite con claves efímeras y BD aislada.

Limitaciones: un único negocio, sin carga certificada, sin intervalos calibrados,
sin chatbot, sin demanda real validada por el dataset ficticio y sin afirmar
compatibilidad Windows/Compose ejecutada cuando solo se verificó CI Linux.
