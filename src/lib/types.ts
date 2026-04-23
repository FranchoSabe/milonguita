export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  points: number;
  stock: number;
  stock_enabled: boolean;
  display_order: number;
  active: boolean;
  created_at: string;
}

export type OptionGroupSelectionType = "single" | "multi";

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  selection_type: OptionGroupSelectionType;
  required: boolean;
  display_order: number;
  created_at: string;
  options?: ProductOption[];
}

export interface ProductOption {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  display_order: number;
  created_at: string;
}

export interface ProductWithOptions extends Product {
  option_groups: ProductOptionGroup[];
}

export type StockMovementType = "ingress" | "adjustment" | "sale" | "correction";

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_delta: number;
  reason: string | null;
  sale_id: string | null;
  balance_after: number | null;
  created_at: string;
}

export interface DynamicPack {
  id: string;
  name: string;
  price: number;
  total_units: number;
  category_filter: string;
  points: number;
  active: boolean;
  display_order: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  price: number;
  items: PromotionItem[];
  active: boolean;
  created_at: string;
}

export interface PromotionItem {
  product_id: string;
  name: string;
  quantity: number;
}

export interface SelectedOption {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price_delta: number;
}

export interface PackItem {
  product_id: string;
  name: string;
  quantity: number;
}

export type CartItemType = "product" | "promotion" | "pack";

export interface CartItem {
  id: string;
  product_id: string | null;
  name: string;
  price: number;
  base_price?: number;
  quantity: number;
  type: CartItemType;
  selected_options?: SelectedOption[];
  pack_id?: string;
  pack_items?: PackItem[];
}

export type PaymentMethod = "efectivo" | "qr" | "transferencia";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  qr: "QR / Mercado Pago",
  transferencia: "Transferencia",
};

export type OrderStatus = "open" | "paid" | "voided";

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  status: OrderStatus;
  paid_at: string | null;
  order_number: number | null;
  customer_name: string | null;
  created_at: string;
  cash_register_id: string;
  customer_id: string | null;
  points_earned: number;
  points_redeemed: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  points_balance: number;
  total_spent: number;
  visits: number;
  last_visit_at: string | null;
  created_at: string;
}

export type PointsMovementType = "earn" | "redeem" | "adjustment";

export interface CustomerPointsHistory {
  id: string;
  customer_id: string;
  sale_id: string | null;
  movement_type: PointsMovementType;
  points_delta: number;
  reason: string | null;
  balance_after: number | null;
  created_at: string;
}

export interface SaleItem {
  product_id: string | null;
  name: string;
  price: number;
  base_price?: number;
  quantity: number;
  type?: CartItemType;
  selected_options?: SelectedOption[];
  pack_id?: string;
  pack_items?: PackItem[];
}

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  total_sales: number;
  status: "open" | "closed";
  business_day: string;
}
