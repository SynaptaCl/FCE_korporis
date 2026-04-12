"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 px-4">
      <div className="w-14 h-14 rounded-full bg-kp-danger-lt flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-kp-danger" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-ink-1">Algo salió mal</h2>
        <p className="text-sm text-ink-3 max-w-sm">
          Ocurrió un error inesperado al cargar la ficha. Los datos del paciente
          no se vieron afectados.
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        <RefreshCw className="w-4 h-4 mr-1.5" />
        Reintentar
      </Button>
    </div>
  );
}
