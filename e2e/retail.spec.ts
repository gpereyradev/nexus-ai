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
async function inventory(page: Page, sku: string, stock: number) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Inventario", exact: true })
    .click();
  await page.getByPlaceholder("Nombre o SKU").fill(sku);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByTestId("stock")).toHaveText(String(stock));
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
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Productos", exact: true })
    .click();
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
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Ventas", exact: true })
    .click();
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
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Panel", exact: true })
    .click();
  await expect(page.getByTestId("kpi-sales")).toHaveText(
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(baseline) + 39.8),
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Ventas", exact: true })
    .click();
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
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Panel", exact: true })
    .click();
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
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Ventas", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("button", { name: "Ingresar al espacio" }),
  ).toBeVisible();
});
