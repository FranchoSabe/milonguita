"use client";

import { Sale, SaleItem } from "@/lib/types";
import { formatTime, getStoreName } from "@/lib/utils";

interface ComandaProps {
  sale: Sale;
}

function shortSaleId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function variantLine(item: SaleItem): string | null {
  if (!item.selected_options?.length) return null;
  return item.selected_options.map((o) => o.option_name).join(" · ");
}

/**
 * Comanda para cocina (80 mm).
 * Prioriza cantidades grandes y variantes; sin precios ni totales.
 */
export function Comanda({ sale }: ComandaProps) {
  const storeName = getStoreName();

  return (
    <div data-print-slot="comanda">
      <div className="comanda-title">COMANDA</div>
      <div className="print-center print-muted">{storeName}</div>
      <div
        className="print-row print-muted"
        style={{ marginTop: 4, borderBottom: "1px dashed #000", paddingBottom: 4 }}
      >
        <span>#{shortSaleId(sale.id)}</span>
        <span>{formatTime(sale.created_at)}</span>
      </div>

      <div style={{ marginTop: 8 }}>
        {sale.items.map((item, index) => {
          const saleItem = item as SaleItem;
          const variant = variantLine(saleItem);
          return (
            <div key={index} className="comanda-item">
              <div>
                <span className="comanda-qty">{saleItem.quantity}</span>
                <span className="comanda-name">{saleItem.name}</span>
              </div>

              {variant && (
                <div className="comanda-variant print-bold">{variant}</div>
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
