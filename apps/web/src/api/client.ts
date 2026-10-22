export type Role = "ADMIN" | "MANAGER" | "ANALYST" | "VIEWER";
export type Account = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
};
type Csrf = { token: string; headerName: string };
let csrf: Csrf | null = null;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  UNAUTHENTICATED: "Tu sesión terminó. Vuelve a ingresar.",
  FORBIDDEN:
    "No tienes permiso o la sesión de seguridad expiró. Vuelve a intentarlo o ingresa nuevamente.",
  LOGIN_RATE_LIMIT:
    "Demasiados intentos. Espera un minuto antes de volver a ingresar.",
};
async function csrfToken(): Promise<Csrf> {
  if (csrf) return csrf;
  csrf = await request<Csrf>("/auth/csrf");
  return csrf;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method || "GET";
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const token = await csrfToken();
    headers.set(token.headerName, token.token);
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "No se pudo conectar con el servicio. Espera un momento y vuelve a intentar.",
    );
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "/auth/login" && path !== "/me")
      window.dispatchEvent(new Event("nexus:session-expired"));
    if (response.status === 401 || response.status === 403) csrf = null;
    throw new ApiError(
      response.status,
      messages[problem.code] ||
        problem.detail ||
        "No se pudo completar la solicitud.",
      problem.fields || {},
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function login(email: string, password: string) {
  csrf = null;
  await request<void>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  });
  csrf = null;
  return request<Account>("/me");
}
export async function logout() {
  await request<void>("/auth/logout", { method: "POST" });
  csrf = null;
}
export function save<T>(path: string, body: unknown, update = false) {
  return request<T>(path, {
    method: update ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
