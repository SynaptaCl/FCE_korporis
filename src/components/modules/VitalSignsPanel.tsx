"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, CheckCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { saveVitalSigns } from "@/app/actions/anamnesis";
import type { VitalSigns } from "@/types";

// ── Schema local (string-based para compatibilidad con RHF) ────────────────
// Los inputs HTML devuelven strings; validamos como strings y convertimos en submit.

const vsFormSchema = z.object({
  presion_arterial: z
    .string()
    .refine((v) => !v || /^\d{2,3}\/\d{2,3}$/.test(v), "Formato: 120/80")
    .optional(),
  frecuencia_cardiaca: z
    .string()
    .refine((v) => !v || (Number(v) >= 30 && Number(v) <= 250), "Rango: 30–250 lpm")
    .optional(),
  spo2: z
    .string()
    .refine((v) => !v || (Number(v) >= 50 && Number(v) <= 100), "Rango: 50–100 %")
    .optional(),
  temperatura: z
    .string()
    .refine((v) => !v || (Number(v) >= 34 && Number(v) <= 42), "Rango: 34–42 °C")
    .optional(),
  frecuencia_respiratoria: z
    .string()
    .refine((v) => !v || (Number(v) >= 5 && Number(v) <= 60), "Rango: 5–60 rpm")
    .optional(),
});

type VsFormType = z.infer<typeof vsFormSchema>;

// ── Helpers de rangos normales ─────────────────────────────────────────────

function getRangeStatus(raw: string | undefined, normal: [number, number], warning: [number, number]) {
  if (!raw) return "neutral";
  const value = Number(raw);
  if (isNaN(value)) return "neutral";
  if (value >= normal[0] && value <= normal[1]) return "normal";
  if (value >= warning[0] && value <= warning[1]) return "warning";
  return "danger";
}

const statusColors = {
  neutral: "text-ink-3",
  normal: "text-kp-success",
  warning: "text-kp-warning",
  danger: "text-kp-danger",
};

// ── Props ──────────────────────────────────────────────────────────────────

interface VitalSignsPanelProps {
  patientId: string;
  latestVitalSigns?: VitalSigns | null;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function VitalSignsPanel({ patientId, latestVitalSigns }: VitalSignsPanelProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VsFormType>({
    resolver: zodResolver(vsFormSchema),
    defaultValues: latestVitalSigns
      ? {
          presion_arterial: latestVitalSigns.presion_arterial ?? "",
          frecuencia_cardiaca: latestVitalSigns.frecuencia_cardiaca
            ? String(latestVitalSigns.frecuencia_cardiaca)
            : "",
          spo2: latestVitalSigns.spo2 ? String(latestVitalSigns.spo2) : "",
          temperatura: latestVitalSigns.temperatura
            ? String(latestVitalSigns.temperatura)
            : "",
          frecuencia_respiratoria: latestVitalSigns.frecuencia_respiratoria
            ? String(latestVitalSigns.frecuencia_respiratoria)
            : "",
        }
      : {},
  });

  const watchedValues = useWatch({ control });

  async function onSubmit(data: VsFormType) {
    // Solo guardar si hay al menos un campo con valor
    const hasAnyValue = Object.values(data).some((v) => v !== undefined && v !== "");
    if (!hasAnyValue) {
      setServerError("Ingresa al menos un signo vital antes de guardar.");
      return;
    }

    setServerError(null);
    setSaved(false);

    const result = await saveVitalSigns(patientId, {
      presion_arterial: data.presion_arterial ?? "",
      frecuencia_cardiaca: data.frecuencia_cardiaca ? Number(data.frecuencia_cardiaca) : 0,
      spo2: data.spo2 ? Number(data.spo2) : 0,
      temperatura: data.temperatura ? Number(data.temperatura) : 0,
      frecuencia_respiratoria: data.frecuencia_respiratoria
        ? Number(data.frecuencia_respiratoria)
        : 0,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setSaved(true);
  }

  const fcStatus = getRangeStatus(watchedValues.frecuencia_cardiaca, [60, 100], [50, 120]);
  const spo2Status = getRangeStatus(watchedValues.spo2, [95, 100], [90, 94]);
  const tempStatus = getRangeStatus(watchedValues.temperatura, [36.1, 37.2], [35, 37.5]);
  const frStatus = getRangeStatus(watchedValues.frecuencia_respiratoria, [12, 20], [10, 24]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <AlertBanner variant="danger">{serverError}</AlertBanner>
      )}
      {saved && (
        <AlertBanner variant="success" title="Signos vitales guardados">
          Registro guardado correctamente.
        </AlertBanner>
      )}

      {latestVitalSigns && (
        <p className="text-xs text-ink-3">
          Último registro:{" "}
          {new Date(latestVitalSigns.recorded_at).toLocaleDateString("es-CL", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Presión arterial */}
        <VsField
          label="Presión arterial"
          unit="mmHg"
          placeholder="120/80"
          hint="Sistólica/Diastólica"
          icon={<Activity className="w-4 h-4" />}
          error={errors.presion_arterial?.message}
          statusColor="neutral"
          {...register("presion_arterial")}
        />

        {/* FC */}
        <VsField
          label="Frec. cardíaca"
          unit="lpm"
          placeholder="72"
          hint="Normal: 60–100 lpm"
          type="number"
          icon={<Activity className="w-4 h-4" />}
          error={errors.frecuencia_cardiaca?.message}
          statusColor={statusColors[fcStatus]}
          {...register("frecuencia_cardiaca")}
        />

        {/* SpO2 */}
        <VsField
          label="SpO₂"
          unit="%"
          placeholder="98"
          hint="Normal: ≥95%"
          type="number"
          icon={<Activity className="w-4 h-4" />}
          error={errors.spo2?.message}
          statusColor={statusColors[spo2Status]}
          {...register("spo2")}
        />

        {/* Temperatura */}
        <VsField
          label="Temperatura"
          unit="°C"
          placeholder="36.5"
          hint="Normal: 36.1–37.2°C"
          type="number"
          step="0.1"
          icon={<Activity className="w-4 h-4" />}
          error={errors.temperatura?.message}
          statusColor={statusColors[tempStatus]}
          {...register("temperatura")}
        />

        {/* FR */}
        <VsField
          label="Frec. respiratoria"
          unit="rpm"
          placeholder="16"
          hint="Normal: 12–20 rpm"
          type="number"
          icon={<Activity className="w-4 h-4" />}
          error={errors.frecuencia_respiratoria?.message}
          statusColor={statusColors[frStatus]}
          {...register("frecuencia_respiratoria")}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="text-sm text-kp-success flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Guardado
          </span>
        )}
        <Button type="submit" variant="secondary" size="sm" disabled={isSubmitting}>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {isSubmitting ? "Guardando…" : "Guardar signos vitales"}
        </Button>
      </div>
    </form>
  );
}

// ── VsField helper ─────────────────────────────────────────────────────────

interface VsFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  unit: string;
  hint: string;
  icon: React.ReactNode;
  error?: string;
  statusColor: string;
}

const VsField = ({
  label,
  unit,
  hint,
  icon,
  error,
  statusColor,
  ...props
}: VsFieldProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-ink-1 flex items-center gap-1.5">
        <span className="text-ink-3">{icon}</span>
        {label}
      </label>
      <span className={cn("text-xs font-semibold", statusColor)}>{unit}</span>
    </div>
    <input
      className={cn(
        "w-full px-3 py-2 text-sm text-ink-1 bg-surface-1 border rounded-lg",
        "placeholder:text-ink-4 outline-none transition-colors",
        "focus:ring-2 focus:ring-kp-accent/30 focus:border-kp-accent",
        error ? "border-kp-danger" : "border-kp-border"
      )}
      {...props}
    />
    {error ? (
      <p className="text-xs text-kp-danger">{error}</p>
    ) : (
      <p className="text-xs text-ink-3">{hint}</p>
    )}
  </div>
);
