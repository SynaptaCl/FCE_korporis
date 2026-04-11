import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-ink-1">
          {label}
          {props.required && <span className="text-kp-danger ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border rounded-lg transition-colors outline-none min-h-[100px] resize-y",
          "placeholder:text-ink-4",
          "focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent",
          error ? "border-kp-danger" : "border-kp-border",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-kp-danger">{error}</p>}
    </div>
  );
}
