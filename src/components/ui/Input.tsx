import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-1">
          {label}
          {props.required && <span className="text-kp-danger ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border rounded-lg transition-colors outline-none",
          "placeholder:text-ink-4",
          "focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent",
          error ? "border-kp-danger" : "border-kp-border",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-kp-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
