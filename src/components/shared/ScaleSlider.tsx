"use client";

import { cn } from "@/lib/utils";

interface ScaleSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  labels?: Record<number, string>;
  colorScale?: "green-red" | "red-green" | "neutral";
  onChange: (value: number) => void;
  className?: string;
}

function getColor(value: number, min: number, max: number, scale: string): string {
  const ratio = (value - min) / (max - min);
  if (scale === "green-red") {
    if (ratio < 0.3) return "text-kp-success";
    if (ratio < 0.7) return "text-kp-warning";
    return "text-kp-danger";
  }
  if (scale === "red-green") {
    if (ratio < 0.3) return "text-kp-danger";
    if (ratio < 0.7) return "text-kp-warning";
    return "text-kp-success";
  }
  return "text-kp-accent";
}

export function ScaleSlider({
  label,
  value,
  min,
  max,
  step = 1,
  labels,
  colorScale = "neutral",
  onChange,
  className,
}: ScaleSliderProps) {
  const color = getColor(value, min, max, colorScale);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink-1">{label}</label>
        <span className={cn("text-lg font-bold tabular-nums", color)}>{value}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-kp-border rounded-lg appearance-none cursor-pointer accent-kp-accent"
      />

      {labels && (
        <div className="flex justify-between text-[0.6rem] text-ink-3">
          {Object.entries(labels).map(([val, text]) => (
            <span key={val} className={cn(Number(val) === value && "font-bold text-ink-2")}>
              {text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
