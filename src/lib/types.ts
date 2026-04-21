export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  active: boolean;
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

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "promotion";
}

export type PaymentMethod = "efectivo" | "qr" | "transferencia";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  qr: "QR / Mercado Pago",
  transferencia: "Transferencia",
};

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  created_at: string;
  cash_register_id: string;
}

export interface SaleItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  total_sales: number;
  status: "open" | "closed";
}
