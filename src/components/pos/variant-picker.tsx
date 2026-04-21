"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProductOption,
  ProductOptionGroup,
  ProductWithOptions,
  SelectedOption,
} from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

interface VariantPickerProps {
  product: ProductWithOptions | null;
  onAdd: (
    product: ProductWithOptions,
    selected: SelectedOption[]
  ) => void;
  onClose: () => void;
}

function buildInitialSelection(
  product: ProductWithOptions
): Record<string, string[]> {
  const initial: Record<string, string[]> = {};
  for (const group of product.option_groups) {
    const defaults = (group.options ?? [])
      .filter((o) => o.is_default)
      .map((o) => o.id);
    if (group.selection_type === "single") {
      initial[group.id] = defaults.slice(0, 1);
    } else {
      initial[group.id] = defaults;
    }
  }
  return initial;
}

function computeExtra(
  product: ProductWithOptions,
  selection: Record<string, string[]>
): number {
  let extra = 0;
  for (const group of product.option_groups) {
    const ids = selection[group.id] ?? [];
    for (const opt of group.options ?? []) {
      if (ids.includes(opt.id)) extra += opt.price_delta;
    }
  }
  return extra;
}

function validate(
  product: ProductWithOptions,
  selection: Record<string, string[]>
): string | null {
  for (const group of product.option_groups) {
    if (group.required && (selection[group.id]?.length ?? 0) === 0) {
      return `Elegí una opción en "${group.name}".`;
    }
  }
  return null;
}

export function VariantPicker({ product, onAdd, onClose }: VariantPickerProps) {
  const [selection, setSelection] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (product) {
      setSelection(buildInitialSelection(product));
    }
  }, [product]);

  const extra = useMemo(
    () => (product ? computeExtra(product, selection) : 0),
    [product, selection]
  );

  const finalPrice = (product?.price ?? 0) + extra;
  const validationError = product ? validate(product, selection) : null;

  const toggleOption = (group: ProductOptionGroup, option: ProductOption) => {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selection_type === "single") {
        return { ...prev, [group.id]: [option.id] };
      }
      if (current.includes(option.id)) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== option.id),
        };
      }
      return { ...prev, [group.id]: [...current, option.id] };
    });
  };

  const handleAdd = () => {
    if (!product) return;
    const selectedOptions: SelectedOption[] = [];
    for (const group of product.option_groups) {
      const ids = selection[group.id] ?? [];
      for (const opt of group.options ?? []) {
        if (ids.includes(opt.id)) {
          selectedOptions.push({
            group_id: group.id,
            group_name: group.name,
            option_id: opt.id,
            option_name: opt.name,
            price_delta: opt.price_delta,
          });
        }
      }
    }
    onAdd(product, selectedOptions);
  };

  return (
    <Dialog
      open={!!product}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
          <DialogDescription>
            Precio base {formatCurrency(product?.price ?? 0)}
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-4">
            {product.option_groups.map((group) => (
              <div key={group.id}>
                <h3 className="mb-2 text-sm font-semibold">
                  {group.name}
                  {group.required ? (
                    <span className="ml-1 text-xs font-normal text-red-500">
                      *
                    </span>
                  ) : (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      (opcional)
                    </span>
                  )}
                  {group.selection_type === "multi" && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      podés elegir varios
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(group.options ?? []).map((option) => {
                    const active = (selection[group.id] ?? []).includes(
                      option.id
                    );
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(group, option)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left transition-all",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className="text-sm font-medium">
                          {option.name}
                        </span>
                        {option.price_delta !== 0 && (
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              option.price_delta > 0
                                ? "text-primary"
                                : "text-green-600"
                            )}
                          >
                            {option.price_delta > 0 ? "+" : "−"}
                            {formatCurrency(Math.abs(option.price_delta))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium">Precio unitario</span>
              <span className="text-lg font-bold">
                {formatCurrency(finalPrice)}
              </span>
            </div>

            {validationError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {validationError}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!!validationError}
                className="flex-1"
              >
                Agregar al carrito
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
