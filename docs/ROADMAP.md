# Roadmap y aceptación · 0.3.0

Fuente: especificación maestra NEXUS AI v1.0. Primero F0–F3, Python desde F4.

| Fase | Estado | Salida verificable |
|---|---|---|
| F0 Fundación | Validada en CI Linux | React, Java/PostgreSQL, migraciones, build y pruebas |
| F1 Seguridad y catálogos | Núcleo validado | Sesiones/CSRF, cuatro roles, cuentas demo y catálogos |
| F2 Operación | Implementada | Stock trazable, venta atómica, concurrencia, reintento idempotente y anulación única |
| F3 Reportería | Implementada | Indicadores, fechas Lima, evolución, categorías y top 5 desde SQL |
| F4 IA | Siguiente | FastAPI, baseline, pronóstico, MAE y tolerancia a fallos |
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

- F4: Python y pronósticos; no hay funciones de IA disponibles todavía.
- Administración de usuarios: editar roles, desactivar cuentas y recuperar
  contraseñas, con invalidación o actualización de sesiones afectadas.
- Windows/Git Bash y Compose local: ejecución manual pendiente.
- Carga, auditoría exhaustiva y accesibilidad completa. La existencia de E2E
  de Chromium no sustituye esas verificaciones.

Evidencia ejecutada: [VALIDACION.md](VALIDACION.md).
