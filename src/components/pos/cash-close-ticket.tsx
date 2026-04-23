"use client";

import {
  CashRegister,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  Sale,
} from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  getStoreName,
} from "@/lib/utils";

export interface CashCloseSummary {
  register: CashRegister;
  closedAt: string;
  sales: Sale[];
}

interface MethodTotal {
  method: PaymentMethod;
  label: string;
  count: number;
  total: number;
}

const METHOD_ORDER: PaymentMethod[] = ["efectivo", "qr", "transferencia"];

function buildMethodTotals(sales: Sale[]): MethodTotal[] {
  const buckets: Record<PaymentMethod, MethodTotal> = {
    efectivo: {
      method: "efectivo",
      label: PAYMENT_METHOD_LABELS.efectivo,
      count: 0,
      total: 0,
    },
    qr: {
      method: "qr",
      label: PAYMENT_METHOD_LABELS.qr,
      count: 0,
      total: 0,
    },
    transferencia: {
      method: "transferencia",
      label: PAYMENT_METHOD_LABELS.transferencia,
      count: 0,
      total: 0,
    },
  };
  for (const sale of sales) {
    if (!sale.payment_method) continue;
    const bucket = buckets[sale.payment_method];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.total += sale.total;
  }
  return METHOD_ORDER.map((m) => buckets[m]);
}

function formatBusinessDay(businessDay: string): string {
  // business_day is a YYYY-MM-DD string. Build it as a local date so the
  // displayed day matches the value the cashier picked.
  const [y, m, d] = businessDay.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CashCloseTicket({ summary }: { summary: CashCloseSummary }) {
  const storeName = getStoreName();
  const totals = buildMethodTotals(summary.sales);
  const grandTotal = summary.sales.reduce((sum, s) => sum + s.total, 0);
  const avgTicket =
    summary.sales.length > 0 ? grandTotal / summary.sales.length : 0;

  return (
    <div data-print-slot="cierre">
      <div className="ticket-title">{storeName}</div>
      <div className="print-center print-bold">CIERRE DE CAJA</div>
      <div className="print-center print-muted">
        {formatBusinessDay(summary.register.business_day)}
      </div>

      <div className="print-divider" />

      <div className="print-row">
        <span>Apertura</span>
        <span>{formatDateTime(summary.register.opened_at)}</span>
      </div>
      <div className="print-row">
        <span>Cierre</span>
        <span>{formatDateTime(summary.closedAt)}</span>
      </div>

      <div className="print-divider" />

      <div className="print-row">
        <span>Ventas</span>
        <span>{summary.sales.length}</span>
      </div>
      <div className="print-row">
        <span>Venta promedio</span>
        <span>{formatCurrency(avgTicket)}</span>
      </div>

      <div className="print-divider" />

      <div className="print-bold">Por método de pago</div>
      {totals.map((t) => (
        <div key={t.method} className="print-row">
          <span>
            {t.label} ({t.count})
          </span>
          <span>{formatCurrency(t.total)}</span>
        </div>
      ))}

      <div className="ticket-total">
        <span>TOTAL</span>
        <span>{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}

export function CashCloseTicketPreview({
  summary,
}: {
  summary: CashCloseSummary;
}) {
  const storeName = getStoreName();
  const totals = buildMethodTotals(summary.sales);
  const grandTotal = summary.sales.reduce((sum, s) => sum + s.total, 0);
  const avgTicket =
    summary.sales.length > 0 ? grandTotal / summary.sales.length : 0;

  return (
    <div className="mx-auto max-w-xs rounded-lg border bg-white p-4 font-mono text-sm">
      <div className="mb-3 border-b border-dashed pb-3 text-center">
        <p className="text-base font-bold">{storeName}</p>
        <p className="text-xs font-semibold uppercase tracking-wide">
          Cierre de caja
        </p>
        <p className="text-[11px] text-gray-500">
          {formatBusinessDay(summary.register.business_day)}
        </p>
      </div>

      <div className="mb-3 space-y-1 border-b border-dashed pb-3 text-xs">
        <div className="flex justify-between">
          <span>Apertura</span>
          <span>{formatTime(summary.register.opened_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cierre</span>
          <span>{formatTime(summary.closedAt)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>Fecha apertura</span>
          <span>{formatDate(summary.register.opened_at)}</span>
        </div>
      </div>

      <div className="mb-3 space-y-1 border-b border-dashed pb-3 text-xs">
        <div className="flex justify-between">
          <span>Ventas</span>
          <span>{summary.sales.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Venta promedio</span>
          <span>{formatCurrency(avgTicket)}</span>
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold">Por método de pago</div>
      <div className="space-y-1 text-xs">
        {totals.map((t) => (
          <div key={t.method} className="flex justify-between">
            <span>
              {t.label}{" "}
              <span className="text-gray-500">({t.count})</span>
            </span>
            <span>{formatCurrency(t.total)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between border-t border-dashed pt-2 text-sm font-bold">
        <span>TOTAL</span>
        <span>{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}
