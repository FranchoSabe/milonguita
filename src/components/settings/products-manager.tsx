"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  GripVertical,
  Copy,
  ChevronsUpDown,
} from "lucide-react";
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

function newTempId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Trim + primera letra en mayúsculas (locale es). */
function normalizeCategory(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.charAt(0).toLocaleUpperCase("es") + t.slice(1);
}

type DraftOption = {
  tempId: string;
  name: string;
  price_delta: number;
  is_default: boolean;
};

type DraftGroup = {
  tempId: string;
  name: string;
  selection_type: OptionGroupSelectionType;
  required: boolean;
  options: DraftOption[];
};

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

interface CategoryComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  categories: string[];
}

function CategoryCombobox({
  id,
  label,
  value,
  onChange,
  categories,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim();
  const qLower = q.toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(qLower));
  }, [categories, q, qLower]);

  const hasExactMatch =
    q.length > 0 &&
    categories.some((c) => c.toLowerCase() === qLower);

  const showCreate =
    q.length > 0 && !hasExactMatch;

  const displayLabel = value || "Elegir o crear categoría…";

  return (
    <div className="relative" ref={rootRef}>
      <Label htmlFor={id}>{label}</Label>
      <button
        type="button"
        id={id}
        onClick={() => {
          setOpen((o) => !o);
          setQuery(value);
        }}
        className={cn(
          "mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !value && "text-muted-foreground"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="sticky top-0 border-b bg-background p-2">
            <Input
              autoFocus
              placeholder="Buscar o escribir nueva…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="p-1">
            {filtered.length === 0 && !showCreate && (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                No hay coincidencias.
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={value === c}
                className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {c}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="mt-1 flex w-full rounded-sm border-t px-2 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
                onClick={() => {
                  onChange(normalizeCategory(q));
                  setOpen(false);
                  setQuery("");
                }}
              >
                Crear categoría: &quot;{normalizeCategory(q)}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductsManager() {
  const [products, setProducts] = useState<ProductWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ProductWithOptions | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [draftGroups, setDraftGroups] = useState<DraftGroup[]>([]);
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

  const resetModalState = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setDraftGroups([]);
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDraftGroups([]);
    setShowDialog(true);
  };

  const openEdit = (product: ProductWithOptions) => {
    setEditing(product);
    setDraftGroups([]);
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

  const handleDialogOpenChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      resetModalState();
    }
  };

  const buildPayload = () => {
    const catRaw = form.category.trim();
    const category = catRaw ? normalizeCategory(catRaw) : null;
    return {
      name: form.name.trim(),
      price: Number(form.price),
      category,
      description: form.description.trim() || null,
      points: Number(form.points) || 0,
      stock_enabled: form.stockEnabled,
      active: editing ? form.active : true,
    };
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const payload = buildPayload();

      if (editing) {
        const updated = await updateProduct(editing.id, payload);
        setEditing({
          ...editing,
          ...updated,
          option_groups: editing.option_groups,
        });
        await load();
      } else {
        const created = await createProduct(payload);
        try {
          for (let gi = 0; gi < draftGroups.length; gi++) {
            const dg = draftGroups[gi];
            const name = dg.name.trim();
            if (!name) continue;
            const newGroup = await createOptionGroup({
              product_id: created.id,
              name,
              selection_type: dg.selection_type,
              required: dg.required,
              display_order: gi,
            });
            for (let oi = 0; oi < dg.options.length; oi++) {
              const opt = dg.options[oi];
              const oname = opt.name.trim();
              if (!oname) continue;
              await createOption({
                group_id: newGroup.id,
                name: oname,
                price_delta: Number(opt.price_delta) || 0,
                is_default: opt.is_default,
                display_order: oi,
              });
            }
          }
        } catch (cascadeErr) {
          console.error("Error creating variants after product:", cascadeErr);
          alert(
            "El producto se guardó pero hubo un error al crear algunas variantes. Podés editarlo para completarlas."
          );
          await load();
          const freshList = await getProductsWithOptions();
          const fresh = freshList.find((p) => p.id === created.id);
          if (fresh) {
            setEditing(fresh);
            setForm({
              name: fresh.name,
              category: fresh.category || "",
              price: fresh.price.toString(),
              description: fresh.description || "",
              points: fresh.points?.toString() || "0",
              stockEnabled: fresh.stock_enabled,
              active: fresh.active,
            });
            setDraftGroups([]);
          }
          return;
        }
        await load();
        setShowDialog(false);
        resetModalState();
      }
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const created = await createProduct({
        name: `${editing.name} (copia)`,
        price: editing.price,
        category: editing.category,
        description: editing.description,
        points: editing.points ?? 0,
        stock_enabled: editing.stock_enabled,
        active: false,
        display_order: editing.display_order,
      });

      for (let gi = 0; gi < editing.option_groups.length; gi++) {
        const g = editing.option_groups[gi];
        const newGroup = await createOptionGroup({
          product_id: created.id,
          name: g.name,
          selection_type: g.selection_type,
          required: g.required,
          display_order: g.display_order ?? gi,
        });
        const opts = g.options ?? [];
        for (let oi = 0; oi < opts.length; oi++) {
          const o = opts[oi];
          await createOption({
            group_id: newGroup.id,
            name: o.name,
            price_delta: o.price_delta,
            is_default: o.is_default,
            display_order: o.display_order ?? oi,
          });
        }
      }

      await load();
      const freshList = await getProductsWithOptions();
      const fresh = freshList.find((p) => p.id === created.id);
      if (fresh) {
        setEditing(fresh);
        setDraftGroups([]);
        setForm({
          name: fresh.name,
          category: fresh.category || "",
          price: fresh.price.toString(),
          description: fresh.description || "",
          points: fresh.points?.toString() || "0",
          stockEnabled: fresh.stock_enabled,
          active: fresh.active,
        });
      }
    } catch (err) {
      console.error("Error duplicating product:", err);
      alert("Error al duplicar el producto.");
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
      resetModalState();
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

      <Dialog open={showDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modificá los datos y las variantes del producto."
                : "Completá nombre, categoría y precio; podés armar variantes antes de guardar (todo en un solo paso)."}
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Datos básicos
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
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CategoryCombobox
                id="product-category"
                label="Categoría"
                value={form.category}
                onChange={(category) =>
                  setForm((f) => ({ ...f, category }))
                }
                categories={categories}
              />
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
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          {editing ? (
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
          ) : (
            <DraftOptionGroupsEditor
              groups={draftGroups}
              setGroups={setDraftGroups}
            />
          )}

          <details className="group rounded-lg border border-dashed bg-muted/30 px-3 py-2">
            <summary className="cursor-pointer list-none text-sm font-medium text-gray-700 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Más opciones
                <span className="text-xs font-normal text-muted-foreground">
                  (descripción, puntos, stock
                  {editing ? ", visible en venta" : ""})
                </span>
              </span>
            </summary>
            <div className="mt-4 space-y-4 border-t pt-4">
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
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    className="mt-1"
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
                  {editing && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, active: e.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        Activo (se muestra en venta)
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {editing?.stock_enabled && (
                <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Stock actual: <strong>{editing.stock}</strong>. Ajustalo desde
                  la sección Stock.
                </p>
              )}
            </div>
          </details>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.price}
              className="min-w-0 flex-1"
            >
              {saving
                ? "Guardando..."
                : editing
                  ? "Guardar cambios"
                  : "Guardar producto"}
            </Button>
            {editing && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDuplicate}
                  disabled={saving}
                  title="Copiar producto y variantes (inactivo hasta que lo actives)"
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Duplicar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
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

interface DraftOptionGroupsEditorProps {
  groups: DraftGroup[];
  setGroups: React.Dispatch<React.SetStateAction<DraftGroup[]>>;
}

function DraftOptionGroupsEditor({
  groups,
  setGroups,
}: DraftOptionGroupsEditorProps) {
  const [newGroupName, setNewGroupName] = useState("");

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setGroups((prev) => [
      ...prev,
      {
        tempId: newTempId(),
        name,
        selection_type: "single",
        required: true,
        options: [],
      },
    ]);
    setNewGroupName("");
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
          type="button"
          onClick={handleAddGroup}
          disabled={!newGroupName.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
          Sin variantes todavía. Podés agregarlas ahora; se guardan junto con el
          producto al pulsar &quot;Guardar producto&quot;.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <DraftGroupCard key={group.tempId} group={group} setGroups={setGroups} />
          ))}
        </div>
      )}
    </section>
  );
}

interface DraftGroupCardProps {
  group: DraftGroup;
  setGroups: React.Dispatch<React.SetStateAction<DraftGroup[]>>;
}

function DraftGroupCard({ group, setGroups }: DraftGroupCardProps) {
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("0");

  const updateGroup = (patch: Partial<DraftGroup>) => {
    setGroups((prev) =>
      prev.map((g) => (g.tempId === group.tempId ? { ...g, ...patch } : g))
    );
  };

  const removeGroup = () => {
    if (!confirm(`¿Quitar el grupo "${group.name}" y sus opciones del borrador?`))
      return;
    setGroups((prev) => prev.filter((g) => g.tempId !== group.tempId));
  };

  const handleAddOption = () => {
    const name = newOptionName.trim();
    if (!name) return;
    const price = Number(newOptionPrice) || 0;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.tempId !== group.tempId) return g;
        const isFirst = g.options.length === 0;
        return {
          ...g,
          options: [
            ...g.options,
            {
              tempId: newTempId(),
              name,
              price_delta: price,
              is_default: isFirst,
            },
          ],
        };
      })
    );
    setNewOptionName("");
    setNewOptionPrice("0");
  };

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-300" />
        <Input
          value={group.name}
          onChange={(e) => updateGroup({ name: e.target.value })}
          className="h-8 min-w-[120px] flex-1"
        />
        <select
          value={group.selection_type}
          onChange={(e) => {
            const next = e.target.value as OptionGroupSelectionType;
            updateGroup({ selection_type: next });
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="single">Uno solo</option>
          <option value="multi">Varios</option>
        </select>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={group.required}
            onChange={(e) => updateGroup({ required: e.target.checked })}
          />
          Obligatorio
        </label>
        <button
          type="button"
          onClick={removeGroup}
          className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
          aria-label="Quitar grupo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {group.options.map((option) => (
          <DraftOptionRow
            key={option.tempId}
            groupTempId={group.tempId}
            option={option}
            setGroups={setGroups}
          />
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
          type="button"
          size="sm"
          onClick={handleAddOption}
          disabled={!newOptionName.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface DraftOptionRowProps {
  groupTempId: string;
  option: DraftOption;
  setGroups: React.Dispatch<React.SetStateAction<DraftGroup[]>>;
}

function DraftOptionRow({
  groupTempId,
  option,
  setGroups,
}: DraftOptionRowProps) {
  const [name, setName] = useState(option.name);
  const [priceDelta, setPriceDelta] = useState(option.price_delta.toString());

  useEffect(() => {
    setName(option.name);
    setPriceDelta(option.price_delta.toString());
  }, [option.name, option.price_delta]);

  const patchOption = (
    updates: Partial<Pick<DraftOption, "name" | "price_delta" | "is_default">>
  ) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.tempId !== groupTempId) return g;
        let nextOptions = g.options.map((o) =>
          o.tempId === option.tempId ? { ...o, ...updates } : o
        );
        if (updates.is_default === true) {
          nextOptions = nextOptions.map((o) => ({
            ...o,
            is_default: o.tempId === option.tempId,
          }));
        }
        return { ...g, options: nextOptions };
      })
    );
  };

  const remove = () => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.tempId !== groupTempId) return g;
        const filtered = g.options.filter((o) => o.tempId !== option.tempId);
        if (filtered.length === 0) return { ...g, options: [] };
        if (!filtered.some((o) => o.is_default)) {
          return {
            ...g,
            options: filtered.map((o, i) => ({
              ...o,
              is_default: i === 0,
            })),
          };
        }
        return { ...g, options: filtered };
      })
    );
  };

  return (
    <div className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== option.name) patchOption({ name });
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
          if (v !== option.price_delta) patchOption({ price_delta: v });
        }}
        className="h-7 w-20"
      />
      <label className="flex items-center gap-1 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={option.is_default}
          onChange={(e) => {
            if (e.target.checked) {
              patchOption({ is_default: true });
            } else {
              setGroups((prev) =>
                prev.map((g) => {
                  if (g.tempId !== groupTempId) return g;
                  const next = g.options.map((o) =>
                    o.tempId === option.tempId
                      ? { ...o, is_default: false }
                      : o
                  );
                  if (!next.some((o) => o.is_default) && next.length > 0) {
                    return {
                      ...g,
                      options: next.map((o, i) => ({
                        ...o,
                        is_default: i === 0,
                      })),
                    };
                  }
                  return { ...g, options: next };
                })
              );
            }
          }}
        />
        Default
      </label>
      <button
        type="button"
        onClick={remove}
        className="rounded p-1 text-gray-400 hover:text-red-600"
        aria-label="Quitar opción"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
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
        {(group.options ?? []).map((opt) => (
          <OptionRow key={opt.id} option={opt} onChange={onChange} />
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
