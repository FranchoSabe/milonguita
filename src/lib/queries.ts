import { supabase } from "./supabase";
import { Product, Promotion, Sale, CashRegister, CartItem } from "./types";

// ============================================
// Products
// ============================================

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createProduct(
  product: Pick<Product, "name" | "price" | "category">
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
  updates: Partial<Pick<Product, "name" | "price" | "category" | "active">>
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

export async function createSale(sale: {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  cash_register_id: string;
}): Promise<Sale> {
  const saleItems = sale.items.map((item) => ({
    product_id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

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
