"use client";

import {
  Heart,
  Baby,
  AlertTriangle,
  ShieldAlert,
  Thermometer,
  AlertCircle,
  Zap,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertBanner } from "@/components/ui/AlertBanner";
import type { RedFlags } from "@/types";

// ── Definición de flags ────────────────────────────────────────────────────

interface FlagDef {
  key: keyof RedFlags;
  label: string;
  description: string;
  icon: React.ReactNode;
  critical: boolean; // hard-stop en masoterapia
}

const FLAG_DEFS: FlagDef[] = [
  {
    key: "marcapasos",
    label: "Marcapasos / DAI",
    description: "Dispositivo cardíaco implantado",
    icon: <Heart className="w-4 h-4" />,
    critical: true,
  },
  {
    key: "embarazo",
    label: "Embarazo",
    description: "Embarazo activo o posible",
    icon: <Baby className="w-4 h-4" />,
    critical: false,
  },
  {
    key: "tvp",
    label: "TVP / Tromboembolia",
    description: "Trombosis venosa profunda activa",
    icon: <AlertTriangle className="w-4 h-4" />,
    critical: true,
  },
  {
    key: "oncologico",
    label: "Oncológico activo",
    description: "Tratamiento activo de cáncer",
    icon: <ShieldAlert className="w-4 h-4" />,
    critical: true,
  },
  {
    key: "fiebre",
    label: "Fiebre aguda",
    description: "Temperatura >37.5°C en este momento",
    icon: <Thermometer className="w-4 h-4" />,
    critical: true,
  },
  {
    key: "alergias_severas",
    label: "Alergias severas",
    description: "Anafilaxia conocida o alergias graves",
    icon: <AlertCircle className="w-4 h-4" />,
    critical: false,
  },
  {
    key: "infeccion_cutanea",
    label: "Infección cutánea",
    description: "Infección o lesión activa en piel",
    icon: <Zap className="w-4 h-4" />,
    critical: true,
  },
  {
    key: "fragilidad_capilar",
    label: "Fragilidad capilar",
    description: "Historial de hematomas espontáneos",
    icon: <Droplets className="w-4 h-4" />,
    critical: false,
  },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface RedFlagsChecklistProps {
  value: RedFlags;
  onChange: (flags: RedFlags) => void;
  /** En masoterapia las flags críticas bloquean el avance */
  hardStop?: boolean;
  readOnly?: boolean;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function RedFlagsChecklist({
  value,
  onChange,
  hardStop = false,
  readOnly = false,
}: RedFlagsChecklistProps) {
  const activeFlags = FLAG_DEFS.filter((f) => value[f.key]);
  const activeCritical = activeFlags.filter((f) => f.critical);
  const hasActive = activeFlags.length > 0;
  const isBlocked = hardStop && activeCritical.length > 0;

  function toggle(key: keyof RedFlags) {
    if (readOnly) return;
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <div className="space-y-4">
      {/* Alertas activas */}
      {isBlocked && (
        <AlertBanner
          variant="danger"
          title="⛔ CONTRAINDICACIÓN ACTIVA — No proceder con masoterapia"
        >
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            {activeCritical.map((f) => (
              <li key={f.key}>{f.label}</li>
            ))}
          </ul>
        </AlertBanner>
      )}

      {!isBlocked && hasActive && (
        <AlertBanner variant="warning" title="Flags activas — Requieren consideración clínica">
          <span className="text-sm">
            {activeFlags.map((f) => f.label).join(" · ")}
          </span>
        </AlertBanner>
      )}

      {/* Grid de flags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FLAG_DEFS.map((flag) => {
          const active = value[flag.key];
          return (
            <button
              key={flag.key}
              type="button"
              disabled={readOnly}
              onClick={() => toggle(flag.key)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                "cursor-pointer disabled:cursor-default",
                active
                  ? flag.critical
                    ? "bg-kp-danger-lt border-kp-danger/40 text-red-900"
                    : "bg-kp-warning-lt border-kp-warning/40 text-amber-900"
                  : "bg-surface-0 border-kp-border text-ink-2 hover:border-kp-border-md"
              )}
              aria-pressed={active}
              aria-label={`${flag.label}: ${active ? "activo" : "inactivo"}`}
            >
              {/* Checkbox visual */}
              <span
                className={cn(
                  "mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors",
                  active
                    ? flag.critical
                      ? "bg-kp-danger border-kp-danger"
                      : "bg-kp-warning border-kp-warning"
                    : "border-kp-border-md"
                )}
              >
                {active && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    viewBox="0 0 10 8"
                    fill="none"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              {/* Contenido */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      active
                        ? flag.critical
                          ? "text-kp-danger"
                          : "text-kp-warning"
                        : "text-ink-3"
                    )}
                  >
                    {flag.icon}
                  </span>
                  <span className="text-sm font-semibold">{flag.label}</span>
                  {flag.critical && (
                    <span className="text-[0.6rem] font-bold uppercase tracking-wide text-ink-3">
                      CRÍTICO
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-3 mt-0.5">{flag.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {!hasActive && (
        <p className="text-xs text-kp-success font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7 0C3.134 0 0 3.134 0 7s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm3.243 5.757a.875.875 0 00-1.237-1.237L6 9.526 4.994 8.52a.875.875 0 10-1.237 1.237l1.625 1.625a.875.875 0 001.237 0l3.624-3.625z"
              clipRule="evenodd"
            />
          </svg>
          Sin red flags activas
        </p>
      )}
    </div>
  );
}
