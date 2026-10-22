# Roadmap y aceptación · 0.2.0

Fuente: especificación maestra NEXUS AI v1.0. Primero F0–F3, Python desde F4.

| Fase | Estado | Salida verificable |
|---|---|---|
| F0 Fundación | Validada en CI Linux | React, Java/PostgreSQL, migraciones repetibles, build y pruebas aprobados |
| F1 Seguridad y catálogos | Núcleo implementado | Login/logout, cuatro roles, cuentas demo, productos, categorías, clientes, filtros y pruebas negativas |
| F2 Operación | Siguiente módulo | Movimientos, stock, venta atómica, concurrencia y anulación única |
| F3 Reportería | Pendiente | Indicadores/filtros coinciden con consultas SQL de control |
| F4 IA | Pendiente | FastAPI, baseline, pronóstico, MAE, advertencias y tolerancia a fallos |
| F5 Entrega | Pendiente | E2E del MVP, accesibilidad completa, hardening y caso de estudio |
| F6 Opcionales | Fuera de esta entrega | Tareas, eventos, CSV/PDF y asistente local tras estabilizar el MVP |

## RF cubiertos por F1

- RF-01: acceso con contraseña hash, sesión y cierre que invalida la cookie.
- RF-02: cuatro roles con autorización por endpoint y servicio de catálogos.
- RF-03: cuentas demo opcionales e idempotentes; secretos locales aleatorios.
- RF-06: productos con SKU único, importes no negativos, categoría y estado.
- RF-07: búsqueda, filtros, orden y páginas; filtros en la URL.
- RF-08: clientes con datos mínimos, correo opcional validado y estado.
- Base para RF-10: desactivación lógica; todavía no hay historial de ventas.

No se marca el MVP completo. La matriz general de administración de usuarios
se implementa inicialmente con alta/listado; edición de roles, desactivación
de cuentas y reinicio de contraseñas quedan pendientes. La interfaz lo indica.

## Datos de demostración

Hay 8 categorías de referencia y cuatro cuentas cuando se habilita el bootstrap.
Productos y clientes empiezan vacíos y se crean desde la interfaz. El seed
completo de 30 productos, 20 clientes y tres meses de ventas se añadirá cuando
exista F2. No se inventan indicadores ni datos de ventas para rellenar pantallas.

## Evidencias y pendientes

- F0-01 y F0-02: integración y CI inicial aprobados en el run 39738272579.
- La rama de F1 ejecuta pruebas nuevas con PostgreSQL; ver docs/VALIDACION.md.
- Compose de la aplicación sigue pendiente de ejecución manual, aunque CI usa
  PostgreSQL en contenedor real. No confundir ambas comprobaciones.
- Arranque en Windows y E2E de navegador contra backend real siguen pendientes.
- Antes de F2: revisar/integrar el PR y confirmar arranque local de la versión.

## Criterios de F2

Crear movimientos trazables, mantener stock consistente y registrar ventas en
una transacción. Dos ventas simultáneas no deben producir stock negativo.
Una anulación debe revertir existencias exactamente una vez. El precio debe
provenir del backend y no del navegador. Cada caso tendrá pruebas negativas
y de concurrencia sobre PostgreSQL, además del recorrido de interfaz.
