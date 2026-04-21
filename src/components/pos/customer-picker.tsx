"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomer, searchCustomers } from "@/lib/queries";
import { Customer } from "@/lib/types";

interface CustomerPickerProps {
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export function CustomerPicker({ selected, onSelect }: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchCustomers(term);
      setResults(data);
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || null,
      });
      handleSelect(created);
      setNewName("");
      setNewPhone("");
      setShowCreate(false);
    } catch (err) {
      console.error("Error creating customer:", err);
      alert("No se pudo crear el cliente.");
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2">
        <div>
          <p className="text-sm font-semibold">{selected.name}</p>
          <p className="text-xs text-gray-500">
            {selected.phone && <span>{selected.phone} · </span>}
            <span className="font-medium text-amber-600">
              {selected.points_balance.toLocaleString("es-AR")} pts
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
          aria-label="Quitar cliente"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (showCreate) {
    return (
      <div className="space-y-2 rounded-lg border-2 border-dashed p-3">
        <p className="text-sm font-semibold">Nuevo cliente</p>
        <div>
          <Label htmlFor="new-cust-name" className="text-xs">
            Nombre
          </Label>
          <Input
            id="new-cust-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="new-cust-phone" className="text-xs">
            Teléfono (opcional)
          </Label>
          <Input
            id="new-cust-phone"
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex-1"
          >
            {creating ? "Guardando…" : "Guardar y usar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Buscar cliente por nombre o teléfono…"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
          title="Nuevo cliente"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-white shadow-lg">
          {searching ? (
            <p className="px-3 py-2 text-sm text-gray-400">Buscando…</p>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm">
              <p className="text-gray-500">Sin resultados.</p>
              <button
                type="button"
                onClick={() => {
                  setNewName(query);
                  setShowCreate(true);
                  setOpen(false);
                }}
                className="mt-1 font-medium text-primary hover:underline"
              >
                + Crear &ldquo;{query}&rdquo;
              </button>
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.phone && (
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-amber-600">
                  {c.points_balance.toLocaleString("es-AR")} pts
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
