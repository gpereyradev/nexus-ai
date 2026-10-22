# ADR-003 · Inventario trazable, ventas y reportes

Estado: adoptada para 0.3.0. Fecha: 22 de octubre de 2026.

El stock es la suma de un ledger inmutable; no se mantiene un segundo contador.
Una vista de PostgreSQL expone saldos para listados y alertas. Un trigger de
inserción bloquea el producto y comprueba que el saldo anterior coincida con
la suma persistida y que el saldo posterior sea consistente y no negativo.
Triggers adicionales impiden editar o borrar movimientos y líneas históricas.
No sustituyen una política de privilegios para administradores de PostgreSQL,
que pueden alterar el esquema; la cuenta de aplicación posee la BD local.

Cada venta corre en una sola transacción JDBC. Bloquea productos por UUID en
orden estable para limitar deadlocks, comprueba actividad y existencias y
lee precios/costos del servidor. Graba cabecera, snapshots de líneas y salidas
de stock; un fallo revierte todo. `DECIMAL(12,2)` y `BigDecimal` mantienen
exactitud. Los códigos usan secuencia, por lo que puede haber huecos tras rollback.

Las solicitudes de creación incluyen UUID `requestKey`. La pareja usuario/clave
es única; el fingerprint de una venta ordena líneas e incluye cliente/cantidades.
Una repetición idéntica retorna el resultado previo (200 frente a 201 inicial).
Reutilizar clave con otro contenido devuelve 409. React conserva la clave ante
un fallo de red mientras el contenido del formulario no cambie. No reproduce
escrituras automáticamente. Si se cierra el formulario tras un resultado
incierto, el usuario debe consultar ventas antes de volver a crearla.

La anulación bloquea la cabecera y después los productos en el mismo orden.
Una venta ya anulada retorna su estado previo. La devolución se registra como
REVERSAL y la cabecera conserva autor/motivo/fecha; se admite devolver stock de
productos desactivados. ADMIN es el único rol que puede anular.

Los reportes leen bajo REPEATABLE READ para que las secciones de una respuesta
vean el mismo estado. Usan fechas inclusivas de America/Lima, solo CONFIRMED,
y muestran días sin ventas como cero. La clasificación por categoría usa el
snapshot de la venta; el ranking usa el nombre vigente del producto. Stock bajo
consulta productos activos actuales. No se presenta como inventario histórico.

Un ApplicationRunner opcional carga el dataset ficticio después de las cuentas.
Un marcador transaccional garantiza carga única incluso con arranques simultáneos.
Las fechas son fijas para reproducibilidad; el botón de período demo permite
consultarlas cuando hayan quedado fuera de los últimos 30 días. La carga no
sobrescribe datos y un conflicto revierte el seed entero. No es una migración
obligatoria de negocio ni un generador de métricas falsas en el navegador.

CI separa integración y E2E en bases efímeras. Playwright arranca API y Vite en
puertos exclusivos, usa cuentas de fixture y requiere el sufijo `_e2e` en BD.
No reutiliza servidores ni exporta capturas, vídeos o trazas con sesiones.

Limitación: sumar el ledger y consultas agregadas en tiempo real es apropiado
para la demostración. Antes de escalar se medirán índices, volumen y carga;
no se prometen rendimiento o disponibilidad de producción sin esas pruebas.
