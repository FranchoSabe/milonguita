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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { formatCurrency } from "@/lib/utils";

const PIE_COLORS = ["#f97316", "#10b981", "#6366f1", "#ec4899"];

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
  const paymentBreakdown = useMemo(() => breakdownByPayment(sales), [sales]);

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
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Ingresos"
              value={formatCurrency(kpis.totalRevenue)}
              icon={DollarSign}
              accent="primary"
            />
            <StatCard
              label="Tickets"
              value={kpis.salesCount.toLocaleString("es-AR")}
              icon={ReceiptText}
            />
            <StatCard
              label="Ticket prom."
              value={formatCurrency(kpis.averageTicket)}
              icon={TrendingUp}
            />
            <StatCard
              label="Clientes únicos"
              value={kpis.uniqueCustomers.toLocaleString("es-AR")}
              icon={Users}
              accent="blue"
              hint="en el rango"
            />
            <StatCard
              label="Puntos otorgados"
              value={kpis.pointsEarned.toLocaleString("es-AR")}
              icon={Coins}
              accent="amber"
            />
            <StatCard
              label="Puntos canjeados"
              value={kpis.pointsRedeemed.toLocaleString("es-AR")}
              icon={Coins}
              accent="green"
            />
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
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Productos más vendidos
              </h2>
              {topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Sin datos.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts}
                      layout="vertical"
                      margin={{ left: 10, right: 10 }}
                    >
                      <CartesianGrid stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip
                        formatter={(v, name) => {
                          const num = Number(v ?? 0);
                          return name === "revenue"
                            ? [formatCurrency(num), "Ingresos"]
                            : [num, "Cantidad"];
                        }}
                      />
                      <Bar
                        dataKey="quantity"
                        fill="#f97316"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Métodos de pago
              </h2>
              {paymentBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Sin datos.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentBreakdown}
                        dataKey="revenue"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
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
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
