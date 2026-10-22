import { useEffect, useState } from "react";
import { request } from "../api/client";
import { currency, daysBefore, limaDate } from "../api/operations";
type Summary = {
  from: string;
  to: string;
  currency: string;
  timezone: string;
  salesTotal: string;
  orders: number;
  averageTicket: string;
  units: number;
  lowStockCount: number;
  daily: { date: string; total: string; orders: number }[];
  categories: { name: string; total: string }[];
  topProducts: {
    id: string;
    sku: string;
    name: string;
    units: number;
    total: string;
  }[];
  lowStock: {
    id: string;
    sku: string;
    name: string;
    stock: number;
    minStock: number;
  }[];
  demoData: boolean;
};
export default function Dashboard({
  navigate,
}: {
  navigate: (view: string, filters?: Record<string, string>) => void;
}) {
  const [from, setFrom] = useState(() => daysBefore(limaDate(), 29));
  const [to, setTo] = useState(limaDate);
  const [period, setPeriod] = useState({ from, to });
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    request<Summary>("/dashboard/summary?" + new URLSearchParams(period), {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period, revision]);
  const peak = Math.max(0, ...(data?.daily.map((d) => Number(d.total)) || []));
  const max = Math.max(1, peak);
  const points =
    data?.daily
      .map(
        (d, i) =>
          `${24 + (i * 752) / Math.max(1, data.daily.length - 1)},${180 - (Number(d.total) / max) * 148}`,
      )
      .join(" ") || "";
  return (
    <section className="dashboard">
      <div className="section-heading">
        <div>
          <h2>Así va tu negocio</h2>
          <p>
            Ventas confirmadas en soles. Las anulaciones se excluyen del
            período.
          </p>
        </div>
        <button
          className="secondary"
          disabled={loading}
          onClick={() => setRevision((x) => x + 1)}
        >
          Actualizar
        </button>
      </div>
      <form
        className="filters dashboard-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPeriod({ from, to });
        }}
      >
        <label>
          Desde
          <input
            type="date"
            required
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            required
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button className="action" type="submit" disabled={loading}>
          Aplicar período
        </button>
        {data?.demoData && (
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setFrom("2026-07-01");
              setTo("2026-10-21");
              setPeriod({ from: "2026-07-01", to: "2026-10-21" });
            }}
          >
            Ver período demo
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="connection-message">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="empty-state">
          Calculando indicadores…
        </p>
      ) : (
        data && (
          <>
            <div className="kpi-grid">
              <article>
                <span>Ventas del período</span>
                <strong data-testid="kpi-sales">
                  {currency(data.salesTotal)}
                </strong>
                <small>
                  {data.from} → {data.to} · Lima
                </small>
              </article>
              <article>
                <span>Ventas confirmadas</span>
                <strong>{data.orders.toLocaleString("es-PE")}</strong>
                <small>
                  {data.units.toLocaleString("es-PE")} unidades vendidas
                </small>
              </article>
              <article>
                <span>Ticket promedio</span>
                <strong>{currency(data.averageTicket)}</strong>
                <small>Importe por venta confirmada</small>
              </article>
              <article className={data.lowStockCount ? "kpi-warning" : ""}>
                <span>Productos con stock bajo</span>
                <strong>{data.lowStockCount}</strong>
                <button
                  className="text-button"
                  onClick={() =>
                    navigate("inventory", { lowOnly: "true", active: "true" })
                  }
                >
                  Ver existencias actuales ↗
                </button>
              </article>
            </div>
            {data.demoData && (
              <p className="demo-banner">
                Incluye datos ficticios de demostración: 30 productos, 20
                clientes y 226 ventas iniciales entre julio y octubre de 2026.
                Las operaciones que registres también se reflejan aquí.
              </p>
            )}
            <section className="panel chart-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">EVOLUCIÓN DIARIA</p>
                  <h2>Ventas a lo largo del tiempo</h2>
                </div>
                <span className="pill">PEN · LIMA</span>
              </div>
              <div className="chart-labels">
                <span>{currency(peak)}</span>
                <span>Máximo diario</span>
              </div>
              <svg
                className="sales-chart"
                viewBox="0 0 800 210"
                role="img"
                aria-label={`Ventas diarias del ${data.from} al ${data.to}. Total ${currency(data.salesTotal)}. Valores completos en la tabla inferior.`}
              >
                <defs>
                  <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#168b70" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#168b70" stopOpacity=".01" />
                  </linearGradient>
                </defs>
                {[32, 81, 130, 180].map((y) => (
                  <line
                    key={y}
                    x1="24"
                    x2="776"
                    y1={y}
                    y2={y}
                    stroke="#e1e8e4"
                  />
                ))}
                <polygon
                  points={`24,180 ${points} 776,180`}
                  fill="url(#sales-fill)"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke="#168b70"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {data.daily.length === 1 && (
                  <circle
                    cx="24"
                    cy={180 - (Number(data.daily[0].total) / max) * 148}
                    r="4"
                    fill="#168b70"
                  />
                )}
                <text x="24" y="205">
                  {data.from}
                </text>
                <text x="776" y="205" textAnchor="end">
                  {data.to}
                </text>
              </svg>
              <details className="chart-data">
                <summary>Consultar valores por día</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha Lima</th>
                        <th>Ventas</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily.map((d) => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td>{d.orders}</td>
                          <td>{currency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <div className="dashboard-grid">
              <section className="panel">
                <p className="eyebrow">COMPOSICIÓN</p>
                <h2>Ventas por categoría</h2>
                {data.categories.length ? (
                  data.categories.map((c) => (
                    <div className="category-bar" key={c.name}>
                      <div>
                        <span>{c.name}</span>
                        <strong>{currency(c.total)}</strong>
                      </div>
                      <progress
                        max={Math.max(1, Number(data.salesTotal))}
                        value={Number(c.total)}
                        aria-label={`${c.name}: ${currency(c.total)}`}
                      />
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Sin ventas en este período.</p>
                )}
              </section>
              <section className="panel">
                <p className="eyebrow">LOS MÁS VENDIDOS POR IMPORTE</p>
                <h2>Productos destacados</h2>
                <ol className="ranking-list">
                  {data.topProducts.map((p, i) => (
                    <li key={p.id}>
                      <span className="rank">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{p.name}</strong>
                        <small className="cell-note">
                          {p.sku} · {p.units} unidades
                        </small>
                      </div>
                      <b>{currency(p.total)}</b>
                    </li>
                  ))}
                </ol>
                {!data.topProducts.length && (
                  <p className="empty-state">
                    Sin productos vendidos en este período.
                  </p>
                )}
              </section>
            </div>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ATENCIÓN AL INVENTARIO</p>
                  <h2>Existencias para revisar</h2>
                  <p>
                    Saldo actual de productos activos, independiente del período
                    de ventas.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    navigate("inventory", { lowOnly: "true", active: "true" })
                  }
                >
                  Ver inventario ↗
                </button>
              </div>
              <div className="low-stock-grid">
                {data.lowStock.map((p) => (
                  <button
                    className="low-stock-card"
                    key={p.id}
                    onClick={() => navigate("inventory", { q: p.sku })}
                  >
                    <span>
                      {p.stock === 0 ? "Sin existencias" : "Stock bajo"}
                    </span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.sku} · Mínimo {p.minStock}
                    </small>
                    <b>
                      {p.stock}
                      <small> unidades</small>
                    </b>
                  </button>
                ))}
              </div>
              {!data.lowStock.length && (
                <p className="empty-state">
                  Todos los productos activos están sobre su mínimo.
                </p>
              )}
            </section>
            <p className="form-hint">
              Indicadores calculados desde las ventas confirmadas. La moneda es
              PEN y cada día se delimita según America/Lima. Los pronósticos están disponibles en Análisis según tu rol.
            </p>
          </>
        )
      )}
    </section>
  );
}
