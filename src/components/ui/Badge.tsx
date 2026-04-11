import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "teal";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-0 text-ink-2 border-kp-border",
  success: "bg-kp-success-lt text-green-800 border-green-200",
  warning: "bg-kp-warning-lt text-amber-800 border-amber-200",
  danger: "bg-kp-danger-lt text-red-800 border-red-200",
  info: "bg-kp-info-lt text-blue-800 border-blue-200",
  teal: "bg-kp-accent-lt text-kp-primary border-kp-accent/20",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border",
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
