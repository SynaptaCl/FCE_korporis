import { Loader2 } from "lucide-react";

interface LoadingPageProps {
  label?: string;
}

export function LoadingPage({ label = "Cargando…" }: LoadingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-kp-accent" />
      <p className="text-sm text-ink-3">{label}</p>
    </div>
  );
}
