import { useEffect, useState, type FormEvent } from "react";
import { request, save } from "../api/client";
import {
  currency,
  dateTime,
  estimate,
  MAX_TOTAL_CENTS,
  type InventoryRow,
  type Page,
  type SaleDetail,
  type SaleSummary,
} from "../api/operations";
import Modal from "./Modal";
import Pagination from "./Pagination";
type Customer = { id: string; name: string; email: string | null };
type Line = { product: InventoryRow; quantity: number };
export default function Sales({
  canEdit,
  canCancel,
  params,
  onParams,
}: {
  canEdit: boolean;
  canCancel: boolean;
  params: URLSearchParams;
  onParams: (changes: Record<string, string>) => void;
}) {
  const [data, setData] = useState<Page<SaleSummary> | null>(null);
  const [query, setQuery] = useState(params.get("q") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
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
    request<Page<SaleSummary>>("/sales?" + search, {
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
  }, [filters, revision]);
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Registro de ventas</h2>
          <p>
            Precios vigentes al confirmar. Las anulaciones conservan el
            comprobante y devuelven las existencias.
          </p>
        </div>
        {canEdit && (
          <button className="action" onClick={() => setCreating(true)}>
            Nueva venta +
          </button>
        )}
      </div>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          onParams({ q: query, page: "0" });
        }}
      >
        <label>
          Buscar
          <input
            placeholder="Código o cliente"
            value={query}
            maxLength={160}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Estado
          <select
            value={params.get("status") || ""}
            onChange={(e) => onParams({ status: e.target.value, page: "0" })}
          >
            <option value="">Todas</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CANCELLED">Anuladas</option>
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={params.get("from") || ""}
            onChange={(e) => onParams({ from: e.target.value, page: "0" })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={params.get("to") || ""}
            onChange={(e) => onParams({ to: e.target.value, page: "0" })}
          />
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
          Cargando ventas…
        </p>
      ) : (
        data && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Código / fecha Lima</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.code}</strong>
                        <small className="cell-note">
                          {dateTime(s.occurredAt)}
                        </small>
                      </td>
                      <td>{s.customerName || "Público general"}</td>
                      <td className="money">{currency(s.total)}</td>
                      <td>
                        <span
                          className={`service-status ${s.status === "CONFIRMED" ? "is-up" : ""}`}
                        >
                          {s.status === "CONFIRMED" ? "Confirmada" : "Anulada"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="secondary"
                          aria-label={`Ver venta ${s.code}`}
                          onClick={() => setDetail(s.id)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.items.length && (
                <p className="empty-state">No hay ventas para este filtro.</p>
              )}
            </div>
            <Pagination
              data={data}
              onPage={(page) => onParams({ page: String(page) })}
            />
          </>
        )
      )}
      {creating && (
        <NewSale
          onClose={() => setCreating(false)}
          onSaved={(sale) => {
            setCreating(false);
            setDetail(sale.id);
            setNotice(
              "Venta confirmada. Las existencias ya están actualizadas.",
            );
            setRevision((x) => x + 1);
          }}
        />
      )}
      {detail && (
        <SaleReceipt
          id={detail}
          canCancel={canCancel}
          onClose={() => setDetail(null)}
          onCancelled={() => {
            setNotice(
              "Venta anulada. Las existencias fueron devueltas una sola vez.",
            );
            setRevision((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}
function NewSale({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (sale: SaleDetail) => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<InventoryRow[]>([]);
  const [searching, setSearching] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      request<Page<InventoryRow>>(
        "/inventory?active=true&size=20&q=" + encodeURIComponent(query),
        { signal: controller.signal },
      )
        .then((p) => setProducts(p.items))
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request<Page<Customer>>(
        "/customers?active=true&size=20&q=" + encodeURIComponent(customerQuery),
        { signal: controller.signal },
      )
        .then((p) => setCustomers(p.items))
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [customerQuery]);
  function changed() {
    setKey(crypto.randomUUID());
    setError("");
  }
  const total = estimate(
    lines.map((l) => ({ price: l.product.price, quantity: l.quantity })),
  );
  const valid =
    lines.length > 0 &&
    lines.every(
      (l) =>
        Number.isInteger(l.quantity) &&
        l.quantity > 0 &&
        l.quantity <= l.product.stock,
    ) &&
    total <= MAX_TOTAL_CENTS;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      onSaved(
        await save<SaleDetail>("/sales", {
          customerId: customer?.id || null,
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
          requestKey: key,
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo confirmar la venta.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Nueva venta" onClose={onClose} busy={busy}>
      <form className="editor-form" onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy}>
          <p className="form-hint">
            El servidor verifica las existencias y toma el precio actual de cada
            producto al confirmar. El total mostrado es una estimación.
          </p>
          <label>
            Buscar producto
            <input
              value={query}
              maxLength={160}
              placeholder="Nombre o SKU"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="product-picker" aria-label="Productos disponibles">
            {searching ? (
              <p role="status">Buscando productos…</p>
            ) : products.length ? (
              products.map((p) => (
                <button
                  className="picker-item"
                  type="button"
                  key={p.id}
                  disabled={
                    p.stock < 1 ||
                    lines.some((l) => l.product.id === p.id) ||
                    lines.length >= 100
                  }
                  onClick={() => {
                    setLines([...lines, { product: p, quantity: 1 }]);
                    changed();
                  }}
                >
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.sku} · {p.stock} disponibles
                    </small>
                  </span>
                  <span>{currency(p.price)} +</span>
                </button>
              ))
            ) : (
              <p>No hay productos para esta búsqueda.</p>
            )}
          </div>
          {lines.length > 0 && (
            <div className="sale-lines">
              {lines.map((line) => (
                <div className="sale-line" key={line.product.id}>
                  <div>
                    <strong>{line.product.name}</strong>
                    <small className="cell-note">
                      {line.product.sku} · {currency(line.product.price)} c/u
                    </small>
                  </div>
                  <label>
                    Unidades
                    <input
                      aria-label={`Cantidad de ${line.product.sku}`}
                      type="number"
                      min={1}
                      max={Math.min(line.product.stock, 1000000)}
                      step={1}
                      required
                      value={line.quantity || ""}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setLines(
                          lines.map((l) =>
                            l.product.id === line.product.id
                              ? {
                                  ...l,
                                  quantity: Number.isSafeInteger(value)
                                    ? value
                                    : 0,
                                }
                              : l,
                          ),
                        );
                        changed();
                      }}
                    />
                  </label>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Quitar ${line.product.sku}`}
                    onClick={() => {
                      setLines(
                        lines.filter((l) => l.product.id !== line.product.id),
                      );
                      changed();
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
          <label>
            Buscar cliente (opcional)
            <input
              value={customerQuery}
              maxLength={160}
              placeholder="Nombre o correo"
              onChange={(e) => setCustomerQuery(e.target.value)}
            />
          </label>
          <label>
            Cliente
            <select
              value={customer?.id || ""}
              onChange={(e) => {
                setCustomer(
                  customers.find((c) => c.id === e.target.value) || null,
                );
                changed();
              }}
            >
              <option value="">Público general</option>
              {customer && !customers.some((c) => c.id === customer.id) && (
                <option value={customer.id}>{customer.name}</option>
              )}
              {customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} · {c.email || "Sin correo"}
                </option>
              ))}
            </select>
          </label>
          <div className="sale-total">
            <span>Total estimado</span>
            <strong>{currency((Number(total) / 100).toFixed(2))}</strong>
          </div>
          {total > MAX_TOTAL_CENTS && (
            <p role="alert">El importe supera el límite por venta.</p>
          )}
          {error && (
            <p role="alert" className="connection-message">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="action" disabled={!valid}>
              {busy ? "Confirmando…" : "Confirmar venta"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
function SaleReceipt({
  id,
  canCancel,
  onClose,
  onCancelled,
}: {
  id: string;
  canCancel: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    request<SaleDetail>("/sales/" + id, { signal: controller.signal })
      .then(setSale)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, attempt]);
  async function cancel(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setSale(
        await save<SaleDetail>(`/sales/${id}/cancel`, {
          reason: reason.trim(),
        }),
      );
      setCancelling(false);
      onCancelled();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Detalle de venta" onClose={onClose} busy={busy}>
      {error && (
        <p role="alert" className="connection-message">
          {error}
        </p>
      )}
      {!sale ? (
        <>
          <p role="status">
            {error ? "No se pudo cargar el comprobante." : "Cargando venta…"}
          </p>
          {error && (
            <button
              className="secondary"
              onClick={() => setAttempt((x) => x + 1)}
            >
              Reintentar
            </button>
          )}
        </>
      ) : (
        <>
          <div className="receipt-heading">
            <div>
              <strong data-testid="sale-code">{sale.code}</strong>
              <small className="cell-note">
                {dateTime(sale.occurredAt)} · Lima
              </small>
            </div>
            <span
              className={`service-status ${sale.status === "CONFIRMED" ? "is-up" : ""}`}
            >
              {sale.status === "CONFIRMED" ? "Confirmada" : "Anulada"}
            </span>
          </div>
          <p>
            {sale.customerName || "Público general"}
            <br />
            <small>Registrada por {sale.actor}</small>
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unid.</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.productName}
                      <small className="cell-note">{i.sku}</small>
                    </td>
                    <td>{i.quantity}</td>
                    <td className="money">{currency(i.unitPrice)}</td>
                    <td className="money">{currency(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sale-total">
            <span>Total registrado · PEN</span>
            <strong>{currency(sale.total)}</strong>
          </div>
          <p className="form-hint">
            Registro interno de demostración. No constituye comprobante
            tributario ni procesa pagos.
          </p>
          {sale.status === "CANCELLED" ? (
            <p className="connection-message">
              Anulada el {dateTime(sale.cancelledAt!)} por {sale.cancelledBy}.
              <br />
              Motivo: {sale.cancellationReason}
            </p>
          ) : (
            canCancel &&
            (cancelling ? (
              <form className="editor-form" onSubmit={(e) => void cancel(e)}>
                <fieldset disabled={busy}>
                  <label>
                    Motivo de anulación
                    <textarea
                      rows={3}
                      required
                      maxLength={250}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <p className="form-hint">
                    Se devolverán todas las unidades al inventario. La venta y
                    sus movimientos permanecerán en el historial.
                  </p>
                  <div className="form-actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setCancelling(false)}
                    >
                      Volver
                    </button>
                    <button className="danger-button" type="submit">
                      {busy ? "Anulando…" : "Confirmar anulación"}
                    </button>
                  </div>
                </fieldset>
              </form>
            ) : (
              <button
                className="danger-button"
                onClick={() => setCancelling(true)}
              >
                Anular venta
              </button>
            ))
          )}
        </>
      )}
    </Modal>
  );
}
