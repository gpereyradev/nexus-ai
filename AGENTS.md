# Guía de continuidad para NEXUS AI

- Revisa README.md, docs/ROADMAP.md y docs/VALIDACION.md antes de implementar.
- La fuente de alcance es docs/NEXUS_AI_Especificacion_Maestra.pdf.
- Stack: React + TypeScript, Java/Spring Boot y PostgreSQL. Python desde F4.
- Presupuesto externo S/0. No activar pagos, pruebas facturables ni hosting
  que requiera tarjeta. No realizar acciones externas que no solicite el usuario.
- Entrega actual: 0.2.0. F0 tiene integración Java/PostgreSQL aprobada en CI.
- F1 incorpora login/logout con sesión y CSRF, cuatro roles, catálogos y alta de usuarios.
- Próximo módulo F2: inventario trazable y ventas atómicas. No hay stock disponible, ventas, dashboard ni IA todavía.
- Consulta la evidencia y limitaciones actuales en docs/VALIDACION.md; no confundas CI Linux con arranque Windows verificado.
- Trabaja sobre el código actual; conserva cambios del usuario y evita
  reemplazar el proyecto completo para hacer una actualización pequeña.
- Nunca simules métricas, persistencia, pruebas ejecutadas o características.
- Deniega por defecto rutas nuevas hasta incorporar su autorización.
- Mantén migraciones aplicadas inmutables; agrega V3, V4, etc.
- Usa UUID, TIMESTAMPTZ/UTC y DECIMAL para importes. Interfaz es-PE, PEN, Lima.
- Ejecuta las comprobaciones pertinentes al módulo. Documenta explícitamente
  las que no puedas ejecutar y su motivo. No uses datos personales reales.
- Actualiza CHANGELOG, ROADMAP y VALIDACION después de cada entrega relevante.
- Para cambios frontend: npm run typecheck, npm test, npm run build.
- Para Java: mvn -B -f services/api-java/pom.xml test.
- Para integración: verify -Pintegration contra una BD aislada de pruebas.
