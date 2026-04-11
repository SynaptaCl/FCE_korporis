import { Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TopBarProps {
  title: string;
  children?: React.ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  return (
    <header className="bg-surface-1 shadow-sm border-b border-kp-border z-10 shrink-0">
      <div className="flex justify-between items-center px-6 h-14">
        <h1 className="text-lg font-bold text-ink-1">{title}</h1>
        <div className="flex items-center gap-4">
          {children}
          <span className="text-sm text-ink-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDate(new Date())}
          </span>
        </div>
      </div>
    </header>
  );
}
