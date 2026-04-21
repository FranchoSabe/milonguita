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

export async function openCashRegister(): Promise<CashRegister> {
  const { data, error } = await supabase
    .from("cash_registers")
    .insert({ status: "open", total_sales: 0 })
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

export async function createSale(sale: {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  cash_register_id: string;
}): Promise<Sale> {
  const saleItems = sale.items.map(cartItemToSaleItem);

  const { data, error } = await supabase
    .from("sales")
    .insert({
      items: saleItems,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      payment_method: sale.payment_method,
      cash_register_id: sale.cash_register_id,
    })
    .select()
    .single();

  if (error) throw error;

  // Deduct stock in a best-effort pass. A failure here should not abort the
  // sale because the register is already booked; surface the failure to the
  // caller via console so they can reconcile manually.
  try {
    const relevantIds = sale.items
      .flatMap((it) => [
        it.product_id,
        ...(it.pack_items?.map((p) => p.product_id) ?? []),
      ])
      .filter((id): id is string => Boolean(id));

    if (relevantIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, stock_enabled")
        .in("id", Array.from(new Set(relevantIds)));

      const enabled = new Set(
        (products ?? [])
          .filter((p: Pick<Product, "id" | "stock_enabled">) => p.stock_enabled)
          .map((p: Pick<Product, "id">) => p.id)
      );

      const deductions = collectStockDeductions(sale.items, enabled);
      for (const d of deductions) {
        await supabase.rpc("apply_stock_movement", {
          p_product_id: d.product_id,
          p_movement_type: "sale",
          p_quantity_delta: -d.quantity,
          p_reason: d.reason,
          p_sale_id: data.id,
        });
      }
    }
  } catch (err) {
    console.error("Stock deduction failed for sale", data.id, err);
  }

  return data;
}

export async function getTodaySales(
  cashRegisterId: string
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("cash_register_id", cashRegisterId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSalesByDateRange(
  from: string,
  to: string
): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
