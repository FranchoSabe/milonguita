"use client";

import { Sale, SaleItem } from "@/lib/types";
import { formatTime, getStoreName } from "@/lib/utils";

interface ComandaProps {
  sale: Sale;
  variant?: "full" | "delta";
}

function orderLabel(sale: Sale): string {
  if (sale.order_number != null) {
    return `#${String(sale.order_number).padStart(3, "0")}`;
  }
  return `#${sale.id.slice(0, 8).toUpperCase()}`;
}

function variantLine(item: SaleItem): string | null {
  if (!item.selected_options?.length) return null;
  return item.selected_options.map((o) => o.option_name).join(" · ");
}

/**
 * Comanda para cocina (80 mm).
 * Prioriza cantidades grandes y variantes; sin precios ni totales.
 */
export function Comanda({ sale, variant = "full" }: ComandaProps) {
  const storeName = getStoreName();
  const title = variant === "delta" ? "COMANDA (AGREGADO)" : "COMANDA";

  return (
    <div data-print-slot="comanda">
      <div className="comanda-title">{title}</div>
      <div className="print-center print-muted">{storeName}</div>
      {sale.customer_name && (
        <div className="print-center print-bold" style={{ marginTop: 2 }}>
          {sale.customer_name}
        </div>
      )}
      <div
        className="print-row print-muted"
        style={{ marginTop: 4, borderBottom: "1px dashed #000", paddingBottom: 4 }}
      >
        <span>{orderLabel(sale)}</span>
        <span>{formatTime(sale.created_at)}</span>
      </div>

      <div style={{ marginTop: 8 }}>
        {sale.items.map((item, index) => {
          const saleItem = item as SaleItem;
          const vline = variantLine(saleItem);
          return (
            <div key={index} className="comanda-item">
              <div>
                <span className="comanda-qty">{saleItem.quantity}</span>
                <span className="comanda-name">{saleItem.name}</span>
              </div>

              {vline && (
                <div className="comanda-variant print-bold">{vline}</div>
              )}

              {saleItem.pack_items && saleItem.pack_items.length > 0 && (
                <div className="comanda-sub">
                  {saleItem.pack_items.map((p, i) => (
                    <div key={i}>
                      · {p.quantity}× {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
