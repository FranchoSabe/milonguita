"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  applyManualPointsAdjustment,
  createCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerPointsHistory,
  getCustomerSales,
  searchCustomers,
  updateCustomer,
} from "@/lib/queries";
import { Customer, CustomerPointsHistory, Sale } from "@/lib/types";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

const MOVEMENT_LABELS: Record<string, string> = {
  earn: "Ganó",
  redeem: "Canjeó",
  adjustment: "Ajuste",
};

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyForm: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CustomerPointsHistory[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = query.trim()
        ? await searchCustomers(query)
        : await getAllCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const stats = useMemo(() => {
    const total = customers.length;
    const activePoints = customers.reduce(
      (sum, c) => sum + (c.points_balance > 0 ? c.points_balance : 0),
      0
    );
    return { total, activePoints };
  }, [customers]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      notes: customer.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await updateCustomer(editing.id, payload);
      } else {
        await createCustomer(payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      console.error("Error saving customer:", err);
      alert("Error al guardar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (customer: Customer) => {
    setDetail(customer);
    setHistory([]);
    setSales([]);
    setAdjustDelta("");
    setAdjustReason("");
    try {
      const [h, s] = await Promise.all([
        getCustomerPointsHistory(customer.id),
        getCustomerSales(customer.id, 20),
      ]);
      setHistory(h);
      setSales(s);
    } catch (err) {
      console.error("Error loading detail:", err);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const fresh = customers.find((c) => c.id === detail.id);
    const [h, s] = await Promise.all([
      getCustomerPointsHistory(detail.id),
      getCustomerSales(detail.id, 20),
    ]);
    setHistory(h);
    setSales(s);
    if (fresh) setDetail(fresh);
    await load();
  };

  const handleAdjust = async () => {
    if (!detail) return;
    const delta = Number(adjustDelta);
    if (!delta || Number.isNaN(delta)) {
      alert("Ingresá un número distinto de 0.");
      return;
    }
    setAdjusting(true);
    try {
      await applyManualPointsAdjustment({
        customer_id: detail.id,
        points_delta: delta,
        reason: adjustReason.trim() || null,
      });
      setAdjustDelta("");
      setAdjustReason("");
      await refreshDetail();
    } catch (err) {
      console.error("Error applying adjustment:", err);
      alert("No se pudo aplicar el ajuste.");
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (
      !confirm(
        `¿Eliminar a "${detail.name}"? Se borran también su historial y puntos. No se puede deshacer.`
      )
    )
      return;
    try {
      await deleteCustomer(detail.id);
      setDetail(null);
      await load();
    } catch (err) {
      console.error("Error deleting customer:", err);
      alert("No se pudo eliminar el cliente.");
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500">Clientes</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-xs text-gray-500">Puntos activos</p>
          <p className="text-xl font-bold text-amber-600">
            {stats.activePoints.toLocaleString("es-AR")}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email…"
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-400">Cargando clientes…</p>
      ) : customers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
          <Users className="mx-auto mb-2 h-8 w-8" />
          <p>
            {query.trim()
              ? `Sin resultados para "${query}".`
              : "Todavía no tenés clientes. Agregá uno para comenzar."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => openDetail(customer)}
              className="flex w-full items-center justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{customer.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1 mr-2">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.visits > 0 && (
                    <span>
                      {customer.visits} visita
                      {customer.visits !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
              <div className="ml-2 text-right">
                <p className="text-lg font-bold text-amber-600 tabular-nums">
                  {customer.points_balance.toLocaleString("es-AR")}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">
                  pts
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
            <DialogDescription>
              Datos básicos del cliente para sumarle puntos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="customer-name">Nombre</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Teléfono</Label>
              <Input
                id="customer-phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="Ej: 11 5555-5555"
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="customer-notes">Notas</Label>
              <Input
                id="customer-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Ej: prefiere pizza integral"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="w-full"
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              {detail?.phone && <span>{detail.phone} · </span>}
              {detail?.visits ?? 0} visita{detail?.visits === 1 ? "" : "s"} ·
              gastado {formatCurrency(detail?.total_spent ?? 0)}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-white p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Puntos
                  </p>
                  <p className="text-xl font-bold text-amber-600 tabular-nums">
                    {detail.points_balance.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Visitas
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {detail.visits}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Total
                  </p>
                  <p className="text-sm font-bold tabular-nums">
                    {formatCurrency(detail.total_spent)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(detail)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Editar datos
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  className="ml-auto"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Eliminar
                </Button>
              </div>

              <section className="rounded-lg border bg-gray-50 p-3">
                <h3 className="mb-2 text-sm font-semibold">
                  Ajuste manual de puntos
                </h3>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="1"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    placeholder="+10 o -5"
                    className="h-9 w-24"
                  />
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Motivo (ej: cumpleaños)"
                    className="h-9 flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAdjust}
                    disabled={adjusting || !adjustDelta}
                  >
                    Aplicar
                  </Button>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">
                  Historial de puntos
                </h3>
                {history.length === 0 ? (
                  <p className="py-3 text-sm text-gray-400">
                    Sin movimientos aún.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {history.map((h) => {
                      const positive = h.points_delta > 0;
                      return (
                        <div
                          key={h.id}
                          className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {MOVEMENT_LABELS[h.movement_type] ||
                                h.movement_type}
                              {h.reason && (
                                <span className="ml-1 text-xs text-gray-500">
                                  · {h.reason}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDateTime(h.created_at)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "flex items-center gap-1 font-bold tabular-nums",
                              positive ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {positive ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            {Math.abs(h.points_delta)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Últimas ventas</h3>
                {sales.length === 0 ? (
                  <p className="py-3 text-sm text-gray-400">
                    Sin ventas asociadas.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sales.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(s.total)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(s.created_at)}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          {s.points_earned > 0 && (
                            <span className="font-medium text-green-600">
                              +{s.points_earned}
                            </span>
                          )}
                          {s.points_redeemed > 0 && (
                            <span className="ml-2 font-medium text-red-600">
                              -{s.points_redeemed}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
