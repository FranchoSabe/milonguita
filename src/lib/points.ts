import { CartItem } from "./types";

export const POINTS_CONVERSION_STORAGE_KEY = "points_conversion_rate";
export const DEFAULT_POINTS_CONVERSION_RATE = 10; // 1 punto = $10 por defecto

export function getPointsConversionRate(): number {
  if (typeof window === "undefined") return DEFAULT_POINTS_CONVERSION_RATE;
  const raw = window.localStorage.getItem(POINTS_CONVERSION_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_POINTS_CONVERSION_RATE;
}

export function setPointsConversionRate(rate: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POINTS_CONVERSION_STORAGE_KEY, String(rate));
}

export function pointsToCurrency(points: number): number {
  return points * getPointsConversionRate();
}

export function currencyToPoints(amount: number): number {
  const rate = getPointsConversionRate();
  return rate > 0 ? Math.floor(amount / rate) : 0;
}

export function computePointsEarned(
  items: CartItem[],
  productPointsMap: Map<string, number>
): number {
  let total = 0;
  for (const item of items) {
    if (item.type === "product" && item.product_id) {
      total += item.quantity * (productPointsMap.get(item.product_id) ?? 0);
      continue;
    }
    if ((item.type === "pack" || item.type === "promotion") && item.pack_items) {
      for (const sub of item.pack_items) {
        total +=
          item.quantity *
          sub.quantity *
          (productPointsMap.get(sub.product_id) ?? 0);
      }
    }
  }
  return total;
}
