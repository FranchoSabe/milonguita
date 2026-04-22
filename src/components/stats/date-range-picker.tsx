"use client";

import { Input } from "@/components/ui/input";
import {
  daysAgo,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toISODate,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

export type RangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "30d"
  | "90d"
  | "custom";

export interface DateRangeValue {
  from: string;
  to: string;
  preset: RangePreset;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
}

function presetRange(preset: Exclude<RangePreset, "custom">): DateRangeValue {
  const today = startOfDay(new Date());
  let from: Date;
  let to: Date = today;

  switch (preset) {
    case "today":
      from = today;
      break;
    case "yesterday": {
      const y = daysAgo(1);
      from = y;
      to = y;
      break;
    }
    case "thisWeek":
      from = startOfWeek(today);
      break;
    case "thisMonth":
      from = startOfMonth(today);
      break;
    case "30d":
      from = daysAgo(29);
      break;
    case "90d":
      from = daysAgo(89);
      break;
  }

  return {
    from: toISODate(from),
    to: toISODate(to),
    preset,
  };
}

export function defaultRange(): DateRangeValue {
  return presetRange("30d");
}

const PRESETS: { key: Exclude<RangePreset, "custom">; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "thisWeek", label: "Esta semana" },
  { key: "thisMonth", label: "Este mes" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(presetRange(p.key))}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              value.preset === p.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:border-l sm:pl-3">
        <Input
          type="date"
          value={value.from}
          onChange={(e) =>
            onChange({ ...value, from: e.target.value, preset: "custom" })
          }
          className="h-9 w-auto"
          aria-label="Desde"
        />
        <span className="text-xs text-gray-500">a</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) =>
            onChange({ ...value, to: e.target.value, preset: "custom" })
          }
          className="h-9 w-auto"
          aria-label="Hasta"
        />
      </div>
    </div>
  );
}
