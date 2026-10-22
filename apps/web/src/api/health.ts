export type Health = {
  status: "UP";
  application: string;
  version: string;
  phase: string;
  database: "UP";
  currency: "PEN";
  timezone: "America/Lima";
  checkedAt: string;
};
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch("/api/v1/health", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(
      "La API no está disponible. Comprueba Java, PostgreSQL y las variables de .env.",
    );
  const value: unknown = await response.json();
  if (!value || typeof value !== "object")
    throw new Error("La API devolvió una respuesta incompatible.");
  const v = value as Partial<Health>;
  if (
    v.status !== "UP" ||
    v.database !== "UP" ||
    v.application !== "nexus-api" ||
    typeof v.version !== "string" ||
    v.phase !== "F4" ||
    v.currency !== "PEN" ||
    v.timezone !== "America/Lima" ||
    typeof v.checkedAt !== "string" ||
    Number.isNaN(Date.parse(v.checkedAt))
  ) {
    throw new Error("La respuesta de salud no coincide con el contrato F4.");
  }
  return v as Health;
}
