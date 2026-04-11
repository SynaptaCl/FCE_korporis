import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, title, icon, className, padding = true }: CardProps) {
  return (
    <div className={cn("bg-surface-1 rounded-xl shadow-sm border border-kp-border", className)}>
      {title && (
        <div className="flex items-center gap-2 px-6 py-4 border-b border-kp-border">
          {icon && <span className="text-kp-accent">{icon}</span>}
          <h3 className="text-base font-bold text-ink-1">{title}</h3>
        </div>
      )}
      <div className={cn(padding && "p-6")}>{children}</div>
    </div>
  );
}
