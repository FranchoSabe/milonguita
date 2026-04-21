"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketPreview, Ticket } from "./ticket";
import { Comanda } from "./comanda";
import { VariantPicker } from "./variant-picker";
import { PackBuilder } from "./pack-builder";
import { CustomerPicker } from "./customer-picker";
import {
  getProductsWithOptions,
  getActivePromotions,
  getActiveDynamicPacks,
  getAllProducts,
  createSale,
} from "@/lib/queries";
import {
  ProductWithOptions,
  Product,
  Promotion,
  DynamicPack,
  PackItem,
  CartItem,
  Sale,
  SelectedOption,
  PaymentMethod,
  Customer,
} from "@/lib/types";
import {
  computePointsEarned,
  getPointsConversionRate,
  pointsToCurrency,
} from "@/lib/points";
import { formatCurrency, cn } from "@/lib/utils";

type Step = "products" | "summary" | "success";

interface SaleModalProps {
  cashRegisterId: string;
  onClose: () => void;
  onSaleComplete: () => void;
}

function buildCartItemId(
  productId: string,
  selectedOptions: SelectedOption[]
): string {
  if (selectedOptions.length === 0) return productId;
  const key = selectedOptions
    .map((o) => o.option_id)
    .sort()
    .join("-");
  return `${productId}|${key}`;
}

function buildCartItemName(
  productName: string,
  selectedOptions: SelectedOption[]
): string {
  if (selectedOptions.length === 0) return productName;
  const variant = selectedOptions.map((o) => o.option_name).join(", ");
  return `${productName} (${variant})`;
}

function buildPackCartId(packId: string, items: PackItem[]): string {
  const key = items
    .slice()
    .sort((a, b) => a.product_id.localeCompare(b.product_id))
    .map((i) => `${i.product_id}x${i.quantity}`)
    .join("-");
  return `pack:${packId}|${key}`;
}

export function SaleModal({
  cashRegisterId,
  onClose,
  onSaleComplete,
}: SaleModalProps) {
  const [step, setStep] = useState<Step>("products");
  const [products, setProducts] = useState<ProductWithOptions[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [packs, setPacks] = useState<DynamicPack[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">(
    "amount"
  );
  const [discountInput, setDiscountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [variantPickerProduct, setVariantPickerProduct] =
    useState<ProductWithOptions | null>(null);
  const [packPickerPack, setPackPickerPack] = useState<DynamicPack | null>(
    null
  );
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [pointsRate, setPointsRate] = useState(10);

  useEffect(() => {
    setPointsRate(getPointsConversionRate());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [prods, allProds, promos, dpacks] = await Promise.all([
          getProductsWithOptions({ activeOnly: true }),
          getAllProducts(),
          getActivePromotions(),
          getActiveDynamicPacks(),
        ]);
        setProducts(prods);
        setAllProducts(allProds);
        setPromotions(promos);
        setPacks(dpacks);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category || "Sin categoría"))
      ),
    [products]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searching = normalizedQuery.length > 0;

  const matchesQuery = (haystack: string | null | undefined): boolean => {
    if (!searching) return true;
    return (haystack ?? "").toLowerCase().includes(normalizedQuery);
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (!searching && activeCategory) {
      result = result.filter(
        (p) => (p.category || "Sin categoría") === activeCategory
      );
    }
    if (searching) {
      result = result.filter(
        (p) => matchesQuery(p.name) || matchesQuery(p.description)
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, activeCategory, normalizedQuery]);

  const filteredPacks = useMemo(() => {
    if (!searching) return packs;
    return packs.filter(
      (p) => matchesQuery(p.name) || matchesQuery(p.category_filter)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packs, normalizedQuery]);

  const filteredPromotions = useMemo(() => {
    if (!searching) return promotions;
    return promotions.filter(
      (p) => matchesQuery(p.name) || matchesQuery(p.description)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions, normalizedQuery]);

  const addSimpleProduct = (product: ProductWithOptions) => {
    pushItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.price,
      base_price: product.price,
      quantity: 1,
      type: "product",
    });
  };

  const addProductWithVariants = (
    product: ProductWithOptions,
    selected: SelectedOption[]
  ) => {
    const extra = selected.reduce((s, o) => s + o.price_delta, 0);
    pushItem({
      id: buildCartItemId(product.id, selected),
      product_id: product.id,
      name: buildCartItemName(product.name, selected),
      price: product.price + extra,
      base_price: product.price,
      quantity: 1,
      type: "product",
      selected_options: selected,
    });
    setVariantPickerProduct(null);
  };

  const addPromotion = (promo: Promotion) => {
    pushItem({
      id: `promo:${promo.id}`,
      product_id: null,
      name: promo.name,
      price: promo.price,
      quantity: 1,
      type: "promotion",
      pack_items: promo.items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        quantity: i.quantity,
      })),
    });
  };

  const addPack = (pack: DynamicPack, items: PackItem[]) => {
    pushItem({
      id: buildPackCartId(pack.id, items),
      product_id: null,
      name: `${pack.name} (${items.map((i) => `${i.quantity}× ${i.name}`).join(", ")})`,
      price: pack.price,
      quantity: 1,
      type: "pack",
      pack_id: pack.id,
      pack_items: items,
    });
    setPackPickerPack(null);
  };

  const pushItem = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + item.quantity } : c
        );
      }
      return [...prev, item];
    });
  };

  const handleSelectProduct = (product: ProductWithOptions) => {
    if (product.option_groups.length > 0) {
      setVariantPickerProduct(product);
    } else {
      addSimpleProduct(product);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const productPointsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allProducts) {
      map.set(p.id, p.points ?? 0);
    }
    return map;
  }, [allProducts]);

  const pointsEarned = useMemo(
    () => computePointsEarned(cart, productPointsMap),
    [cart, productPointsMap]
  );

  const discountValueRaw = Number(discountInput) || 0;
  const discount = useMemo(() => {
    if (discountMode === "percent") {
      const clamped = Math.max(0, Math.min(100, discountValueRaw));
      return Math.round((subtotal * clamped) / 100);
    }
    return Math.max(0, Math.round(discountValueRaw));
  }, [discountMode, discountValueRaw, subtotal]);

  const redeemAmount = pointsToCurrency(redeemPoints);
  const totalDiscount = discount + redeemAmount;
  const total = Math.max(0, subtotal - totalDiscount);
  const maxRedeemByBalance = customer?.points_balance ?? 0;
  const maxRedeemByTotal = pointsRate > 0
    ? Math.floor(Math.max(0, subtotal - discount) / pointsRate)
    : 0;
  const maxRedeem = Math.min(maxRedeemByBalance, maxRedeemByTotal);

  // Clamp redeem points if it exceeds the customer's balance or the bill.
  useEffect(() => {
    if (redeemPoints > maxRedeem) {
      setRedeemPoints(maxRedeem);
    }
  }, [redeemPoints, maxRedeem]);

  // Reset redemption when the customer changes.
  useEffect(() => {
    setRedeemPoints(0);
  }, [customer?.id]);

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const sale = await createSale({
        items: cart,
        subtotal,
        discount: totalDiscount,
        total,
        payment_method: paymentMethod,
        cash_register_id: cashRegisterId,
        customer_id: customer?.id ?? null,
        points_earned: customer ? pointsEarned : 0,
        points_redeemed: customer ? redeemPoints : 0,
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

  const printDocument = (mode: "ticket" | "comanda") => {
    document.body.dataset.printMode = mode;
    // Wait for the browser to paint the change before launching the dialog.
    requestAnimationFrame(() => {
      window.print();
      // window.print() is synchronous; cleanup once the user closes the dialog.
      delete document.body.dataset.printMode;
    });
  };

  const printBoth = () => {
    printDocument("comanda");
    // Give the browser a tick to settle the first print before firing the next.
    setTimeout(() => printDocument("ticket"), 300);
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

      {step === "products" && (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar producto, pack o promoción…"
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!searching && categories.length > 1 && (
                <div className="flex flex-wrap gap-2">
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
            </div>

            {searching &&
              filteredProducts.length === 0 &&
              filteredPacks.length === 0 &&
              filteredPromotions.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  Sin resultados para &ldquo;{searchQuery}&rdquo;.
                </p>
              )}

            {filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:border-primary hover:shadow-md active:scale-95"
                  >
                    <span className="text-sm font-semibold">
                      {product.name}
                    </span>
                    <span className="mt-1 text-lg font-bold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                    {product.option_groups.length > 0 && (
                      <span className="mt-0.5 text-[10px] text-gray-400">
                        Con opciones
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {filteredPacks.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-lg font-bold text-primary">
                  Packs
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredPacks.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => setPackPickerPack(pack)}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-center shadow-sm transition-all hover:border-primary hover:shadow-md active:scale-95"
                    >
                      <span className="text-sm font-semibold">{pack.name}</span>
                      <span className="mt-0.5 text-xs text-gray-500">
                        {pack.total_units} unidades · {pack.category_filter}
                      </span>
                      <span className="mt-1 text-lg font-bold text-primary">
                        {formatCurrency(pack.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {filteredPromotions.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-lg font-bold text-primary">
                  Promociones
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredPromotions.map((promo) => (
                    <button
                      key={promo.id}
                      onClick={() => addPromotion(promo)}
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
                      key={item.id}
                      className="flex items-start justify-between rounded-lg bg-white p-3 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.price)} c/u
                        </p>
                      </div>
                      <div className="ml-2 flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded-full bg-gray-100 p-1.5 hover:bg-gray-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="rounded-full bg-gray-100 p-1.5 hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-0.5 rounded-full p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
            <div>
              <h3 className="mb-2 font-bold">Resumen</h3>
              <div className="space-y-2 rounded-lg border p-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
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

            <div>
              <h3 className="mb-2 font-bold">Cliente (opcional)</h3>
              <CustomerPicker selected={customer} onSelect={setCustomer} />
              {customer && (
                <p className="mt-2 text-xs text-gray-500">
                  Va a sumar{" "}
                  <span className="font-semibold text-green-600">
                    {pointsEarned.toLocaleString("es-AR")} pts
                  </span>{" "}
                  con esta venta.
                </p>
              )}
            </div>

            {customer && maxRedeem > 0 && (
              <div>
                <h3 className="mb-2 font-bold">Canjear puntos</h3>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={maxRedeem}
                    step="1"
                    value={redeemPoints || ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isNaN(n)) {
                        setRedeemPoints(0);
                      } else {
                        setRedeemPoints(
                          Math.max(0, Math.min(maxRedeem, Math.floor(n)))
                        );
                      }
                    }}
                    placeholder="0"
                    className="text-lg"
                  />
                  <span className="whitespace-nowrap text-sm text-gray-500">
                    = {formatCurrency(redeemAmount)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Saldo disponible:{" "}
                  {customer.points_balance.toLocaleString("es-AR")} pts · 1 pt ={" "}
                  {formatCurrency(pointsRate)} · máx canjeable: {maxRedeem}
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-2 font-bold">Descuento manual (opcional)</h3>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setDiscountMode("amount")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                      discountMode === "amount"
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    $
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode("percent")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                      discountMode === "percent"
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    %
                  </button>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={discountMode === "percent" ? 100 : undefined}
                  step={discountMode === "percent" ? "0.1" : "1"}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0"
                  className="text-lg"
                />
              </div>
              {discountMode === "percent" && discount > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  = {formatCurrency(discount)} sobre{" "}
                  {formatCurrency(subtotal)}
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-bold">Método de pago</h3>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "efectivo", label: "Efectivo" },
                    { value: "qr", label: "QR" },
                    { value: "transferencia", label: "Transferencia" },
                  ] as { value: PaymentMethod; label: string }[]
                ).map((method) => (
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
              {redeemAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Canje ({redeemPoints} pts):</span>
                  <span>-{formatCurrency(redeemAmount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2 text-xl font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {customer && pointsEarned > 0 && (
                <div className="mt-1 flex justify-between text-xs text-green-600">
                  <span>Puntos a ganar:</span>
                  <span>+{pointsEarned}</span>
                </div>
              )}
            </div>

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
        <div className="flex flex-1 flex-col items-center overflow-y-auto p-4">
          <CheckCircle2 className="mb-4 h-20 w-20 text-green-500" />
          <h3 className="mb-2 text-2xl font-bold">Venta registrada</h3>
          <p className="mb-6 text-gray-500">
            Total: {formatCurrency(completedSale.total)}
          </p>

          <TicketPreview sale={completedSale} customer={customer} />

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => printDocument("comanda")}
              size="lg"
            >
              <Printer className="mr-2 h-5 w-5" />
              Comanda cocina
            </Button>
            <Button
              variant="outline"
              onClick={() => printDocument("ticket")}
              size="lg"
            >
              <Printer className="mr-2 h-5 w-5" />
              Ticket cliente
            </Button>
            <Button onClick={printBoth} size="lg">
              <Printer className="mr-2 h-5 w-5" />
              Ambos
            </Button>
          </div>

          <div className="mt-4">
            <Button variant="ghost" onClick={onClose} size="lg">
              Nueva venta
            </Button>
          </div>

          <Ticket sale={completedSale} customer={customer} />
          <Comanda sale={completedSale} />
        </div>
      )}

      <VariantPicker
        product={variantPickerProduct}
        onAdd={addProductWithVariants}
        onClose={() => setVariantPickerProduct(null)}
      />

      <PackBuilder
        pack={packPickerPack}
        allProducts={allProducts}
        onAdd={addPack}
        onClose={() => setPackPickerPack(null)}
      />
    </div>
  );
}
