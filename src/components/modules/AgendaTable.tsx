"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { CitaAgenda } from "@/types";

interface AgendaTableProps {
  citas: CitaAgenda[];
}

type BadgeVariant = "info" | "warning" | "default" | "danger" | "teal";

function encuentroStatusBadge(status: CitaAgenda["encuentro_status"]): { label: string; variant: BadgeVariant } {
  switch (status) {
    case "planificado":  return { label: "Planificado", variant: "info" };
    case "en_progreso":  return { label: "En curso",    variant: "warning" };
    case "finalizado":   return { label: "Finalizado",  variant: "default" };
    default:             return { label: "Sin encuentro", variant: "danger" };
  }
}

export function AgendaTable({ citas }: AgendaTableProps) {
  const router = useRouter();

  if (citas.length === 0) {
    return (
      <div className="bg-surface-1 rounded-xl border border-kp-border px-6 py-12 text-center">
        <Calendar className="w-8 h-8 text-ink-4 mx-auto mb-3" />
        <p className="text-sm font-semibold text-ink-2">No hay citas confirmadas para hoy</p>
        <p className="text-xs text-ink-3 mt-1">
          Las citas aparecen aquí cuando recepción confirma el check-in.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[0.8fr_2fr_1.5fr_1.5fr] gap-4 px-5 py-3 bg-surface-0 border-b border-kp-border">
        {["Hora", "Paciente", "Especialidad", "Encuentro"].map((h) => (
          <span
            key={h}
            className="text-[0.65rem] font-semibold text-ink-3 uppercase tracking-wider"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Filas */}
      {citas.map((cita, idx) => {
        const { label, variant } = encuentroStatusBadge(cita.encuentro_status);
        const isNavigable = !!cita.id_encuentro;
        const hora = cita.hora_inicio.slice(0, 5);
        const paciente = [cita.paciente_nombre, cita.paciente_apellido]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={cita.id_cita}
            disabled={!isNavigable}
            onClick={() =>
              isNavigable && router.push(`/dashboard/pacientes/${cita.id_paciente}`)
            }
            className={cn(
              "w-full text-left transition-colors",
              "px-5 py-3.5 border-b border-kp-border last:border-0",
              "flex flex-col sm:grid sm:grid-cols-[0.8fr_2fr_1.5fr_1.5fr] sm:gap-4 sm:items-center",
              idx % 2 === 0 ? "bg-surface-1" : "bg-surface-0/50",
              isNavigable
                ? "cursor-pointer hover:bg-kp-accent-xs"
                : "cursor-default opacity-60"
            )}
          >
            {/* Hora */}
            <span className="text-sm font-mono font-semibold text-ink-1">{hora}</span>

            {/* Paciente + notas */}
            <div className="min-w-0">
              <span className="text-sm font-medium text-ink-1 block truncate">
                {paciente}
              </span>
              {cita.notas_cita && (
                <span className="text-xs text-ink-3 block truncate">{cita.notas_cita}</span>
              )}
            </div>

            {/* Especialidad */}
            <span className="text-sm text-ink-2 capitalize">
              {cita.profesional_especialidad ?? "—"}
            </span>

            {/* Estado del encuentro */}
            <Badge variant={variant}>{label}</Badge>
          </button>
        );
      })}
    </div>
  );
}
