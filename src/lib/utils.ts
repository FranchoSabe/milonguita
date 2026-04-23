import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStoreName(): string {
  if (typeof window === "undefined") return "Mi Local";
  return localStorage.getItem("store_name") || "Mi Local";
}

export function formatOrderNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return `#${String(n).padStart(3, "0")}`;
}

/**
 * Builds a wa.me URL for a phone number.
 * Assumes Argentina (54) + mobile prefix (9) when the number is local.
 */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 6) return null;
  const normalized = digits.startsWith("54") ? digits : `549${digits}`;
  return `https://wa.me/${normalized}`;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function relativeLastVisit(
  iso: string | null | undefined
): string | null {
  const days = daysSince(iso);
  if (days === null) return null;
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(days / 365);
  if (years === 1) return "hace 1 año";
  return `hace ${years} años`;
}
