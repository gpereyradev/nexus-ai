import { useEffect, useState, type FormEvent } from "react";
import { ApiError, request, save } from "../api/client";
import { currency, dateTime, daysBefore, limaDate } from "../api/operations";
type Point = { date: string; value: string };
type Result = {
  runId: string;
  method: string;
  methodVersion: string;
  forecastHorizonDays: number;
  generatedAt: string;
  demoData: boolean;
  stockAsOf: string;
  trainingPeriod: {
    from: string;
    to: string;
    days: number;
    nonzeroDays: number;
  };
  evaluation: {
    selectionFrom: string;
    selectionTo: string;
    testFrom: string;
    testTo: string;
    fitTo: string;
    sampleSize: number;
    selectionBaselineMAE: string;
    selectionCandidateMAE: string;
    baselineMAE: string;
    candidateMAE: string;
    mae: string;
    candidateMethod: string;
  };
  history: Point[];
  predictions: Point[];
  summary: {
    total: string;
    dailyAverage: string;
    minimum: string;
    maximum: string;
  };
  anomalies: {
    date: string;
    value: string;
    reference: string;
    threshold: string;
    reason: string;
  }[];
  replenishment: {
    id: string;
    sku: string;
    name: string;
    stock: number;
    minStock: number;
    unitsSold: number;
    dailyUnits: string;
    coverageDays: string | null;
    targetUnits: number;
    suggestedUnits: number;
  }[];
  warnings: string[];
};
const methodName = (method: string) =>
  method === "ridge_calendar_v1"
    ? "Regresión Ridge con calendario"
    : "Referencia semanal";
export default function Analytics() {
  const [to, setTo] = useState(() => daysBefore(limaDate(), 1));
  const [from, setFrom] = useState(() =>
    daysBefore(daysBefore(limaDate(), 1), 111),
  );
  const [horizon, setHorizon] = useState(7);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [insufficient, setInsufficient] = useState(false);
  const [saved, setSaved] = useState<
    {
      id: string;
      createdAt: string;
      method: string;
      mae: string;
      from: string;
      to: string;
      horizon: number;
    }[]
  >([]);
  const [historyError, setHistoryError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setHistoryError("");
    request<typeof saved>("/analytics/runs", { signal: controller.signal })
      .then(setSaved)
      .catch((e) => {
        if (!controller.signal.aborted) setHistoryError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  async function restore(id: string) {
    setBusy(true);
    setError("");
    setResult(null);
    setInsufficient(false);
    try {
      const value = await request<Result>("/analytics/runs/" + id);
      setResult(value);
      setFrom(value.trainingPeriod.from);
      setTo(value.trainingPeriod.to);
      setHorizon(value.forecastHorizonDays);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el análisis.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setInsufficient(false);
    try {
      setResult(
        await save<Result>("/analytics/forecast", {
          from,
          to,
          forecastHorizonDays: horizon,
        }),
      );
      setRevision((x) => x + 1);
    } catch (e) {
      setInsufficient(e instanceof ApiError && e.status === 422);
      setError(
        e instanceof Error ? e.message : "No se pudo generar el análisis.",
      );
    } finally {
      setBusy(false);
    }
  }
  const points = [
    ...(result?.history.slice(-56) || []),
    ...(result?.predictions || []),
  ];
  const historySize = result ? Math.min(56, result.history.length) : 0;
  const peak = Math.max(0, ...points.map((p) => Number(p.value)));
  const scale = Math.max(1, peak);
  const point = (p: Point, i: number) =>
    `${24 + (i * 752) / Math.max(1, points.length - 1)},${180 - (Number(p.value) / scale) * 148}`;
  return (
    <section className="analytics">
      <div className="section-heading">
        <div>
          <h2>Estimaciones con evidencia</h2>
          <p>
            Explora ventas, cambios inusuales y cobertura de inventario. Ningún
            análisis modifica tus registros.
          </p>
        </div>
        <span className="pill">PYTHON · MODELO LOCAL</span>
      </div>
      <form
        className="filters analytics-filters"
        onSubmit={(e) => void submit(e)}
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
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
              max={daysBefore(limaDate(), 1)}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Horizonte
            <select
              aria-label="Horizonte"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
            </select>
          </label>
          <button className="action" type="submit">
            {busy ? "Analizando…" : "Generar análisis"}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setFrom("2026-07-01");
              setTo("2026-10-21");
            }}
          >
            Usar fechas demo
          </button>
        </fieldset>
      </form>
      <p className="form-hint">
        Utiliza días completos hasta ayer. Se necesitan 84 días desde la primera
        venta y al menos 28 días con ventas confirmadas. Fechas y cierres en
        horario de Lima.
      </p>
      {busy && (
        <p role="status" className="connection-message">
          Comparando la referencia semanal y el modelo con datos anteriores a
          cada bloque de evaluación…
        </p>
      )}
      {error && (
        <div role="alert" className="connection-message">
          <h3>
            {insufficient ? "Historial insuficiente" : "Análisis no disponible"}
          </h3>
          <p>{error}</p>
          <small>
            Puedes cambiar el período y volver a intentar. Inventario y ventas
            siguen disponibles.
          </small>
        </div>
      )}
      {!busy && !result && !error && (
        <section className="panel analytics-intro">
          <p className="eyebrow">UN PRONÓSTICO QUE SE PUEDE REVISAR</p>
          <h2>Primero medir. Después estimar.</h2>
          <div className="analytics-steps">
            <article>
              <b>01</b>
              <h3>Historial confirmado</h3>
              <p>
                Se excluyen ventas anuladas y días incompletos. Las fechas demo
                permiten explorar el dataset opcional.
              </p>
            </article>
            <article>
              <b>02</b>
              <h3>Comparación temporal</h3>
              <p>
                Una referencia semanal compite con una regresión ligera. Se
                conserva la referencia si el modelo no mejora al menos 10% en
                ambos bloques.
              </p>
            </article>
            <article>
              <b>03</b>
              <h3>Límites visibles</h3>
              <p>
                Verás el error, las fechas usadas y las advertencias. Las
                sugerencias de reposición requieren tu revisión.
              </p>
            </article>
          </div>
        </section>
      )}
      {saved.length > 0 && (
        <details className="panel saved-analyses">
          <summary>Análisis guardados · últimos {saved.length}</summary>
          <p className="form-hint">
            Cada resultado conserva la serie y los agregados utilizados. Se abre
            sin recalcular ni necesitar que Python esté disponible.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Generado Lima</th>
                  <th>Período</th>
                  <th>Método / MAE</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {saved.map((r) => (
                  <tr key={r.id}>
                    <td>{dateTime(r.createdAt)}</td>
                    <td>
                      {r.from} → {r.to}
                      <small className="cell-note">
                        Horizonte: {r.horizon} días
                      </small>
                    </td>
                    <td>
                      {methodName(r.method)}
                      <small className="cell-note">{currency(r.mae)}</small>
                    </td>
                    <td>
                      <button
                        className="secondary"
                        disabled={busy}
                        aria-label={`Abrir análisis ${r.id}`}
                        onClick={() => void restore(r.id)}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {historyError && (
        <p role="alert" className="connection-message">
          No se pudo consultar el historial: {historyError}
        </p>
      )}
      {result && (
        <>
          <div className="demo-banner" role="status">
            {result.demoData
              ? "Este análisis incluye datos ficticios de demostración. "
              : "Análisis orientativo de tus registros. "}
            No es una garantía de ventas futuras ni una orden de compra.
          </div>
          <div className="kpi-grid">
            <article>
              <span>Estimación · {result.forecastHorizonDays} días</span>
              <strong data-testid="forecast-total">
                {currency(
                  result.predictions.reduce((n, p) => n + Number(p.value), 0),
                )}
              </strong>
              <small>
                Del {result.predictions[0].date} al{" "}
                {result.predictions.at(-1)!.date}
              </small>
            </article>
            <article>
              <span>Error absoluto medio · MAE</span>
              <strong data-testid="forecast-mae">
                {currency(result.evaluation.mae)}
              </strong>
              <small>Diferencia diaria promedio en retrospectiva</small>
            </article>
            <article>
              <span>MAE de referencia semanal</span>
              <strong>{currency(result.evaluation.baselineMAE)}</strong>
              <small>Mismo bloque de {result.evaluation.sampleSize} días</small>
            </article>
            <article>
              <span>Historial utilizado</span>
              <strong>{result.trainingPeriod.days} días</strong>
              <small>{result.trainingPeriod.nonzeroDays} días con ventas</small>
            </article>
          </div>
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">HISTORIAL Y ESTIMACIÓN</p>
                <h2 data-testid="forecast-method">
                  {methodName(result.method)}
                </h2>
                <p>
                  {result.method} · versión {result.methodVersion}
                </p>
              </div>
              <span className="pill">PEN · LIMA</span>
            </div>
            <p className="form-hint">
              Línea continua: observado. Línea azul discontinua: estimación. La
              gráfica muestra los últimos 56 días del historial y el horizonte
              elegido. No hay intervalo de confianza calibrado.
            </p>
            <div className="chart-labels">
              <span>{currency(peak)}</span>
              <span>Máximo representado</span>
            </div>
            <svg
              className="sales-chart"
              viewBox="0 0 800 210"
              role="img"
              aria-label="Ventas diarias observadas y pronóstico orientativo. Consulta todas las cifras en la tabla inferior."
            >
              {[32, 81, 130, 180].map((y) => (
                <line key={y} x1="24" x2="776" y1={y} y2={y} stroke="#e1e8e4" />
              ))}
              <polyline
                points={points.slice(0, historySize).map(point).join(" ")}
                fill="none"
                stroke="#168b70"
                strokeWidth="3"
              />
              <polyline
                points={points
                  .slice(historySize - 1)
                  .map((p, i) => point(p, historySize - 1 + i))
                  .join(" ")}
                fill="none"
                stroke="#376bce"
                strokeWidth="3"
                strokeDasharray="6 5"
              />
              <text x="24" y="205">
                {points[0]?.date}
              </text>
              <text x="776" y="205" textAnchor="end">
                {points.at(-1)?.date}
              </text>
            </svg>
            <details className="chart-data">
              <summary>Consultar historial completo y predicciones</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha Lima</th>
                      <th>Tipo</th>
                      <th>Ventas PEN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.history.map((p) => (
                      <tr key={p.date}>
                        <td>{p.date}</td>
                        <td>Observado</td>
                        <td>{currency(p.value)}</td>
                      </tr>
                    ))}
                    {result.predictions.map((p) => (
                      <tr className="prediction-row" key={p.date}>
                        <td>{p.date}</td>
                        <td>Estimación</td>
                        <td>{currency(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <div className="dashboard-grid">
            <section className="panel">
              <p className="eyebrow">CÓMO SE EVALUÓ</p>
              <h2>Una comparación verificable</h2>
              <dl className="evaluation-list">
                <dt>Ajuste final con todo el historial</dt>
                <dd>
                  {result.trainingPeriod.from} → {result.trainingPeriod.to}
                </dd>
                <dt>Selección temporal · 14 días</dt>
                <dd>
                  {result.evaluation.selectionFrom} →{" "}
                  {result.evaluation.selectionTo}
                </dd>
                <dt>Confirmación temporal · 14 días</dt>
                <dd>
                  {result.evaluation.testFrom} → {result.evaluation.testTo}
                </dd>
                <dt>Ajuste previo a la confirmación</dt>
                <dd>Hasta {result.evaluation.fitTo}</dd>
                <dt>MAE Ridge en confirmación</dt>
                <dd>{currency(result.evaluation.candidateMAE)}</dd>
                <dt>MAE de selección · referencia / Ridge</dt>
                <dd>
                  {currency(result.evaluation.selectionBaselineMAE)} /{" "}
                  {currency(result.evaluation.selectionCandidateMAE)}
                </dd>
                <dt>Total observado / promedio diario</dt>
                <dd>
                  {currency(result.summary.total)} /{" "}
                  {currency(result.summary.dailyAverage)}
                </dd>
              </dl>
              <p className="form-hint">
                MAE = promedio de |venta observada − estimación|. Ambos bloques
                participan en decidir si retener el modelo: no constituyen una
                evaluación independiente posterior a esa decisión.
              </p>
            </section>
            <section className="panel">
              <p className="eyebrow">CAMBIOS PARA REVISAR</p>
              <h2>Alertas estadísticas</h2>
              <p className="form-hint">
                Mediana y dispersión de los 28 días anteriores a cada fecha.
                Hasta 10 alertas recientes; pueden ser falsos positivos.
              </p>
              {result.anomalies.length ? (
                <ol className="movement-list">
                  {result.anomalies.map((a) => (
                    <li key={a.date}>
                      <strong>
                        {a.date} · {currency(a.value)}
                      </strong>
                      <p>
                        Referencia: {currency(a.reference)} · Umbral:{" "}
                        {currency(a.threshold)}
                      </p>
                      <small>{a.reason}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="empty-state">
                  No se detectaron cambios que superen la regla en este período.
                </p>
              )}
            </section>
          </div>
          <section className="panel">
            <p className="eyebrow">REPOSICIÓN ORIENTATIVA</p>
            <h2>Unidades y cobertura estimada</h2>
            <p className="form-hint">
              Hasta 10 productos por faltante estimado. Promedio de los últimos
              28 días del período y stock registrado al{" "}
              {dateTime(result.stockAsOf)}. Objetivo: 14 días. Sin ventas
              observadas no se inventa demanda ni cobertura.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th>Unidades / día</th>
                    <th>Cobertura</th>
                    <th>Unidades sugeridas</th>
                  </tr>
                </thead>
                <tbody>
                  {result.replenishment.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small className="cell-note">
                          {p.sku} · {p.unitsSold} unidades vendidas en la
                          ventana
                        </small>
                      </td>
                      <td>{p.stock}</td>
                      <td>{p.dailyUnits}</td>
                      <td>
                        {p.coverageDays === null
                          ? "Sin ventas"
                          : `${p.coverageDays} días`}
                      </td>
                      <td>
                        <strong>{p.suggestedUnits}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!result.replenishment.length && (
                <p className="empty-state">
                  No hay faltantes estimados ni productos bajo mínimo en la
                  muestra.
                </p>
              )}
            </div>
          </section>
          <section className="panel">
            <p className="eyebrow">ALCANCE Y ADVERTENCIAS</p>
            <h2>Lee el resultado con contexto</h2>
            <ul className="analytics-warnings">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="form-hint">
              Análisis {result.runId} · Generado el{" "}
              {dateTime(result.generatedAt)} · Modelo local, sin APIs
              comerciales.
            </p>
          </section>
        </>
      )}
    </section>
  );
}
