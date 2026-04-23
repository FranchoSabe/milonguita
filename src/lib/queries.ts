import { supabase } from "./supabase";
import {
  Product,
  ProductOptionGroup,
  ProductOption,
  ProductWithOptions,
  StockMovement,
  StockMovementType,
  DynamicPack,
  Promotion,
  Sale,
  SaleItem,
  CashRegister,
  CartItem,
  PaymentMethod,
  Customer,
  CustomerPointsHistory,
  PointsMovementType,
} from "./types";

// ============================================
// Products
// ============================================

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getProductsWithOptions(params?: {
  activeOnly?: boolean;
}): Promise<ProductWithOptions[]> {
  const query = supabase
    .from("products")
    .select(
      `*, option_groups:product_option_groups(
        id, product_id, name, selection_type, required, display_order, created_at,
        options:product_options(id, group_id, name, price_delta, is_default, display_order, created_at)
      )`
    )
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });

  const { data, error } = params?.activeOnly
    ? await query.eq("active", true)
    : await query;

  if (error) throw error;

  return (data || []).map((p) => ({
    ...p,
    option_groups: (p.option_groups || [])
      .slice()
      .sort(
        (a: ProductOptionGroup, b: ProductOptionGroup) =>
          a.display_order - b.display_order
      )
      .map((g: ProductOptionGroup) => ({
        ...g,
        options: (g.options || [])
          .slice()
          .sort(
            (a: ProductOption, b: ProductOption) =>
              a.display_order - b.display_order
          ),
      })),
  })) as ProductWithOptions[];
}

export type ProductWriteInput = Partial<
  Pick<
    Product,
    | "name"
    | "price"
    | "category"
    | "description"
    | "points"
    | "stock"
    | "stock_enabled"
    | "display_order"
    | "active"
  >
>;

export async function createProduct(
  product: ProductWriteInput & { name: string; price: number }
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  updates: ProductWriteInput
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// Product option groups + options
// ============================================

export async function createOptionGroup(
  input: Pick<
    ProductOptionGroup,
    "product_id" | "name" | "selection_type" | "required" | "display_order"
  >
): Promise<ProductOptionGroup> {
  const { data, error } = await supabase
    .from("product_option_groups")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOptionGroup(
  id: string,
  updates: Partial<
    Pick<
      ProductOptionGroup,
      "name" | "selection_type" | "required" | "display_order"
    >
  >
): Promise<ProductOptionGroup> {
  const { data, error } = await supabase
    .from("product_option_groups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOptionGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from("product_option_groups")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function createOption(
  input: Pick<
    ProductOption,
    "group_id" | "name" | "price_delta" | "is_default" | "display_order"
  >
): Promise<ProductOption> {
  const { data, error } = await supabase
    .from("product_options")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOption(
  id: string,
  updates: Partial<
    Pick<ProductOption, "name" | "price_delta" | "is_default" | "display_order">
  >
): Promise<ProductOption> {
  const { data, error } = await supabase
    .from("product_options")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOption(id: string): Promise<void> {
  const { error } = await supabase.from("product_options").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// Stock movements
// ============================================

export async function applyStockMovement(input: {
  product_id: string;
  movement_type: StockMovementType;
  quantity_delta: number;
  reason?: string | null;
  sale_id?: string | null;
}): Promise<StockMovement> {
  const { data, error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: input.product_id,
    p_movement_type: input.movement_type,
    p_quantity_delta: input.quantity_delta,
    p_reason: input.reason ?? null,
    p_sale_id: input.sale_id ?? null,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function getRecentStockMovements(
  limit = 50
): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getStockMovementsForProduct(
  productId: string,
  limit = 100
): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================
// Dynamic packs
// ============================================

export async function getActiveDynamicPacks(): Promise<DynamicPack[]> {
  const { data, error } = await supabase
    .from("dynamic_packs")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAllDynamicPacks(): Promise<DynamicPack[]> {
  const { data, error } = await supabase
    .from("dynamic_packs")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export type DynamicPackWriteInput = Partial<
  Pick<
    DynamicPack,
    | "name"
    | "price"
    | "total_units"
    | "category_filter"
    | "points"
    | "active"
    | "display_order"
  >
>;

export async function createDynamicPack(
  pack: DynamicPackWriteInput & {
    name: string;
    price: number;
    total_units: number;
    category_filter: string;
  }
): Promise<DynamicPack> {
  const { data, error } = await supabase
    .from("dynamic_packs")
    .insert(pack)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDynamicPack(
  id: string,
  updates: DynamicPackWriteInput
): Promise<DynamicPack> {
  const { data, error } = await supabase
    .from("dynamic_packs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDynamicPack(id: string): Promise<void> {
  const { error } = await supabase.from("dynamic_packs").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// Promotions
// ============================================

export async function getActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createPromotion(
  promotion: Pick<Promotion, "name" | "description" | "price" | "items">
): Promise<Promotion> {
  const { data, error } = await supabase
    .from("promotions")
    .insert(promotion)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePromotion(
  id: string,
  updates: Partial<
    Pick<Promotion, "name" | "description" | "price" | "items" | "active">
  >
): Promise<Promotion> {
  const { data, error } = await supabase
    .from("promotions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Cash Registers
// ============================================

export async function getOpenCashRegister(): Promise<CashRegister | null> {
  const { data, error } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getCashRegisterByBusinessDay(
  businessDay: string
): Promise<CashRegister | null> {
  const { data, error } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("business_day", businessDay)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function openCashRegister(
  businessDay: string
): Promise<CashRegister> {
  const existing = await getCashRegisterByBusinessDay(businessDay);
  if (existing) {
    throw new Error(
      existing.status === "open"
        ? "Ya hay una caja abierta para ese día."
        : "Ya existe una caja cerrada para ese día."
    );
  }

  const { data, error } = await supabase
    .from("cash_registers")
    .insert({ status: "open", total_sales: 0, business_day: businessDay })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function closeCashRegister(
  id: string,
  totalSales: number
): Promise<CashRegister> {
  const { data, error } = await supabase
    .from("cash_registers")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      total_sales: totalSales,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Sales
// ============================================

function cartItemToSaleItem(item: CartItem): SaleItem {
  return {
    product_id: item.product_id,
    name: item.name,
    price: item.price,
    base_price: item.base_price,
    quantity: item.quantity,
    type: item.type,
    selected_options: item.selected_options,
    pack_id: item.pack_id,
    pack_items: item.pack_items,
  };
}

interface StockDeduction {
  product_id: string;
  quantity: number;
  reason: string;
}

function collectStockDeductions(
  items: CartItem[],
  stockEnabledIds: Set<string>
): StockDeduction[] {
  const deductions = new Map<string, StockDeduction>();

  const push = (productId: string, quantity: number, reason: string) => {
    if (!stockEnabledIds.has(productId)) return;
    const existing = deductions.get(productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      deductions.set(productId, { product_id: productId, quantity, reason });
    }
  };

  for (const item of items) {
    if (item.type === "product" && item.product_id) {
      push(item.product_id, item.quantity, `Venta: ${item.name}`);
      continue;
    }

    if ((item.type === "pack" || item.type === "promotion") && item.pack_items) {
      for (const sub of item.pack_items) {
        push(
          sub.product_id,
          sub.quantity * item.quantity,
          `Venta (${item.name}): ${sub.name}`
        );
      }
    }
  }

  return Array.from(deductions.values());
}

// ----- Stock helpers for orders -----

async function getStockEnabledIds(items: CartItem[]): Promise<Set<string>> {
  const relevantIds = items
    .flatMap((it) => [
      it.product_id,
      ...(it.pack_items?.map((p) => p.product_id) ?? []),
    ])
    .filter((id): id is string => Boolean(id));
  if (relevantIds.length === 0) return new Set();
  const { data } = await supabase
    .from("products")
    .select("id, stock_enabled")
    .in("id", Array.from(new Set(relevantIds)));
  return new Set(
    (data ?? [])
      .filter((p: Pick<Product, "id" | "stock_enabled">) => p.stock_enabled)
      .map((p: Pick<Product, "id">) => p.id)
  );
}

async function deductStockForOrder(saleId: string, items: CartItem[]) {
  const enabled = await getStockEnabledIds(items);
  if (enabled.size === 0) return;
  const deductions = collectStockDeductions(items, enabled);
  for (const d of deductions) {
    await supabase.rpc("apply_stock_movement", {
      p_product_id: d.product_id,
      p_movement_type: "sale",
      p_quantity_delta: -d.quantity,
      p_reason: d.reason,
      p_sale_id: saleId,
    });
  }
}

// Undo every stock movement previously written for this order by applying
// a compensating positive movement per product. Used on void or before
// re-deducting after an edit.
async function reverseStockForOrder(saleId: string) {
  const { data: movements } = await supabase
    .from("stock_movements")
    .select("product_id, quantity_delta")
    .eq("sale_id", saleId);
  if (!movements || movements.length === 0) return;
  const netByProduct = new Map<string, number>();
  for (const m of movements as { product_id: string; quantity_delta: number }[]) {
    netByProduct.set(
      m.product_id,
      (netByProduct.get(m.product_id) ?? 0) + m.quantity_delta
    );
  }
  for (const [productId, net] of Array.from(netByProduct.entries())) {
    if (net >= 0) continue;
    await supabase.rpc("apply_stock_movement", {
      p_product_id: productId,
      p_movement_type: "correction",
      p_quantity_delta: -net,
      p_reason: `Reversión de orden ${saleId.slice(0, 8)}`,
      p_sale_id: saleId,
    });
  }
}

// ----- Orders (sales lifecycle) -----

async function nextOrderNumber(cashRegisterId: string): Promise<number> {
  const { data } = await supabase
    .from("sales")
    .select("order_number")
    .eq("cash_register_id", cashRegisterId)
    .not("order_number", "is", null)
    .order("order_number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.order_number ?? 0;
  return last + 1;
}

export async function createOrder(input: {
  items: CartItem[];
  cash_register_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
}): Promise<Sale> {
  const saleItems = input.items.map(cartItemToSaleItem);
  const subtotal = input.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  const orderNumber = await nextOrderNumber(input.cash_register_id);

  const { data, error } = await supabase
    .from("sales")
    .insert({
      items: saleItems,
      subtotal,
      discount: 0,
      total: subtotal,
      payment_method: null,
      status: "open",
      order_number: orderNumber,
      customer_name: input.customer_name ?? null,
      cash_register_id: input.cash_register_id,
      customer_id: input.customer_id ?? null,
      points_earned: 0,
      points_redeemed: 0,
    })
    .select()
    .single();

  if (error) throw error;

  try {
    await deductStockForOrder(data.id, input.items);
  } catch (err) {
    console.error("Stock deduction failed for order", data.id, err);
  }

  return data;
}

export async function updateOrderItems(
  saleId: string,
  items: CartItem[]
): Promise<Sale> {
  const saleItems = items.map(cartItemToSaleItem);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const { data, error } = await supabase
    .from("sales")
    .update({
      items: saleItems,
      subtotal,
      total: subtotal,
      discount: 0,
    })
    .eq("id", saleId)
    .eq("status", "open")
    .select()
    .single();

  if (error) throw error;

  try {
    await reverseStockForOrder(saleId);
    await deductStockForOrder(saleId, items);
  } catch (err) {
    console.error("Stock reconciliation failed for order", saleId, err);
  }

  return data;
}

export async function updateOrderCustomer(
  saleId: string,
  input: { customer_id: string | null; customer_name: string | null }
): Promise<Sale> {
  const { data, error } = await supabase
    .from("sales")
    .update({
      customer_id: input.customer_id,
      customer_name: input.customer_name,
    })
    .eq("id", saleId)
    .eq("status", "open")
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function voidOpenOrder(saleId: string): Promise<void> {
  try {
    await reverseStockForOrder(saleId);
  } catch (err) {
    console.error("Stock reversal failed for order", saleId, err);
  }
  const { error } = await supabase
    .from("sales")
    .update({ status: "voided" })
    .eq("id", saleId)
    .eq("status", "open");
  if (error) throw error;
}

export async function payOrder(input: {
  sale_id: string;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  customer_id?: string | null;
  customer_name?: string | null;
  points_earned?: number;
  points_redeemed?: number;
}): Promise<Sale> {
  const { data, error } = await supabase
    .from("sales")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: input.payment_method,
      discount: input.discount,
      total: input.total,
      customer_id: input.customer_id ?? null,
      customer_name: input.customer_name ?? null,
      points_earned: input.points_earned ?? 0,
      points_redeemed: input.points_redeemed ?? 0,
    })
    .eq("id", input.sale_id)
    .eq("status", "open")
    .select()
    .single();

  if (error) throw error;

  if (input.customer_id) {
    try {
      await supabase.rpc("register_sale_for_customer", {
        p_customer_id: input.customer_id,
        p_sale_id: input.sale_id,
        p_amount: input.total,
      });
      if ((input.points_earned ?? 0) > 0) {
        await supabase.rpc("apply_points_movement", {
          p_customer_id: input.customer_id,
          p_movement_type: "earn",
          p_points_delta: input.points_earned,
          p_reason: `Venta ${input.sale_id.slice(0, 8)}`,
          p_sale_id: input.sale_id,
        });
      }
      if ((input.points_redeemed ?? 0) > 0) {
        await supabase.rpc("apply_points_movement", {
          p_customer_id: input.customer_id,
          p_movement_type: "redeem",
          p_points_delta: -input.points_redeemed!,
          p_reason: `Canje en venta ${input.sale_id.slice(0, 8)}`,
          p_sale_id: input.sale_id,
        });
      }
    } catch (err) {
      console.error("Loyalty update failed for order", input.sale_id, err);
    }
  }

  return data;
}

// Moves a paid order back to open state so the cashier can modify it. The
// original payment metadata is wiped on purpose (the user explicitly asked
// not to preserve the prior cobro). Loyalty side-effects are reversed on a
// best-effort basis; visits cannot be decremented via the existing RPC so
// that counter may drift slightly if the same customer's order is reopened.
export async function reopenPaidOrder(saleId: string): Promise<Sale> {
  const { data: existing, error: fetchErr } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .eq("status", "paid")
    .single();
  if (fetchErr) throw fetchErr;
  const prior = existing as Sale;

  if (prior.customer_id) {
    try {
      await supabase.rpc("register_sale_for_customer", {
        p_customer_id: prior.customer_id,
        p_sale_id: saleId,
        p_amount: -prior.total,
      });
      if ((prior.points_earned ?? 0) > 0) {
        await supabase.rpc("apply_points_movement", {
          p_customer_id: prior.customer_id,
          p_movement_type: "adjustment",
          p_points_delta: -prior.points_earned,
          p_reason: `Anulación venta ${saleId.slice(0, 8)}`,
          p_sale_id: saleId,
        });
      }
      if ((prior.points_redeemed ?? 0) > 0) {
        await supabase.rpc("apply_points_movement", {
          p_customer_id: prior.customer_id,
          p_movement_type: "adjustment",
          p_points_delta: prior.points_redeemed,
          p_reason: `Reversión canje venta ${saleId.slice(0, 8)}`,
          p_sale_id: saleId,
        });
      }
    } catch (err) {
      console.error("Loyalty reversal failed for order", saleId, err);
    }
  }

  const { data, error } = await supabase
    .from("sales")
    .update({
      status: "open",
      payment_method: null,
      paid_at: null,
      discount: 0,
      total: prior.subtotal,
      points_earned: 0,
      points_redeemed: 0,
    })
    .eq("id", saleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOpenOrders(
  cashRegisterId: string
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "open")
    .order("order_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getPaidOrders(
  cashRegisterId: string
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================
// Customers + loyalty
// ============================================

export async function getAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const term = query.trim();
  if (!term) return getAllCustomers();
  const pattern = `%${term}%`;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type CustomerWriteInput = Partial<
  Pick<Customer, "name" | "phone" | "email" | "notes">
>;

export async function createCustomer(
  input: CustomerWriteInput & { name: string }
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(
  id: string,
  updates: CustomerWriteInput
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

export async function getCustomerPointsHistory(
  customerId: string,
  limit = 100
): Promise<CustomerPointsHistory[]> {
  const { data, error } = await supabase
    .from("customer_points_history")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getCustomerSales(
  customerId: string,
  limit = 100
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function applyManualPointsAdjustment(input: {
  customer_id: string;
  points_delta: number;
  reason?: string | null;
}): Promise<CustomerPointsHistory> {
  const movementType: PointsMovementType = "adjustment";
  const { data, error } = await supabase.rpc("apply_points_movement", {
    p_customer_id: input.customer_id,
    p_movement_type: movementType,
    p_points_delta: input.points_delta,
    p_reason: input.reason ?? null,
    p_sale_id: null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// Paid sales only. Used by Estado de caja for today's totals.
export async function getTodayPaidSales(
  cashRegisterId: string
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Paid sales whose register is closed AND whose business_day falls in
// [from, to]. Used by /stats so the currently-open register and
// open/voided orders are excluded.
export async function getClosedRegisterSalesByBusinessDayRange(
  from: string,
  to: string
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, cash_register:cash_registers!inner(business_day, status)")
    .eq("status", "paid")
    .eq("cash_register.status", "closed")
    .gte("cash_register.business_day", from)
    .lte("cash_register.business_day", to)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => {
    const typed = row as Sale & {
      cash_register?: { business_day: string; status: string };
    };
    delete typed.cash_register;
    return typed as Sale;
  });
}
