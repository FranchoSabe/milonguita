import { Sale, SaleItem, PaymentMethod } from "./types";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface StatsKpis {
  totalRevenue: number;
  salesCount: number;
  averageTicket: number;
  uniqueCustomers: number;
  pointsEarned: number;
  pointsRedeemed: number;
}

export interface DailyBucket {
  date: string;
  label: string;
  revenue: number;
  count: number;
}

export interface ProductRanking {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  label: string;
  revenue: number;
  count: number;
}

export interface CustomerRanking {
  customer_id: string;
  revenue: number;
  visits: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function daysAgo(n: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

export function computeKpis(sales: Sale[]): StatsKpis {
  let totalRevenue = 0;
  let pointsEarned = 0;
  let pointsRedeemed = 0;
  const customers = new Set<string>();

  for (const sale of sales) {
    totalRevenue += sale.total;
    pointsEarned += sale.points_earned ?? 0;
    pointsRedeemed += sale.points_redeemed ?? 0;
    if (sale.customer_id) customers.add(sale.customer_id);
  }

  return {
    totalRevenue,
    salesCount: sales.length,
    averageTicket: sales.length > 0 ? totalRevenue / sales.length : 0,
    uniqueCustomers: customers.size,
    pointsEarned,
    pointsRedeemed,
  };
}

export function bucketByDay(
  sales: Sale[],
  range: DateRange
): DailyBucket[] {
  const start = startOfDay(range.from).getTime();
  const end = startOfDay(range.to).getTime();
  const buckets = new Map<string, DailyBucket>();

  for (let t = start; t <= end; t += DAY_MS) {
    const date = new Date(t);
    const iso = toISODate(date);
    buckets.set(iso, {
      date: iso,
      label: date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: 0,
      count: 0,
    });
  }

  for (const sale of sales) {
    const iso = toISODate(new Date(sale.created_at));
    const bucket = buckets.get(iso);
    if (bucket) {
      bucket.revenue += sale.total;
      bucket.count += 1;
    }
  }

  return Array.from(buckets.values());
}

export function rankProducts(
  sales: Sale[],
  limit = 10
): ProductRanking[] {
  const map = new Map<string, ProductRanking>();

  const bump = (
    key: string,
    name: string,
    quantity: number,
    revenue: number
  ) => {
    const existing = map.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.revenue += revenue;
    } else {
      map.set(key, { key, name, quantity, revenue });
    }
  };

  for (const sale of sales) {
    for (const rawItem of sale.items) {
      const item = rawItem as SaleItem;
      const lineRevenue = item.price * item.quantity;

      if (item.type === "pack" || item.type === "promotion") {
        // Attribute revenue to the pack/promo, quantity to its components.
        const key = item.pack_id ? `pack:${item.pack_id}` : `promo:${item.name}`;
        bump(key, item.name, item.quantity, lineRevenue);
        continue;
      }

      // Regular product: group by product_id if available, fall back to name.
      const key = item.product_id ? `product:${item.product_id}` : `name:${item.name}`;
      bump(key, item.name, item.quantity, lineRevenue);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
};

export function breakdownByPayment(sales: Sale[]): PaymentBreakdown[] {
  const buckets: Record<PaymentMethod, PaymentBreakdown> = {
    efectivo: {
      method: "efectivo",
      label: PAYMENT_LABELS.efectivo,
      revenue: 0,
      count: 0,
    },
    qr: { method: "qr", label: PAYMENT_LABELS.qr, revenue: 0, count: 0 },
    transferencia: {
      method: "transferencia",
      label: PAYMENT_LABELS.transferencia,
      revenue: 0,
      count: 0,
    },
  };

  for (const sale of sales) {
    const bucket = buckets[sale.payment_method];
    if (bucket) {
      bucket.revenue += sale.total;
      bucket.count += 1;
    }
  }

  return Object.values(buckets).filter((b) => b.count > 0);
}

export function rankCustomersInRange(
  sales: Sale[],
  limit = 5
): CustomerRanking[] {
  const map = new Map<string, CustomerRanking>();

  for (const sale of sales) {
    if (!sale.customer_id) continue;
    const existing = map.get(sale.customer_id);
    if (existing) {
      existing.revenue += sale.total;
      existing.visits += 1;
    } else {
      map.set(sale.customer_id, {
        customer_id: sale.customer_id,
        revenue: sale.total,
        visits: 1,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
