import { useEffect, useState, type FormEvent } from "react";
import { login, logout, request, ApiError, type Account } from "./api/client";
import { fetchHealth, type Health } from "./api/health";
import Catalog, { type Kind } from "./components/Catalog";
import Users from "./components/Users";
import Inventory from "./components/Inventory";
import Sales from "./components/Sales";
import Dashboard from "./components/Dashboard";
import Analytics from "./components/Analytics";
import Modal from "./components/Modal";
import Icon from "./components/Icon";
import ThemeToggle from "./components/ThemeToggle";
const roles = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  ANALYST: "Analista",
  VIEWER: "Lector",
};
const publicDeployment = import.meta.env.VITE_DEPLOYMENT_MODE === "public";
const deploymentLabel = publicDeployment
  ? "Demostración web"
  : "Demostración local";
const titles: Record<string, string> = {
  home: "Tu negocio, bien organizado.",
  products: "Productos",
  customers: "Clientes",
  categories: "Categorías",
  users: "Usuarios",
  inventory: "Inventario",
  sales: "Ventas",
  analytics: "Análisis y pronósticos",
};
const descriptions: Record<string, string> = {
  products: "Administra tu catálogo y mantén los precios al día.",
  customers: "Ten a mano los datos de tus clientes.",
  categories: "Organiza tus productos para encontrarlos más rápido.",
  inventory: "Consulta existencias y revisa cada movimiento.",
  sales: "Registra una venta o encuentra su detalle.",
  analytics: "Convierte tu historial de ventas en información útil.",
  users: "Gestiona el acceso a tu espacio de trabajo.",
};
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState(window.location.search);
  const params = new URLSearchParams(query);
  const selected = params.get("view") || "home";
  const view =
    titles[selected] &&
    !(selected === "users" && account?.role !== "ADMIN") &&
    !(selected === "analytics" && account?.role === "VIEWER")
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
    const pop = () => {
      setQuery(window.location.search);
      setMenuOpen(false);
    };
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
    setMenuOpen(false);
    if (reset) window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function leave() {
    try {
      await logout();
      setAccount(null);
      setMenuOpen(false);
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
    ["home", "Panel"],
    ["sales", "Ventas"],
    ["inventory", "Inventario"],
    ...(account.role !== "VIEWER" ? [["analytics", "Análisis"]] : []),
    ["products", "Productos"],
    ["customers", "Clientes"],
    ["categories", "Categorías"],
    ...(account.role === "ADMIN" ? [["users", "Usuarios"]] : []),
  ];
  const navigation = (label: string) => (
    <nav aria-label={label}>
      {nav.map(([id, title]) => (
        <button
          key={id}
          className={view === id ? "active" : ""}
          aria-current={view === id ? "page" : undefined}
          onClick={() => change({ view: id }, true)}
        >
          <Icon name={id} />
          {title}
          {view === id && <span className="nav-current" aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
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
        {navigation("Navegación principal")}
        <div className="sidebar-note">
          <span className="small-dot" /> {deploymentLabel.toUpperCase()}
          <p>
            Datos ordenados.
            <br />
            Decisiones con base.
          </p>
          <small>v0.5.0 · Gestión y analítica</small>
        </div>
        <button className="logout-button" onClick={() => void leave()}>
          <Icon name="logout" /> Cerrar sesión
        </button>
        <footer className="sidebar-footer">
          Ingeniería de Software con IA
        </footer>
      </aside>
      {menuOpen && (
        <Modal title="Menú de navegación" onClose={() => setMenuOpen(false)}>
          <div className="mobile-account">
            <strong>{account.displayName}</strong>
            <small>{roles[account.role]}</small>
          </div>
          {navigation("Navegación móvil")}
          <button
            className="secondary mobile-logout"
            onClick={() => void leave()}
          >
            <Icon name="logout" />
            Cerrar sesión
          </button>
        </Modal>
      )}
      <div className="content">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="menu-toggle secondary"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span>
              NEXUS AI <span className="slash">/</span>
              <strong>{view === "home" ? "Inicio" : titles[view]}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="local-label">PEN · LIMA</span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">TU ESPACIO DE TRABAJO</p>
              <h1>{titles[view]}</h1>
              <p className="subtitle">
                {view === "home"
                  ? `Bienvenido, ${account.displayName}.`
                  : descriptions[view]}
              </p>
            </div>
          </div>
          {notice && (
            <p className="connection-message" role="status">
              {notice}
            </p>
          )}
          {view === "home" ? (
            <Dashboard
              canEdit={canEdit}
              canAnalyze={account.role !== "VIEWER"}
              navigate={(id, filters = {}) =>
                change({ view: id, ...filters }, true)
              }
            />
          ) : view === "analytics" ? (
            <Analytics />
          ) : view === "inventory" ? (
            <Inventory canEdit={canEdit} params={params} onParams={change} />
          ) : view === "sales" ? (
            <Sales
              canEdit={canEdit}
              canCancel={account.role === "ADMIN"}
              params={params}
              onParams={change}
            />
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
            <span>{deploymentLabel} · Sin cobros reales</span>
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
        <small>GESTIÓN + INTELIGENCIA</small>
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
  const [showPassword, setShowPassword] = useState(false);
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
          <p className="eyebrow">TU NEGOCIO, CONECTADO</p>
          <h1>
            Todo en su lugar.
            <br />
            Desde el primer día.
          </h1>
          <p>
            Ventas, inventario y clientes conectados en un solo espacio, con
            acceso según tu rol.
          </p>
          <div className="login-tags">
            <span>Ventas</span>
            <span>Inventario</span>
            <span>Análisis y pronósticos</span>
          </div>
        </div>
        <small>Guillermo Pereyra · Ingeniería de Software con IA</small>
      </section>
      <main id="main" className="login-main">
        <div className="login-appearance">
          <ThemeToggle />
        </div>
        <div className="login-card">
          <p className="eyebrow">BIENVENIDO A NEXUS</p>
          <h2>Entra a tu espacio</h2>
          <p className="subtitle">
            Usa una cuenta creada para esta demostración.
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
              <div className="password-group">
                <label htmlFor="login-password">Contraseña</label>
                <span className="password-field">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </div>
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
            {publicDeployment ? (
              <p>
                Solicita una cuenta al responsable de esta demostración. Si el
                servicio está iniciando, la primera conexión puede tardar un
                momento.
              </p>
            ) : (
              <p>
                Después de configurar e iniciar Java, ejecuta{" "}
                <code>npm run accounts</code> en tu equipo para consultar tus
                credenciales locales. No las publiques.
              </p>
            )}
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
            v0.5.0 · {deploymentLabel} · Datos ficticios
          </p>
        </div>
      </main>
    </div>
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
              ? "El servicio está tardando en responder. Espera un momento y vuelve a comprobar."
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
