"use client";

import { useEffect, useState } from "react";
import { Box, Package, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
import { ProductsManager } from "@/components/settings/products-manager";
import { PromotionsManager } from "@/components/settings/promotions-manager";
import { DynamicPacksManager } from "@/components/settings/dynamic-packs-manager";
import {
  DEFAULT_POINTS_CONVERSION_RATE,
  getPointsConversionRate,
  setPointsConversionRate,
} from "@/lib/points";

type Tab = "products" | "promotions" | "packs" | "general";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [storeName, setStoreName] = useState("");
  const [pointsRate, setPointsRate] = useState(
    DEFAULT_POINTS_CONVERSION_RATE.toString()
  );

  useEffect(() => {
    setStoreName(localStorage.getItem("store_name") || "Mi Local");
    setPointsRate(getPointsConversionRate().toString());
  }, []);

  const handleSaveStoreName = () => {
    localStorage.setItem("store_name", storeName);
    alert("Nombre del local guardado.");
  };

  const handleSavePointsRate = () => {
    const rate = Number(pointsRate);
    if (!rate || rate <= 0 || Number.isNaN(rate)) {
      alert("Ingresá un valor mayor a 0.");
      return;
    }
    setPointsConversionRate(rate);
    alert("Conversión de puntos guardada.");
  };

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "products", label: "Productos", icon: Package },
    { key: "promotions", label: "Promos", icon: Tag },
    { key: "packs", label: "Packs", icon: Box },
    { key: "general", label: "General", icon: Store },
  ];

  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Configuración</h1>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
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
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsManager />}
      {tab === "promotions" && <PromotionsManager />}
      {tab === "packs" && <DynamicPacksManager />}

      {tab === "general" && (
        <div className="max-w-md space-y-4">
          <h2 className="text-lg font-semibold">General</h2>

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

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4">
              <Label htmlFor="points-rate">Valor de cada punto</Label>
              <p className="mb-2 text-xs text-gray-500">
                Cuánto vale 1 punto en pesos al canjearlo. Ej: 10 significa que
                100 puntos = {formatCurrency(1000)}.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg">$</span>
                <Input
                  id="points-rate"
                  type="number"
                  min="1"
                  step="1"
                  value={pointsRate}
                  onChange={(e) => setPointsRate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSavePointsRate}>Guardar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
