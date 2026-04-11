import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink-1">
          {label}
          {props.required && <span className="text-kp-danger ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border rounded-lg transition-colors outline-none appearance-none cursor-pointer",
          "focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent",
          error ? "border-kp-danger" : "border-kp-border",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-kp-danger">{error}</p>}
    </div>
  );
}
