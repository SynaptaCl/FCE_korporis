# Ficha Clínica — Layout TrakCare 3 Columnas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el layout de tabs de `/dashboard/pacientes/[id]` por un diseño de 3 columnas inspirado en TrakCare: nav de acciones (izquierda) + timeline clínico cronológico (centro) + panel resumen (derecha).

**Architecture:** Approach A — solo se reescribe `/[id]/page.tsx`. Las sub-páginas (`/evaluacion`, `/evolucion`, `/anamnesis`, `/consentimiento`, `/auditoria`) permanecen intactas. Los datos del timeline y resumen vienen del server action `getPatientTimeline` ya existente.

**Tech Stack:** Next.js 16 App Router · TypeScript 5 strict · Tailwind v4 · tokens kp-* · lucide-react · Server + Client Components

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modificar | `src/components/layout/PatientHeader.tsx` | Convertir a Server Component (quitar specialty selector) |
| Crear | `src/components/modules/PatientActionNav.tsx` | Nav izquierdo con secciones agrupadas + active state |
| Crear | `src/components/modules/ClinicalTimeline.tsx` | Feed cronológico con tabs + expand/collapse (client) |
| Crear | `src/components/modules/SummaryPanel.tsx` | Panel resumen derecho (server) |
| Reescribir | `src/app/dashboard/pacientes/[id]/page.tsx` | Hub 3 columnas — orquesta fetch + renderiza grid |
| Modificar | `src/components/modules/index.ts` | Exportar PatientActionNav + ClinicalTimeline + SummaryPanel |

**Archivos NO tocar:** `/evaluacion`, `/evolucion`, `/anamnesis`, `/consentimiento`, `/auditoria` pages. Tampoco `actions/timeline.ts` (ya funciona).

---

## Task 1: Simplificar `PatientHeader` a Server Component

**Files:**
- Modify: `src/components/layout/PatientHeader.tsx`

El `PatientHeader` actual es `'use client'` con props de specialty selector que ya no necesitamos. Lo convertimos a Server Component puro.

- [ ] **Step 1.1: Reemplazar PatientHeader.tsx**

```tsx
// src/components/layout/PatientHeader.tsx
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
    <div className="bg-surface-1 rounded-xl border border-kp-border px-6 py-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-kp-primary/10 border-2 border-kp-accent/20 rounded-lg flex items-center justify-center text-kp-primary text-lg font-bold shrink-0">
          {initials}
        </div>
        {/* Info */}
        <div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 1.2: Verificar build parcial**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

El build debe pasar. Si falla con "PatientHeader props mismatch", buscar dónde se usa y actualizar el call site.

---

## Task 2: Crear `PatientActionNav`

**Files:**
- Create: `src/components/modules/PatientActionNav.tsx`

Nav izquierdo con secciones agrupadas. Es `'use client'` para usar `usePathname` y destacar el item activo.

- [ ] **Step 2.1: Crear PatientActionNav.tsx**

```tsx
// src/components/modules/PatientActionNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Stethoscope,
  FileText,
  FileSignature,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientActionNavProps {
  patientId: string;
  isAdmin: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

type NavEntry = NavGroup | { item: NavItem };

function buildNav(patientId: string): NavEntry[] {
  const base = `/dashboard/pacientes/${patientId}`;
  return [
    {
      title: "Evaluación",
      items: [
        {
          id: "signos",
          label: "Signos Vitales",
          icon: <Activity className="w-4 h-4" />,
          href: `${base}/anamnesis`,
        },
        {
          id: "evaluacion",
          label: "Evaluación Kine/Fono/Maso",
          icon: <Stethoscope className="w-4 h-4" />,
          href: `${base}/evaluacion`,
        },
      ],
    },
    {
      title: "Evolución",
      items: [
        {
          id: "soap",
          label: "Notas SOAP",
          icon: <FileText className="w-4 h-4" />,
          href: `${base}/evolucion`,
        },
      ],
    },
    {
      item: {
        id: "consentimiento",
        label: "Consentimientos",
        icon: <FileSignature className="w-4 h-4" />,
        href: `${base}/consentimiento`,
      },
    },
    {
      item: {
        id: "auditoria",
        label: "Auditoría",
        icon: <ShieldCheck className="w-4 h-4" />,
        href: `${base}/auditoria`,
        adminOnly: true,
      },
    },
  ];
}

function NavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group",
        isActive
          ? "bg-kp-accent-xs text-kp-primary font-medium border border-kp-accent/30"
          : "text-ink-2 hover:bg-surface-0 hover:text-ink-1"
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          isActive
            ? "text-kp-accent"
            : "text-ink-3 group-hover:text-kp-accent"
        )}
      >
        {item.icon}
      </span>
      <span className="leading-tight text-xs font-medium">{item.label}</span>
    </Link>
  );
}

export function PatientActionNav({
  patientId,
  isAdmin,
}: PatientActionNavProps) {
  const pathname = usePathname();
  const entries = buildNav(patientId);

  function isActiveHref(href: string) {
    // exact match OR starts-with for nested paths
    return pathname === href || pathname.startsWith(href + "?");
  }

  return (
    <nav className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border flex items-center justify-between">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Acciones
        </p>
        <Link
          href={`/dashboard/pacientes/${patientId}/evolucion?nueva=1`}
          className="flex items-center gap-1 text-[0.65rem] font-semibold text-kp-accent hover:text-kp-primary transition-colors"
          title="Nueva nota SOAP"
        >
          <Plus className="w-3 h-3" />
          Nueva nota
        </Link>
      </div>

      {/* Nav entries */}
      <div className="p-2 space-y-1">
        {entries.map((entry, idx) => {
          if ("title" in entry) {
            // Group
            return (
              <div key={entry.title}>
                {idx > 0 && <div className="my-1 border-t border-kp-border" />}
                <p className="px-3 pt-1 pb-0.5 text-[0.58rem] font-bold text-ink-4 uppercase tracking-wider">
                  {entry.title}
                </p>
                <div className="space-y-0.5">
                  {entry.items.map((item) => (
                    <NavLink
                      key={item.id}
                      item={item}
                      isActive={isActiveHref(item.href)}
                    />
                  ))}
                </div>
              </div>
            );
          }
          // Standalone item
          const { item } = entry;
          if (item.adminOnly && !isAdmin) return null;
          return (
            <div key={item.id}>
              <div className="my-1 border-t border-kp-border" />
              <NavLink item={item} isActive={isActiveHref(item.href)} />
            </div>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2.2: Verificar build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Debe compilar sin errores. El componente aún no está importado en ninguna página.

---

## Task 3: Crear `ClinicalTimeline`

**Files:**
- Create: `src/components/modules/ClinicalTimeline.tsx`

Feed cronológico con tabs de filtro y expand/collapse. Client Component. Recibe `entries` y `currentUserId` como props (data ya fetched en servidor).

- [ ] **Step 3.1: Crear ClinicalTimeline.tsx**

```tsx
// src/components/modules/ClinicalTimeline.tsx
"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Stethoscope,
  FileText,
  FileSignature,
  Lock,
  ChevronsUpDown,
  ChevronsDownUp,
  User,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "@/app/actions/timeline";

// ── Types ──────────────────────────────────────────────────────────────────

type FilterTab = "todos" | "mis" | "kinesiologia" | "fonoaudiologia" | "masoterapia";

interface ClinicalTimelineProps {
  entries: TimelineEntry[];
  currentUserId: string;
}

// ── Config ─────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "mis", label: "Mis Atenciones" },
  { key: "kinesiologia", label: "Kinesiología" },
  { key: "fonoaudiologia", label: "Fonoaudiología" },
  { key: "masoterapia", label: "Masoterapia" },
];

const TYPE_CONFIG: Record<
  TimelineEntry["type"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeVariant: "teal" | "info" | "warning" | "success";
    borderColor: string;
    bgColor: string;
  }
> = {
  soap: {
    label: "Nota SOAP",
    icon: FileText,
    badgeVariant: "teal",
    borderColor: "border-l-kp-accent",
    bgColor: "bg-kp-accent-xs",
  },
  evaluacion: {
    label: "Evaluación",
    icon: Stethoscope,
    badgeVariant: "info",
    borderColor: "border-l-kp-info",
    bgColor: "bg-kp-info-lt",
  },
  signos_vitales: {
    label: "Signos Vitales",
    icon: Activity,
    badgeVariant: "warning",
    borderColor: "border-l-kp-secondary",
    bgColor: "bg-kp-secondary-lt",
  },
  consentimiento: {
    label: "Consentimiento",
    icon: FileSignature,
    badgeVariant: "success",
    borderColor: "border-l-kp-success",
    bgColor: "bg-kp-success-lt",
  },
};

const ESPECIALIDAD_LABELS: Record<string, string> = {
  kinesiologia: "Kinesiología",
  fonoaudiologia: "Fonoaudiología",
  masoterapia: "Masoterapia",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Entry content by type ──────────────────────────────────────────────────

function SoapContent({ data }: { data: TimelineEntry["data"] }) {
  return (
    <div className="space-y-2 text-xs text-ink-2">
      {data.subjetivo && (
        <div>
          <span className="font-semibold text-ink-1 uppercase tracking-wide text-[0.6rem]">S — Subjetivo</span>
          <p className="mt-0.5 text-ink-2 leading-relaxed">{data.subjetivo}</p>
        </div>
      )}
      {data.objetivo && (
        <div>
          <span className="font-semibold text-ink-1 uppercase tracking-wide text-[0.6rem]">O — Objetivo</span>
          <p className="mt-0.5 text-ink-2 leading-relaxed">{data.objetivo}</p>
        </div>
      )}
      {data.plan && (
        <div>
          <span className="font-semibold text-ink-1 uppercase tracking-wide text-[0.6rem]">P — Plan</span>
          <p className="mt-0.5 text-ink-2 leading-relaxed">{data.plan}</p>
        </div>
      )}
      {data.proxima_sesion && (
        <div className="flex items-center gap-1.5 mt-1 text-kp-primary">
          <Clock className="w-3 h-3" />
          <span className="font-medium">Próxima sesión: {data.proxima_sesion}</span>
        </div>
      )}
      {data.cif_count > 0 && (
        <Badge variant="teal">{data.cif_count} ítems CIF</Badge>
      )}
      {data.firmado && (
        <div className="flex items-center gap-1 text-kp-success text-[0.65rem] font-medium">
          <Lock className="w-3 h-3" />
          Firmado el {formatDateTime(data.firmado_at)}
        </div>
      )}
    </div>
  );
}

function EvaluacionContent({ data }: { data: TimelineEntry["data"] }) {
  const esp = data.especialidad
    ? ESPECIALIDAD_LABELS[data.especialidad] ?? data.especialidad
    : null;
  const area = data.sub_area
    ? String(data.sub_area).replace(/_/g, " ")
    : null;
  return (
    <div className="text-xs text-ink-2 space-y-1">
      {esp && (
        <p>
          <span className="font-semibold text-ink-1">Especialidad:</span> {esp}
        </p>
      )}
      {area && (
        <p>
          <span className="font-semibold text-ink-1">Área:</span>{" "}
          <span className="capitalize">{area}</span>
        </p>
      )}
      {data.contraindicaciones_certificadas === true && (
        <Badge variant="success">Contraindicaciones certificadas ✓</Badge>
      )}
    </div>
  );
}

function SignosContent({ data }: { data: TimelineEntry["data"] }) {
  const fields = [
    { label: "PA", value: data.presion_arterial, unit: "mmHg" },
    { label: "FC", value: data.frecuencia_cardiaca, unit: "bpm" },
    { label: "SpO₂", value: data.spo2, unit: "%" },
    { label: "T°", value: data.temperatura, unit: "°C" },
    { label: "FR", value: data.frecuencia_respiratoria, unit: "rpm" },
  ].filter((f) => f.value != null);
  return (
    <div className="grid grid-cols-3 gap-2">
      {fields.map((f) => (
        <div key={f.label} className="bg-surface-0 rounded-lg px-2 py-1.5 text-center">
          <p className="text-[0.55rem] font-bold text-ink-3 uppercase tracking-wide">{f.label}</p>
          <p className="text-sm font-bold text-ink-1">
            {String(f.value)}{" "}
            <span className="text-[0.6rem] font-normal text-ink-3">{f.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function ConsentimientoContent({ data }: { data: TimelineEntry["data"] }) {
  return (
    <div className="text-xs text-ink-2">
      <p>
        <span className="font-semibold text-ink-1">Tipo:</span>{" "}
        <span className="capitalize">{data.tipo ?? "—"}</span>
      </p>
      {data.version && (
        <p>
          <span className="font-semibold text-ink-1">Versión:</span> {data.version}
        </p>
      )}
    </div>
  );
}

function EntryContent({ entry }: { entry: TimelineEntry }) {
  switch (entry.type) {
    case "soap":
      return <SoapContent data={entry.data} />;
    case "evaluacion":
      return <EvaluacionContent data={entry.data} />;
    case "signos_vitales":
      return <SignosContent data={entry.data} />;
    case "consentimiento":
      return <ConsentimientoContent data={entry.data} />;
  }
}

// ── TimelineCard ───────────────────────────────────────────────────────────

function TimelineCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: TimelineEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = TYPE_CONFIG[entry.type];
  const TypeIcon = cfg.icon;
  const espLabel = entry.especialidad
    ? ESPECIALIDAD_LABELS[entry.especialidad] ?? entry.especialidad
    : null;

  return (
    <div
      className={cn(
        "bg-surface-1 rounded-xl border border-kp-border border-l-2 overflow-hidden transition-shadow hover:shadow-sm",
        cfg.borderColor
      )}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left group"
        aria-expanded={expanded}
      >
        {/* Type icon */}
        <div
          className={cn(
            "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            cfg.bgColor
          )}
        >
          <TypeIcon className="w-3.5 h-3.5 text-ink-1" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-1">{entry.titulo}</span>
            {espLabel && (
              <Badge variant={cfg.badgeVariant} className="text-[0.6rem]">
                {espLabel}
              </Badge>
            )}
            {entry.firmado && (
              <Lock className="w-3 h-3 text-kp-success shrink-0" title="Firmado" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[0.65rem] text-ink-3">
            {entry.profesional_nombre && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.profesional_nombre}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(entry.date)}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-ink-3 mt-0.5 truncate">{entry.resumen}</p>
          )}
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-ink-4 group-hover:text-kp-accent transition-colors mt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-kp-border">
          <EntryContent entry={entry} />
        </div>
      )}
    </div>
  );
}

// ── ClinicalTimeline ───────────────────────────────────────────────────────

export function ClinicalTimeline({
  entries,
  currentUserId,
}: ClinicalTimelineProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    switch (activeTab) {
      case "todos":
        return entries;
      case "mis":
        return entries.filter((e) => e.autor_id === currentUserId);
      case "kinesiologia":
        return entries.filter((e) => e.especialidad === "kinesiologia");
      case "fonoaudiologia":
        return entries.filter((e) => e.especialidad === "fonoaudiologia");
      case "masoterapia":
        return entries.filter((e) => e.especialidad === "masoterapia");
    }
  }, [entries, activeTab, currentUserId]);

  // ── Expand/collapse ───────────────────────────────────────────────────
  const allExpanded = filtered.length > 0 && filtered.every((e) => expandedIds.has(e.id));

  function toggleEntry(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(filtered.map((e) => e.id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border flex items-center justify-between gap-2">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest shrink-0">
          Timeline Clínico
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1 text-[0.65rem] font-medium text-ink-3 hover:text-kp-accent transition-colors px-2 py-1 rounded-md hover:bg-surface-0"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="w-3 h-3" />
                Colapsar todo
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3 h-3" />
                Expandir todo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-kp-border overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "todos"
              ? entries.length
              : tab.key === "mis"
                ? entries.filter((e) => e.autor_id === currentUserId).length
                : entries.filter((e) => e.especialidad === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-kp-accent text-kp-primary"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[0.55rem] font-bold px-1 py-0.5 rounded-full min-w-[1rem] text-center",
                    activeTab === tab.key
                      ? "bg-kp-accent text-white"
                      : "bg-surface-0 text-ink-3"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Entries */}
      <div className="p-3 space-y-2 min-h-[200px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-8 h-8 text-ink-4 mb-2" />
            <p className="text-sm font-medium text-ink-3">
              {activeTab === "todos"
                ? "Sin registros clínicos aún"
                : "Sin registros para este filtro"}
            </p>
            <p className="text-xs text-ink-4 mt-1">
              Los registros aparecerán aquí en orden cronológico inverso
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <TimelineCard
              key={entry.id}
              entry={entry}
              expanded={expandedIds.has(entry.id)}
              onToggle={() => toggleEntry(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2: Verificar build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Debe compilar sin errores.

---

## Task 4: Crear `SummaryPanel`

**Files:**
- Create: `src/components/modules/SummaryPanel.tsx`

Panel resumen derecho. Server Component. Recibe `summary: PatientSummary` del action.

- [ ] **Step 4.1: Crear SummaryPanel.tsx**

```tsx
// src/components/modules/SummaryPanel.tsx
import {
  AlertTriangle,
  Activity,
  ClipboardList,
  Target,
  Clock,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { PatientSummary } from "@/app/actions/timeline";

interface SummaryPanelProps {
  summary: PatientSummary;
}

// ── Panel section wrapper ─────────────────────────────────────────────────

function PanelSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-kp-accent">{icon}</span>
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-wider">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

// ── SummaryPanel ───────────────────────────────────────────────────────────

export function SummaryPanel({ summary }: SummaryPanelProps) {
  const hasRedFlags = summary.red_flags_activos.length > 0;

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-kp-border">
        <p className="text-[0.6rem] font-bold text-ink-3 uppercase tracking-widest">
          Resumen Clínico
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Red Flags — primero si hay */}
        {hasRedFlags && (
          <PanelSection
            title="Alertas Activas"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
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
        >
          {summary.motivo_consulta ? (
            <p className="text-xs text-ink-2 leading-relaxed line-clamp-4">
              {summary.motivo_consulta}
            </p>
          ) : (
            <p className="text-xs text-ink-4 italic">Sin registro</p>
          )}
        </PanelSection>

        {/* CIF activos */}
        <PanelSection
          title="Diagnósticos CIF"
          icon={<Target className="w-3.5 h-3.5" />}
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
        >
          {summary.vitales ? (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "PA", value: summary.vitales.presion_arterial, unit: "mmHg" },
                { label: "FC", value: summary.vitales.frecuencia_cardiaca, unit: "bpm" },
                { label: "SpO₂", value: summary.vitales.spo2, unit: "%" },
                { label: "T°", value: summary.vitales.temperatura, unit: "°C" },
              ]
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
        >
          {summary.plan_actual ? (
            <p className="text-xs text-ink-2 leading-relaxed line-clamp-5">
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
```

- [ ] **Step 4.2: Verificar build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

---

## Task 5: Actualizar `src/components/modules/index.ts`

**Files:**
- Modify: `src/components/modules/index.ts`

Agregar exports para los 3 nuevos componentes.

- [ ] **Step 5.1: Actualizar index.ts**

```ts
// src/components/modules/index.ts
export { PatientForm } from "./PatientForm";
export { PatientList } from "./PatientList";
export { AnamnesisForm } from "./AnamnesisForm";
export { RedFlagsChecklist } from "./RedFlagsChecklist";
export { VitalSignsPanel } from "./VitalSignsPanel";
export { KinesiologiaEval } from "./KinesiologiaEval";
export { FonoaudiologiaEval } from "./FonoaudiologiaEval";
export { MasoterapiaEval } from "./MasoterapiaEval";
export { SoapForm } from "./SoapForm";
export { CifMapper } from "./CifMapper";
export { PatientActionNav } from "./PatientActionNav";
export { ClinicalTimeline } from "./ClinicalTimeline";
export { SummaryPanel } from "./SummaryPanel";
```

- [ ] **Step 5.2: Verificar build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

---

## Task 6: Reescribir `/dashboard/pacientes/[id]/page.tsx`

**Files:**
- Rewrite: `src/app/dashboard/pacientes/[id]/page.tsx`

Hub principal con layout de 3 columnas. Server Component que orquesta los fetches y pasa datos a componentes client.

- [ ] **Step 6.1: Reescribir page.tsx con el grid 3 columnas**

```tsx
// src/app/dashboard/pacientes/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import { getPatientTimeline } from "@/app/actions/timeline";
import { PatientHeader } from "@/components/layout/PatientHeader";
import { PatientActionNav } from "@/components/modules/PatientActionNav";
import { ClinicalTimeline } from "@/components/modules/ClinicalTimeline";
import { SummaryPanel } from "@/components/modules/SummaryPanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPatientById(id);
  if (!result.success) return { title: "Paciente" };
  const p = result.data;
  const fullName = [p.nombre, p.apellido_paterno].filter(Boolean).join(" ");
  return { title: `Ficha — ${fullName}` };
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ── Auth + rol ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // ── Fetch en paralelo ──────────────────────────────────────────────────
  const [patientResult, timelineResult, adminResult, consentResult] =
    await Promise.all([
      getPatientById(id),
      getPatientTimeline(id),
      supabase
        .from("admin_users")
        .select("rol")
        .eq("auth_id", user.id)
        .maybeSingle(),
      supabase
        .from("fce_consentimientos")
        .select("id", { count: "exact", head: true })
        .eq("id_paciente", id)
        .eq("firmado", true),
    ]);

  if (!patientResult.success) notFound();

  const p = patientResult.data;
  const isAdmin = adminResult.data?.rol === "admin";
  const hasConsent = (consentResult.count ?? 0) > 0;

  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin nombre";

  const entries = timelineResult.success
    ? timelineResult.data.entries
    : [];
  const summary = timelineResult.success
    ? timelineResult.data.summary
    : {
        motivo_consulta: null,
        red_flags_activos: [],
        cif_activos: 0,
        plan_actual: null,
        proxima_sesion: null,
        vitales: null,
      };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href="/dashboard/pacientes"
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Pacientes
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium truncate">{fullName}</span>
      </div>

      {/* Patient header banner */}
      <PatientHeader patient={p} hasConsent={hasConsent} />

      {/* 3-column grid */}
      {/*
        xl: 3 columnas [220px | 1fr | 280px]
        lg: 2 columnas [200px | 1fr]  (panel resumen oculto)
        <lg: 1 columna (stack vertical)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr_280px] gap-4 items-start">
        {/* ── Columna izquierda: nav de acciones ── */}
        <div className="lg:sticky lg:top-0 self-start">
          <PatientActionNav patientId={id} isAdmin={isAdmin} />
        </div>

        {/* ── Columna central: timeline ── */}
        <div className="min-w-0">
          <ClinicalTimeline entries={entries} currentUserId={user.id} />
        </div>

        {/* ── Columna derecha: panel resumen (solo xl) ── */}
        <div className="hidden xl:block xl:sticky xl:top-0 self-start">
          <SummaryPanel summary={summary} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.2: Verificar build completo**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Resultado esperado: `✓ Compiled successfully` con 0 errores.

Si hay errores de TypeScript, corregirlos antes de continuar.

- [ ] **Step 6.3: Commit**

```bash
cd C:/Users/alexi/korporis-fce
git add src/components/layout/PatientHeader.tsx \
        src/components/modules/PatientActionNav.tsx \
        src/components/modules/ClinicalTimeline.tsx \
        src/components/modules/SummaryPanel.tsx \
        src/components/modules/index.ts \
        src/app/dashboard/pacientes/\[id\]/page.tsx \
        docs/superpowers/plans/2026-04-12-ficha-3col-layout.md
git commit -m "feat: layout 3 columnas TrakCare en ficha clínica del paciente

- PatientHeader convertido a Server Component (sin specialty selector)
- PatientActionNav con secciones agrupadas (Evaluación/Evolución/Consentim./Auditoría)
- ClinicalTimeline: feed cronológico con tabs de filtro + expand/collapse
- SummaryPanel: resumen clínico lateral (motivo, CIF, red flags, vitales, plan)
- /[id]/page.tsx reescrito como hub 3 columnas (xl=3col, lg=2col, mobile=1col)
- Sin migraciones DB — uses queries SELECT existentes"
```

---

## Verificación final

- [ ] `npm run build` pasa con 0 errores
- [ ] `npm run lint` pasa sin errores relevantes
- [ ] Navegar a `/dashboard/pacientes/[id]` muestra el grid 3 columnas
- [ ] El nav izquierdo muestra los items agrupados por sección
- [ ] El timeline muestra entradas o el estado vacío correcto
- [ ] Las tabs de filtro cambian el contenido visible
- [ ] "Expandir todo" / "Colapsar todo" funcionan
- [ ] El panel derecho muestra los datos de resumen
- [ ] En pantalla lg (tablet) el panel derecho desaparece
- [ ] En mobile los 3 bloques se apilan verticalmente
- [ ] Auditoría solo aparece en el nav si `isAdmin === true`
- [ ] Links del nav izquierdo llevan a las sub-páginas correctas
- [ ] Sub-páginas existentes (`/evaluacion`, `/evolucion`, etc.) siguen funcionando

---

## Self-review del plan

**Cobertura de spec:**
- ✅ Columna izquierda: nav agrupado con Evaluación/Evolución/Consentimientos/Auditoría
- ✅ Columna central: timeline con tabs Todos|Mis Atenciones|Kine|Fono|Maso
- ✅ Cada entrada: profesional + especialidad + fecha/hora + tipo + contenido expandible
- ✅ Botones "Expandir Todo" / "Colapsar Todo"
- ✅ Datos de fce_notas_soap + fce_evaluaciones + fce_signos_vitales + fce_consentimientos
- ✅ Columna derecha: Motivo Consulta, CIF activos, Red Flags, Últimos Signos Vitales, Plan actual, Próxima sesión
- ✅ PatientHeader banner arriba fijo
- ✅ Sub-páginas siguen existiendo como rutas separadas
- ✅ Responsive: xl=3cols, lg=2cols, mobile=1col
- ✅ Auditoría solo admin

**No hay migraciones DB.** Todos los queries usan SELECT en tablas existentes.
