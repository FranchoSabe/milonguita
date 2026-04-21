"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DynamicPack, Product, PackItem } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

interface PackBuilderProps {
  pack: DynamicPack | null;
  allProducts: Product[];
  onAdd: (pack: DynamicPack, items: PackItem[]) => void;
  onClose: () => void;
}

export function PackBuilder({
  pack,
  allProducts,
  onAdd,
  onClose,
}: PackBuilderProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setCounts({});
  }, [pack]);

  const candidates = useMemo(() => {
    if (!pack) return [];
    return allProducts.filter(
      (p) =>
        p.active &&
        p.category &&
        p.category.toLowerCase() === pack.category_filter.toLowerCase()
    );
  }, [pack, allProducts]);

  const selectedTotal = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  if (!pack) return null;

  const remaining = pack.total_units - selectedTotal;
  const isComplete = remaining === 0;

  const bump = (productId: string, delta: number) => {
    setCounts((prev) => {
      const next = (prev[productId] ?? 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      if (selectedTotal + delta > pack.total_units) return prev;
      return { ...prev, [productId]: next };
    });
  };

  const handleAdd = () => {
    if (!isComplete) return;
    const items: PackItem[] = candidates
      .filter((p) => (counts[p.id] ?? 0) > 0)
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        quantity: counts[p.id],
      }));
    onAdd(pack, items);
  };

  return (
    <Dialog
      open={!!pack}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pack.name}</DialogTitle>
          <DialogDescription>
            Armá el mix: {pack.total_units} unidades · {formatCurrency(pack.price)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <div className="mb-1 flex justify-between text-sm font-medium">
              <span>Seleccionadas</span>
              <span>
                {selectedTotal} / {pack.total_units}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isComplete ? "bg-green-500" : "bg-primary"
                )}
                style={{
                  width: `${(selectedTotal / pack.total_units) * 100}%`,
                }}
              />
            </div>
          </div>

          {candidates.length === 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No hay productos activos en la categoría &quot;{pack.category_filter}&quot;.
            </p>
          )}

          <div className="space-y-2">
            {candidates.map((product) => {
              const count = counts[product.id] ?? 0;
              const canAdd = selectedTotal < pack.total_units;
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    {product.stock_enabled && (
                      <p className="text-xs text-gray-500">
                        Stock: {product.stock}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bump(product.id, -1)}
                      disabled={count === 0}
                      className="rounded-full bg-gray-100 p-1.5 disabled:opacity-30 hover:bg-gray-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold tabular-nums">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => bump(product.id, 1)}
                      disabled={!canAdd}
                      className="rounded-full bg-gray-100 p-1.5 disabled:opacity-30 hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!isComplete && selectedTotal > 0 && (
            <p className="text-sm text-gray-500">
              Faltan {remaining} para completar el pack.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!isComplete}
              className="flex-1"
            >
              Agregar al carrito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
