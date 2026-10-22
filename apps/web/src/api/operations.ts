export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: string;
  minStock: number;
  active: boolean;
  stock: number;
  lowStock: boolean;
};
export type Movement = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  saleId: string | null;
  saleCode: string | null;
  actor: string;
  createdAt: string;
};
export type SaleSummary = {
  id: string;
  code: string;
  customerId: string | null;
  customerName: string | null;
  total: string;
  status: "CONFIRMED" | "CANCELLED";
  occurredAt: string;
  actor: string;
};
export type SaleItem = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  subtotal: string;
};
export type SaleDetail = SaleSummary & {
  currency: "PEN";
  items: SaleItem[];
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
};
export const movementLabels: Record<string, string> = {
  ENTRY: "Ingreso",
  ADJUSTMENT: "Ajuste",
  SALE: "Venta",
  REVERSAL: "Reversión",
};
export const currency = (value: string | number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    Number(value),
  );
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
export function cents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}
export function estimate(lines: { price: string; quantity: number }[]): bigint {
  return lines.reduce(
    (sum, line) => sum + cents(line.price) * BigInt(line.quantity),
    0n,
  );
}
export const MAX_TOTAL_CENTS = 999999999999n;
export function limaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function daysBefore(date: string, days: number): string {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}
