import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "./health";
afterEach(() => vi.unstubAllGlobals());
const healthy = {
  status: "UP",
  application: "nexus-api",
  version: "0.1.0",
  phase: "F0",
  database: "UP",
  currency: "PEN",
  timezone: "America/Lima",
  checkedAt: "2026-10-22T10:00:00Z",
};
describe("Contrato de conectividad", () => {
  it("acepta el contrato real y propaga la señal de cancelación", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(healthy)));
    vi.stubGlobal("fetch", mock);
    const signal = new AbortController().signal;
    expect(await fetchHealth(signal)).toEqual(healthy);
    expect(mock).toHaveBeenCalledWith(
      "/api/v1/health",
      expect.objectContaining({ signal }),
    );
  });
  it("no presenta un fallo HTTP como servicio conectado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );
    await expect(fetchHealth()).rejects.toThrow("no está disponible");
  });
  it.each([
    {},
    { ...healthy, database: "DOWN" },
    { ...healthy, checkedAt: "inválido" },
    { ...healthy, currency: "USD" },
  ])("rechaza contratos incompatibles: %j", async (payload) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))),
    );
    await expect(fetchHealth()).rejects.toThrow("contrato F0");
  });
});
