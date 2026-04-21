"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Pencil, Plus, Trash2 } from "lucide-react";
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
  createDynamicPack,
  deleteDynamicPack,
  getActiveProducts,
  getAllDynamicPacks,
  updateDynamicPack,
} from "@/lib/queries";
import { DynamicPack, Product } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

interface PackForm {
  name: string;
  price: string;
  total_units: string;
  category_filter: string;
  points: string;
  active: boolean;
}

const emptyForm: PackForm = {
  name: "",
  price: "",
  total_units: "6",
  category_filter: "",
  points: "0",
  active: true,
};

export function DynamicPacksManager() {
  const [packs, setPacks] = useState<DynamicPack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<DynamicPack | null>(null);
  const [form, setForm] = useState<PackForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, prods] = await Promise.all([
        getAllDynamicPacks(),
        getActiveProducts(),
      ]);
      setPacks(p);
      setProducts(prods);
    } catch (err) {
      console.error("Error loading packs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  const productsInCategory = useCallback(
    (category: string) =>
      products.filter(
        (p) => p.category && p.category.toLowerCase() === category.toLowerCase()
      ),
    [products]
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (pack: DynamicPack) => {
    setEditing(pack);
    setForm({
      name: pack.name,
      price: pack.price.toString(),
      total_units: pack.total_units.toString(),
      category_filter: pack.category_filter,
      points: pack.points.toString(),
      active: pack.active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (
      !form.name.trim() ||
      !form.price ||
      !form.total_units ||
      !form.category_filter.trim()
    )
      return;
    const units = Number(form.total_units);
    if (!Number.isFinite(units) || units <= 0) {
      alert("Las unidades totales deben ser mayores a 0.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        total_units: units,
        category_filter: form.category_filter.trim(),
        points: Number(form.points) || 0,
        active: form.active,
      };
      if (editing) {
        await updateDynamicPack(editing.id, payload);
      } else {
        await createDynamicPack(payload);
      }
      setShowDialog(false);
      await load();
    } catch (err) {
      console.error("Error saving pack:", err);
      alert("Error al guardar el pack.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`¿Eliminar el pack "${editing.name}"?`)) return;
    try {
      await deleteDynamicPack(editing.id);
      setShowDialog(false);
      await load();
    } catch (err) {
      console.error("Error deleting pack:", err);
      alert("No se pudo eliminar.");
    }
  };

  const matchingProductsCount = form.category_filter
    ? productsInCategory(form.category_filter).length
    : 0;

  if (loading) {
    return <p className="py-8 text-center text-gray-400">Cargando…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Packs dinámicos</h2>
          <p className="text-xs text-gray-500">
            El vendedor arma el mix al venderlos (ej: docena de empanadas).
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {packs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
          <Box className="mx-auto mb-2 h-8 w-8" />
          <p>
            No hay packs. Creá uno para ofrecer combos con mix libre (ej:
            &quot;Media docena de empanadas&quot;).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => openEdit(pack)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/40",
                !pack.active && "opacity-50"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{pack.name}</p>
                <p className="truncate text-sm text-gray-500">
                  {formatCurrency(pack.price)} · {pack.total_units} unidades ·{" "}
                  {pack.category_filter}
                  {pack.points > 0 && (
                    <span className="ml-2 text-xs font-medium text-amber-600">
                      +{pack.points} pts bonus
                    </span>
                  )}
                  {!pack.active && (
                    <span className="ml-2 text-xs font-medium text-red-500">
                      Inactivo
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pack" : "Nuevo pack"}</DialogTitle>
            <DialogDescription>
              Un pack tiene precio fijo y un total de unidades que el vendedor
              reparte entre los productos de una categoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pack-name">Nombre</Label>
              <Input
                id="pack-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Media docena de empanadas"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pack-price">Precio</Label>
                <Input
                  id="pack-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="4200"
                />
              </div>
              <div>
                <Label htmlFor="pack-units">Unidades totales</Label>
                <Input
                  id="pack-units"
                  type="number"
                  min="1"
                  step="1"
                  value={form.total_units}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, total_units: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pack-category">Categoría de productos</Label>
              <Input
                id="pack-category"
                value={form.category_filter}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category_filter: e.target.value }))
                }
                placeholder="Ej: Empanadas"
                list="pack-category-options"
              />
              <datalist id="pack-category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {form.category_filter && (
                <p className="mt-1 text-xs text-gray-500">
                  {matchingProductsCount === 0
                    ? "⚠️ No hay productos activos en esta categoría."
                    : `${matchingProductsCount} producto${matchingProductsCount === 1 ? "" : "s"} disponible${matchingProductsCount === 1 ? "" : "s"} para el mix.`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pack-points">Puntos bonus</Label>
                <Input
                  id="pack-points"
                  type="number"
                  min="0"
                  step="1"
                  value={form.points}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, points: e.target.value }))
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Extra además de los puntos de cada producto.
                </p>
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
                  <span className="text-sm">Activo</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.name.trim() ||
                  !form.price ||
                  !form.total_units ||
                  !form.category_filter.trim()
                }
                className="flex-1"
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
              {editing && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
