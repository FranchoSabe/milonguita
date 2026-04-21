"use client";

import { Sale, SaleItem, Customer } from "@/lib/types";
import { formatCurrency, formatDateTime, getStoreName } from "@/lib/utils";

interface TicketProps {
  sale: Sale;
  customer?: Customer | null;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
};

function shortSaleId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatOptions(item: SaleItem): string | null {
  if (!item.selected_options?.length) return null;
  return item.selected_options.map((o) => o.option_name).join(", ");
}

/**
 * Ticket para el cliente (80 mm).
 * Se imprime cuando body[data-print-mode="ticket"].
 */
export function Ticket({ sale, customer }: TicketProps) {
  const storeName = getStoreName();

  return (
    <div data-print-slot="ticket">
      <div className="ticket-title">{storeName}</div>
      <div className="print-center print-muted">
        {formatDateTime(sale.created_at)}
      </div>
      <div className="print-center print-muted">
        Ticket #{shortSaleId(sale.id)}
      </div>

      <div className="print-divider" />

      {sale.items.map((item, index) => {
        const opts = formatOptions(item as SaleItem);
        const saleItem = item as SaleItem;
        return (
          <div key={index} style={{ marginBottom: 4 }}>
            <div className="print-row">
              <span>
                {saleItem.quantity}× {saleItem.name}
              </span>
              <span>{formatCurrency(saleItem.price * saleItem.quantity)}</span>
            </div>
            {opts && (
              <div className="print-muted" style={{ marginLeft: 12 }}>
                {opts}
              </div>
            )}
            {saleItem.pack_items && saleItem.pack_items.length > 0 && (
              <div className="print-muted" style={{ marginLeft: 12 }}>
                {saleItem.pack_items
                  .map((p) => `${p.quantity}× ${p.name}`)
                  .join(", ")}
              </div>
            )}
          </div>
        );
      })}

      <div className="print-divider" />

      <div className="print-row">
        <span>Subtotal</span>
        <span>{formatCurrency(sale.subtotal)}</span>
      </div>
      {sale.discount > 0 && (
        <div className="print-row">
          <span>Descuento</span>
          <span>-{formatCurrency(sale.discount)}</span>
        </div>
      )}
      {sale.points_redeemed > 0 && (
        <div className="print-row print-muted">
          <span>(incluye canje {sale.points_redeemed} pts)</span>
          <span />
        </div>
      )}

      <div className="ticket-total">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>

      <div className="print-row" style={{ marginTop: 4 }}>
        <span>Pago</span>
        <span>{paymentMethodLabels[sale.payment_method] ?? sale.payment_method}</span>
      </div>

      {customer && (
        <>
          <div className="print-divider" />
          <div className="print-center">
            <div className="print-bold">{customer.name}</div>
            {sale.points_earned > 0 && (
              <div>Ganaste {sale.points_earned} pts</div>
            )}
            <div className="print-muted">
              Saldo: {customer.points_balance.toLocaleString("es-AR")} pts
            </div>
          </div>
        </>
      )}

      <div className="print-divider" />
      <div className="print-center print-muted">¡Gracias por su compra!</div>
    </div>
  );
}

/**
 * Preview en pantalla del ticket. No se imprime.
 * Útil para que el cajero vea el ticket antes de imprimirlo.
 */
export function TicketPreview({ sale, customer }: TicketProps) {
  const storeName = getStoreName();

  return (
    <div className="mx-auto max-w-xs rounded-lg border bg-white p-4 font-mono text-sm">
      <div className="mb-3 border-b border-dashed pb-3 text-center">
        <p className="text-base font-bold">{storeName}</p>
        <p className="text-xs text-gray-500">
          {formatDateTime(sale.created_at)}
        </p>
        <p className="text-[10px] text-gray-400">
          Ticket #{shortSaleId(sale.id)}
        </p>
      </div>

      <div className="mb-3 space-y-1 border-b border-dashed pb-3">
        {sale.items.map((item, index) => {
          const saleItem = item as SaleItem;
          const opts = formatOptions(saleItem);
          return (
            <div key={index}>
              <div className="flex justify-between text-xs">
                <span>
                  {saleItem.quantity}× {saleItem.name}
                </span>
                <span>
                  {formatCurrency(saleItem.price * saleItem.quantity)}
                </span>
              </div>
              {opts && (
                <div className="pl-3 text-[10px] text-gray-500">{opts}</div>
              )}
              {saleItem.pack_items && saleItem.pack_items.length > 0 && (
                <div className="pl-3 text-[10px] text-gray-500">
                  {saleItem.pack_items
                    .map((p) => `${p.quantity}× ${p.name}`)
                    .join(", ")}
                </div>
              )}
            </div>
          );
        })}
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
          <span>
            {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
          </span>
        </div>
      </div>

      {customer && (
        <div className="mt-3 border-t border-dashed pt-2 text-center text-xs">
          <p className="font-semibold">{customer.name}</p>
          {sale.points_earned > 0 && (
            <p className="text-green-600">+{sale.points_earned} pts</p>
          )}
          <p className="text-gray-500">
            Saldo: {customer.points_balance.toLocaleString("es-AR")} pts
          </p>
        </div>
      )}

      <div className="mt-3 text-center text-xs text-gray-400">
        ¡Gracias por su compra!
      </div>
    </div>
  );
}
