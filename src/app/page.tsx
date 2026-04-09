"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleModal } from "@/components/pos/sale-modal";
import { getOpenCashRegister, openCashRegister, getTodaySales } from "@/lib/queries";
import { CashRegister } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function HomePage() {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const register = await getOpenCashRegister();
      setCashRegister(register);
      if (register) {
        const sales = await getTodaySales(register.id);
        setTodayTotal(sales.reduce((sum, s) => sum + s.total, 0));
        setTodayCount(sales.length);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCashRegister = async () => {
    setOpening(true);
    try {
      const register = await openCashRegister();
      setCashRegister(register);
    } catch (err) {
      console.error("Error opening cash register:", err);
      alert("Error al abrir la caja. Intentá de nuevo.");
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!cashRegister) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <DoorOpen className="mb-6 h-24 w-24 text-gray-300" />
        <h1 className="mb-2 text-2xl font-bold">Caja cerrada</h1>
        <p className="mb-8 text-center text-gray-500">
          Abrí la caja para comenzar a registrar ventas
        </p>
        <Button
          onClick={handleOpenCashRegister}
          disabled={opening}
          size="xl"
          className="px-12 text-xl"
        >
          {opening ? "Abriendo..." : "Abrir Caja"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 grid w-full max-w-md grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">Ventas hoy</p>
          <p className="text-2xl font-bold">{todayCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">Total hoy</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(todayTotal)}
          </p>
        </div>
      </div>

      <Button
        onClick={() => setShowSaleModal(true)}
        size="xl"
        className="h-32 w-64 flex-col gap-3 rounded-2xl text-xl shadow-lg transition-transform hover:scale-105"
      >
        <ShoppingCart className="h-12 w-12" />
        REGISTRAR VENTA
      </Button>

      {showSaleModal && (
        <SaleModal
          cashRegisterId={cashRegister.id}
          onClose={() => {
            setShowSaleModal(false);
            loadData();
          }}
          onSaleComplete={() => loadData()}
        />
      )}
    </div>
  );
}
