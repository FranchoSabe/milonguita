"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, Trash2, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketPreview, Ticket } from "./ticket";
import { getActiveProducts, getActivePromotions, createSale } from "@/lib/queries";
import { Product, Promotion, CartItem, Sale } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

type Step = "products" | "summary" | "success";

interface SaleModalProps {
  cashRegisterId: string;
  onClose: () => void;
  onSaleComplete: () => void;
}

export function SaleModal({
  cashRegisterId,
  onClose,
  onSaleComplete,
}: SaleModalProps) {
  const [step, setStep] = useState<Step>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("efectivo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [prods, promos] = await Promise.all([
          getActiveProducts(),
          getActivePromotions(),
        ]);
        setProducts(prods);
        setPromotions(promos);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = Array.from(
    new Set(products.map((p) => p.category || "Sin categoría"))
  );

  const filteredProducts = activeCategory
    ? products.filter((p) => (p.category || "Sin categoría") === activeCategory)
    : products;

  const addToCart = (item: { id: string; name: string; price: number; type: "product" | "promotion" }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && c.type === item.type);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, type: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id && c.type === type
            ? { ...c, quantity: c.quantity + delta }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string, type: string) => {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const sale = await createSale({
        items: cart,
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        cash_register_id: cashRegisterId,
      });
      setCompletedSale(sale);
      setStep("success");
      onSaleComplete();
    } catch (err) {
      console.error("Error creating sale:", err);
      alert("Error al registrar la venta. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-8">
          <p className="text-lg">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xl font-bold">
          {step === "products" && "Nueva Venta"}
          {step === "summary" && "Confirmar Venta"}
          {step === "success" && "Venta Registrada"}
        </h2>
        <button
          onClick={onClose}
          className="rounded-full p-2 hover:bg-gray-100"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      {step === "products" && (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Product selection */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Category filters */}
            {categories.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    activeCategory === null
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      activeCategory === cat
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      type: "product",
                    })
                  }
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:border-primary hover:shadow-md active:scale-95"
                >
                  <span className="text-sm font-semibold">{product.name}</span>
                  <span className="mt-1 text-lg font-bold text-primary">
                    {formatCurrency(product.price)}
                  </span>
                </button>
              ))}
            </div>

            {/* Promotions */}
            {promotions.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-lg font-bold text-primary">
                  Promociones
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {promotions.map((promo) => (
                    <button
                      key={promo.id}
                      onClick={() =>
                        addToCart({
                          id: promo.id,
                          name: promo.name,
                          price: promo.price,
                          type: "promotion",
                        })
                      }
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-center shadow-sm transition-all hover:border-primary hover:shadow-md active:scale-95"
                    >
                      <span className="text-sm font-semibold">
                        {promo.name}
                      </span>
                      {promo.description && (
                        <span className="mt-0.5 text-xs text-gray-500">
                          {promo.description}
                        </span>
                      )}
                      <span className="mt-1 text-lg font-bold text-primary">
                        {formatCurrency(promo.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cart sidebar */}
          <div className="flex w-full flex-col border-t bg-gray-50 lg:w-96 lg:border-l lg:border-t-0">
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="mb-3 font-bold">
                Carrito ({cart.reduce((s, c) => s + c.quantity, 0)})
              </h3>
              {cart.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Agregá productos para comenzar
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.price)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.type, -1)
                          }
                          className="rounded-full bg-gray-100 p-1.5 hover:bg-gray-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.type, 1)
                          }
                          className="rounded-full bg-gray-100 p-1.5 hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id, item.type)}
                          className="ml-1 rounded-full p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer */}
            <div className="border-t bg-white p-4">
              <div className="mb-2 flex justify-between text-lg font-bold">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {cart.length > 0 && (
                <Button
                  onClick={() => setStep("summary")}
                  className="w-full"
                  size="xl"
                >
                  Continuar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "summary" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-md space-y-6">
            {/* Items summary */}
            <div>
              <h3 className="mb-2 font-bold">Resumen</h3>
              <div className="space-y-2 rounded-lg border p-3">
                {cart.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount */}
            <div>
              <h3 className="mb-2 font-bold">Descuento</h3>
              <div className="flex items-center gap-2">
                <span className="text-lg">$</span>
                <Input
                  type="number"
                  min="0"
                  value={discount || ""}
                  onChange={(e) =>
                    setDiscount(Number(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="text-lg"
                />
              </div>
            </div>

            {/* Payment method */}
            <div>
              <h3 className="mb-2 font-bold">Método de pago</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "efectivo", label: "Efectivo" },
                  { value: "tarjeta", label: "Tarjeta" },
                  { value: "transferencia", label: "Transferencia" },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      "rounded-xl border-2 px-4 py-4 text-center text-sm font-semibold transition-all",
                      paymentMethod === method.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2 text-xl font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("products")}
                className="flex-1"
                size="lg"
              >
                Volver
              </Button>
              <Button
                onClick={handleConfirmSale}
                disabled={saving}
                className="flex-1"
                size="lg"
              >
                {saving ? "Guardando..." : "Confirmar Venta"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "success" && completedSale && (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <CheckCircle2 className="mb-4 h-20 w-20 text-green-500" />
          <h3 className="mb-2 text-2xl font-bold">Venta registrada</h3>
          <p className="mb-6 text-gray-500">
            Total: {formatCurrency(completedSale.total)}
          </p>

          <TicketPreview sale={completedSale} />

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={handlePrint} size="lg">
              <Printer className="mr-2 h-5 w-5" />
              Imprimir ticket
            </Button>
            <Button onClick={onClose} size="lg">
              Nueva venta
            </Button>
          </div>

          {/* Hidden print ticket */}
          <Ticket sale={completedSale} />
        </div>
      )}
    </div>
  );
}
