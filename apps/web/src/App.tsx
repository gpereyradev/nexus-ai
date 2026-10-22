import { useEffect, useRef, useState } from "react";
import { fetchHealth, type Health } from "./api/health";

const phases = [
  [
    "F0",
    "Fundación",
    "Entorno, conexiones, migraciones y validación continua.",
  ],
  [
    "F1",
    "Seguridad y catálogos",
    "Login, cuatro roles, productos, categorías y clientes.",
  ],
  [
    "F2",
    "Operación central",
    "Inventario trazable, ventas atómicas y anulaciones.",
  ],
  ["F3", "Reportería", "Indicadores y gráficos calculados desde PostgreSQL."],
  [
    "F4",
    "Inteligencia aplicada",
    "Python, pronóstico, baseline y evaluación con MAE.",
  ],
  [
    "F5",
    "Entrega de portafolio",
    "Pruebas completas, accesibilidad y recorrido de producto.",
  ],
];
type Connection = {
  state: "loading" | "offline" | "online";
  health?: Health;
  error?: string;
};
export default function App() {
  const [view, setView] = useState<"environment" | "roadmap">("environment");
  const [connection, setConnection] = useState<Connection>({
    state: "loading",
  });
  const activeRequest = useRef<AbortController | null>(null);
  async function refresh() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setConnection({ state: "loading" });
    const timeout = setTimeout(() => controller.abort("timeout"), 8000);
    try {
      const health = await fetchHealth(controller.signal);
      if (activeRequest.current === controller)
        setConnection({ state: "online", health });
    } catch (error) {
      if (activeRequest.current !== controller) return;
      setConnection({
        state: "offline",
        error: controller.signal.aborted
          ? "La consulta superó 8 segundos. Revisa el backend y vuelve a comprobar."
          : error instanceof Error && !error.message.includes("fetch")
            ? error.message
            : "No se pudo conectar con Java. Inicia la base de datos y ejecuta npm run api.",
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, []);
  const online = connection.state === "online";
  return (
    <div className="layout">
      <aside className="sidebar">
        <a
          className="brand"
          href="#main"
          aria-label="Nexus AI, ir al contenido"
        >
          <span className="brand-mark">N</span>
          <span>
            NEXUS<span className="brand-ai"> AI</span>
            <small>BUSINESS WORKSPACE</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">GP</span>
          <div>
            Guillermo Pereyra<small>Proyecto de portafolio</small>
          </div>
        </div>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          <button
            className={view === "environment" ? "active" : ""}
            onClick={() => setView("environment")}
            aria-current={view === "environment" ? "page" : undefined}
          >
            <span aria-hidden="true">◫</span> Entorno del proyecto
          </button>
          <button
            className={view === "roadmap" ? "active" : ""}
            onClick={() => setView("roadmap")}
            aria-current={view === "roadmap" ? "page" : undefined}
          >
            <span aria-hidden="true">↗</span> Plan de trabajo
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="small-dot" /> DESARROLLO LOCAL
          <p>
            Una base sólida.
            <br />
            Un módulo a la vez.
          </p>
          <small>v0.1.0 · Fundación</small>
        </div>
        <footer className="sidebar-footer">
          Ingeniería de Software con IA
        </footer>
      </aside>
      <div className="content">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>{view === "environment" ? "Entorno" : "Roadmap"}</strong>
          </span>
          <span className="local-label">
            <span className="small-dot" /> LOCAL · PEN · LIMA
          </span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">NEXUS AI / FASE 00</p>
              <h1>
                {view === "environment"
                  ? "Todo empieza con una buena base."
                  : "Del primer commit al producto."}
              </h1>
              <p className="subtitle">
                {view === "environment"
                  ? "Comprueba tu entorno y prepara el siguiente paso del proyecto."
                  : "Cada fase tiene una salida verificable antes de avanzar."}
              </p>
            </div>
            <span className="version">v0.1.0</span>
          </div>
          {view === "environment" ? (
            <>
              <section className="hero" aria-labelledby="foundation-title">
                <div className="hero-copy">
                  <span className="pill">F0 · FUNDACIÓN</span>
                  <h2 id="foundation-title">
                    Conectar hoy.
                    <br />
                    Construir sobre seguro.
                  </h2>
                  <p>
                    La estructura está lista. El primer objetivo es conectar
                    React, Java y PostgreSQL en tu equipo.
                  </p>
                  <a href="#startup" className="primary-link">
                    Ver guía de arranque <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div
                  className="architecture"
                  aria-label="Arquitectura: React consume Java, Java se conecta a PostgreSQL. Python se añadirá en F4."
                >
                  <div>
                    <span>01</span> React + TypeScript <b>WEB</b>
                  </div>
                  <i aria-hidden="true">↓ API REST</i>
                  <div>
                    <span>02</span> Java + Spring Boot <b>API</b>
                  </div>
                  <i aria-hidden="true">↓ PERSISTENCIA</i>
                  <div>
                    <span>03</span> PostgreSQL <b>DATA</b>
                  </div>
                  <p>+ Python / analítica · F4</p>
                </div>
              </section>
              <section aria-labelledby="services-title">
                <div className="section-heading">
                  <div>
                    <h2 id="services-title">Estado de los servicios</h2>
                    <p>
                      Las conexiones se consultan al backend; no hay indicadores
                      simulados.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => void refresh()}
                    disabled={connection.state === "loading"}
                  >
                    {connection.state === "loading"
                      ? "Comprobando…"
                      : "↻ Comprobar"}
                  </button>
                </div>
                <div className="services">
                  <Service
                    letter="R"
                    name="Frontend"
                    tech="React + TypeScript"
                    status="En ejecución"
                    ok
                  />
                  <Service
                    letter="J"
                    name="API principal"
                    tech="Java · Spring Boot"
                    status={
                      connection.state === "loading"
                        ? "Comprobando"
                        : online
                          ? "Conectada"
                          : "Sin conexión"
                    }
                    ok={online}
                  />
                  <Service
                    letter="P"
                    name="Base de datos"
                    tech="PostgreSQL · Flyway"
                    status={
                      connection.state === "loading"
                        ? "Comprobando"
                        : online
                          ? "Verificada por Java"
                          : "No comprobada"
                    }
                    ok={online}
                  />
                </div>
                <div
                  className={`connection-message ${online ? "success" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {connection.state === "loading"
                    ? "Consultando /api/v1/health…"
                    : online
                      ? `API ${connection.health?.version} y base de datos disponibles. Última comprobación: ${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(connection.health!.checkedAt))} (Lima).`
                      : connection.error}
                </div>
              </section>
              <div className="bottom-grid">
                <section id="startup" className="panel">
                  <p className="eyebrow">PRIMER ARRANQUE</p>
                  <h2>Tu entorno en tres pasos</h2>
                  <ol className="steps">
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Instala y configura</strong>
                        <code>npm install</code>
                        <code>npm run setup</code>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Inicia PostgreSQL y Java</strong>
                        <p>
                          Sigue README.md para elegir Docker o instalación
                          manual.
                        </p>
                        <code>npm run api</code>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Abre el frontend</strong>
                        <code>npm run dev</code>
                        <p>Vuelve a comprobar la conexión en esta pantalla.</p>
                      </div>
                    </li>
                  </ol>
                </section>
                <section className="panel next-panel">
                  <p className="eyebrow">SIGUIENTE OBJETIVO</p>
                  <span className="phase-number">01</span>
                  <h2>Seguridad y catálogos</h2>
                  <p>
                    Implementaremos autenticación, permisos y los primeros datos
                    del negocio.
                  </p>
                  <ul>
                    <li>Usuarios y cuatro roles</li>
                    <li>Productos y categorías</li>
                    <li>Clientes con validación</li>
                  </ul>
                  <button
                    className="text-button"
                    onClick={() => setView("roadmap")}
                  >
                    Explorar el plan de trabajo ↗
                  </button>
                </section>
              </div>
            </>
          ) : (
            <section className="roadmap" aria-label="Fases del proyecto">
              {phases.map(([code, title, description], i) => (
                <article className="phase-card" key={code}>
                  <span className="phase-code">{code}</span>
                  <div>
                    <span className="phase-label">
                      {i === 0 ? "EN VALIDACIÓN LOCAL" : "PENDIENTE"}
                    </span>
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                  <span className="phase-order">0{i}</span>
                </article>
              ))}
              <p className="scope-note">
                Ventas, login, dashboard e IA todavía no están implementados en
                esta entrega. Consulta docs/ROADMAP.md para los criterios de
                aceptación.
              </p>
            </section>
          )}
          <footer className="page-footer">
            <span>NEXUS AI · Guillermo Pereyra</span>
            <span>Datos ficticios · Sin servicios de pago</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Service({
  letter,
  name,
  tech,
  status,
  ok,
}: {
  letter: string;
  name: string;
  tech: string;
  status: string;
  ok: boolean;
}) {
  return (
    <article className="service">
      <span className="service-letter">{letter}</span>
      <h3>{name}</h3>
      <p>{tech}</p>
      <span className={`service-status ${ok ? "is-up" : ""}`}>
        <span className="small-dot" />
        {status}
      </span>
    </article>
  );
}
