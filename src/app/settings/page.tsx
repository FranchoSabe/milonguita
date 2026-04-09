"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Store,
  Package,
  Tag,
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
  getAllProducts,
  createProduct,
  updateProduct,
  getAllPromotions,
  createPromotion,
  updatePromotion,
} from "@/lib/queries";
import { Product, Promotion } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

type Tab = "products" | "promotions" | "general";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Promotion form
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoName, setPromoName] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);

  // General
  const [storeName, setStoreName] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [prods, promos] = await Promise.all([
        getAllProducts(),
        getAllPromotions(),
      ]);
      setProducts(prods);
      setPromotions(promos);
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setStoreName(localStorage.getItem("store_name") || "Mi Local");
  }, [loadData]);

  // Product handlers
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductName("");
    setProductPrice("");
    setProductCategory("");
    setShowProductDialog(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductCategory(product.category || "");
    setShowProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!productName || !productPrice) return;
    setSavingProduct(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: productName,
          price: Number(productPrice),
          category: productCategory || null,
        });
      } else {
        await createProduct({
          name: productName,
          price: Number(productPrice),
          category: productCategory || null,
        });
      }
      setShowProductDialog(false);
      await loadData();
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Error al guardar el producto.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProduct = async (product: Product) => {
    try {
      await updateProduct(product.id, { active: !product.active });
      await loadData();
    } catch (err) {
      console.error("Error toggling product:", err);
    }
  };

  // Promotion handlers
  const openNewPromo = () => {
    setEditingPromo(null);
    setPromoName("");
    setPromoDescription("");
    setPromoPrice("");
    setShowPromoDialog(true);
  };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoName(promo.name);
    setPromoDescription(promo.description || "");
    setPromoPrice(promo.price.toString());
    setShowPromoDialog(true);
  };

  const handleSavePromo = async () => {
    if (!promoName || !promoPrice) return;
    setSavingPromo(true);
    try {
      if (editingPromo) {
        await updatePromotion(editingPromo.id, {
          name: promoName,
          description: promoDescription || null,
          price: Number(promoPrice),
        });
      } else {
        await createPromotion({
          name: promoName,
          description: promoDescription || null,
          price: Number(promoPrice),
          items: [],
        });
      }
      setShowPromoDialog(false);
      await loadData();
    } catch (err) {
      console.error("Error saving promotion:", err);
      alert("Error al guardar la promoción.");
    } finally {
      setSavingPromo(false);
    }
  };

  const handleTogglePromo = async (promo: Promotion) => {
    try {
      await updatePromotion(promo.id, { active: !promo.active });
      await loadData();
    } catch (err) {
      console.error("Error toggling promotion:", err);
    }
  };

  // General handlers
  const handleSaveStoreName = () => {
    localStorage.setItem("store_name", storeName);
    alert("Nombre del local guardado.");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Configuración</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {[
          { key: "products" as Tab, label: "Productos", icon: Package },
          { key: "promotions" as Tab, label: "Promociones", icon: Tag },
          { key: "general" as Tab, label: "General", icon: Store },
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

      {/* Products Tab */}
      {tab === "products" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Productos</h2>
            <Button onClick={openNewProduct} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm",
                  !product.active && "opacity-50"
                )}
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(product.price)}
                    {product.category && ` · ${product.category}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditProduct(product)}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleProduct(product)}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    {product.active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="py-8 text-center text-gray-400">
                No hay productos. Agregá uno para comenzar.
              </p>
            )}
          </div>

          {/* Product dialog */}
          <Dialog
            open={showProductDialog}
            onOpenChange={setShowProductDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Modificá los datos del producto."
                    : "Completá los datos del nuevo producto."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-name">Nombre</Label>
                  <Input
                    id="product-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ej: Empanada de carne"
                  />
                </div>
                <div>
                  <Label htmlFor="product-price">Precio</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="Ej: 800"
                  />
                </div>
                <div>
                  <Label htmlFor="product-category">
                    Categoría (opcional)
                  </Label>
                  <Input
                    id="product-category"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    placeholder="Ej: Empanadas"
                  />
                </div>
                <Button
                  onClick={handleSaveProduct}
                  disabled={savingProduct || !productName || !productPrice}
                  className="w-full"
                >
                  {savingProduct ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Promotions Tab */}
      {tab === "promotions" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Promociones</h2>
            <Button onClick={openNewPromo} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm",
                  !promo.active && "opacity-50"
                )}
              >
                <div>
                  <p className="font-medium">{promo.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(promo.price)}
                    {promo.description && ` · ${promo.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditPromo(promo)}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTogglePromo(promo)}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    {promo.active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {promotions.length === 0 && (
              <p className="py-8 text-center text-gray-400">
                No hay promociones. Agregá una para comenzar.
              </p>
            )}
          </div>

          {/* Promotion dialog */}
          <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPromo
                    ? "Editar Promoción"
                    : "Nueva Promoción"}
                </DialogTitle>
                <DialogDescription>
                  {editingPromo
                    ? "Modificá los datos de la promoción."
                    : "Completá los datos de la nueva promoción."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="promo-name">Nombre</Label>
                  <Input
                    id="promo-name"
                    value={promoName}
                    onChange={(e) => setPromoName(e.target.value)}
                    placeholder="Ej: Combo empanadas"
                  />
                </div>
                <div>
                  <Label htmlFor="promo-description">
                    Descripción (opcional)
                  </Label>
                  <Input
                    id="promo-description"
                    value={promoDescription}
                    onChange={(e) => setPromoDescription(e.target.value)}
                    placeholder="Ej: 6 empanadas + bebida"
                  />
                </div>
                <div>
                  <Label htmlFor="promo-price">Precio</Label>
                  <Input
                    id="promo-price"
                    type="number"
                    min="0"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(e.target.value)}
                    placeholder="Ej: 4500"
                  />
                </div>
                <Button
                  onClick={handleSavePromo}
                  disabled={savingPromo || !promoName || !promoPrice}
                  className="w-full"
                >
                  {savingPromo ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* General Tab */}
      {tab === "general" && (
        <div className="max-w-md">
          <h2 className="mb-4 text-lg font-semibold">General</h2>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4">
              <Label htmlFor="store-name">Nombre del local</Label>
              <p className="mb-2 text-xs text-gray-500">
                Se muestra en el ticket de impresión
              </p>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ej: Mi Local de Comida"
              />
            </div>
            <Button onClick={handleSaveStoreName}>Guardar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
