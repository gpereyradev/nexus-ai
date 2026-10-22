# Guía de continuidad para NEXUS AI

- Revisa README.md, docs/ROADMAP.md y docs/VALIDACION.md antes de implementar.
- La fuente de alcance es docs/NEXUS_AI_Especificacion_Maestra.pdf.
- Stack: React + TypeScript, Java/Spring Boot y PostgreSQL. Python desde F4.
- Presupuesto externo S/0. No activar pagos, pruebas facturables ni hosting
  que requiera tarjeta. No realizar acciones externas que no solicite el usuario.
- Entrega actual: 0.4.1. F0 tiene integración Java/PostgreSQL aprobada en CI.
- F1 incorpora login/logout con sesión y CSRF, cuatro roles, catálogos y alta de usuarios.
- F2/F3 incorporan stock por ledger, ventas atómicas, anulación única y reportes SQL.
- F4: FastAPI, Ridge y referencia semanal; MAE temporal, anomalías, reposición y snapshots.
- Despliegue: infra/public/Dockerfile + render.yaml (Free), PostgreSQL externo
  Neon. Leer docs/DESPLIEGUE.md. No afirmar publicado sin deploy/URL verificados.
- El perfil public conserva cookie Secure y PostgreSQL verify-full. El bypass
  TLS de CI solo es para PostgreSQL aislado. No compartir secretos ni .env.
- Demo pública: https://nexus-ai-gpereyradev.onrender.com/, servicio
  srv-dbd4fi6i0phs73enb1p0 en Guillermo's workspace. Neon flat-fire-16237279,
  branch br-late-voice-b75b3fer, base nexus. Solo datos ficticios. Actualizaciones
  manuales después de CI; la instancia no está administrada por Blueprint.
- Nunca ejecutar E2E que creen ventas o limpien tablas sobre la demo publicada.
- No hay chatbot, LLM ni servicios de IA comerciales; no presentar reglas estadísticas como aprendizaje automático.
- Próximos pendientes: usuarios, exportaciones, carga y accesibilidad.
- V1–V5 ya fueron aplicadas en CI: son inmutables. Para cambios de esquema agrega V6.
- Playwright requiere una BD aislada cuyo nombre termine en _e2e; nunca reutilices la de trabajo.
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

- Analítica solo ADMIN/MANAGER/ANALYST, por Java; Python nunca accede a PostgreSQL.
- No enviar clientes, usuarios, sesiones o credenciales en el payload de analítica.
- Python 3.12; requisitos fijados en services/analytics-python/requirements.txt.
- Para Python: python -m pytest -q services/analytics-python/tests con sus dependencias.
- Los dos bloques de evaluación participan en selección: no afirmar MAE fuera de muestra independiente de la decisión final.
- Cambios al método, reglas o dependencias numéricas requieren revisar/bump methodVersion (actual 1.0.0).
- Los snapshots de V5 son inmutables y guardan agregados de entrada, resultado y huella normalizada sin stockAsOf en el hash.
