import { useEffect, useState, type FormEvent } from "react";
import { request, save } from "../api/client";
import {
  dateTime,
  movementLabels,
  type InventoryRow,
  type Movement,
  type Page,
} from "../api/operations";
import Modal from "./Modal";
import Pagination from "./Pagination";
type Category = { id: string; name: string };
export default function Inventory({
  canEdit,
  params,
  onParams,
}: {
  canEdit: boolean;
  params: URLSearchParams;
  onParams: (changes: Record<string, string>) => void;
}) {
  const [data, setData] = useState<Page<InventoryRow> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(params.get("q") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState<InventoryRow | null>(null);
  const [history, setHistory] = useState<InventoryRow | null>(null);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const filters = params.toString();
  useEffect(() => setQuery(params.get("q") || ""), [filters]);
  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams(filters);
    search.delete("view");
    setLoading(true);
    setData(null);
    setError("");
    Promise.all([
      request<Page<InventoryRow>>("/inventory?" + search, {
        signal: controller.signal,
      }),
      request<Category[]>("/categories", { signal: controller.signal }),
    ])
      .then(([page, cats]) => {
        if (!controller.signal.aborted) {
          setData(page);
          setCategories(cats);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, revision]);
  function search(e: FormEvent) {
    e.preventDefault();
    onParams({ q: query, page: "0" });
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Existencias y movimientos</h2>
          <p>
            El saldo se calcula desde el historial. Las correcciones se
            registran como nuevos movimientos.
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
      <form className="filters" onSubmit={search}>
        <label>
          Buscar
          <input
            placeholder="Nombre o SKU"
            maxLength={160}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Estado
          <select
            value={params.get("active") || ""}
            onChange={(e) => onParams({ active: e.target.value, page: "0" })}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <label>
          Categoría
          <select
            value={params.get("category") || ""}
            onChange={(e) => onParams({ category: e.target.value, page: "0" })}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alerta
          <select
            value={params.get("lowOnly") || "false"}
            onChange={(e) => onParams({ lowOnly: e.target.value, page: "0" })}
          >
            <option value="false">Todo el inventario</option>
            <option value="true">Solo stock bajo</option>
          </select>
        </label>
        <button className="secondary" type="submit">
          Buscar
        </button>
      </form>
      {notice && (
        <p role="status" className="connection-message success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="connection-message">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="empty-state">
          Cargando existencias…
        </p>
      ) : (
        data && (
          <>
            <div className="table-scroll">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                        <small className="cell-note">{row.sku}</small>
                      </td>
                      <td>{row.categoryName}</td>
                      <td data-testid="stock">
                        <strong className={row.lowStock ? "stock-alert" : ""}>
                          {row.stock}
                        </strong>
                      </td>
                      <td>{row.minStock}</td>
                      <td>
                        <span
                          className={`service-status ${row.lowStock ? "" : "is-up"}`}
                        >
                          {!row.active
                            ? "Inactivo"
                            : row.stock === 0
                              ? "Sin stock"
                              : row.lowStock
                                ? "Stock bajo"
                                : "Disponible"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="secondary"
                            onClick={() => setHistory(row)}
                            aria-label={`Ver movimientos de ${row.sku}`}
                          >
                            Historial
                          </button>
                          {canEdit && row.active && (
                            <button
                              className="secondary"
                              onClick={() => setAdjust(row)}
                              aria-label={`Registrar movimiento de ${row.sku}`}
                            >
                              Movimiento
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.items.length === 0 && (
                <div className="empty-state">
                  <h3>No hay productos para este filtro</h3>
                  <p>Cambia la búsqueda o crea productos desde el catálogo.</p>
                </div>
              )}
            </div>
            <Pagination
              data={data}
              onPage={(page) => onParams({ page: String(page) })}
            />
          </>
        )
      )}
      {adjust && (
        <Adjustment
          row={adjust}
          onClose={() => setAdjust(null)}
          onSaved={() => {
            setAdjust(null);
            setNotice(
              "Movimiento registrado. El inventario ya está actualizado.",
            );
            setRevision((x) => x + 1);
          }}
        />
      )}
      {history && <History row={history} onClose={() => setHistory(null)} />}
    </section>
  );
}
function Adjustment({
  row,
  onClose,
  onSaved,
}: {
  row: InventoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState("ENTRY");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function changed() {
    setKey(crypto.randomUUID());
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!Number.isInteger(Number(quantity)) || Number(quantity) === 0) {
      setError("Indica una cantidad entera distinta de cero.");
      return;
    }
    setBusy(true);
    try {
      await save("/inventory/adjustments", {
        productId: row.id,
        type,
        quantity: Number(quantity),
        reason: reason.trim(),
        requestKey: key,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Registrar movimiento" onClose={onClose} busy={busy}>
      <p className="form-hint">
        {row.name} · {row.sku}. Existencias al abrir: {row.stock}. El saldo se
        verifica nuevamente al guardar.
      </p>
      <form className="editor-form" onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy}>
          <label>
            Tipo de movimiento
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setQuantity("1");
                changed();
              }}
            >
              <option value="ENTRY">Ingreso de existencias</option>
              <option value="ADJUSTMENT">
                Ajuste por diferencia de conteo
              </option>
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              aria-label="Cantidad"
              aria-describedby="adjustment-quantity-hint"
              required
              min={type === "ENTRY" ? 1 : -1000000}
              max={1000000}
              step={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                changed();
              }}
            />
            <small id="adjustment-quantity-hint">
              {type === "ENTRY"
                ? "Cantidad de unidades que ingresan."
                : "Usa una cantidad negativa para descontar o positiva para agregar."}
            </small>
          </label>
          <label>
            Motivo
            <textarea
              required
              maxLength={250}
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                changed();
              }}
              placeholder="Ej. reposición o diferencia en el conteo"
            />
          </label>
          {error && (
            <p role="alert" className="connection-message">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="action" type="submit">
              {busy ? "Guardando…" : "Registrar movimiento"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
function History({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  const [data, setData] = useState<Page<Movement> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      productId: row.id,
      page: String(page),
    });
    if (type) query.set("type", type);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    setLoading(true);
    setData(null);
    setError("");
    request<Page<Movement>>("/inventory/movements?" + query, {
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
  }, [row.id, page, type, from, to]);
  return (
    <Modal title={`Movimientos · ${row.sku}`} onClose={onClose}>
      <p className="form-hint">
        {row.name}. Horario de Lima. El historial no se edita ni se elimina.
      </p>
      <div className="editor-form">
        <div className="form-grid">
          <label>
            Tipo
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(movementLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
      </div>
      {error && (
        <p role="alert" className="connection-message">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Cargando movimientos…</p>
      ) : (
        data && (
          <>
            <ol className="movement-list">
              {data.items.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{movementLabels[m.type]}</strong>
                    <span className="movement-quantity">
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </span>
                  </div>
                  <p>{m.reason}</p>
                  <small>
                    Saldo: {m.stockBefore} → {m.stockAfter} · {m.actor}
                    <br />
                    {dateTime(m.createdAt)}
                    {m.saleCode ? ` · ${m.saleCode}` : ""}
                  </small>
                </li>
              ))}
            </ol>
            {data.items.length === 0 && (
              <p className="empty-state">
                Todavía no hay movimientos para este filtro.
              </p>
            )}
            <Pagination data={data} onPage={setPage} />
          </>
        )
      )}
    </Modal>
  );
}
