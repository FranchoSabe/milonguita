"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, History, Package, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllProducts,
  getRecentStockMovements,
  applyStockMovement,
} from "@/lib/queries";
import { Product, StockMovement, StockMovementType } from "@/lib/types";
import { formatDateTime, cn } from "@/lib/utils";

type Tab = "products" | "history";
type Action = "ingress" | "adjustment";

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  ingress: "Ingreso",
  adjustment: "Ajuste",
  sale: "Venta",
  correction: "Corrección",
};

export default function StockPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Product | null>(null);
  const [action, setAction] = useState<Action>("ingress");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prods, hist] = await Promise.all([
        getAllProducts(),
        getRecentStockMovements(100),
      ]);
      setProducts(prods.filter((p) => p.stock_enabled));
      setMovements(hist);
    } catch (err) {
      console.error("Error loading stock:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category || "Sin categoría";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(p);
    }
    return Array.from(byCategory.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [products]);

  const openAction = (product: Product) => {
    setSelected(product);
    setAction("ingress");
    setQuantity("");
    setReason("");
  };

  const closeAction = () => setSelected(null);

  const handleSubmit = async () => {
    if (!selected) return;
    const qty = Number(quantity);
    if (!qty || Number.isNaN(qty)) {
      alert("Ingresá una cantidad válida.");
      return;
    }

    const delta = action === "ingress" ? Math.abs(qty) : qty;
    if (action === "adjustment" && delta === 0) {
      alert("El ajuste debe ser distinto de 0.");
      return;
    }

    setSaving(true);
    try {
      await applyStockMovement({
        product_id: selected.id,
        movement_type: action,
        quantity_delta: delta,
        reason: reason.trim() || null,
      });
      closeAction();
      await load();
    } catch (err) {
      console.error("Error applying stock movement:", err);
      alert("No se pudo registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Cargando stock...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Stock</h1>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {[
          { key: "products" as Tab, label: "Productos", icon: Package },
          { key: "history" as Tab, label: "Historial", icon: History },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div>
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
              <Settings2 className="mx-auto mb-2 h-8 w-8" />
              <p>
                Ningún producto tiene stock habilitado. Activalo desde
                Configuración → Productos.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => openAction(product)}
                        className="flex w-full items-center justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/40"
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            Stock actual
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-2xl font-bold tabular-nums",
                            product.stock <= 0
                              ? "text-red-600"
                              : product.stock < 5
                                ? "text-amber-600"
                                : "text-gray-900"
                          )}
                        >
                          {product.stock}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div>
          {movements.length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              Sin movimientos registrados.
            </p>
          ) : (
            <div className="space-y-1.5">
              {movements.map((m) => {
                const product = productMap.get(m.product_id);
                const isIngress = m.quantity_delta > 0;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {product?.name || "Producto eliminado"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {MOVEMENT_LABELS[m.movement_type]}
                        {m.reason && ` · ${m.reason}`}
                        {" · "}
                        {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex items-center gap-1 font-bold tabular-nums",
                          isIngress ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {isIngress ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                        {Math.abs(m.quantity_delta)}
                      </span>
                      {m.balance_after !== null && (
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          = {m.balance_after}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              Stock actual:{" "}
              <strong className="tabular-nums">{selected?.stock ?? 0}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction("ingress")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border-2 px-4 py-3 transition",
                  action === "ingress"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600"
                )}
              >
                <ArrowUp className="h-5 w-5" />
                <span className="text-sm font-semibold">Ingreso</span>
              </button>
              <button
                type="button"
                onClick={() => setAction("adjustment")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border-2 px-4 py-3 transition",
                  action === "adjustment"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-600"
                )}
              >
                <Settings2 className="h-5 w-5" />
                <span className="text-sm font-semibold">Ajuste</span>
              </button>
            </div>

            <div>
              <Label htmlFor="qty">
                {action === "ingress"
                  ? "Cantidad a ingresar"
                  : "Ajuste (+/-)"}
              </Label>
              <Input
                id="qty"
                type="number"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={action === "ingress" ? "10" : "-3 o 5"}
                autoFocus
              />
              {action === "adjustment" && (
                <p className="mt-1 text-xs text-gray-500">
                  Usá negativo para descontar (ej: -3), positivo para sumar.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reason">
                Motivo {action === "adjustment" ? "(recomendado)" : "(opcional)"}
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  action === "ingress"
                    ? "Ej: compra, producción, proveedor"
                    : "Ej: merma, rotura, conteo físico"
                }
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={saving || !quantity}
              className="w-full"
            >
              {saving ? "Guardando..." : "Registrar movimiento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
