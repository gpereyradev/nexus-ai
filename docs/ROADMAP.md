# Roadmap y aceptación · 0.5.0

Fuente: especificación maestra NEXUS AI v1.0. Primero F0–F3, Python desde F4.

| Fase | Estado | Salida verificable |
|---|---|---|
| F0 Fundación | Validada en CI Linux | React, Java/PostgreSQL, migraciones, build y pruebas |
| F1 Seguridad y catálogos | Núcleo validado | Sesiones/CSRF, cuatro roles, cuentas demo y catálogos |
| F2 Operación | Implementada | Stock trazable, venta atómica, concurrencia, reintento idempotente y anulación única |
| F3 Reportería | Implementada | Indicadores, fechas Lima, evolución, categorías y top 5 desde SQL |
| F4 Analítica | Implementada | FastAPI, referencia semanal/Ridge, MAE temporal, reglas y snapshots reproducibles |
| F5 Entrega | Parcial | E2E principal disponible; faltan carga, auditoría completa y caso de estudio |
| F6 Opcionales | Fuera de esta entrega | Tareas, eventos, CSV/PDF y asistente local |

## Criterios de operación

- El saldo deriva del historial; ingresos, ajustes, ventas y reversiones no se
  editan ni eliminan. Cada movimiento guarda motivo, autor y saldos.
- Una venta confirma todas sus líneas o ninguna; toma precios del catálogo y
  no acepta totales del cliente como autoridad. Conserva snapshots históricos.
- Dos ventas simultáneas no generan stock negativo. Los productos se bloquean
  por UUID ordenado; el límite de espera devuelve conflicto recuperable.
- Clave de solicitud por usuario para ventas y ajustes: repetir el mismo
  contenido devuelve el registro anterior; cambiarlo con la misma clave da 409.
- Solo ADMIN anula. Reintentos o anulaciones simultáneas no duplican devolución.
- ADMIN/MANAGER operan; ANALYST/VIEWER consultan. CSRF en escrituras.

## Criterios de reportes

- Ventas confirmadas y ticket promedio, unidades y días vacíos explícitos.
- Filtro inclusivo de fechas locales en Lima, máximo 366 días.
- Totales diarios y por categoría suman el total independiente de SQL.
- Anulaciones excluidas; detalle histórico retenido. Stock bajo refleja el
  presente de productos activos y no el cierre histórico del período.
- Dataset opcional de 30 productos, 20 clientes, 226 ventas (113 días),
  452 líneas y 485 movimientos. Identificado como ficticio, con carga única.

## Pendientes reales

- No hay chatbot ni LLM. La IA disponible es la regresión clásica, con baseline conservador.
- Administración de usuarios: editar roles, desactivar cuentas y recuperar
  contraseñas, con invalidación o actualización de sesiones afectadas.
- Windows/Git Bash y Compose local: ejecución manual pendiente.
- Carga, auditoría exhaustiva y accesibilidad completa. La existencia de E2E
  de Chromium no sustituye esas verificaciones.

Evidencia ejecutada: [VALIDACION.md](VALIDACION.md).

## Despliegue de portafolio

- Imagen única y Blueprint gratuito preparados: [DESPLIEGUE.md](DESPLIEGUE.md).
- Verificar la imagen construida, HTTPS, sesión Secure, roles y persistencia.
- Publicación realizada y comprobada el 22/10/2026 en Render Free + Neon Free:
  https://nexus-ai-gpereyradev.onrender.com/. Evidencia en VALIDACION.md.
- La instancia publicada requiere deploy manual después de aprobar CI; el
  Blueprint conserva la alternativa con proveedor Git conectado.
- Mantener S/0: sin tarjetas, pruebas facturables ni ampliaciones automáticas.

## Criterios de F4

- Java agrega ventas confirmadas por fecha de Lima y unidades por producto; no
  comparte datos de clientes, usuarios, sesiones o conexión. Python no accede a BD.
- Solo se usan días completos. Ventanas de 1–366 días; pronóstico 1–14. No se
  fabrica historia a partir de ceros previos a la primera venta observada.
- Mínimo 84 días y 28 con ventas. Baseline semanal frente a Ridge; mejora mínima
  10% en selección y confirmación, ambos bloques participan en la decisión.
- Fecha de generación, método/versión, períodos, MAE y advertencias visibles.
  Sin intervalos de confianza ficticios ni garantía de demanda.
- Reglas de anomalía y reposición explícitas, sin mutaciones automáticas.
- Experimentos con snapshots inmutables y huella de datos. Consulta de últimos
  10 y detalle por UUID sin recalcular ni depender de Python.
- Timeout recuperable; pruebas de venta real después de un fallo de analítica.

## Usabilidad · 0.5.0

- Temas claro/oscuro completos, oscuro morado y negro inicial, preferencia local.
- Acciones frecuentes desde el panel, fechas rápidas y filtros reversibles.
- Menú móvil compacto, navegación por teclado y formularios enfocados.
- Venta con selección visible, cantidades y cliente opcional desplegable.
- La revisión visual y E2E no sustituyen la auditoría completa de accesibilidad pendiente.
