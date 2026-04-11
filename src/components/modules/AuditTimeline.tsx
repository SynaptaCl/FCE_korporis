"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Filter,
  Clock,
  FileText,
  LogIn,
  LogOut,
  PenLine,
  Eye,
  Printer,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getAuditLogs, type AuditFilter } from "@/app/actions/auditoria";
import type { AuditEntry, AuditAction } from "@/types";

// ── Icon map por tipo de acción ───────────────────────────────────────────

const ACTION_ICONS: Record<AuditAction, React.ComponentType<{ className?: string }>> = {
  login:  LogIn,
  logout: LogOut,
  read:   Eye,
  create: FileText,
  update: PenLine,
  sign:   ShieldCheck,
  export: Printer,
};

const ACTION_LABELS: Record<AuditAction, string> = {
  login:  "Inicio de sesión",
  logout: "Cierre de sesión",
  read:   "Lectura",
  create: "Creación",
  update: "Modificación",
  sign:   "Firma",
  export: "Exportación",
};

const TABLA_LABELS: Record<string, string> = {
  pacientes:           "Paciente",
  fce_anamnesis:       "Anamnesis",
  fce_signos_vitales:  "Signos vitales",
  fce_evaluaciones:    "Evaluación",
  fce_encuentros:      "Encuentro",
  fce_notas_soap:      "Nota SOAP",
  fce_consentimientos: "Consentimiento",
  logs_auditoria:      "Auditoría",
  anamnesis:           "Anamnesis",
  vital_signs:         "Signos vitales",
};

// ── AuditEntryRow ─────────────────────────────────────────────────────────

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const Icon = ACTION_ICONS[entry.accion] ?? FileText;
  const fecha = new Date(entry.created_at);

  return (
    <div className="flex gap-4 items-start">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full border border-kp-border bg-surface-0 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-kp-primary" />
        </div>
        <div className="w-px flex-1 bg-kp-border mt-1 min-h-[24px]" />
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-ink-1">
              {ACTION_LABELS[entry.accion] ?? entry.accion}
              {entry.tabla_afectada && (
                <span className="font-normal text-ink-3">
                  {" · "}{TABLA_LABELS[entry.tabla_afectada] ?? entry.tabla_afectada}
                </span>
              )}
            </p>
            <p className="text-xs text-ink-3 font-mono">
              Actor: {entry.actor_id.slice(0, 8)}…
              {entry.actor_tipo !== "profesional" && ` (${entry.actor_tipo})`}
            </p>
            {entry.registro_id && (
              <p className="text-xs text-ink-4 font-mono">
                ID: {entry.registro_id.slice(0, 12)}…
              </p>
            )}
          </div>
          <time className="text-xs text-ink-3 shrink-0" title={fecha.toISOString()}>
            {fecha.toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" "}
            {fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
          </time>
        </div>
      </div>
    </div>
  );
}

// ── AuditTimeline ─────────────────────────────────────────────────────────

interface AuditTimelineProps {
  patientId: string;
  initialLogs: AuditEntry[];
}

const ACCIONES_OPTIONS: { value: string; label: string }[] = [
  { value: "",       label: "Todas las acciones" },
  { value: "create", label: "Creación" },
  { value: "update", label: "Modificación" },
  { value: "sign",   label: "Firma" },
  { value: "read",   label: "Lectura" },
  { value: "login",  label: "Login" },
  { value: "export", label: "Exportación" },
];

export function AuditTimeline({ patientId, initialLogs }: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditEntry[]>(initialLogs);
  const [filter, setFilter] = useState<AuditFilter>({ patientId });
  const [loading, setLoading] = useState(false);

  const applyFilter = async (newFilter: Partial<AuditFilter>) => {
    const merged = { ...filter, ...newFilter };
    setFilter(merged);
    setLoading(true);
    const result = await getAuditLogs(merged);
    setLoading(false);
    if (result.success) setLogs(result.data);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-kp-accent" />
        <h3 className="text-base font-bold text-ink-1">Historial de Auditoría</h3>
        <Badge variant="default" className="ml-auto">{logs.length} registros</Badge>
      </div>

      {/* Filtros */}
      <div className="bg-surface-0 border border-kp-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-ink-3 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Acción"
            options={ACCIONES_OPTIONS}
            value={filter.accion ?? ""}
            onChange={(e) =>
              applyFilter({ accion: e.target.value as AuditAction | "" })
            }
          />
          <Input
            label="Desde"
            type="date"
            value={filter.desde ?? ""}
            onChange={(e) => applyFilter({ desde: e.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            value={filter.hasta ?? ""}
            onChange={(e) => applyFilter({ hasta: e.target.value })}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFilter({ accion: "", desde: "", hasta: "", patientId })}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Limpiar filtros
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-10 text-ink-3 text-sm">Cargando...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-ink-3">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay registros con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className={cn("pl-2")}>
          {logs.map((entry) => (
            <AuditEntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
