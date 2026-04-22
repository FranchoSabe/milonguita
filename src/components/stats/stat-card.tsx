import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatDelta {
  value: number;
  label?: string;
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "green" | "amber" | "blue" | "gray";
  delta?: StatDelta | null;
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "text-primary",
  green: "text-green-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  gray: "text-gray-900",
};

function DeltaPill({ value, label }: StatDelta) {
  if (!Number.isFinite(value)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
        title={label ?? "Sin período anterior para comparar"}
      >
        Nuevo
      </span>
    );
  }
  const rounded = Math.round(value);
  const isZero = rounded === 0;
  const isUp = rounded > 0;
  const Icon = isZero ? null : isUp ? TrendingUp : TrendingDown;
  const text = isZero
    ? "0%"
    : `${isUp ? "+" : "−"}${Math.abs(rounded)}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        isZero
          ? "bg-gray-100 text-gray-500"
          : isUp
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
      )}
      title={label ?? "vs período anterior"}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {text}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "gray",
  delta,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            ACCENT[accent]
          )}
        >
          {value}
        </p>
        {delta !== undefined && delta !== null && <DeltaPill {...delta} />}
      </div>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
