import { useEffect, useState, type FormEvent } from "react";
import { request, save, type Account, type Role } from "../api/client";
import Modal from "./Modal";
export default function Users() {
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<Account[]>("/users", { signal: controller.signal })
      .then(setUsers)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Usuarios y permisos</h2>
          <p>
            Solo el administrador puede crear cuentas. Se muestran hasta 200
            usuarios.
          </p>
        </div>
        <button className="action" onClick={() => setOpen(true)}>
          + Nuevo usuario
        </button>
      </div>
      {loading && <p role="status">Cargando usuarios…</p>}
      {error && (
        <p role="alert" className="connection-message">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setRevision((x) => x + 1)}
          >
            Reintentar
          </button>
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.active ? "Activo" : "Inactivo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scope-note">
        La edición de roles y el reinicio de contraseñas quedan pendientes de
        una siguiente entrega.
      </p>
      {open && (
        <UserEditor
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setRevision((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}
function UserEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save("/users", {
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        role,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Crear usuario" onClose={onClose} busy={busy}>
      <form className="editor-form" onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy}>
          <label>
            Nombre
            <input
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña inicial
            <input
              type="password"
              minLength={12}
              maxLength={72}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small>Al menos 12 caracteres. Hasta 72 bytes UTF-8.</small>
          </label>
          <label>
            Rol
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(["VIEWER", "ANALYST", "MANAGER", "ADMIN"] as Role[]).map(
                (r) => (
                  <option key={r}>{r}</option>
                ),
              )}
            </select>
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
              {busy ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
