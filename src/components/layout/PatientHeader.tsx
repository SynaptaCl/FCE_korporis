import { FileSignature } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { calculateAge, formatRut } from "@/lib/utils";
import type { Patient } from "@/types";

interface PatientHeaderProps {
  patient: Patient;
  hasConsent: boolean;
}

export function PatientHeader({ patient, hasConsent }: PatientHeaderProps) {
  const initials = `${patient.nombre?.charAt(0) ?? ""}${patient.apellido_paterno?.charAt(0) ?? ""}`.toUpperCase() || "?";
  const age = calculateAge(patient.fecha_nacimiento);
  const fullName =
    [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";
  const previsionLabel =
    patient.prevision?.tipo === "FONASA"
      ? `FONASA ${patient.prevision.tramo || ""}`.trim()
      : patient.prevision?.tipo === "Isapre"
        ? patient.prevision.isapre || "Isapre"
        : "Particular";

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border px-6 py-4 flex items-start gap-4">
      {/* Avatar */}
      <div className="w-12 h-12 bg-kp-primary/10 border-2 border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-lg font-bold shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-ink-1 flex items-center gap-2">
          {fullName}
          {hasConsent && (
            <span title="Consentimiento Informado Firmado">
              <FileSignature className="w-4 h-4 text-kp-success" />
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-ink-2">
          <span>
            <span className="font-medium text-ink-1">RUT:</span>{" "}
            {formatRut(patient.rut)}
          </span>
          <span>
            <span className="font-medium text-ink-1">Edad:</span>{" "}
            {age !== null ? `${age} años` : "Sin registro"} ({patient.sexo_registral ?? "—"})
          </span>
          <span>
            <span className="font-medium text-ink-1">Previsión:</span>{" "}
            {previsionLabel}
          </span>
          <span>
            <span className="font-medium text-ink-1">Ocupación:</span>{" "}
            {patient.ocupacion ?? "Sin registro"}
          </span>
        </div>
        <div className="flex gap-2 mt-1.5">
          <Badge variant="teal">Paciente activo</Badge>
          {hasConsent && (
            <Badge variant="success">Consentimiento firmado</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
