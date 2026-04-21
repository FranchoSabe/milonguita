"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  QrCode,
  Banknote,
  ArrowRightLeft,
  Lock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getOpenCashRegister,
  getTodaySales,
  closeCashRegister,
  getSalesByDateRange,
  getAllSales,
} from "@/lib/queries";
import { CashRegister, Sale, SaleItem } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ReportsPage() {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filteredSales, setFilteredSales] = useState<Sale[] | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [register, sales] = await Promise.all([
        getOpenCashRegister(),
        getAllSales(),
      ]);
      setCashRegister(register);
      setAllSales(sales);
      if (register) {
        const today = await getTodaySales(register.id);
        setTodaySales(today);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseCashRegister = async () => {
    if (!cashRegister) return;
    setClosing(true);
    try {
      const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
      await closeCashRegister(cashRegister.id, totalSales);
      setShowCloseConfirm(false);
      await loadData();
    } catch (err) {
      console.error("Error closing register:", err);
      alert("Error al cerrar la caja.");
    } finally {
      setClosing(false);
    }
  };

  const handleFilter = async () => {
    if (!filterFrom || !filterTo) return;
    try {
      const from = new Date(filterFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      const sales = await getSalesByDateRange(
        from.toISOString(),
        to.toISOString()
      );
      setFilteredSales(sales);
    } catch (err) {
      console.error("Error filtering:", err);
    }
  };

  const clearFilter = () => {
    setFilteredSales(null);
    setFilterFrom("");
    setFilterTo("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Cargando reportes...</p>
      </div>
    );
  }

  // Today stats
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayEfectivo = todaySales
    .filter((s) => s.payment_method === "efectivo")
    .reduce((sum, s) => sum + s.total, 0);
  const todayQr = todaySales
    .filter((s) => s.payment_method === "qr")
    .reduce((sum, s) => sum + s.total, 0);
  const todayTransferencia = todaySales
    .filter((s) => s.payment_method === "transferencia")
    .reduce((sum, s) => sum + s.total, 0);

  // Top 5 products (from all sales)
  const productCounts: Record<string, { name: string; count: number }> = {};
  allSales.forEach((sale) => {
    sale.items.forEach((item: SaleItem) => {
      const key = item.name;
      if (!productCounts[key]) {
        productCounts[key] = { name: item.name, count: 0 };
      }
      productCounts[key].count += item.quantity;
    });
  });
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Hourly distribution (from all sales)
  const hourlySlots = [
    "08-10",
    "10-12",
    "12-14",
    "14-16",
    "16-18",
    "18-20",
    "20-22",
    "22-00",
  ];
  const hourlyData = hourlySlots.map((slot) => {
    const [startStr] = slot.split("-");
    const startHour = parseInt(startStr);
    const endHour = startHour + 2;
    const count = allSales.filter((s) => {
      const hour = new Date(s.created_at).getHours();
      return hour >= startHour && hour < (endHour === 24 ? 0 : endHour);
    }).length;
    return { franja: slot, ventas: count };
  });

  const displaySales = filteredSales || allSales;

  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Reportes</h1>

      {/* Today summary cards */}
      {cashRegister && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Resumen del día</h2>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <DollarSign className="h-4 w-4" />
                Total del día
              </div>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatCurrency(todayTotal)}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Banknote className="h-4 w-4" />
                Efectivo
              </div>
              <p className="mt-1 text-xl font-bold">
                {formatCurrency(todayEfectivo)}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <QrCode className="h-4 w-4" />
                QR
              </div>
              <p className="mt-1 text-xl font-bold">
                {formatCurrency(todayQr)}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ArrowRightLeft className="h-4 w-4" />
                Transferencia
              </div>
              <p className="mt-1 text-xl font-bold">
                {formatCurrency(todayTransferencia)}
              </p>
            </div>
          </div>

          {/* Close register button */}
          {!showCloseConfirm ? (
            <Button
              onClick={() => setShowCloseConfirm(true)}
              variant="destructive"
              className="mb-6"
            >
              <Lock className="mr-2 h-4 w-4" />
              Cerrar Caja
            </Button>
          ) : (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="mb-3 font-medium text-red-800">
                ¿Estás seguro de cerrar la caja? No se podrán registrar más
                ventas hasta abrir una nueva caja.
              </p>
              <p className="mb-3 text-sm text-red-600">
                Total de la caja: {formatCurrency(todayTotal)} (
                {todaySales.length} ventas)
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleCloseCashRegister}
                  disabled={closing}
                  variant="destructive"
                  size="sm"
                >
                  {closing ? "Cerrando..." : "Sí, cerrar caja"}
                </Button>
                <Button
                  onClick={() => setShowCloseConfirm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!cashRegister && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800">
            No hay caja abierta. Abrí una caja desde la pantalla de venta para
            ver el resumen del día.
          </p>
        </div>
      )}

      {/* Top 5 products */}
      {topProducts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5" />
            Top 5 productos más vendidos
          </h2>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {product.count} vendidos
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly chart */}
      {allSales.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">
            Ventas por franja horaria
          </h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="franja" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="ventas" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sales history */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Historial de ventas</h2>

        {/* Date filter */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-gray-500">Desde</label>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500">Hasta</label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>
          <Button onClick={handleFilter} size="sm">
            Filtrar
          </Button>
          {filteredSales && (
            <Button onClick={clearFilter} variant="outline" size="sm">
              Limpiar
            </Button>
          )}
        </div>

        {/* Sales table */}
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Items
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Pago
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displaySales.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No hay ventas para mostrar
                  </td>
                </tr>
              ) : (
                displaySales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateTime(sale.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {sale.items
                        .map(
                          (item: SaleItem) =>
                            `${item.quantity}x ${item.name}`
                        )
                        .join(", ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {sale.payment_method}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
