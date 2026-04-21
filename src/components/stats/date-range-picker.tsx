"use client";

import { Input } from "@/components/ui/input";
import { daysAgo, startOfDay, toISODate } from "@/lib/stats";
import { cn } from "@/lib/utils";

export type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

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
  const map: Record<Exclude<RangePreset, "custom">, Date> = {
    today: today,
    "7d": daysAgo(6),
    "30d": daysAgo(29),
    "90d": daysAgo(89),
  };
  return {
    from: toISODate(map[preset]),
    to: toISODate(today),
    preset,
  };
}

export function defaultRange(): DateRangeValue {
  return presetRange("30d");
}

const PRESETS: { key: Exclude<RangePreset, "custom">; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value.from}
          onChange={(e) =>
            onChange({ ...value, from: e.target.value, preset: "custom" })
          }
          className="h-9 w-auto"
        />
        <span className="text-xs text-gray-500">a</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) =>
            onChange({ ...value, to: e.target.value, preset: "custom" })
          }
          className="h-9 w-auto"
        />
      </div>
    </div>
  );
}
