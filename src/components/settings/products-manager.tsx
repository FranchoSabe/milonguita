"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Package, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getProductsWithOptions,
  createProduct,
  updateProduct,
  deleteProduct,
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  createOption,
  updateOption,
  deleteOption,
} from "@/lib/queries";
import {
  ProductWithOptions,
  ProductOptionGroup,
  ProductOption,
  OptionGroupSelectionType,
} from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

interface ProductFormState {
  name: string;
  category: string;
  price: string;
  description: string;
  points: string;
  stockEnabled: boolean;
  active: boolean;
}

const emptyForm: ProductFormState = {
  name: "",
  category: "",
  price: "",
  description: "",
  points: "0",
  stockEnabled: false,
  active: true,
};

export function ProductsManager() {
  const [products, setProducts] = useState<ProductWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ProductWithOptions | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProductsWithOptions();
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err);
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

  const grouped = useMemo(() => {
    const byCategory = new Map<string, ProductWithOptions[]>();
    for (const p of products) {
      const key = p.category || "Sin categoría";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(p);
    }
    return Array.from(byCategory.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [products]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (product: ProductWithOptions) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category || "",
      price: product.price.toString(),
      description: product.description || "",
      points: product.points?.toString() || "0",
      stockEnabled: product.stock_enabled,
      active: product.active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        points: Number(form.points) || 0,
        stock_enabled: form.stockEnabled,
        active: form.active,
      };

      if (editing) {
        const updated = await updateProduct(editing.id, payload);
        setEditing({
          ...editing,
          ...updated,
          option_groups: editing.option_groups,
        });
      } else {
        const created = await createProduct(payload);
        const newWithOptions: ProductWithOptions = {
          ...created,
          option_groups: [],
        };
        setEditing(newWithOptions);
        setProducts((prev) => [...prev, newWithOptions]);
      }
      await load();
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`¿Eliminar "${editing.name}"? No se puede deshacer.`)) return;
    try {
      await deleteProduct(editing.id);
      setShowDialog(false);
      await load();
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Error al eliminar el producto.");
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-gray-400">Cargando productos…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Productos</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
          <Package className="mx-auto mb-2 h-8 w-8" />
          <p>No hay productos. Agregá uno para comenzar.</p>
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
                    onClick={() => openEdit(product)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/40",
                      !product.active && "opacity-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(product.price)}
                        {product.points > 0 && (
                          <span className="ml-2 text-xs font-medium text-amber-600">
                            +{product.points} pts
                          </span>
                        )}
                        {product.stock_enabled && (
                          <span className="ml-2 text-xs font-medium text-blue-600">
                            Stock: {product.stock}
                          </span>
                        )}
                        {product.option_groups.length > 0 && (
                          <span className="ml-2 text-xs text-gray-400">
                            · {product.option_groups.length}{" "}
                            {product.option_groups.length === 1
                              ? "grupo"
                              : "grupos"}{" "}
                            de opciones
                          </span>
                        )}
                      </p>
                    </div>
                    <Pencil className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modificá los datos y las variantes del producto."
                : "Completá los datos y guardá para poder agregar variantes."}
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Datos del producto
            </h3>

            <div>
              <Label htmlFor="product-name">Nombre</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Pizza muzzarella"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="product-category">Categoría</Label>
                <Input
                  id="product-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="Ej: Pizzas"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="product-price">Precio base</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="5500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="product-description">
                Descripción (opcional)
              </Label>
              <Input
                id="product-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ej: salsa de tomate, mozzarella, orégano"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="product-points">
                  Puntos de fidelidad por unidad
                </Label>
                <Input
                  id="product-points"
                  type="number"
                  min="0"
                  step="1"
                  value={form.points}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, points: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.stockEnabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stockEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Controlar stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, active: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Activo (se muestra en venta)</span>
                </label>
              </div>
            </div>

            {editing?.stock_enabled && (
              <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Stock actual: <strong>{editing.stock}</strong>. Ajustalo desde
                la sección Stock.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price}
                className="flex-1"
              >
                {saving
                  ? "Guardando..."
                  : editing
                    ? "Guardar cambios"
                    : "Guardar producto"}
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
          </section>

          {editing && (
            <OptionGroupsEditor
              product={editing}
              onChange={async () => {
                await load();
                const fresh = (await getProductsWithOptions()).find(
                  (p) => p.id === editing.id
                );
                if (fresh) setEditing(fresh);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface OptionGroupsEditorProps {
  product: ProductWithOptions;
  onChange: () => Promise<void>;
}

function OptionGroupsEditor({ product, onChange }: OptionGroupsEditorProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [working, setWorking] = useState(false);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setWorking(true);
    try {
      await createOptionGroup({
        product_id: product.id,
        name: newGroupName.trim(),
        selection_type: "single",
        required: true,
        display_order: product.option_groups.length,
      });
      setNewGroupName("");
      await onChange();
    } catch (err) {
      console.error("Error creating group:", err);
      alert("No se pudo agregar el grupo.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="mt-4 space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Opciones / variantes
      </h3>

      <div className="flex gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder='Nombre del grupo (ej: "Masa", "Salsa")'
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddGroup();
            }
          }}
        />
        <Button
          onClick={handleAddGroup}
          disabled={working || !newGroupName.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {product.option_groups.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
          Sin variantes. Este producto se vende tal cual al precio base.
        </p>
      ) : (
        <div className="space-y-3">
          {product.option_groups.map((group) => (
            <OptionGroupCard
              key={group.id}
              group={group}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface OptionGroupCardProps {
  group: ProductOptionGroup;
  onChange: () => Promise<void>;
}

function OptionGroupCard({ group, onChange }: OptionGroupCardProps) {
  const [editingName, setEditingName] = useState(group.name);
  const [selectionType, setSelectionType] = useState<OptionGroupSelectionType>(
    group.selection_type
  );
  const [required, setRequired] = useState(group.required);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("0");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setEditingName(group.name);
    setSelectionType(group.selection_type);
    setRequired(group.required);
  }, [group]);

  const commitGroup = async (
    updates: Partial<
      Pick<
        ProductOptionGroup,
        "name" | "selection_type" | "required" | "display_order"
      >
    >
  ) => {
    try {
      await updateOptionGroup(group.id, updates);
      await onChange();
    } catch (err) {
      console.error("Error updating group:", err);
      alert("No se pudo actualizar el grupo.");
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !confirm(
        `¿Eliminar el grupo "${group.name}" y todas sus opciones?`
      )
    )
      return;
    try {
      await deleteOptionGroup(group.id);
      await onChange();
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("No se pudo eliminar el grupo.");
    }
  };

  const handleAddOption = async () => {
    if (!newOptionName.trim()) return;
    setWorking(true);
    try {
      await createOption({
        group_id: group.id,
        name: newOptionName.trim(),
        price_delta: Number(newOptionPrice) || 0,
        is_default: (group.options?.length ?? 0) === 0,
        display_order: group.options?.length ?? 0,
      });
      setNewOptionName("");
      setNewOptionPrice("0");
      await onChange();
    } catch (err) {
      console.error("Error creating option:", err);
      alert("No se pudo agregar la opción.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-300" />
        <Input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={() => {
            if (editingName !== group.name) {
              commitGroup({ name: editingName });
            }
          }}
          className="h-8 flex-1 min-w-[120px]"
        />
        <select
          value={selectionType}
          onChange={(e) => {
            const next = e.target.value as OptionGroupSelectionType;
            setSelectionType(next);
            commitGroup({ selection_type: next });
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="single">Uno solo</option>
          <option value="multi">Varios</option>
        </select>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => {
              setRequired(e.target.checked);
              commitGroup({ required: e.target.checked });
            }}
          />
          Obligatorio
        </label>
        <button
          type="button"
          onClick={handleDeleteGroup}
          className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
          aria-label="Eliminar grupo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {(group.options ?? []).map((option) => (
          <OptionRow key={option.id} option={option} onChange={onChange} />
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          value={newOptionName}
          onChange={(e) => setNewOptionName(e.target.value)}
          placeholder="Nombre de la opción"
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddOption();
            }
          }}
        />
        <Input
          type="number"
          step="0.01"
          value={newOptionPrice}
          onChange={(e) => setNewOptionPrice(e.target.value)}
          placeholder="Recargo"
          className="h-8 w-24"
        />
        <Button
          size="sm"
          onClick={handleAddOption}
          disabled={working || !newOptionName.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface OptionRowProps {
  option: ProductOption;
  onChange: () => Promise<void>;
}

function OptionRow({ option, onChange }: OptionRowProps) {
  const [name, setName] = useState(option.name);
  const [priceDelta, setPriceDelta] = useState(option.price_delta.toString());

  useEffect(() => {
    setName(option.name);
    setPriceDelta(option.price_delta.toString());
  }, [option.name, option.price_delta]);

  const commit = async (
    updates: Partial<Pick<ProductOption, "name" | "price_delta" | "is_default">>
  ) => {
    try {
      await updateOption(option.id, updates);
      await onChange();
    } catch (err) {
      console.error("Error updating option:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la opción "${option.name}"?`)) return;
    try {
      await deleteOption(option.id);
      await onChange();
    } catch (err) {
      console.error("Error deleting option:", err);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== option.name) commit({ name });
        }}
        className="h-7 flex-1 border-transparent bg-transparent"
      />
      <span className="text-xs text-gray-400">+</span>
      <Input
        type="number"
        step="0.01"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        onBlur={() => {
          const v = Number(priceDelta) || 0;
          if (v !== option.price_delta) commit({ price_delta: v });
        }}
        className="h-7 w-20"
      />
      <label className="flex items-center gap-1 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={option.is_default}
          onChange={(e) => commit({ is_default: e.target.checked })}
        />
        Default
      </label>
      <button
        type="button"
        onClick={handleDelete}
        className="rounded p-1 text-gray-400 hover:text-red-600"
        aria-label="Eliminar opción"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
