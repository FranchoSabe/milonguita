import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "green" | "amber" | "blue" | "gray";
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "text-primary",
  green: "text-green-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  gray: "text-gray-900",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "gray",
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", ACCENT[accent])}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
