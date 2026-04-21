"use client";

import { Sale } from "@/lib/types";
import { formatCurrency, formatDateTime, getStoreName } from "@/lib/utils";

interface TicketProps {
  sale: Sale;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
};

export function Ticket({ sale }: TicketProps) {
  const storeName = getStoreName();

  return (
    <div id="ticket-print" className="hidden print:block">
      <div className="ticket-header">
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>{storeName}</div>
        <div style={{ marginTop: "4px" }}>
          {formatDateTime(sale.created_at)}
        </div>
      </div>

      <div className="ticket-items">
        {sale.items.map((item, index) => (
          <div key={index} className="ticket-item">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="ticket-totals">
        <div className="ticket-total-line">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="ticket-total-line">
            <span>Descuento:</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
        )}
        <div className="ticket-total-line ticket-total-final">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        <div className="ticket-total-line" style={{ marginTop: "8px" }}>
          <span>Pago:</span>
          <span>{paymentMethodLabels[sale.payment_method]}</span>
        </div>
      </div>

      <div className="ticket-footer">
        <p>Gracias por su compra</p>
      </div>
    </div>
  );
}

export function TicketPreview({ sale }: TicketProps) {
  const storeName = getStoreName();

  return (
    <div className="mx-auto max-w-xs rounded-lg border bg-white p-4 font-mono text-sm">
      <div className="mb-3 border-b border-dashed pb-3 text-center">
        <p className="text-base font-bold">{storeName}</p>
        <p className="text-xs text-gray-500">
          {formatDateTime(sale.created_at)}
        </p>
      </div>

      <div className="mb-3 space-y-1 border-b border-dashed pb-3">
        {sale.items.map((item, index) => (
          <div key={index} className="flex justify-between text-xs">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-xs text-red-500">
            <span>Descuento:</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-dashed pt-1 text-sm font-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Pago:</span>
          <span>{paymentMethodLabels[sale.payment_method]}</span>
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-gray-400">
        Gracias por su compra
      </div>
    </div>
  );
}
