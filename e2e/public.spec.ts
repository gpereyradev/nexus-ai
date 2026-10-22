import { test, expect } from "@playwright/test";

test("contenedor público: recursos, sesión HTTPS y cierre sin acceso residual", async ({ page }) => {
  test.skip(process.env.NEXUS_PUBLIC_E2E !== "true", "Solo para la imagen pública con proxy TLS real.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(page.getByText("Demostración web · Datos ficticios", { exact: false })).toBeVisible();
  await page.getByLabel("Correo", { exact: true }).fill("analyst@nexus.demo");
  await page.getByLabel("Contraseña", { exact: true }).fill("e2e_fixture_analyst_password_2026");
  await page.getByRole("button", { name: "Ingresar al espacio" }).click();
  await expect(page.getByTestId("kpi-sales")).toBeVisible();
  const session = (await page.context().cookies()).find((cookie) => cookie.name === "JSESSIONID");
  expect(session?.secure).toBe(true);
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");
  for (const path of ["/.env", "/actuator/env", "/api/v1/unknown", "/v1/forecast"]) {
    expect((await page.request.get(path)).status()).toBe(403);
  }
  expect((await page.request.post("/api/v1/analytics/forecast", {
    data: { from: "2026-07-01", to: "2026-10-21", forecastHorizonDays: 7 },
  })).status()).toBe(403);
  await page.reload();
  await expect(page.getByTestId("kpi-sales")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("button", { name: "Ingresar al espacio" })).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
  expect(errors).toEqual([]);
});
