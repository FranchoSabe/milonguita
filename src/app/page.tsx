"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DoorOpen,
  Receipt,
  Lock,
  ArrowLeft,
  Printer,
  X,
  Plus,
  ChefHat,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaleModal } from "@/components/pos/sale-modal";
import {
  CashCloseSummary,
  CashCloseTicket,
  CashCloseTicketPreview,
} from "@/components/pos/cash-close-ticket";
import {
  closeCashRegister,
  getCashRegistersForBusinessDay,
  getOpenCashRegister,
  getOpenOrders,
  getTodayPaidSales,
  openCashRegister,
  reopenPaidOrder,
} from "@/lib/queries";
import {
  CashRegister,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  Sale,
  SHIFT_LABELS,
  Shift,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";

type View = "main" | "status";
type CloseStep = "confirm" | "ticket";
type ModalState =
  | { open: false }
  | { open: true; order: Sale | null; step: "products" | "payment" };

function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBusinessDay(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatOrderNumber(n: number | null): string {
  if (n == null) return "—";
  return `#${String(n).padStart(3, "0")}`;
}

const PAYMENT_ORDER: PaymentMethod[] = ["efectivo", "qr", "transferencia"];

export default function HomePage() {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [paidSales, setPaidSales] = useState<Sale[]>([]);
  const [openOrders, setOpenOrders] = useState<Sale[]>([]);
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openDate, setOpenDate] = useState(todayLocalISO());
  const [openShift, setOpenShift] = useState<Shift>("mediodia");
  const [dayRegisters, setDayRegisters] = useState<CashRegister[]>([]);
  const [openError, setOpenError] = useState<string | null>(null);
  const [view, setView] = useState<View>("main");
  const [closeStep, setCloseStep] = useState<CloseStep | null>(null);
  const [closeSummary, setCloseSummary] = useState<CashCloseSummary | null>(null);
  const [closing, setClosing] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const register = await getOpenCashRegister();
      setCashRegister(register);
      if (register) {
        const [paid, open] = await Promise.all([
          getTodayPaidSales(register.id),
          getOpenOrders(register.id),
        ]);
        setPaidSales(paid);
        setOpenOrders(open);
      } else {
        setPaidSales([]);
        setOpenOrders([]);
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
    setOpenError(null);
    try {
      const register = await openCashRegister(openDate, openShift);
      setCashRegister(register);
      setPaidSales([]);
      setOpenOrders([]);
    } catch (err) {
      console.error("Error opening cash register:", err);
      setOpenError(
        err instanceof Error
          ? err.message
          : "Error al abrir la caja. Intentá de nuevo."
      );
    } finally {
      setOpening(false);
    }
  };

  // Refresh the list of registers already present for the selected day
  // so we can disable shifts that are already closed.
  useEffect(() => {
    if (cashRegister) return;
    let cancelled = false;
    (async () => {
      try {
        const regs = await getCashRegistersForBusinessDay(openDate);
        if (!cancelled) setDayRegisters(regs);
      } catch (err) {
        console.error("Error loading day registers:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openDate, cashRegister]);

  const shiftStatusOnSelectedDay = (shift: Shift) =>
    dayRegisters.find((r) => r.shift === shift)?.status ?? null;

  const startClose = () => {
    if (!cashRegister) return;
    if (openOrders.length > 0) {
      alert(
        `Cerrá o eliminá las ${openOrders.length} orden(es) abierta(s) antes de cerrar la caja.`
      );
      return;
    }
    setCloseStep("confirm");
  };

  const confirmCloseAndShowTicket = async () => {
    if (!cashRegister) return;
    setClosing(true);
    try {
      const total = paidSales.reduce((sum, s) => sum + s.total, 0);
      const updated = await closeCashRegister(cashRegister.id, total);
      setCloseSummary({
        register: updated,
        closedAt: updated.closed_at ?? new Date().toISOString(),
        sales: paidSales,
      });
      setCloseStep("ticket");
    } catch (err) {
      console.error("Error closing register:", err);
      alert("Error al cerrar la caja.");
    } finally {
      setClosing(false);
    }
  };

  const finishClose = () => {
    setCloseStep(null);
    setCloseSummary(null);
    setView("main");
    setCashRegister(null);
    setPaidSales([]);
    setOpenOrders([]);
    setOpenDate(todayLocalISO());
    setOpenError(null);
    loadData();
  };

  const handlePrintAndFinish = () => {
    document.body.dataset.printMode = "cierre";
    requestAnimationFrame(() => {
      window.print();
      delete document.body.dataset.printMode;
      finishClose();
    });
  };

  const handleReopenPaidOrder = async (sale: Sale) => {
    const label = formatOrderNumber(sale.order_number);
    const ok = window.confirm(
      `¿Anular el cobro de la orden ${label}? Volverá a la lista de órdenes abiertas.`
    );
    if (!ok) return;
    setReopeningId(sale.id);
    try {
      await reopenPaidOrder(sale.id);
      await loadData();
      setView("main");
    } catch (err) {
      console.error("Error reopening order:", err);
      alert("No se pudo anular la venta.");
    } finally {
      setReopeningId(null);
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
    const selectedShiftStatus = shiftStatusOnSelectedDay(openShift);
    const selectedShiftIsClosed = selectedShiftStatus === "closed";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <DoorOpen className="mb-6 h-24 w-24 text-gray-300" />
        <h1 className="mb-2 text-2xl font-bold">Caja cerrada</h1>
        <p className="mb-6 text-center text-gray-500">
          Elegí día y turno para abrir la caja.
        </p>

        <div className="mb-6 w-full max-w-xs space-y-4">
          <div>
            <Label htmlFor="business-day" className="mb-1 block">
              Día laboral
            </Label>
            <Input
              id="business-day"
              type="date"
              value={openDate}
              max={todayLocalISO()}
              onChange={(e) => {
                setOpenDate(e.target.value);
                setOpenError(null);
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              {openDate ? formatBusinessDay(openDate) : ""}
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Turno</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["mediodia", "noche"] as Shift[]).map((shift) => {
                const status = shiftStatusOnSelectedDay(shift);
                const disabled = status !== null;
                const active = openShift === shift;
                return (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => {
                      if (disabled) return;
                      setOpenShift(shift);
                      setOpenError(null);
                    }}
                    disabled={disabled}
                    className={cn(
                      "rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all",
                      active && !disabled
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 hover:border-gray-300",
                      disabled && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {SHIFT_LABELS[shift]}
                    {status === "open" && (
                      <span className="ml-1 text-[10px] font-normal">
                        (abierta)
                      </span>
                    )}
                    {status === "closed" && (
                      <span className="ml-1 text-[10px] font-normal">
                        (cerrada)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedShiftIsClosed && (
              <p className="mt-2 text-xs text-amber-600">
                Ese turno ya fue cerrado para este día.
              </p>
            )}
          </div>

          {openError && (
            <p className="text-sm text-red-600">{openError}</p>
          )}
        </div>

        <Button
          onClick={handleOpenCashRegister}
          disabled={opening || !openDate || selectedShiftStatus !== null}
          size="xl"
          className="px-12 text-xl"
        >
          {opening ? "Abriendo..." : `Abrir caja ${SHIFT_LABELS[openShift]}`}
        </Button>
      </div>
    );
  }

  if (view === "status") {
    const total = paidSales.reduce((sum, s) => sum + s.total, 0);
    const avg = paidSales.length > 0 ? total / paidSales.length : 0;
    const byMethod = PAYMENT_ORDER.map((method) => {
      const filtered = paidSales.filter((s) => s.payment_method === method);
      return {
        method,
        label: PAYMENT_METHOD_LABELS[method],
        count: filtered.length,
        total: filtered.reduce((sum, s) => sum + s.total, 0),
      };
    });

    return (
      <div className="min-h-screen p-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView("main")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <Button onClick={startClose} variant="destructive" size="sm">
            <Lock className="mr-2 h-4 w-4" />
            Cerrar caja
          </Button>
        </div>

        <h1 className="mb-1 text-2xl font-bold">Estado de caja</h1>
        <p className="mb-6 text-sm text-gray-500">
          {formatBusinessDay(cashRegister.business_day)} · abierta a las{" "}
          {formatTime(cashRegister.opened_at)} (
          {formatDate(cashRegister.opened_at)})
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Ventas</p>
            <p className="mt-1 text-2xl font-bold">{paidSales.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatCurrency(total)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Venta promedio</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(avg)}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Apertura</p>
            <p className="mt-1 text-xl font-bold">
              {formatTime(cashRegister.opened_at)}
            </p>
          </div>
        </div>

        <h2 className="mb-3 text-lg font-semibold">Por método de pago</h2>
        <div className="mb-8 space-y-2">
          {byMethod.map((m) => (
            <div
              key={m.method}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium">{m.label}</p>
                <p className="text-xs text-gray-500">
                  {m.count} {m.count === 1 ? "venta" : "ventas"}
                </p>
              </div>
              <p className="font-bold tabular-nums">{formatCurrency(m.total)}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-lg font-semibold">Órdenes cobradas</h2>
        {paidSales.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-white px-4 py-6 text-center text-sm text-gray-400">
            Aún no se cobró ninguna orden.
          </p>
        ) : (
          <div className="space-y-2">
            {paidSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {formatOrderNumber(sale.order_number)}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {formatTime(sale.paid_at ?? sale.created_at)}
                    </span>
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {sale.customer_name ?? "Sin nombre"} ·{" "}
                    {sale.payment_method
                      ? PAYMENT_METHOD_LABELS[sale.payment_method]
                      : "-"}
                  </p>
                </div>
                <p className="whitespace-nowrap font-bold tabular-nums">
                  {formatCurrency(sale.total)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReopenPaidOrder(sale)}
                  disabled={reopeningId === sale.id}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  {reopeningId === sale.id ? "Anulando..." : "Anular"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {closeStep && renderCloseFlow()}
      </div>
    );
  }

  function renderCloseFlow() {
    if (!closeStep) return null;

    if (closeStep === "confirm") {
      const total = paidSales.reduce((sum, s) => sum + s.total, 0);
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold">¿Cerrar caja?</h3>
            <p className="mb-1 text-sm text-gray-600">
              Día laboral:{" "}
              <span className="font-medium">
                {cashRegister && formatBusinessDay(cashRegister.business_day)}
              </span>
            </p>
            <p className="mb-4 text-sm text-gray-600">
              Total de la caja:{" "}
              <span className="font-bold">{formatCurrency(total)}</span> (
              {paidSales.length} ventas)
            </p>
            <p className="mb-4 text-xs text-gray-500">
              No vas a poder registrar más ventas hasta abrir una nueva caja.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => setCloseStep(null)}
                variant="outline"
                disabled={closing}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmCloseAndShowTicket}
                variant="destructive"
                disabled={closing}
              >
                {closing ? "Cerrando..." : "Sí, cerrar caja"}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (closeStep === "ticket" && closeSummary) {
      return (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4 print:hidden">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-3 text-lg font-bold">Caja cerrada</h3>
              <p className="mb-4 text-sm text-gray-600">
                Revisá el cierre. Podés imprimirlo o solo cerrarlo.
              </p>
              <div className="mb-4 max-h-[60vh] overflow-auto">
                <CashCloseTicketPreview summary={closeSummary} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button onClick={finishClose} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Cerrar sin imprimir
                </Button>
                <Button onClick={handlePrintAndFinish}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
          <CashCloseTicket summary={closeSummary} />
        </>
      );
    }

    return null;
  }

  const openOrdersTotal = openOrders.reduce((sum, o) => sum + o.subtotal, 0);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="flex justify-end gap-2 p-3">
        <Button
          onClick={() => setView("status")}
          variant="outline"
          size="sm"
        >
          <Receipt className="mr-2 h-4 w-4" />
          Estado de caja
        </Button>
        <Button onClick={startClose} variant="destructive" size="sm">
          <Lock className="mr-2 h-4 w-4" />
          Cerrar caja
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 p-4">
        <Button
          onClick={() =>
            setModalState({ open: true, order: null, step: "products" })
          }
          size="xl"
          className="h-24 w-full max-w-md flex-col gap-2 rounded-2xl text-xl shadow-lg transition-transform hover:scale-105"
        >
          <Plus className="h-8 w-8" />
          Nueva orden
        </Button>

        <div className="w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Órdenes abiertas ({openOrders.length})
            </h2>
            {openOrders.length > 0 && (
              <p className="text-sm text-gray-500">
                Subtotal:{" "}
                <span className="font-semibold text-gray-700">
                  {formatCurrency(openOrdersTotal)}
                </span>
              </p>
            )}
          </div>

          {openOrders.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-gray-400">
              No hay órdenes abiertas. Creá una nueva para comenzar.
            </p>
          ) : (
            <div className="space-y-2">
              {openOrders.map((order) => {
                const itemCount = order.items.reduce(
                  (s, it) => s + it.quantity,
                  0
                );
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold">
                        {formatOrderNumber(order.order_number)}
                        {order.customer_name && (
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            · {order.customer_name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                        {formatCurrency(order.subtotal)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setModalState({
                            open: true,
                            order,
                            step: "products",
                          })
                        }
                      >
                        <ChefHat className="mr-1 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          setModalState({
                            open: true,
                            order,
                            step: "payment",
                          })
                        }
                      >
                        <CreditCard className="mr-1 h-4 w-4" />
                        Cobrar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalState.open && (
        <SaleModal
          cashRegisterId={cashRegister.id}
          existingOrder={modalState.order}
          initialStep={modalState.step}
          onClose={() => {
            setModalState({ open: false });
            loadData();
          }}
        />
      )}

      {closeStep && renderCloseFlow()}
    </div>
  );
}
