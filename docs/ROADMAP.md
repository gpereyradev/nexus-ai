# Roadmap y aceptación

Fuente: especificación maestra NEXUS AI v1.0 entregada por el usuario.
Primero F0–F3; Python se añade en F4. Las fases siguientes no están terminadas.

| Fase | Estado en 0.1.0 | Criterio de cierre |
|---|---|---|
| F0 Fundación | Base creada; validación integral pendiente | React visible, Java conectado a PostgreSQL, migraciones repetibles y CI verde |
| F1 Seguridad y catálogos | Pendiente | RF-01/02/03/06/07/08: login/logout, cuatro roles autorizados en API, CRUD de productos/categorías/clientes y pruebas negativas |
| F2 Operación | Pendiente | RF-11/12/13/14/15: movimientos trazables, ventas atómicas, concurrencia sin stock negativo y anulación única |
| F3 Reportería | Pendiente | RF-18/19/20: dashboard y filtros coinciden con consultas SQL de control |
| F4 IA | Pendiente | RF-23/24/25: FastAPI, baseline, pronóstico, MAE, advertencias y tolerancia a caídas |
| F5 Entrega | Pendiente | E2E, accesibilidad, revisión de seguridad, documentación y demo verificable |
| F6 Opcionales | Fuera de esta entrega | Solo tras estabilizar F0–F5: tareas, eventos, CSV/PDF y asistente local |

El seed completo exigido por el documento (4 usuarios, 30 productos, 8 categorías,
20 clientes y 3 meses de ventas) se construirá progresivamente con los módulos
que soporten esos datos. F0 solo instala roles y categorías; no hay usuarios.

## Incidencias abiertas

| ID | Prioridad | Reproducción / impacto | Criterio de cierre |
|---|---|---|---|
| F0-01 | Alta | Arranque Java y PostgreSQL no validado aún en esta entrega | Ejecutar verify -Pintegration en BD aislada y comprobar health en equipo local |
| F0-02 | Alta | Workflow incluido, sin ejecución en cuenta GitHub | Primer push y ambos jobs verdes sin cargos |
| F0-03 | Media | Compose no se pudo ejecutar en el entorno de preparación | Build y arranque en máquina compatible, health devuelve 200 |

No se adjudican RF de negocio completos a esta fundación. Se establecen bases
de RNF-06 (mantenibilidad) y RNF-07 (salud), con validación pendiente donde se
indica. No se acredita aún RBAC, autenticación, recuperación ni rendimiento.

Cada módulo entregará código, migraciones, pruebas pertinentes, instrucciones,
evidencia visual, cambios y límites. Una pantalla con botones sin implementación
no cuenta como funcionalidad terminada.
