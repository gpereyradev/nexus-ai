import { useEffect, useState, type FormEvent } from "react";
import { ApiError, request, save } from "../api/client";
import Modal from "./Modal";
export type Kind = "products" | "customers" | "categories";
export type Row = {
  id: string;
  name: string;
  active: boolean;
  version: number;
  sku?: string;
  categoryId?: string;
  categoryName?: string;
  cost?: string;
  price?: string;
  minStock?: number;
  email?: string | null;
  phone?: string | null;
};
type Page = {
  items: Row[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
const labels = {
  products: "productos",
  customers: "clientes",
  categories: "categorías",
};
const singular = {
  products: "producto",
  customers: "cliente",
  categories: "categoría",
};
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export default function Catalog({
  kind,
  canEdit,
  params,
  onParams,
}: {
  kind: Kind;
  canEdit: boolean;
  params: URLSearchParams;
  onParams: (changes: Record<string, string>) => void;
}) {
  const [data, setData] = useState<Page | null>(null);
  const [categories, setCategories] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(params.get("q") || "");
  const query = params.toString();
  useEffect(() => {
    setSearch(params.get("q") || "");
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const filters = new URLSearchParams(query);
    filters.delete("view");
    async function load() {
      try {
        const result = await request<Page | Row[]>(
          `/${kind}${kind === "categories" ? "" : "?" + filters}`,
          { signal: controller.signal },
        );
        const list = Array.isArray(result)
          ? {
              items: result,
              page: 0,
              size: result.length,
              totalElements: result.length,
              totalPages: 1,
            }
          : result;
        if (!controller.signal.aborted) setData(list);
        if (kind === "products") {
          const cats = await request<Row[]>("/categories", {
            signal: controller.signal,
          });
          if (!controller.signal.aborted) setCategories(cats);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo cargar.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [kind, query, revision]);
  function filter(e: FormEvent) {
    e.preventDefault();
    onParams({ q: search, page: "0" });
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Catálogo de {labels[kind]}</h2>
          <p>
            {data
              ? `${data.totalElements} ${data.totalElements === 1 ? "registro" : "registros"} · `
              : ""}
            {canEdit
              ? "Crea, edita y conserva el historial."
              : "Tu rol tiene acceso de solo lectura."}
          </p>
        </div>
        {canEdit && (
          <button
            className="action"
            disabled={loading}
            onClick={() => setEditing(null)}
          >
            + Nuevo {singular[kind]}
          </button>
        )}
      </div>
      {kind !== "categories" && (
        <form className="filters" onSubmit={filter}>
          <label>
            Buscar
            <input
              maxLength={160}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                kind === "products" ? "Nombre o SKU" : "Nombre o correo"
              }
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
          {kind === "products" && (
            <label>
              Categoría
              <select
                value={params.get("category") || ""}
                onChange={(e) =>
                  onParams({ category: e.target.value, page: "0" })
                }
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Orden
            <select
              value={params.get("sort") || "name"}
              onChange={(e) => onParams({ sort: e.target.value, page: "0" })}
            >
              <option value="name">Nombre</option>
              {kind === "products" && (
                <>
                  <option value="sku">SKU</option>
                  <option value="price">Precio</option>
                </>
              )}
              <option value="createdAt">Fecha de creación</option>
            </select>
          </label>
          <label>
            Dirección
            <select
              value={params.get("direction") || "asc"}
              onChange={(e) =>
                onParams({ direction: e.target.value, page: "0" })
              }
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </label>
          <button className="secondary" type="submit">
            Buscar
          </button>
        </form>
      )}
      {notice && (
        <p role="status" className="connection-message success">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="connection-message">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setRevision((x) => x + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="empty-state">
          Cargando {labels[kind]}…
        </p>
      )}
      {!loading && data && (
        <>
          <div className="table-scroll">
            <table className={`catalog-table ${kind}`}>
              <thead>
                <tr>
                  {kind === "products" && <th>SKU</th>}
                  <th>Nombre</th>
                  {kind === "products" && (
                    <>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Costo</th>
                      <th>Stock mínimo</th>
                    </>
                  )}
                  {kind === "customers" && (
                    <>
                      <th>Correo</th>
                      <th>Teléfono</th>
                    </>
                  )}
                  <th>Estado</th>
                  {canEdit && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    {kind === "products" && (
                      <td>
                        <code>{row.sku}</code>
                      </td>
                    )}
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    {kind === "products" && (
                      <>
                        <td>{row.categoryName}</td>
                        <td>{money.format(Number(row.price))}</td>
                        <td>{money.format(Number(row.cost))}</td>
                        <td>{row.minStock}</td>
                      </>
                    )}
                    {kind === "customers" && (
                      <>
                        <td>{row.email || "—"}</td>
                        <td>{row.phone || "—"}</td>
                      </>
                    )}
                    <td>
                      <span
                        className={`service-status ${row.active ? "is-up" : ""}`}
                      >
                        {row.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          className="secondary"
                          onClick={() => setEditing(row)}
                          aria-label={`Editar ${row.name}`}
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <div className="empty-state">
                <h3>No hay {labels[kind]} para mostrar</h3>
                <p>
                  {params.get("q")
                    ? "Prueba con otra búsqueda o cambia los filtros."
                    : canEdit
                      ? "Crea el primer registro para empezar."
                      : "Todavía no se han creado registros."}
                </p>
              </div>
            )}
          </div>
          {kind !== "categories" && (
            <div className="pagination">
              <span>
                Página {data.page + 1} de {Math.max(1, data.totalPages)}
              </span>
              <button
                className="secondary"
                disabled={data.page === 0}
                onClick={() => onParams({ page: String(data.page - 1) })}
              >
                Anterior
              </button>
              <button
                className="secondary"
                disabled={data.page + 1 >= data.totalPages}
                onClick={() => onParams({ page: String(data.page + 1) })}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
      {editing !== undefined && (
        <Editor
          kind={kind}
          row={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setNotice("Registro guardado correctamente.");
            setRevision((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}
function Editor({
  kind,
  row,
  categories,
  onClose,
  onSaved,
}: {
  kind: Kind;
  row: Row | null;
  categories: Row[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    name: row?.name || "",
    sku: row?.sku || "",
    categoryId: row?.categoryId || categories.find((c) => c.active)?.id || "",
    cost: row?.cost || "0.00",
    price: row?.price || "0.00",
    minStock: String(row?.minStock ?? 0),
    email: row?.email || "",
    phone: row?.phone || "",
  });
  const [active, setActive] = useState(row?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  function input(
    key: string,
    label: string,
    type = "text",
    extra: Record<string, string | number | boolean> = {},
  ) {
    return (
      <label>
        {label}
        <input
          name={key}
          type={type}
          value={values[key]}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          aria-invalid={Boolean(fields[key])}
          {...extra}
        />
        {fields[key] && <small className="field-error">{fields[key]}</small>}
      </label>
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      row?.active &&
      !active &&
      !window.confirm(
        "¿Desactivar este registro? Se conservará su información.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setFields({});
    const body: Record<string, unknown> = {
      name: values.name.trim(),
      active,
      ...(row ? { version: row.version } : {}),
    };
    if (kind === "products")
      Object.assign(body, {
        sku: values.sku,
        categoryId: values.categoryId,
        cost: values.cost,
        price: values.price,
        minStock: Number(values.minStock),
      });
    if (kind === "customers")
      Object.assign(body, {
        email: values.email.trim(),
        phone: values.phone.trim(),
      });
    try {
      await save(`/${kind}${row ? "/" + row.id : ""}`, body, Boolean(row));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${row ? "Editar" : "Crear"} ${singular[kind]}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={(e) => void submit(e)} className="editor-form">
        <fieldset disabled={busy}>
          {input("name", "Nombre", "text", {
            required: true,
            maxLength: kind === "categories" ? 100 : 160,
          })}
          {kind === "products" && (
            <>
              {input("sku", "SKU", "text", {
                required: true,
                maxLength: 40,
                pattern: "[A-Za-z0-9_\\-]+",
              })}
              <label>
                Categoría
                <select
                  required
                  value={values.categoryId}
                  onChange={(e) =>
                    setValues({ ...values, categoryId: e.target.value })
                  }
                >
                  {!values.categoryId && (
                    <option value="">Selecciona una categoría</option>
                  )}
                  {categories
                    .filter((c) => c.active || c.id === row?.categoryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.active ? " (inactiva)" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-grid">
                {input("cost", "Costo (S/)", "number", {
                  required: true,
                  min: 0,
                  max: "9999999999.99",
                  step: "0.01",
                })}
                {input("price", "Precio (S/)", "number", {
                  required: true,
                  min: 0,
                  max: "9999999999.99",
                  step: "0.01",
                })}
              </div>
              {input("minStock", "Stock mínimo", "number", {
                required: true,
                min: 0,
                max: 2147483647,
                step: 1,
              })}
              <p className="form-hint">
                Consulta las existencias y registra movimientos desde
                Inventario.
              </p>
            </>
          )}
          {kind === "customers" && (
            <>
              {input("email", "Correo (opcional)", "email", { maxLength: 254 })}
              {input("phone", "Teléfono (opcional)", "tel", {
                maxLength: 30,
              })}
            </>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Registro activo
          </label>
          {error && (
            <div role="alert" className="connection-message">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="action" type="submit">
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
