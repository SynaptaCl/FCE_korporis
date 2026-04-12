import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  ClipboardList,
  Target,
  Clock,
  Calendar,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { PatientSummary } from "@/app/actions/timeline";

interface SummaryPanelProps {
  summary: PatientSummary;
  patientId: string;
}

// ── Section wrapper ────────────────────────────────────────────────────────

function PanelSection({
  title,
  icon,
  children,
  className,
  editHref,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  editHref?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-kp-accent">{icon}</span>
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-wider flex-1">
          {title}
        </p>
        {editHref && (
          <Link
            href={editHref}
            className="text-ink-4 hover:text-kp-accent transition-colors"
            title={`Ir a ${title}`}
          >
            <Pencil className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ── SummaryPanel ───────────────────────────────────────────────────────────

export function SummaryPanel({ summary, patientId }: SummaryPanelProps) {
  const hasRedFlags = summary.red_flags_activos.length > 0;
  const base = `/dashboard/pacientes/${patientId}`;

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Resumen Clínico
        </p>
      </div>

      <div className="p-4 space-y-4 divide-y divide-kp-border">
        {/* Red Flags — siempre primero si los hay */}
        {hasRedFlags && (
          <PanelSection
            title="Alertas Activas"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            editHref={`${base}/anamnesis`}
          >
            <div className="bg-kp-danger-lt rounded-lg p-2.5 space-y-1.5">
              {summary.red_flags_activos.map((flag) => (
                <div
                  key={flag}
                  className="flex items-center gap-1.5 text-xs font-medium text-kp-danger"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-kp-danger shrink-0" />
                  {flag}
                </div>
              ))}
            </div>
          </PanelSection>
        )}

        {/* Motivo de consulta */}
        <PanelSection
          title="Motivo de Consulta"
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          className={hasRedFlags ? "pt-4" : ""}
          editHref={`${base}/anamnesis`}
        >
          {summary.motivo_consulta ? (
            <p className="text-xs text-ink-2 leading-relaxed line-clamp-5">
              {summary.motivo_consulta}
            </p>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin registro</p>
          )}
        </PanelSection>

        {/* Diagnósticos CIF */}
        <PanelSection
          title="Diagnósticos CIF"
          icon={<Target className="w-3.5 h-3.5" />}
          className="pt-4"
        >
          {summary.cif_activos > 0 ? (
            <Badge variant="teal">{summary.cif_activos} ítems activos</Badge>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin diagnósticos CIF</p>
          )}
        </PanelSection>

        {/* Últimos signos vitales */}
        <PanelSection
          title="Últimos Signos Vitales"
          icon={<Activity className="w-3.5 h-3.5" />}
          className="pt-4"
          editHref={`${base}/anamnesis`}
        >
          {summary.vitales ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { label: "PA", value: summary.vitales.presion_arterial, unit: "mmHg" },
                  { label: "FC", value: summary.vitales.frecuencia_cardiaca, unit: "bpm" },
                  { label: "SpO₂", value: summary.vitales.spo2, unit: "%" },
                  { label: "T°", value: summary.vitales.temperatura, unit: "°C" },
                ] as { label: string; value: string | number | null | undefined; unit: string }[]
              )
                .filter((f) => f.value != null)
                .map((f) => (
                  <div
                    key={f.label}
                    className="bg-surface-0 rounded-lg px-2 py-1.5 text-center"
                  >
                    <p className="text-[0.55rem] font-bold text-ink-3 uppercase tracking-wide">
                      {f.label}
                    </p>
                    <p className="text-xs font-bold text-ink-1">
                      {String(f.value)}{" "}
                      <span className="text-[0.55rem] font-normal text-ink-3">
                        {f.unit}
                      </span>
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin registro</p>
          )}
        </PanelSection>

        {/* Plan actual */}
        <PanelSection
          title="Plan Actual"
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          className="pt-4"
          editHref={`${base}/evolucion`}
        >
          {summary.plan_actual ? (
            <p className="text-xs text-ink-2 leading-relaxed line-clamp-6">
              {summary.plan_actual}
            </p>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin plan registrado</p>
          )}
        </PanelSection>

        {/* Próxima sesión */}
        <PanelSection
          title="Próxima Sesión"
          icon={<Calendar className="w-3.5 h-3.5" />}
          className="pt-4"
        >
          {summary.proxima_sesion ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-kp-primary bg-kp-accent-xs rounded-lg px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-kp-accent shrink-0" />
              {summary.proxima_sesion}
            </div>
          ) : (
            <p className="text-xs text-ink-4 italic">No agendada</p>
          )}
        </PanelSection>
      </div>
    </div>
  );
}
