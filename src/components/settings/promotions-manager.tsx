"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Pencil, Plus, Tag, Trash2 } from "lucide-react";
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
  createPromotion,
  getActiveProducts,
  getAllPromotions,
  updatePromotion,
} from "@/lib/queries";
import { Product, Promotion, PromotionItem } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

interface PromoForm {
  name: string;
  description: string;
  price: string;
  active: boolean;
  items: PromotionItem[];
}

const emptyForm: PromoForm = {
  name: "",
  description: "",
  price: "",
  active: true,
  items: [],
};

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [promos, prods] = await Promise.all([
        getAllPromotions(),
        getActiveProducts(),
      ]);
      setPromotions(promos);
      setProducts(prods);
    } catch (err) {
      console.error("Error loading promotions:", err);
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

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditing(promo);
    setForm({
      name: promo.name,
      description: promo.description || "",
      price: promo.price.toString(),
      active: promo.active,
      items: promo.items || [],
    });
    setShowDialog(true);
  };

  const addItem = (productId: string) => {
    if (!productId) return;
    const product = productMap.get(productId);
    if (!product) return;
    setForm((f) => {
      const existing = f.items.find((i) => i.product_id === productId);
      if (existing) {
        return {
          ...f,
          items: f.items.map((i) =>
            i.product_id === productId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...f,
        items: [
          ...f.items,
          { product_id: productId, name: product.name, quantity: 1 },
        ],
      };
    });
  };

  const bumpItem = (productId: string, delta: number) => {
    setForm((f) => ({
      ...f,
      items: f.items
        .map((i) =>
          i.product_id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0),
    }));
  };

  const removeItem = (productId: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((i) => i.product_id !== productId),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        items: form.items,
      };
      if (editing) {
        await updatePromotion(editing.id, {
          ...payload,
          active: form.active,
        });
      } else {
        await createPromotion(payload);
      }
      setShowDialog(false);
      await load();
    } catch (err) {
      console.error("Error saving promotion:", err);
      alert("Error al guardar la promoción.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      await updatePromotion(promo.id, { active: !promo.active });
      await load();
    } catch (err) {
      console.error("Error toggling promotion:", err);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-gray-400">Cargando…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Promociones</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {promotions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
          <Tag className="mx-auto mb-2 h-8 w-8" />
          <p>
            No hay promociones. Creá una con varios productos a precio fijo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {promotions.map((promo) => (
            <button
              key={promo.id}
              onClick={() => openEdit(promo)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/40",
                !promo.active && "opacity-50"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{promo.name}</p>
                <p className="truncate text-sm text-gray-500">
                  {formatCurrency(promo.price)}
                  {promo.items?.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      · {promo.items.length}{" "}
                      {promo.items.length === 1 ? "producto" : "productos"}
                    </span>
                  )}
                  {!promo.active && (
                    <span className="ml-2 text-xs font-medium text-red-500">
                      Inactiva
                    </span>
                  )}
                </p>
              </div>
              <Pencil className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar promoción" : "Nueva promoción"}
            </DialogTitle>
            <DialogDescription>
              Una promo tiene precio fijo y los productos que incluye.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="promo-name">Nombre</Label>
              <Input
                id="promo-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Combo familia"
              />
            </div>

            <div>
              <Label htmlFor="promo-desc">Descripción (opcional)</Label>
              <Input
                id="promo-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ej: 2 pizzas + gaseosa 1.5L"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="promo-price">Precio</Label>
                <Input
                  id="promo-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="12000"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, active: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Activa</span>
                </label>
              </div>
            </div>

            <section className="space-y-2 rounded-lg border bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Productos incluidos</h3>
                <span className="text-xs text-gray-500">
                  {form.items.length} producto
                  {form.items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div>
                <select
                  onChange={(e) => {
                    addItem(e.target.value);
                    e.currentTarget.selectedIndex = 0;
                  }}
                  className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Agregar producto…
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.category ? ` · ${p.category}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {form.items.length === 0 ? (
                <p className="rounded-md bg-white px-3 py-3 text-center text-xs text-gray-400">
                  Agregá productos para mostrar qué contiene la promo y
                  descontar stock automáticamente.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {form.items.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
                    >
                      <span className="text-sm font-medium">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => bumpItem(item.product_id, -1)}
                          className="rounded-full bg-gray-100 p-1 hover:bg-gray-200"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => bumpItem(item.product_id, 1)}
                          className="rounded-full bg-gray-100 p-1 hover:bg-gray-200"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          className="ml-1 rounded-full p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex gap-2">
              {editing && (
                <Button
                  variant="outline"
                  onClick={() => handleToggleActive(editing)}
                  disabled={saving}
                  className="flex-1"
                >
                  {editing.active ? "Desactivar" : "Activar"}
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.price}
                className="flex-1"
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
