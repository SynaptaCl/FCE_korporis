import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "danger" | "warning" | "success" | "info";

const config: Record<AlertVariant, { bg: string; border: string; text: string; icon: ReactNode }> = {
  danger: {
    bg: "bg-kp-danger-lt",
    border: "border-red-200",
    text: "text-red-800",
    icon: <AlertCircle className="w-5 h-5 text-kp-danger" />,
  },
  warning: {
    bg: "bg-kp-warning-lt",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: <AlertTriangle className="w-5 h-5 text-kp-warning" />,
  },
  success: {
    bg: "bg-kp-success-lt",
    border: "border-green-200",
    text: "text-green-800",
    icon: <CheckCircle className="w-5 h-5 text-kp-success" />,
  },
  info: {
    bg: "bg-kp-info-lt",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: <Info className="w-5 h-5 text-kp-info" />,
  },
};

interface AlertBannerProps {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function AlertBanner({ variant, title, children, className }: AlertBannerProps) {
  const c = config[variant];

  return (
    <div className={cn("flex gap-3 p-4 rounded-lg border", c.bg, c.border, className)}>
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div>
        {title && <p className={cn("text-sm font-semibold mb-1", c.text)}>{title}</p>}
        <div className={cn("text-sm", c.text)}>{children}</div>
      </div>
    </div>
  );
}
