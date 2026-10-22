import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "admin") {
  await page.goto("/");
  await page.getByLabel("Correo", { exact: true }).fill(`${role}@nexus.demo`);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(`e2e_fixture_${role}_password_2026`);
  await page.getByRole("button", { name: "Ingresar al espacio" }).click();
  await expect(page.getByTestId("kpi-sales")).toBeVisible();
}
async function navigate(page: Page, title: string) {
  const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: title, exact: true })
    .click();
}
async function inventory(page: Page, sku: string, stock: number) {
  await navigate(page, "Inventario");
  await page.getByPlaceholder("Nombre o SKU").fill(sku);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: sku });
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId("stock")).toHaveText(String(stock));
}
test("venta real: catálogo, ingreso, venta, reporte, anulación y trazabilidad", async ({
  page,
}) => {
  await login(page);
  const baseline = (await page.getByTestId("kpi-sales").innerText()).replace(
    /[^0-9.]/g,
    "",
  );
  const sku = `E2E-${Date.now()}`;
  await navigate(page, "Productos");
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  const editor = page.getByRole("dialog");
  await editor
    .getByLabel("Nombre", { exact: true })
    .fill("Producto recorrido completo");
  await editor.getByLabel("SKU", { exact: true }).fill(sku);
  await editor
    .getByLabel("Categoría")
    .selectOption("10000000-0000-0000-0000-000000000001");
  await editor.getByLabel("Costo (S/)", { exact: true }).fill("10.00");
  await editor.getByLabel("Precio (S/)", { exact: true }).fill("19.90");
  await editor.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await inventory(page, sku, 0);
  await page
    .getByRole("button", { name: `Registrar movimiento de ${sku}` })
    .click();
  await page.getByLabel("Cantidad", { exact: true }).fill("5");
  await page
    .getByLabel("Motivo", { exact: true })
    .fill("Existencias para recorrido E2E");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registrar movimiento", exact: true })
    .click();
  await expect(page.getByTestId("stock")).toHaveText("5");
  await navigate(page, "Ventas");
  await page.getByRole("button", { name: "Nueva venta" }).click();
  await page.getByLabel("Buscar producto", { exact: true }).fill(sku);
  await page.getByRole("button").filter({ hasText: sku }).click();
  await page.getByLabel(`Cantidad de ${sku}`, { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  const receipt = page.getByRole("dialog");
  const code = await page.getByTestId("sale-code").innerText();
  await expect(receipt).toContainText("S/ 39.80");
  await receipt.getByRole("button", { name: "Cerrar formulario" }).click();
  await inventory(page, sku, 3);
  await navigate(page, "Panel");
  await expect(page.getByTestId("kpi-sales")).toHaveText(
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(baseline) + 39.8),
  );
  await navigate(page, "Ventas");
  await page.getByPlaceholder("Código o cliente").fill(code);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: `Ver venta ${code}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Anular venta", exact: true }).click();
  await page
    .getByLabel("Motivo de anulación")
    .fill("Verificación E2E de devolución");
  await page
    .getByRole("button", { name: "Confirmar anulación", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Anulada");
  await page.getByRole("button", { name: "Cerrar formulario" }).click();
  await inventory(page, sku, 5);
  await page.getByRole("button", { name: `Ver movimientos de ${sku}` }).click();
  await expect(page.locator(".movement-list li")).toHaveCount(3);
  await expect(page.getByRole("dialog")).toContainText("Reversión");
  await page.getByRole("button", { name: "Cerrar formulario" }).click();
  await navigate(page, "Panel");
  await expect(page.getByTestId("kpi-sales")).toHaveText(
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(baseline)),
  );
});
test("lector: reportes y navegación móvil con escrituras denegadas en la API", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "viewer");
  await page.getByRole("button", { name: "Ver período demo" }).click();
  await expect(page.getByTestId("kpi-sales")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await navigate(page, "Ventas");
  await expect(page.getByRole("button", { name: "Nueva venta" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /^Ver venta / }).first(),
  ).toBeVisible();
  const csrf = await page.request.get("/api/v1/auth/csrf");
  const token = await csrf.json();
  const response = await page.request.post("/api/v1/sales", {
    headers: { [token.headerName]: token.token },
    data: { items: [], requestKey: crypto.randomUUID() },
  });
  expect(response.status()).toBe(403);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Análisis", exact: true }),
  ).toHaveCount(0);
  const analysis = await page.request.post("/api/v1/analytics/forecast", {
    headers: { [token.headerName]: token.token },
    data: { from: "2026-07-01", to: "2026-10-21", forecastHorizonDays: 7 },
  });
  expect(analysis.status()).toBe(403);
  expect((await page.request.get("/api/v1/analytics/runs")).status()).toBe(403);
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("button", { name: "Ingresar al espacio" }),
  ).toBeVisible();
});

test("análisis real de Python: pronóstico evaluado y estado de historial insuficiente", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Análisis");
  await page.getByRole("button", { name: "Usar fechas demo" }).click();
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/analytics/forecast") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Generar análisis", exact: true })
    .click();
  const response = await pending;
  expect(response.status()).toBe(200);
  const result = await response.json();
  await expect(page.getByTestId("forecast-total")).toBeVisible();
  expect(result.predictions).toHaveLength(7);
  expect(result.evaluation.sampleSize).toBe(14);
  expect(result.trainingPeriod.days).toBe(113);
  expect(["seasonal_naive_v1", "ridge_calendar_v1"]).toContain(result.method);
  expect(Number(result.evaluation.mae)).toBeGreaterThanOrEqual(0);
  const summary = await page.request.get(
    "/api/v1/dashboard/summary?from=2026-07-01&to=2026-10-21",
  );
  expect(Number(result.summary.total)).toBe(
    Number((await summary.json()).salesTotal),
  );
  await page.getByLabel("Horizonte", { exact: true }).selectOption("14");
  await page
    .getByRole("button", { name: "Generar análisis", exact: true })
    .click();
  await expect(
    page.getByText("Estimación · 14 días", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByLabel("Desde", { exact: true }).fill("2020-01-01");
  await page.getByLabel("Hasta", { exact: true }).fill("2020-04-30");
  await page
    .getByRole("button", { name: "Generar análisis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Historial insuficiente", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("forecast-total")).toHaveCount(0);
  expect(result.runId).toMatch(/^[0-9a-f-]{36}$/);
  const saved = await page.request.get(
    "/api/v1/analytics/runs/" + result.runId,
  );
  expect(saved.status()).toBe(200);
  expect((await saved.json()).predictions).toEqual(result.predictions);
  await page.locator(".saved-analyses summary").click();
  await page
    .getByRole("button", {
      name: "Abrir análisis " + result.runId,
      exact: true,
    })
    .click();
  await expect(page.getByTestId("forecast-total")).toBeVisible();
  await expect(
    page.getByText("Estimación · 7 días", { exact: true }),
  ).toBeVisible();
});

test("apariencia persistente y accesos rápidos en escritorio y móvil", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Activar tema claro", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const password = page.getByLabel("Contraseña", { exact: true });
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Ocultar contraseña", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await login(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Activar tema oscuro", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Últimos 7 días", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Últimos 7 días", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("kpi-sales")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Nueva venta Registra productos en pocos pasos",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Nueva venta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Buscar producto", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Buscar cliente (opcional)", { exact: true }),
  ).not.toBeVisible();
  await page.getByText("Agregar cliente · opcional", { exact: true }).click();
  await expect(
    page.getByLabel("Buscar cliente (opcional)", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page, "Inventario");
  await page.getByLabel("Alerta").selectOption("true");
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.getByLabel("Alerta")).toHaveValue("false");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir menú", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
