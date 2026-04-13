"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, ChevronRight, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { calculateAge, formatRut, cn } from "@/lib/utils";
import type { PacienteClinico } from "@/types";

interface PatientListProps {
  patients: PacienteClinico[];
}

function previsionLabel(p: PacienteClinico["prevision"] | null | undefined): string {
  if (!p) return "Sin previsión";
  if (p.tipo === "FONASA") return `FONASA ${p.tramo ?? ""}`.trim();
  if (p.tipo === "Isapre") return p.isapre ?? "Isapre";
  return "Particular";
}

function previsionVariant(tipo: "FONASA" | "Isapre" | "Particular" | null | undefined) {
  if (tipo === "FONASA") return "info" as const;
  if (tipo === "Isapre") return "teal" as const;
  return "default" as const;
}

function atencionesMeta(p: PacienteClinico): string {
  const ultima = p.ultima_atencion
    ? `Última: ${format(parseISO(p.ultima_atencion), "d MMM", { locale: es })}`
    : null;
  const proxima = p.proxima_cita_fecha
    ? `Próxima: ${format(parseISO(p.proxima_cita_fecha), "d MMM", { locale: es })}${
        p.proxima_cita_hora ? ` ${p.proxima_cita_hora.slice(0, 5)}` : ""
      }`
    : null;

  if (!ultima && !proxima) return "Sin atenciones previas";
  if (ultima && !proxima) return `${ultima} · Sin cita agendada`;
  if (!ultima) return proxima ?? "Sin atenciones previas";
  return `${ultima} · ${proxima}`;
}

export function PatientList({ patients }: PatientListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.toLowerCase().replace(/[.\-\s]/g, "");
    return patients.filter((p) => {
      const runClean = (p.rut ?? "").replace(/[.\-\s]/g, "").toLowerCase();
      const fullName =
        [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ").toLowerCase();
      return runClean.includes(q) || fullName.includes(q.toLowerCase());
    });
  }, [patients, query]);

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o RUN…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-1 border border-kp-border rounded-lg outline-none focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent text-ink-1 placeholder:text-ink-4"
          />
        </div>
        <Button
          href="/dashboard/pacientes/nuevo"
          size="sm"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Nueva ficha
        </Button>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState hasQuery={!!query.trim()} />
      ) : (
        <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[2fr_3fr_1fr_1.5fr_0.75fr_auto] gap-4 px-5 py-3 bg-surface-0 border-b border-kp-border">
            {["RUN", "Nombre", "Edad", "Previsión", "Sesiones", ""].map(
              (h) => (
                <span
                  key={h}
                  className="text-[0.65rem] font-semibold text-ink-3 uppercase tracking-wider"
                >
                  {h}
                </span>
              )
            )}
          </div>

          {/* Rows */}
          {filtered.map((patient, idx) => {
            const age = calculateAge(patient.fecha_nacimiento);
            const run = formatRut(patient.rut);
            const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno].filter(Boolean).join(" ");

            return (
              <button
                key={patient.id}
                onClick={() =>
                  router.push(`/dashboard/pacientes/${patient.id}`)
                }
                className={cn(
                  "w-full text-left cursor-pointer transition-colors hover:bg-kp-accent-xs",
                  "px-5 py-3.5 border-b border-kp-border last:border-0",
                  "flex flex-col sm:grid sm:grid-cols-[2fr_3fr_1fr_1.5fr_0.75fr_auto] sm:gap-4 sm:items-center",
                  idx % 2 === 0 ? "bg-surface-1" : "bg-surface-0/50"
                )}
              >
                {/* RUN */}
                <span className="text-sm font-mono font-medium text-ink-1">
                  {run}
                </span>

                {/* Nombre + meta de atenciones */}
                <div className="min-w-0">
                  <span className="text-sm text-ink-1 font-medium truncate block">
                    {fullName}
                  </span>
                  <span className="text-xs text-ink-3 truncate block">
                    {atencionesMeta(patient)}
                  </span>
                </div>

                {/* Edad */}
                <span className="text-sm text-ink-2">
                  {age !== null ? `${age} años` : "Sin registro"}
                </span>

                {/* Previsión */}
                <Badge variant={previsionVariant(patient.prevision?.tipo)}>
                  {previsionLabel(patient.prevision)}
                </Badge>

                {/* Sesiones */}
                <Badge variant={patient.total_encuentros > 0 ? "teal" : "default"}>
                  {patient.total_encuentros}
                </Badge>

                {/* Acción */}
                <ChevronRight className="w-4 h-4 text-ink-4 hidden sm:block" />
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-ink-3">
        {filtered.length} de {patients.length} paciente
        {patients.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border px-6 py-16 text-center">
      <Users className="w-10 h-10 text-ink-4 mx-auto mb-3" />
      <p className="text-sm font-semibold text-ink-2">
        {hasQuery ? "Sin resultados" : "Aún no hay pacientes con atención clínica registrada."}
      </p>
      <p className="text-xs text-ink-3 mt-1">
        {hasQuery
          ? "Prueba con otro nombre o RUN."
          : "Crea la primera ficha clínica con el botón de arriba."}
      </p>
    </div>
  );
}
