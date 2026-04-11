"use client";

import { FileSignature, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { calculateAge } from "@/lib/utils";
import { ESPECIALIDAD_LABELS, type Especialidad } from "@/lib/constants";
import type { Patient } from "@/types";

interface PatientHeaderProps {
  patient: Patient;
  hasConsent: boolean;
  selectedSpecialty: Especialidad;
  onSpecialtyChange: (specialty: Especialidad) => void;
}

export function PatientHeader({
  patient,
  hasConsent,
  selectedSpecialty,
  onSpecialtyChange,
}: PatientHeaderProps) {
  const initials = `${patient.nombre?.charAt(0) ?? ""}${patient.apellido_paterno?.charAt(0) ?? ""}`;
  const age = calculateAge(patient.fecha_nacimiento);
  const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
  const previsionLabel =
    patient.prevision?.tipo === "FONASA"
      ? `FONASA ${patient.prevision.tramo || ""}`.trim()
      : patient.prevision?.tipo === "Isapre"
        ? patient.prevision.isapre || "Isapre"
        : "Particular";

  return (
    <div className="px-6 py-4 bg-surface-0 border-b border-kp-border flex items-start justify-between">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 bg-kp-primary/10 border-2 border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-xl font-bold shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div>
          <h2 className="text-xl font-bold text-ink-1 flex items-center gap-2">
            {fullName}
            {hasConsent && (
              <span title="Consentimiento Informado Firmado">
                <FileSignature className="w-4 h-4 text-kp-success" />
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-ink-2">
            <span>
              <span className="font-medium text-ink-1">RUT:</span> {patient.rut}
            </span>
            <span>
              <span className="font-medium text-ink-1">Edad:</span>{" "}
              {age !== null ? `${age} años` : "Sin registro"} ({patient.sexo_registral})
            </span>
            <span>
              <span className="font-medium text-ink-1">Previsión:</span> {previsionLabel}
            </span>
            <span>
              <span className="font-medium text-ink-1">Ocupación:</span> {patient.ocupacion}
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="info" icon={<CheckCircle className="w-3 h-3" />}>
              Validado Registro Civil
            </Badge>
          </div>
        </div>
      </div>

      {/* Specialty selector */}
      <div className="shrink-0 w-56">
        <Select
          label="Módulo activo"
          value={selectedSpecialty}
          onChange={(e) => onSpecialtyChange(e.target.value as Especialidad)}
          options={Object.entries(ESPECIALIDAD_LABELS).map(([value, label]) => ({
            value,
            label: `Módulo: ${label}`,
          }))}
        />
      </div>
    </div>
  );
}
