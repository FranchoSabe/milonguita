"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  DollarSign,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/stats/stat-card";
import {
  DateRangePicker,
  DateRangeValue,
  defaultRange,
} from "@/components/stats/date-range-picker";
import {
  getAllCustomers,
  getSalesByDateRange,
} from "@/lib/queries";
import { Customer, Sale } from "@/lib/types";
import {
  bucketByDay,
  breakdownByPayment,
  computeKpis,
  endOfDay,
  rankCustomersInRange,
  rankProducts,
} from "@/lib/stats";
import { cn, formatCurrency } from "@/lib/utils";

const PIE_COLORS = ["#f97316", "#10b981", "#6366f1", "#ec4899"];

const PODIUM_BADGE: Record<number, string> = {
  0: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  1: "bg-gray-200 text-gray-700 ring-1 ring-gray-300",
  2: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
};

export default function StatsPage() {
  const [range, setRange] = useState<DateRangeValue>(defaultRange());
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = new Date(`${range.from}T00:00:00`);
      const toDate = endOfDay(new Date(`${range.to}T00:00:00`));
      const [s, c] = await Promise.all([
        getSalesByDateRange(fromDate.toISOString(), toDate.toISOString()),
        getAllCustomers(),
      ]);
      setSales(s);
      setCustomers(c);
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => computeKpis(sales), [sales]);

  const daily = useMemo(
    () =>
      bucketByDay(sales, {
        from: new Date(`${range.from}T00:00:00`),
        to: new Date(`${range.to}T00:00:00`),
      }),
    [sales, range.from, range.to]
  );

  const topProducts = useMemo(() => rankProducts(sales, 10), [sales]);
  const topProductsTotal = useMemo(
    () => topProducts.reduce((s, p) => s + p.revenue, 0),
    [topProducts]
  );
  const topProductMax = topProducts[0]?.revenue ?? 0;

  const paymentBreakdown = useMemo(() => breakdownByPayment(sales), [sales]);
  const paymentTotal = useMemo(
    () => paymentBreakdown.reduce((s, p) => s + p.revenue, 0),
    [paymentBreakdown]
  );

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const topCustomersInRange = useMemo(
    () =>
      rankCustomersInRange(sales, 5).map((r) => ({
        ...r,
        name:
          customerMap.get(r.customer_id)?.name ?? "Cliente eliminado",
      })),
    [sales, customerMap]
  );

  const topCustomersOverall = useMemo(
    () =>
      customers
        .slice()
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5),
    [customers]
  );

  const globalStats = useMemo(() => {
    const activePoints = customers.reduce(
      (s, c) => s + Math.max(0, c.points_balance),
      0
    );
    const withVisits = customers.filter((c) => c.visits > 0);
    const avgVisits =
      withVisits.length > 0
        ? withVisits.reduce((s, c) => s + c.visits, 0) / withVisits.length
        : 0;
    return {
      total: customers.length,
      activePoints,
      avgVisits,
    };
  }, [customers]);

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-400">Cargando…</p>
      ) : (
        <>
          <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Ingresos"
              value={formatCurrency(kpis.totalRevenue)}
              icon={DollarSign}
              accent="primary"
              hint="total en el rango"
            />
            <StatCard
              label="Ventas"
              value={kpis.salesCount.toLocaleString("es-AR")}
              icon={ReceiptText}
              hint="cantidad de operaciones"
            />
            <StatCard
              label="Venta promedio"
              value={formatCurrency(kpis.averageTicket)}
              icon={TrendingUp}
              hint="monto promedio por venta"
            />
            <StatCard
              label="Clientes"
              value={kpis.uniqueCustomers.toLocaleString("es-AR")}
              icon={Users}
              accent="blue"
              hint="compradores distintos"
            />
          </section>

          <section className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              <Coins className="h-3.5 w-3.5" />
              <span>Puntos de fidelidad</span>
            </div>
            <div className="mt-2 flex items-end gap-8">
              <div>
                <p className="text-2xl font-bold tabular-nums text-amber-600">
                  {kpis.pointsEarned.toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-gray-500">entregados a clientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-green-600">
                  {kpis.pointsRedeemed.toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-gray-500">usados como descuento</p>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Tendencia de ingresos
            </h2>
            {daily.every((d) => d.revenue === 0) ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Sin ventas en este rango.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                      }
                      width={40}
                    />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v ?? 0))}
                      labelClassName="font-semibold"
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-700">
                  Productos que más dinero generan
                </h2>
                {topProductsTotal > 0 && (
                  <span className="text-xs text-gray-500 tabular-nums">
                    Top {topProducts.length} · {formatCurrency(topProductsTotal)}
                  </span>
                )}
              </div>
              {topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Sin ventas en este rango.
                </p>
              ) : (
                <ol className="space-y-2">
                  {topProducts.map((p, idx) => {
                    const barWidth =
                      topProductMax > 0 ? (p.revenue / topProductMax) * 100 : 0;
                    const share =
                      topProductsTotal > 0
                        ? (p.revenue / topProductsTotal) * 100
                        : 0;
                    return (
                      <li
                        key={p.key}
                        className="rounded-lg border bg-gray-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                                PODIUM_BADGE[idx] ??
                                  "bg-white text-gray-500 ring-1 ring-gray-200"
                              )}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {p.name}
                              </p>
                              <p className="text-xs text-gray-500 tabular-nums">
                                {p.quantity.toLocaleString("es-AR")} unidades ·{" "}
                                {share.toFixed(1)}% del total
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
                            {formatCurrency(p.revenue)}
                          </p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Métodos de pago
              </h2>
              {paymentBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Sin ventas en este rango.
                </p>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <ul className="flex-1 space-y-2">
                    {paymentBreakdown.map((p, idx) => {
                      const pct =
                        paymentTotal > 0
                          ? (p.revenue / paymentTotal) * 100
                          : 0;
                      return (
                        <li
                          key={p.method}
                          className="flex items-center justify-between gap-3 rounded-md border bg-gray-50 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{
                                background: PIE_COLORS[idx % PIE_COLORS.length],
                              }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {p.label}
                              </p>
                              <p className="text-xs text-gray-500 tabular-nums">
                                {p.count} {p.count === 1 ? "venta" : "ventas"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold tabular-nums text-gray-900">
                              {formatCurrency(p.revenue)}
                            </p>
                            <p className="text-xs text-gray-500 tabular-nums">
                              {pct.toFixed(1)}%
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mx-auto h-36 w-36 shrink-0 sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentBreakdown}
                          dataKey="revenue"
                          nameKey="label"
                          innerRadius={38}
                          outerRadius={60}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {paymentBreakdown.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatCurrency(Number(v ?? 0))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  Top clientes del rango
                </h2>
                <BarChart3 className="h-4 w-4 text-gray-300" />
              </div>
              {topCustomersInRange.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Sin ventas con cliente asignado.
                </p>
              ) : (
                <div className="space-y-2">
                  {topCustomersInRange.map((c) => (
                    <div
                      key={c.customer_id}
                      className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">
                          {c.visits} compra{c.visits === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="font-bold text-primary tabular-nums">
                        {formatCurrency(c.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Top clientes (histórico)
              </h2>
              {topCustomersOverall.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Todavía no hay clientes cargados.
                </p>
              ) : (
                <div className="space-y-2">
                  {topCustomersOverall.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">
                          {c.visits} visita{c.visits === 1 ? "" : "s"} ·{" "}
                          <span className="text-amber-600">
                            {c.points_balance.toLocaleString("es-AR")} pts
                          </span>
                        </p>
                      </div>
                      <span className="font-bold tabular-nums">
                        {formatCurrency(c.total_spent)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Clientes registrados"
              value={globalStats.total.toLocaleString("es-AR")}
              icon={Users}
            />
            <StatCard
              label="Puntos activos"
              value={globalStats.activePoints.toLocaleString("es-AR")}
              icon={Coins}
              accent="amber"
            />
            <StatCard
              label="Visitas promedio"
              value={globalStats.avgVisits.toFixed(1)}
              icon={TrendingUp}
              hint="por cliente activo"
            />
          </section>
        </>
      )}
    </div>
  );
}
