"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Package,
  Users,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Venta", icon: ShoppingCart },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/reports", label: "Caja", icon: Receipt },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Config", icon: Settings },
];

const HIDDEN_PATHS = ["/login", "/auth"];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white print:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-6 w-6" />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  );
}
