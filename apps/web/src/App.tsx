import { useEffect, useState, type FormEvent } from "react";
import { login, logout, request, ApiError, type Account } from "./api/client";
import { fetchHealth, type Health } from "./api/health";
import Catalog, { type Kind } from "./components/Catalog";
import Users from "./components/Users";
const roles = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  ANALYST: "Analista",
  VIEWER: "Lector",
};
const titles: Record<string, string> = {
  home: "Tu negocio, bien organizado.",
  products: "Productos",
  customers: "Clientes",
  categories: "Categorías",
  users: "Usuarios",
};
export default function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState(window.location.search);
  const params = new URLSearchParams(query);
  const selected = params.get("view") || "home";
  const view =
    titles[selected] && !(selected === "users" && account?.role !== "ADMIN")
      ? selected
      : "home";
  useEffect(() => {
    const controller = new AbortController();
    request<Account>("/me", { signal: controller.signal })
      .then(setAccount)
      .catch((e) => {
        if (
          !controller.signal.aborted &&
          (!(e instanceof ApiError) || e.status !== 401)
        )
          setNotice(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    const expired = () => {
      setAccount(null);
      setNotice("Tu sesión terminó. Vuelve a ingresar.");
    };
    const pop = () => setQuery(window.location.search);
    window.addEventListener("nexus:session-expired", expired);
    window.addEventListener("popstate", pop);
    return () => {
      controller.abort();
      window.removeEventListener("nexus:session-expired", expired);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  function change(changes: Record<string, string>, reset = false) {
    const next = reset
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const search = next.toString();
    window.history.pushState(
      {},
      "",
      window.location.pathname + (search ? "?" + search : ""),
    );
    setQuery(window.location.search);
  }
  async function leave() {
    try {
      await logout();
      setAccount(null);
      setNotice("Sesión cerrada correctamente.");
      change({}, true);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "No se pudo cerrar la sesión. Intenta nuevamente.",
      );
    }
  }
  if (checking)
    return (
      <main className="app-loading" role="status">
        Conectando con NEXUS AI…
      </main>
    );
  if (!account)
    return (
      <Login
        notice={notice}
        onLogin={(u) => {
          setAccount(u);
          setNotice("");
        }}
      />
    );
  const canEdit = account.role === "ADMIN" || account.role === "MANAGER";
  const nav = [
    ["home", "Inicio", "◫"],
    ["products", "Productos", "▦"],
    ["customers", "Clientes", "◎"],
    ["categories", "Categorías", "▤"],
    ...(account.role === "ADMIN" ? [["users", "Usuarios", "◇"]] : []),
  ];
  return (
    <div className="layout">
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <span className="workspace-icon">
            {account.displayName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            {account.displayName}
            <small>{roles[account.role]}</small>
          </div>
        </div>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          {nav.map(([id, title, icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => change({ view: id }, true)}
            >
              <span aria-hidden="true">{icon}</span>
              {title}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-dot" /> DEMOSTRACIÓN LOCAL
          <p>
            Datos ordenados.
            <br />
            Decisiones con base.
          </p>
          <small>v0.2.0 · Seguridad y catálogos</small>
        </div>
        <button className="logout-button" onClick={() => void leave()}>
          Cerrar sesión ↗
        </button>
        <footer className="sidebar-footer">
          Ingeniería de Software con IA
        </footer>
      </aside>
      <div className="content">
        <header className="topbar">
          <span>
            NEXUS AI <span className="slash">/</span>
            <strong>{view === "home" ? "Inicio" : titles[view]}</strong>
          </span>
          <span className="local-label">
            {roles[account.role]} · PEN · LIMA
          </span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">GESTIÓN EMPRESARIAL / FASE 01</p>
              <h1>{titles[view]}</h1>
              <p className="subtitle">
                {view === "home"
                  ? `Bienvenido, ${account.displayName}.`
                  : "Información persistida en PostgreSQL y permisos comprobados por la API."}
              </p>
            </div>
            <span className="version">v0.2.0</span>
          </div>
          {notice && (
            <p className="connection-message" role="status">
              {notice}
            </p>
          )}
          {view === "home" ? (
            <Home navigate={(id) => change({ view: id }, true)} />
          ) : view === "users" ? (
            <Users />
          ) : (
            <Catalog
              key={view}
              kind={view as Kind}
              canEdit={canEdit}
              params={params}
              onParams={(changes) => change(changes)}
            />
          )}
          <footer className="page-footer">
            <span>NEXUS AI · Guillermo Pereyra</span>
            <span>Demostración local · Sin cobros reales</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Brand() {
  return (
    <a className="brand" href="#main" aria-label="Nexus AI">
      <span className="brand-mark">N</span>
      <span>
        NEXUS<span className="brand-ai"> AI</span>
        <small>BUSINESS WORKSPACE</small>
      </span>
    </a>
  );
}
function Login({
  notice,
  onLogin,
}: {
  notice: string;
  onLogin: (u: Account) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [environment, setEnvironment] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(email.trim(), password));
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ingresar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">NEXUS AI / BUSINESS WORKSPACE</p>
          <h1>
            Todo en su lugar.
            <br />
            Desde el primer día.
          </h1>
          <p>
            Productos, categorías y clientes conectados en un solo espacio, con
            acceso según tu rol.
          </p>
          <div className="login-tags">
            <span>React + TypeScript</span>
            <span>Java + Spring Boot</span>
            <span>PostgreSQL</span>
          </div>
        </div>
        <small>Guillermo Pereyra · Ingeniería de Software con IA</small>
      </section>
      <main id="main" className="login-main">
        <div className="login-card">
          <p className="eyebrow">BIENVENIDO A NEXUS</p>
          <h2>Entra a tu espacio</h2>
          <p className="subtitle">
            Usa una cuenta local creada para esta demostración.
          </p>
          {notice && (
            <p className="connection-message" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={(e) => void submit(e)} className="editor-form">
            <fieldset disabled={busy}>
              <label>
                Correo
                <input
                  type="email"
                  required
                  autoComplete="username"
                  maxLength={254}
                  placeholder="admin@nexus.demo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p className="connection-message" role="alert">
                  {error}
                </p>
              )}
              <button className="action login-submit" type="submit">
                {busy ? "Ingresando…" : "Ingresar al espacio ↗"}
              </button>
            </fieldset>
          </form>
          <details className="demo-help">
            <summary>¿Cómo obtengo una cuenta de demostración?</summary>
            <p>
              Después de configurar e iniciar Java, ejecuta{" "}
              <code>npm run accounts</code> en tu equipo para consultar tus
              credenciales locales. No las publiques.
            </p>
          </details>
          <button
            className="text-button"
            onClick={() => setEnvironment((x) => !x)}
          >
            {environment
              ? "Ocultar estado del entorno"
              : "Comprobar estado del entorno"}
          </button>
          {environment && <Environment />}
          <p className="login-footnote">
            v0.2.0 · Entorno local · Datos ficticios
          </p>
        </div>
      </main>
    </div>
  );
}
function Home({ navigate }: { navigate: (id: string) => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">F1 · SEGURIDAD Y CATÁLOGOS</span>
          <h2>
            Una base ordenada
            <br />
            para lo que viene.
          </h2>
          <p>
            Empieza con tus productos y clientes. Cada cambio se valida y se
            guarda en la base de datos.
          </p>
          <button className="action" onClick={() => navigate("products")}>
            Explorar productos ↗
          </button>
        </div>
        <div className="architecture">
          <div>
            <span>01</span> Usuarios y permisos <b>ACCESO</b>
          </div>
          <i aria-hidden="true">↓</i>
          <div>
            <span>02</span> Productos y categorías <b>CATÁLOGO</b>
          </div>
          <i aria-hidden="true">↓</i>
          <div>
            <span>03</span> Clientes <b>RELACIÓN</b>
          </div>
        </div>
      </section>
      <div className="bottom-grid">
        <section className="panel">
          <p className="eyebrow">CONEXIÓN DEL SISTEMA</p>
          <h2>Estado del entorno</h2>
          <Environment />
        </section>
        <section className="panel next-panel">
          <p className="eyebrow">SIGUIENTE FASE</p>
          <span className="phase-number">02</span>
          <h2>Inventario y ventas</h2>
          <p>
            El próximo módulo incorporará movimientos trazables, ventas y
            anulaciones. Aún no está implementado.
          </p>
          <ul>
            <li>Control de existencias</li>
            <li>Ventas en una transacción</li>
            <li>Protección ante operaciones simultáneas</li>
          </ul>
        </section>
      </div>
    </>
  );
}
function Environment() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let active = true;
    setLoading(true);
    setError("");
    setHealth(null);
    fetchHealth(controller.signal)
      .then((value) => {
        if (active) setHealth(value);
      })
      .catch((e) => {
        if (active)
          setError(
            controller.signal.aborted
              ? "No se pudo verificar la conexión. Comprueba Java y PostgreSQL."
              : e.message,
          );
      })
      .finally(() => {
        if (active) setLoading(false);
        clearTimeout(timer);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);
  return (
    <div className="environment">
      <p
        role="status"
        className={`connection-message ${health ? "success" : ""}`}
      >
        {loading
          ? "Comprobando servicios…"
          : health
            ? `API ${health.version} y PostgreSQL conectados. Moneda PEN · Hora de referencia Lima.`
            : error}
      </p>
      <button
        className="secondary"
        disabled={loading}
        onClick={() => setAttempt((x) => x + 1)}
      >
        Comprobar conexión
      </button>
    </div>
  );
}
