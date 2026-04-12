# PDF Export + FHIR Preview + Dynamic Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PDF export (Ley 20.584 compliance), FHIR R4 CL Core preview, and dynamic clinic branding from Supabase.

**Architecture:**
- Feature 3 (Branding) first — dashboard layout fetches `clinicas.config.branding` server-side, injects CSS vars via Client Component; Sidebar gets dynamic logo/name.
- Feature 1 (PDF) — Server Component page fetches all patient data → passes to `PdfExportView` Client Component that uses `html2pdf.js` (dynamic import) to generate PDF.
- Feature 2 (FHIR) — Server Component page fetches patient data → `fhir-mapper.ts` transforms to FHIR R4 resources → `FhirPreview` Client Component renders tabbed JSON viewer.

**Tech Stack:** Next.js 16 App Router, Supabase SSR, html2pdf.js, TypeScript strict, Tailwind v4 kp-* tokens.

---

## File Map

### New Files
- `src/types/html2pdf.d.ts` — type declaration for html2pdf.js
- `src/lib/fhir-mapper.ts` — pure functions mapping DB records → FHIR R4 CL Core resources
- `src/components/layout/BrandingInjector.tsx` — 'use client' component that sets CSS vars on documentElement
- `src/components/modules/PdfExportView.tsx` — 'use client' print template + html2pdf logic
- `src/components/modules/FhirPreview.tsx` — 'use client' tabbed JSON viewer with syntax highlighting
- `src/app/dashboard/pacientes/[id]/exportar-pdf/page.tsx` — Server Component; fetches all patient data for PDF
- `src/app/dashboard/pacientes/[id]/fhir/page.tsx` — Server Component; fetches + maps patient data to FHIR

### Modified Files
- `package.json` — add html2pdf.js
- `src/app/dashboard/layout.tsx` — fetch clinicas branding, pass to DashboardShell + BrandingInjector
- `src/components/layout/DashboardShell.tsx` — accept + forward branding props
- `src/components/layout/Sidebar.tsx` — accept logoUrl + clinicName, wire "Interoperabilidad" nav item
- `src/components/modules/PatientActionNav.tsx` — add "Exportar PDF" and "FHIR Preview" nav links

---

## Task 1: Install html2pdf.js + type declaration

**Files:**
- Modify: `package.json`
- Create: `src/types/html2pdf.d.ts`

- [ ] **Step 1: Install package**

```bash
cd C:/Users/alexi/korporis-fce && npm install html2pdf.js
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Create type declaration**

`html2pdf.js` has no @types package. Create manual declaration:

Create `src/types/html2pdf.d.ts`:
```typescript
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean };
    jsPDF?: { unit?: string; format?: string | [number, number]; orientation?: string };
    pagebreak?: { mode?: string[]; before?: string[]; after?: string[] };
  }

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
    output(type: 'blob'): Promise<Blob>;
    output(type: 'datauristring'): Promise<string>;
  }

  function html2pdf(): Html2PdfInstance;
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Promise<void>;

  export = html2pdf;
}
```

- [ ] **Step 3: Verify build still passes**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Expected: `✓ Compiled successfully` with 0 errors.

---

## Task 2: Dynamic Branding — Fetch + Inject CSS vars

**Files:**
- Create: `src/components/layout/BrandingInjector.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/components/layout/DashboardShell.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

### Why BrandingInjector?
`dashboard/layout.tsx` is a Server Component — it can fetch from Supabase. But CSS var injection requires `document.documentElement`, which only exists client-side. Solution: fetch server-side → pass as props to a tiny `'use client'` component that applies them in `useEffect`.

- [ ] **Step 1: Create BrandingInjector client component**

Create `src/components/layout/BrandingInjector.tsx`:
```typescript
"use client";

import { useEffect } from "react";

export interface BrandingConfig {
  primary?: string;
  navy?: string;
  navy_deep?: string;
  accent?: string;
  light_bg?: string;
  logo_url?: string;
  clinic_short_name?: string;
  clinic_initials?: string;
}

interface BrandingInjectorProps {
  branding: BrandingConfig | null;
}

export function BrandingInjector({ branding }: BrandingInjectorProps) {
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    if (branding.primary)   root.style.setProperty("--clinic-primary",  branding.primary);
    if (branding.navy)      root.style.setProperty("--clinic-navy",      branding.navy);
    if (branding.navy_deep) root.style.setProperty("--clinic-navy-deep", branding.navy_deep);
    if (branding.accent)    root.style.setProperty("--clinic-accent",    branding.accent);
    if (branding.light_bg)  root.style.setProperty("--clinic-light-bg",  branding.light_bg);
  }, [branding]);

  // Renders nothing — only side-effect
  return null;
}
```

- [ ] **Step 2: Modify dashboard/layout.tsx to fetch branding**

Read the current file: `src/app/dashboard/layout.tsx`.

Replace full file content with:
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BrandingInjector, type BrandingConfig } from "@/components/layout/BrandingInjector";
import type { Especialidad, Rol } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch profesional + admin_user + clinica branding in parallel
  const [profesionalRes, adminRes] = await Promise.all([
    supabase
      .from("profesionales")
      .select("nombre, apellidos, especialidad, rol")
      .eq("id", user.id)
      .single(),
    supabase
      .from("admin_users")
      .select("id_clinica")
      .eq("auth_id", user.id)
      .maybeSingle(),
  ]);

  const profesional = profesionalRes.data;
  const idClinica = adminRes.data?.id_clinica ?? null;

  // Fetch branding if we have a clinic
  let branding: BrandingConfig | null = null;
  if (idClinica) {
    const { data: clinica } = await supabase
      .from("clinicas")
      .select("config")
      .eq("id", idClinica)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    branding = (clinica?.config as any)?.branding ?? null;
  }

  const nombre    = profesional?.nombre   ?? user.email?.split("@")[0] ?? "Usuario";
  const apellidos = profesional?.apellidos ?? "";
  const especialidad = (profesional?.especialidad as Especialidad) ?? "kinesiologia";
  const rol          = (profesional?.rol          as Rol)          ?? "profesional";

  const practitionerName = apellidos ? `${nombre} ${apellidos}` : nombre;
  const initials = [nombre[0], apellidos[0]].filter(Boolean).join("").toUpperCase() || "U";

  return (
    <>
      <BrandingInjector branding={branding} />
      <DashboardShell
        practitionerName={practitionerName}
        practitionerInitials={initials}
        especialidad={especialidad}
        rol={rol}
        branding={branding}
      >
        {children}
      </DashboardShell>
    </>
  );
}
```

- [ ] **Step 3: Modify DashboardShell to accept + forward branding**

Read `src/components/layout/DashboardShell.tsx`.

Replace full file content with:
```typescript
"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { createClient } from "@/lib/supabase/client";
import type { Especialidad, Rol } from "@/lib/constants";
import type { BrandingConfig } from "./BrandingInjector";

interface DashboardShellProps {
  children: React.ReactNode;
  practitionerName: string;
  practitionerInitials: string;
  especialidad: Especialidad;
  rol: Rol;
  branding: BrandingConfig | null;
}

const SECTION_TITLES: Record<string, string> = {
  agenda:    "Agenda Diaria",
  pacientes: "Pacientes",
  ficha:     "Ficha Clínica",
  fhir:      "Interoperabilidad FHIR",
  config:    "Configuración",
};

const PATH_TO_SECTION: Array<[string, string]> = [
  ["/dashboard/configuracion", "config"],
  ["/dashboard/pacientes",     "pacientes"],
  ["/dashboard",               "agenda"],
];

function getSectionFromPath(pathname: string): string {
  if (pathname.includes("/fhir")) return "fhir";
  for (const [prefix, section] of PATH_TO_SECTION) {
    if (pathname.startsWith(prefix)) return section;
  }
  return "agenda";
}

const SECTION_TO_PATH: Record<string, string> = {
  agenda:    "/dashboard",
  pacientes: "/dashboard/pacientes",
  config:    "/dashboard/configuracion",
  fhir:      "/dashboard/pacientes",  // FHIR is per-patient; send to patient list
};

export function DashboardShell({
  children,
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  branding,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeSection = getSectionFromPath(pathname);

  const handleNavigate = useCallback(
    (section: string) => {
      const path = SECTION_TO_PATH[section];
      if (path) router.push(path);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar
        practitionerName={practitionerName}
        practitionerInitials={practitionerInitials}
        especialidad={especialidad}
        rol={rol}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        branding={branding}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar title={SECTION_TITLES[activeSection] ?? "FCE Korporis"} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modify Sidebar to use branding**

Read `src/components/layout/Sidebar.tsx`.

Replace full file content with:
```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Activity,
  Calendar,
  User,
  FileText,
  Share2,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { ESPECIALIDAD_LABELS } from "@/lib/constants";
import type { Especialidad, Rol } from "@/lib/constants";
import type { BrandingConfig } from "./BrandingInjector";

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, text, active = false, collapsed = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? text : undefined}
      className={cn(
        "flex items-center w-full px-4 py-3 transition-colors cursor-pointer",
        active
          ? "bg-kp-accent/10 text-kp-accent border-l-4 border-kp-accent"
          : "text-ink-3 hover:bg-white/5 hover:text-white border-l-4 border-transparent",
        collapsed && "justify-center px-0"
      )}
    >
      <span className={cn("w-5 h-5 shrink-0", !collapsed && "mr-3")}>{icon}</span>
      {!collapsed && <span className="text-sm font-medium">{text}</span>}
    </button>
  );
}

interface SidebarProps {
  practitionerName: string;
  practitionerInitials: string;
  especialidad: Especialidad;
  rol: Rol;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  branding: BrandingConfig | null;
}

export function Sidebar({
  practitionerName,
  practitionerInitials,
  especialidad,
  rol,
  activeSection,
  onNavigate,
  onLogout,
  branding,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const clinicName = branding?.clinic_short_name ?? "FCE";
  const logoUrl    = branding?.logo_url ?? null;

  return (
    <aside
      className={cn(
        "bg-surface-dark text-ink-3 flex flex-col shadow-xl z-20 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 justify-between">
        <div className="flex items-center min-w-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${clinicName} logo`}
              width={28}
              height={28}
              className="shrink-0 object-contain"
              unoptimized
            />
          ) : (
            <Activity className="text-kp-accent w-6 h-6 shrink-0" />
          )}
          {!collapsed && (
            <span className="text-white font-bold tracking-wider ml-3 text-sm truncate">
              {clinicName} FCE
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-ink-3 hover:text-white transition-colors cursor-pointer shrink-0 ml-1"
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* User */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="text-[0.6rem] text-ink-3 font-semibold uppercase tracking-wider mb-2">
            Usuario Activo
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-kp-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {practitionerInitials}
            </div>
            <div className="ml-3 min-w-0">
              <div className="text-sm font-bold text-white truncate">{practitionerName}</div>
              <div className="text-xs text-kp-accent">{ESPECIALIDAD_LABELS[especialidad]}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3">
        <NavItem
          icon={<Calendar />}
          text="Agenda Diaria"
          active={activeSection === "agenda"}
          collapsed={collapsed}
          onClick={() => onNavigate("agenda")}
        />
        <NavItem
          icon={<User />}
          text="Pacientes"
          active={activeSection === "pacientes"}
          collapsed={collapsed}
          onClick={() => onNavigate("pacientes")}
        />
        <NavItem
          icon={<FileText />}
          text="Ficha Clínica"
          active={activeSection === "ficha"}
          collapsed={collapsed}
          onClick={() => onNavigate("ficha")}
        />
        <NavItem
          icon={<Share2 />}
          text="Interoperabilidad (FHIR)"
          active={activeSection === "fhir"}
          collapsed={collapsed}
          onClick={() => onNavigate("fhir")}
        />
        {rol === "admin" && (
          <NavItem
            icon={<Settings />}
            text="Configuración"
            active={activeSection === "config"}
            collapsed={collapsed}
            onClick={() => onNavigate("config")}
          />
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10">
        <NavItem
          icon={<LogOut />}
          text="Cerrar sesión"
          collapsed={collapsed}
          onClick={onLogout}
        />
        <div
          className={cn(
            "px-4 py-3 text-[0.6rem] text-ink-3 flex items-center",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-kp-success shrink-0" />
          {!collapsed && <span>TLS 1.3 Activo</span>}
        </div>
      </div>
    </aside>
  );
}
```

**Note:** `Image` from `next/image` with `unoptimized` prop for external logo URLs. Sidebar now also imports `Image`.

- [ ] **Step 5: Verify build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Expected: 0 errors. Fix any TypeScript issues before proceeding.

---

## Task 3: Feature 1 — PDF Export page + server action

**Files:**
- Create: `src/app/actions/exportar-pdf.ts`
- Create: `src/app/dashboard/pacientes/[id]/exportar-pdf/page.tsx`
- Create: `src/components/modules/PdfExportView.tsx`
- Modify: `src/components/modules/PatientActionNav.tsx`

- [ ] **Step 1: Create server action for PDF data**

Create `src/app/actions/exportar-pdf.ts`:
```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Patient } from "@/types";
import type { BrandingConfig } from "@/components/layout/BrandingInjector";

export interface PdfPatientData {
  patient: Patient;
  anamnesis: {
    motivo_consulta: string | null;
    antecedentes_medicos: unknown;
    antecedentes_quirurgicos: unknown;
    farmacologia: unknown;
    alergias: unknown;
    red_flags: Record<string, boolean> | null;
    habitos: unknown;
  } | null;
  vitales: {
    presion_arterial: string | null;
    frecuencia_cardiaca: number | null;
    spo2: number | null;
    temperatura: number | null;
    frecuencia_respiratoria: number | null;
    recorded_at: string;
  } | null;
  evaluaciones: Array<{
    id: string;
    especialidad: string;
    sub_area: string | null;
    created_at: string;
  }>;
  soaps: Array<{
    id: string;
    subjetivo: string | null;
    objetivo: string | null;
    analisis_cif: unknown;
    plan: string | null;
    intervenciones: unknown;
    tareas_domiciliarias: string | null;
    proxima_sesion: string | null;
    firmado: boolean;
    firmado_at: string | null;
    created_at: string;
  }>;
  consentimientos: Array<{
    id: string;
    tipo: string;
    firmado: boolean;
    firmado_at: string | null;
    created_at: string;
  }>;
  branding: BrandingConfig | null;
  clinicName: string;
}

export async function getPdfPatientData(
  patientId: string
): Promise<{ success: true; data: PdfPatientData } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Parallel fetches
  const [patientRes, adminRes] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", patientId).single(),
    supabase.from("admin_users").select("id_clinica").eq("auth_id", user.id).maybeSingle(),
  ]);

  if (patientRes.error || !patientRes.data) {
    return { success: false, error: "Paciente no encontrado" };
  }

  const idClinica = adminRes.data?.id_clinica ?? null;

  // Fetch remaining data in parallel
  const [anamnesisRes, vitalesRes, evaluacionesRes, soapsRes, consentimientosRes, clinicaRes] =
    await Promise.all([
      supabase
        .from("fce_anamnesis")
        .select("motivo_consulta, antecedentes_medicos, antecedentes_quirurgicos, farmacologia, alergias, red_flags, habitos")
        .eq("id_paciente", patientId)
        .maybeSingle(),
      supabase
        .from("fce_signos_vitales")
        .select("presion_arterial, frecuencia_cardiaca, spo2, temperatura, frecuencia_respiratoria, recorded_at")
        .eq("id_paciente", patientId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("fce_evaluaciones")
        .select("id, especialidad, sub_area, created_at")
        .eq("id_paciente", patientId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("fce_notas_soap")
        .select("id, subjetivo, objetivo, analisis_cif, plan, intervenciones, tareas_domiciliarias, proxima_sesion, firmado, firmado_at, created_at")
        .eq("id_paciente", patientId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("fce_consentimientos")
        .select("id, tipo, firmado, firmado_at, created_at")
        .eq("id_paciente", patientId)
        .order("created_at", { ascending: false }),
      idClinica
        ? supabase.from("clinicas").select("config, nombre").eq("id", idClinica).single()
        : Promise.resolve({ data: null }),
    ]);

  // Log export to audit
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: user.id,
      actor_tipo: "profesional",
      accion: "exportar_ficha",
      tabla_afectada: "pacientes",
      registro_id: patientId,
      id_paciente: patientId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
    });
  } catch { /* never block PDF generation */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (clinicaRes?.data as any)?.config;
  const branding: BrandingConfig | null = config?.branding ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clinicName: string = (clinicaRes?.data as any)?.nombre ?? branding?.clinic_short_name ?? "Clínica";

  return {
    success: true,
    data: {
      patient: patientRes.data as Patient,
      anamnesis: anamnesisRes.data ?? null,
      vitales: vitalesRes.data ?? null,
      evaluaciones: evaluacionesRes.data ?? [],
      soaps: soapsRes.data ?? [],
      consentimientos: consentimientosRes.data ?? [],
      branding,
      clinicName,
    },
  };
}
```

- [ ] **Step 2: Create PdfExportView client component**

Create `src/components/modules/PdfExportView.tsx`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PdfPatientData } from "@/app/actions/exportar-pdf";
import { calculateAge } from "@/lib/utils";

interface PdfExportViewProps {
  data: PdfPatientData;
}

const RED_FLAG_LABELS: Record<string, string> = {
  marcapasos: "Marcapasos",
  embarazo: "Embarazo",
  tvp: "TVP",
  oncologico: "Oncológico activo",
  fiebre: "Fiebre",
  alergias_severas: "Alergias severas",
  infeccion_cutanea: "Infección cutánea",
  fragilidad_capilar: "Fragilidad capilar",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}

export function PdfExportView({ data }: PdfExportViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const { patient, anamnesis, vitales, evaluaciones, soaps, consentimientos, branding, clinicName } = data;

  const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
    .filter(Boolean).join(" ") || "Sin nombre";
  const age = calculateAge(patient.fecha_nacimiento);
  const ageStr = age !== null ? `${age} años` : "—";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previsionTipo = (patient.prevision as any)?.tipo ?? "—";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dir = patient.direccion as any;
  const direccionStr = dir
    ? [dir.calle, dir.numero, dir.comuna, dir.region].filter(Boolean).join(", ")
    : "—";

  const activeRedFlags = anamnesis?.red_flags
    ? Object.entries(anamnesis.red_flags)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => RED_FLAG_LABELS[k] ?? k)
    : [];

  const generatedAt = format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });

  async function generatePdf() {
    if (!containerRef.current) return;
    setStatus("generating");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [12, 10, 14, 10],
          filename: `ficha-${patient.rut ?? patient.id}-${format(new Date(), "yyyyMMdd")}.pdf`,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css"] },
        })
        .from(containerRef.current)
        .save();
      setStatus("done");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setStatus("error");
    }
  }

  // Auto-generate on mount
  useEffect(() => {
    generatePdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-surface-0 p-6">
      {/* Controls bar */}
      <div className="max-w-[860px] mx-auto mb-4 flex items-center justify-between">
        <div className="text-sm text-ink-2">
          {status === "generating" && (
            <span className="text-kp-accent font-medium">Generando PDF…</span>
          )}
          {status === "done" && (
            <span className="text-kp-success font-medium">✓ PDF descargado correctamente</span>
          )}
          {status === "error" && (
            <span className="text-kp-danger font-medium">Error al generar PDF</span>
          )}
          {status === "idle" && <span>Preparando…</span>}
        </div>
        <button
          onClick={generatePdf}
          disabled={status === "generating"}
          className="px-4 py-2 bg-kp-accent text-white text-sm font-semibold rounded-lg
                     hover:bg-kp-primary transition-colors disabled:opacity-60 cursor-pointer
                     disabled:cursor-not-allowed"
        >
          {status === "generating" ? "Generando…" : "↓ Descargar PDF"}
        </button>
      </div>

      {/* ── PDF TEMPLATE ── */}
      <div
        ref={containerRef}
        className="max-w-[860px] mx-auto bg-white shadow-sm"
        style={{ fontFamily: "Arial, sans-serif", fontSize: "10pt", color: "#1E293B" }}
      >
        {/* HEADER */}
        <div style={{ background: "#004545", color: "white", padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="logo" style={{ height: 40, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 40, height: 40, background: "#00B0A8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white" }}>
                {branding?.clinic_initials ?? "KP"}
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>
                {clinicName.toUpperCase()}
              </div>
              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2 }}>FICHA CLÍNICA ELECTRÓNICA</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 8, opacity: 0.8 }}>
            <div>Generado: {generatedAt}</div>
            <div style={{ marginTop: 2 }}>Decreto 41 MINSAL · Ley 20.584</div>
          </div>
        </div>

        {/* PATIENT BANNER */}
        <div style={{ background: "#E6FAF9", padding: "12px 24px", borderBottom: "1px solid #D5F5F4", display: "flex", gap: 32 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#006B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Paciente</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#004545" }}>{fullName}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#006B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>RUT</div>
            <div style={{ fontWeight: 600 }}>{patient.rut ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#006B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Edad</div>
            <div style={{ fontWeight: 600 }}>{ageStr}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#006B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Previsión</div>
            <div style={{ fontWeight: 600 }}>{previsionTipo}</div>
          </div>
        </div>

        <div style={{ padding: "16px 24px" }}>

          {/* M1 — IDENTIFICACIÓN */}
          <SectionTitle>M1 — Identificación</SectionTitle>
          <TwoCol
            items={[
              ["Nombre completo", fullName],
              ["RUT", patient.rut ?? "—"],
              ["Fecha nacimiento", formatDate(patient.fecha_nacimiento)],
              ["Edad", ageStr],
              ["Sexo registral", patient.sexo_registral ?? "—"],
              ["Nacionalidad", patient.nacionalidad ?? "Chilena"],
              ["Teléfono", patient.telefono ?? "—"],
              ["Email", patient.email ?? "—"],
              ["Ocupación", patient.ocupacion ?? "—"],
              ["Previsión", previsionTipo],
              ["Dirección", direccionStr],
            ]}
          />

          {/* M2 — ANAMNESIS */}
          {anamnesis && (
            <>
              <SectionTitle>M2 — Anamnesis</SectionTitle>
              {anamnesis.motivo_consulta && (
                <Field label="Motivo de consulta" value={anamnesis.motivo_consulta} />
              )}
              {activeRedFlags.length > 0 && (
                <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 4, padding: "6px 10px", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: "#DC2626", fontSize: 9, textTransform: "uppercase" }}>⚠ Red Flags Activos: </span>
                  <span style={{ color: "#991B1B" }}>{activeRedFlags.join(" · ")}</span>
                </div>
              )}
            </>
          )}

          {/* SIGNOS VITALES */}
          {vitales && (
            <>
              <SectionTitle>Últimos Signos Vitales — {formatDate(vitales.recorded_at)}</SectionTitle>
              <TwoCol
                items={[
                  ["Presión arterial", vitales.presion_arterial ?? "—"],
                  ["Frec. cardíaca", vitales.frecuencia_cardiaca ? `${vitales.frecuencia_cardiaca} bpm` : "—"],
                  ["SpO₂", vitales.spo2 ? `${vitales.spo2}%` : "—"],
                  ["Temperatura", vitales.temperatura ? `${vitales.temperatura} °C` : "—"],
                  ["Frec. respiratoria", vitales.frecuencia_respiratoria ? `${vitales.frecuencia_respiratoria} rpm` : "—"],
                ]}
              />
            </>
          )}

          {/* EVALUACIONES */}
          {evaluaciones.length > 0 && (
            <>
              <SectionTitle>Evaluaciones por Especialidad</SectionTitle>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, marginBottom: 12 }}>
                <thead>
                  <tr style={{ background: "#F1F5F9" }}>
                    {["Fecha", "Especialidad", "Área"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, color: "#006B6B", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluaciones.map((ev, i) => (
                    <tr key={ev.id} style={{ background: i % 2 === 0 ? "white" : "#F8FAFC" }}>
                      <td style={{ padding: "4px 8px" }}>{formatDate(ev.created_at)}</td>
                      <td style={{ padding: "4px 8px", textTransform: "capitalize" }}>{ev.especialidad ?? "—"}</td>
                      <td style={{ padding: "4px 8px", textTransform: "capitalize" }}>{ev.sub_area?.replace(/_/g, " ") ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* NOTAS SOAP */}
          {soaps.length > 0 && (
            <>
              <SectionTitle>Evolución Clínica — Notas SOAP (últimas {soaps.length})</SectionTitle>
              {soaps.map((soap) => (
                <div key={soap.id} style={{ border: "1px solid #E2E8F0", borderRadius: 6, marginBottom: 10, overflow: "hidden", pageBreakInside: "avoid" }}>
                  <div style={{ background: "#F1F5F9", padding: "5px 10px", fontSize: 8, fontWeight: 700, color: "#475569", display: "flex", justifyContent: "space-between" }}>
                    <span>SOAP — {formatDate(soap.created_at)}</span>
                    {soap.firmado && <span style={{ color: "#16A34A" }}>✓ FIRMADO {formatDate(soap.firmado_at)}</span>}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    {soap.subjetivo && <Field label="S — Subjetivo" value={soap.subjetivo} />}
                    {soap.objetivo   && <Field label="O — Objetivo"  value={soap.objetivo} />}
                    {soap.plan       && <Field label="P — Plan"      value={soap.plan} />}
                    {soap.tareas_domiciliarias && <Field label="Tareas domiciliarias" value={soap.tareas_domiciliarias} />}
                    {soap.proxima_sesion && <Field label="Próxima sesión" value={formatDate(soap.proxima_sesion)} />}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* CONSENTIMIENTOS */}
          {consentimientos.length > 0 && (
            <>
              <SectionTitle>Consentimientos</SectionTitle>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, marginBottom: 12 }}>
                <thead>
                  <tr style={{ background: "#F1F5F9" }}>
                    {["Tipo", "Estado", "Fecha"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, color: "#006B6B", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consentimientos.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? "white" : "#F8FAFC" }}>
                      <td style={{ padding: "4px 8px", textTransform: "capitalize" }}>{c.tipo}</td>
                      <td style={{ padding: "4px 8px", color: c.firmado ? "#16A34A" : "#F59E0B", fontWeight: 600 }}>
                        {c.firmado ? "✓ Firmado" : "Pendiente"}
                      </td>
                      <td style={{ padding: "4px 8px" }}>{formatDate(c.firmado_at ?? c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

        </div>

        {/* FOOTER */}
        <div style={{ borderTop: "1px solid #E2E8F0", background: "#F8FAFC", padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 7.5, color: "#94A3B8" }}>
            Documento generado electrónicamente — Ley 20.584, Decreto 41 MINSAL
          </div>
          <div style={{ fontSize: 7.5, color: "#94A3B8" }}>
            {clinicName} · {generatedAt}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: "3px solid #00B0A8", paddingLeft: 8, marginBottom: 8, marginTop: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#006B6B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <span style={{ fontSize: 8, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6 }}>
        {label}:
      </span>
      <span style={{ fontSize: 9 }}>{value}</span>
    </div>
  );
}

function TwoCol({ items }: { items: Array<[string, string]> }) {
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px", marginBottom: 10 }}>
      <div>{left.map(([l, v]) => <Field key={l} label={l} value={v} />)}</div>
      <div>{right.map(([l, v]) => <Field key={l} label={l} value={v} />)}</div>
    </div>
  );
}
```

**Note on `calculateAge`:** This utility already exists in `src/lib/utils.ts` per CLAUDE.md. Import it directly.

- [ ] **Step 3: Create the exportar-pdf page**

Create `src/app/dashboard/pacientes/[id]/exportar-pdf/page.tsx`:
```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPdfPatientData } from "@/app/actions/exportar-pdf";
import { PdfExportView } from "@/components/modules/PdfExportView";

export const metadata = { title: "Exportar PDF — FCE Korporis" };

export default async function ExportarPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const result = await getPdfPatientData(id);
  if (!result.success) notFound();

  const patient = result.data.patient;
  const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
    .filter(Boolean).join(" ") || "Paciente";

  return (
    <div>
      {/* Back nav */}
      <div className="max-w-[860px] mx-auto mb-2 flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a ficha de {fullName}
        </Link>
      </div>
      <PdfExportView data={result.data} />
    </div>
  );
}
```

- [ ] **Step 4: Add "Exportar PDF" to PatientActionNav**

Read `src/components/modules/PatientActionNav.tsx`.

In `buildNav`, add a new standalone item after "Auditoría":
```typescript
// Add to imports at the top:
import { FileDown, Share2 } from "lucide-react";

// In buildNav(), add these two entries after the auditoria item:
{
  item: {
    id: "exportar-pdf",
    label: "Exportar PDF",
    icon: <FileDown className="w-4 h-4" />,
    href: `${base}/exportar-pdf`,
  },
},
{
  item: {
    id: "fhir",
    label: "FHIR Preview",
    icon: <Share2 className="w-4 h-4" />,
    href: `${base}/fhir`,
  },
},
```

Also in the render loop, the "exportar-pdf" and "fhir" items are NOT adminOnly, so they render for all users. No change needed to the filter logic.

Full updated `PatientActionNav.tsx` (show complete file to avoid partial edits):
```typescript
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
  FileDown,
  Share2,
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
    {
      item: {
        id: "exportar-pdf",
        label: "Exportar PDF",
        icon: <FileDown className="w-4 h-4" />,
        href: `${base}/exportar-pdf`,
      },
    },
    {
      item: {
        id: "fhir",
        label: "FHIR Preview",
        icon: <Share2 className="w-4 h-4" />,
        href: `${base}/fhir`,
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
        "flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-lg text-sm transition-colors group",
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
          className="flex items-center gap-1 min-h-[44px] px-2 text-[0.65rem] font-semibold text-kp-accent hover:text-kp-primary transition-colors"
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

- [ ] **Step 5: Verify build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Expected: 0 errors. Common issue to watch for: `calculateAge` import path — it lives in `src/lib/utils.ts`.

---

## Task 4: Feature 2 — FHIR Mapper utility

**Files:**
- Create: `src/lib/fhir-mapper.ts`

This is a pure data-transformation module — no Supabase calls, no React.

- [ ] **Step 1: Create fhir-mapper.ts**

Create `src/lib/fhir-mapper.ts`:
```typescript
/**
 * FHIR R4 CL Core Mapper
 * Maps korporis-fce DB records to HL7 FHIR R4 resources (CL Core profile).
 * Pure functions — no side effects, no DB calls.
 *
 * Reference: Guía de Implementación FHIR Chile Core
 * https://hl7chile.cl/fhir/ig/clcore/
 */

import type { Patient } from "@/types";
import type { VitalSigns, Anamnesis } from "@/types";

// ── Minimal FHIR R4 types ─────────────────────────────────────────────────────

export interface FhirPatient {
  resourceType: "Patient";
  meta: { profile: string[] };
  identifier: Array<{ system: string; value: string; use?: string }>;
  name: Array<{ use: string; family?: string; given?: string[] }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  address?: Array<{
    use?: string; text?: string;
    line?: string[]; city?: string; state?: string; country?: string;
  }>;
  extension?: Array<{ url: string; valueString?: string; valueCode?: string }>;
}

export interface FhirEncounter {
  resourceType: "Encounter";
  meta: { profile: string[] };
  status: string;
  class: { system: string; code: string; display: string };
  subject: { reference: string; display?: string };
  participant?: Array<{ individual?: { reference: string } }>;
  period?: { start?: string; end?: string };
  serviceType?: { coding: Array<{ system: string; code: string; display: string }> };
}

export interface FhirObservation {
  resourceType: "Observation";
  meta: { profile: string[] };
  status: "final" | "preliminary";
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueString?: string;
}

export interface FhirCondition {
  resourceType: "Condition";
  meta: { profile: string[] };
  clinicalStatus: { coding: Array<{ system: string; code: string }> };
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code?: { text: string; coding?: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  note?: Array<{ text: string }>;
}

export interface FhirCarePlan {
  resourceType: "CarePlan";
  meta: { profile: string[] };
  status: "active" | "completed" | "draft";
  intent: "plan";
  subject: { reference: string };
  description?: string;
  activity?: Array<{
    detail: {
      kind?: string;
      description?: string;
      status: "in-progress" | "completed" | "not-started";
    };
  }>;
  note?: Array<{ text: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FHIR_BASE = "https://hl7chile.cl/fhir/ig/clcore/StructureDefinition";
const RUT_SYSTEM = "https://www.registrocivil.cl/run";
const SNOMED = "http://snomed.info/sct";
const LOINC = "http://loinc.org";
const V3_GENDER = "http://hl7.org/fhir/administrative-gender";
const ENCOUNTER_CLASS_SYSTEM = "http://terminology.hl7.org/CodeSystem/v3-ActCode";
const VITAL_CATEGORY = "http://terminology.hl7.org/CodeSystem/observation-category";
const CL_CORE_CONDITION_CATEGORY = "http://terminology.hl7.org/CodeSystem/condition-category";

// ── mapPatientToFhir ──────────────────────────────────────────────────────────

export function mapPatientToFhir(patient: Patient): FhirPatient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dir = patient.direccion as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prev = patient.prevision as any;

  const identifiers: FhirPatient["identifier"] = [];
  if (patient.rut) {
    identifiers.push({ system: RUT_SYSTEM, value: patient.rut, use: "official" });
  }

  const gender =
    patient.sexo_registral === "M" ? "male"
    : patient.sexo_registral === "F" ? "female"
    : "other";

  const address: FhirPatient["address"] = dir
    ? [{
        use: "home",
        line: [dir.calle, dir.numero].filter(Boolean),
        city: dir.comuna ?? undefined,
        state: dir.region ?? undefined,
        country: "CL",
        text: [dir.calle, dir.numero, dir.comuna, dir.region].filter(Boolean).join(", "),
      }]
    : undefined;

  const telecom: FhirPatient["telecom"] = [];
  if (patient.telefono) telecom.push({ system: "phone", value: patient.telefono, use: "mobile" });
  if (patient.email)    telecom.push({ system: "email", value: patient.email });

  const extensions: FhirPatient["extension"] = [];
  if (patient.identidad_genero) {
    extensions.push({
      url: `${FHIR_BASE}/IdentidadDeGenero`,
      valueString: patient.identidad_genero,
    });
  }
  if (patient.nacionalidad) {
    extensions.push({
      url: `${FHIR_BASE}/CodigoPaises`,
      valueString: patient.nacionalidad,
    });
  }
  if (prev?.tipo) {
    extensions.push({
      url: `${FHIR_BASE}/PrevisionSalud`,
      valueString: prev.tipo,
    });
  }

  return {
    resourceType: "Patient",
    meta: { profile: [`${FHIR_BASE}/CorePacienteCl`] },
    identifier: identifiers,
    name: [{
      use: "official",
      family: [patient.apellido_paterno, patient.apellido_materno].filter(Boolean).join(" ") || undefined,
      given: patient.nombre ? [patient.nombre] : undefined,
    }],
    gender,
    birthDate: patient.fecha_nacimiento?.toString().slice(0, 10) ?? undefined,
    telecom: telecom.length ? telecom : undefined,
    address,
    extension: extensions.length ? extensions : undefined,
  };
}

// ── mapEncounterToFhir ────────────────────────────────────────────────────────

export interface DbEncounter {
  id: string;
  id_paciente: string;
  id_profesional?: string | null;
  especialidad?: string | null;
  modalidad?: string | null;
  status?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export function mapEncounterToFhir(enc: DbEncounter): FhirEncounter {
  const classCode = enc.modalidad === "virtual" ? "VR" : "AMB";
  const classDisplay = enc.modalidad === "virtual" ? "Virtual" : "Ambulatory";

  const serviceCode =
    enc.especialidad === "kinesiologia"   ? { code: "228" , display: "Physiotherapy" }
    : enc.especialidad === "fonoaudiologia" ? { code: "310" , display: "Speech Therapy" }
    : enc.especialidad === "masoterapia"    ? { code: "310" , display: "Massage therapy" }
    : { code: "999", display: enc.especialidad ?? "General" };

  const fhirStatus =
    enc.status === "finalizado" ? "finished"
    : enc.status === "en_progreso" ? "in-progress"
    : enc.status === "planificado" ? "planned"
    : "unknown";

  return {
    resourceType: "Encounter",
    meta: { profile: [`${FHIR_BASE}/EncounterCL`] },
    status: fhirStatus,
    class: { system: ENCOUNTER_CLASS_SYSTEM, code: classCode, display: classDisplay },
    subject: { reference: `Patient/${enc.id_paciente}` },
    participant: enc.id_profesional
      ? [{ individual: { reference: `Practitioner/${enc.id_profesional}` } }]
      : undefined,
    period: {
      start: enc.started_at ?? undefined,
      end: enc.ended_at ?? undefined,
    },
    serviceType: {
      coding: [{ system: SNOMED, code: serviceCode.code, display: serviceCode.display }],
    },
  };
}

// ── mapVitalsToFhir ───────────────────────────────────────────────────────────

export function mapVitalsToFhir(vitals: VitalSigns, patientId: string): FhirObservation[] {
  const base: Omit<FhirObservation, "code" | "valueQuantity" | "valueString"> = {
    resourceType: "Observation",
    meta: { profile: [`${FHIR_BASE}/CoreObservacionCL`] },
    status: "final",
    category: [{ coding: [{ system: VITAL_CATEGORY, code: "vital-signs", display: "Vital Signs" }] }],
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: vitals.recorded_at ?? undefined,
  };

  const observations: FhirObservation[] = [];

  if (vitals.frecuencia_cardiaca != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: "8867-4", display: "Heart rate" }] },
      valueQuantity: { value: vitals.frecuencia_cardiaca, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" },
    });
  }
  if (vitals.spo2 != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: "59408-5", display: "Oxygen saturation in Arterial blood by Pulse oximetry" }] },
      valueQuantity: { value: vitals.spo2, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
    });
  }
  if (vitals.temperatura != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: "8310-5", display: "Body temperature" }] },
      valueQuantity: { value: Number(vitals.temperatura), unit: "°C", system: "http://unitsofmeasure.org", code: "Cel" },
    });
  }
  if (vitals.frecuencia_respiratoria != null) {
    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: "9279-1", display: "Respiratory rate" }] },
      valueQuantity: { value: vitals.frecuencia_respiratoria, unit: "/min", system: "http://unitsofmeasure.org", code: "/min" },
    });
  }
  if (vitals.presion_arterial) {
    observations.push({
      ...base,
      code: { coding: [{ system: LOINC, code: "55284-4", display: "Blood pressure systolic and diastolic" }] },
      valueString: vitals.presion_arterial,
    });
  }

  return observations;
}

// ── mapSoapToConditions ───────────────────────────────────────────────────────

export interface DbSoapNote {
  id: string;
  id_paciente: string;
  id_encuentro?: string | null;
  subjetivo?: string | null;
  objetivo?: string | null;
  analisis_cif?: {
    funciones?: Array<{ code?: string; descripcion?: string; cuantificador?: number }>;
    actividades?: Array<{ code?: string; descripcion?: string; cuantificador?: number }>;
    participacion?: Array<{ code?: string; descripcion?: string; cuantificador?: number }>;
    contexto?: Array<{ code?: string; descripcion?: string; cuantificador?: number }>;
  } | null;
  plan?: string | null;
  intervenciones?: Array<{ tipo?: string; descripcion?: string }> | null;
  tareas_domiciliarias?: string | null;
  proxima_sesion?: string | null;
  firmado?: boolean;
  firmado_at?: string | null;
  created_at: string;
}

export function mapSoapToConditions(soap: DbSoapNote): FhirCondition[] {
  const cif = soap.analisis_cif;
  if (!cif) return [];

  const allItems = [
    ...(cif.funciones ?? []).map(i => ({ ...i, domain: "Funciones/Estructuras Corporales" })),
    ...(cif.actividades ?? []).map(i => ({ ...i, domain: "Actividades" })),
    ...(cif.participacion ?? []).map(i => ({ ...i, domain: "Participación" })),
    ...(cif.contexto ?? []).map(i => ({ ...i, domain: "Factores Contextuales" })),
  ];

  return allItems.map((item) => ({
    resourceType: "Condition",
    meta: { profile: [`${FHIR_BASE}/CoreDiagnosticoCl`] },
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
    },
    category: [{
      coding: [{ system: CL_CORE_CONDITION_CATEGORY, code: "encounter-diagnosis", display: item.domain }],
    }],
    code: item.code
      ? { text: item.descripcion ?? item.code, coding: [{ system: "http://www.who.int/classifications/icf", code: item.code, display: item.descripcion ?? item.code }] }
      : { text: item.descripcion ?? "Sin descripción" },
    subject: { reference: `Patient/${soap.id_paciente}` },
    note: item.cuantificador != null
      ? [{ text: `Cuantificador CIF: ${item.cuantificador}/4` }]
      : undefined,
  }));
}

// ── mapSoapToCarePlan ─────────────────────────────────────────────────────────

export function mapSoapToCarePlan(soap: DbSoapNote): FhirCarePlan {
  const intervenciones = soap.intervenciones ?? [];

  return {
    resourceType: "CarePlan",
    meta: { profile: [`${FHIR_BASE}/CarePlan`] },
    status: soap.firmado ? "completed" : "active",
    intent: "plan",
    subject: { reference: `Patient/${soap.id_paciente}` },
    description: soap.plan ?? undefined,
    activity: intervenciones.map((inv) => ({
      detail: {
        kind: inv.tipo ?? undefined,
        description: inv.descripcion ?? undefined,
        status: "completed",
      },
    })),
    note: [
      ...(soap.tareas_domiciliarias ? [{ text: `Tareas domiciliarias: ${soap.tareas_domiciliarias}` }] : []),
      ...(soap.proxima_sesion ? [{ text: `Próxima sesión: ${soap.proxima_sesion}` }] : []),
    ],
  };
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Expected: 0 errors.

---

## Task 5: Feature 2 — FHIR Preview page + UI component

**Files:**
- Create: `src/components/modules/FhirPreview.tsx`
- Create: `src/app/dashboard/pacientes/[id]/fhir/page.tsx`

- [ ] **Step 1: Create FhirPreview client component**

Create `src/components/modules/FhirPreview.tsx`:
```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FhirPatient, FhirEncounter, FhirObservation, FhirCondition, FhirCarePlan } from "@/lib/fhir-mapper";

type TabId = "patient" | "encounter" | "condition" | "observation" | "careplan";

interface Tab {
  id: TabId;
  label: string;
  badge?: string;
}

interface FhirPreviewProps {
  patient: FhirPatient;
  encounter: FhirEncounter | null;
  observations: FhirObservation[];
  conditions: FhirCondition[];
  carePlan: FhirCarePlan | null;
}

const TABS: Tab[] = [
  { id: "patient",     label: "Patient" },
  { id: "encounter",   label: "Encounter" },
  { id: "condition",   label: "Condition" },
  { id: "observation", label: "Observation" },
  { id: "careplan",    label: "CarePlan" },
];

// Minimal JSON syntax highlighting — no external deps
function highlight(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "text-sky-300";      // number / boolean / null
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "text-kp-accent" : "text-emerald-300";
        }
        if (/true|false/.test(match)) cls = "text-amber-300";
        if (/null/.test(match)) cls = "text-rose-400";
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function JsonBlock({ data }: { data: unknown }) {
  if (!data) {
    return (
      <div className="p-8 text-center text-ink-3 text-sm">
        No hay datos disponibles para este recurso.
      </div>
    );
  }
  const json = JSON.stringify(data, null, 2);
  return (
    <pre
      className="p-4 text-xs leading-relaxed overflow-auto max-h-[540px] font-mono"
      dangerouslySetInnerHTML={{ __html: highlight(json) }}
    />
  );
}

export function FhirPreview({
  patient,
  encounter,
  observations,
  conditions,
  carePlan,
}: FhirPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("patient");

  const tabData: Record<TabId, unknown> = {
    patient:     patient,
    encounter:   encounter,
    observation: observations.length > 0 ? observations : null,
    condition:   conditions.length > 0 ? conditions : null,
    careplan:    carePlan,
  };

  const tabCounts: Partial<Record<TabId, number>> = {
    observation: observations.length,
    condition:   conditions.length,
  };

  return (
    <div className="bg-surface-1 rounded-xl border border-kp-border overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-kp-border bg-surface-0 scrollbar-hide">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-semibold whitespace-nowrap transition-colors cursor-pointer border-b-2",
                isActive
                  ? "border-kp-accent text-kp-accent bg-surface-1"
                  : "border-transparent text-ink-3 hover:text-ink-1 hover:bg-kp-border/30"
              )}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-kp-accent text-white" : "bg-kp-border-md text-ink-3"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* JSON viewer */}
      <div className="bg-[#0d1117]">
        <JsonBlock data={tabData[activeTab]} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FHIR page (Server Component)**

Create `src/app/dashboard/pacientes/[id]/fhir/page.tsx`:
```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Share2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPatientById } from "@/app/actions/patients";
import {
  mapPatientToFhir,
  mapEncounterToFhir,
  mapVitalsToFhir,
  mapSoapToConditions,
  mapSoapToCarePlan,
  type DbEncounter,
  type DbSoapNote,
} from "@/lib/fhir-mapper";
import { FhirPreview } from "@/components/modules/FhirPreview";
import type { VitalSigns } from "@/types";

export const metadata = { title: "FHIR Preview — FCE Korporis" };

export default async function FhirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const patientResult = await getPatientById(id);
  if (!patientResult.success) notFound();

  const patient = patientResult.data;

  // Fetch last encounter, last vitals, last SOAP in parallel
  const [encounterRes, vitalsRes, soapRes] = await Promise.all([
    supabase
      .from("fce_encuentros")
      .select("id, id_paciente, id_profesional, especialidad, modalidad, status, started_at, ended_at")
      .eq("id_paciente", id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fce_signos_vitales")
      .select("*")
      .eq("id_paciente", id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fce_notas_soap")
      .select("id, id_paciente, id_encuentro, subjetivo, objetivo, analisis_cif, plan, intervenciones, tareas_domiciliarias, proxima_sesion, firmado, firmado_at, created_at")
      .eq("id_paciente", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Map to FHIR
  const fhirPatient = mapPatientToFhir(patient);
  const fhirEncounter = encounterRes.data
    ? mapEncounterToFhir(encounterRes.data as DbEncounter)
    : null;
  const fhirObservations = vitalsRes.data
    ? mapVitalsToFhir(vitalsRes.data as VitalSigns, id)
    : [];
  const fhirConditions = soapRes.data
    ? mapSoapToConditions(soapRes.data as DbSoapNote)
    : [];
  const fhirCarePlan = soapRes.data
    ? mapSoapToCarePlan(soapRes.data as DbSoapNote)
    : null;

  const fullName = [patient.nombre, patient.apellido_paterno, patient.apellido_materno]
    .filter(Boolean).join(" ") || "Paciente";

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-3">
        <Link
          href={`/dashboard/pacientes/${id}`}
          className="flex items-center gap-1 hover:text-kp-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">FHIR Preview</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-kp-accent-xs flex items-center justify-center">
            <Share2 className="w-5 h-5 text-kp-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-1">Interoperabilidad FHIR</h1>
            <p className="text-xs text-ink-3">Vista de recursos HL7 FHIR R4 — {fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-kp-accent-xs border border-kp-accent/30">
          <Share2 className="w-3 h-3 text-kp-accent" />
          <span className="text-[0.65rem] font-bold text-kp-primary tracking-wide">FHIR R4 · CL Core</span>
        </div>
      </div>

      {/* Informational banner */}
      <div className="flex gap-2.5 p-3 rounded-lg bg-kp-info-lt border border-kp-info/20 text-kp-info">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          <strong>Vista de interoperabilidad — Preview.</strong> La transmisión activa de datos FHIR
          se habilitará con el reglamento de la Ley 21.668.
          Los recursos mostrados siguen la Guía de Implementación{" "}
          <span className="font-semibold">HL7 FHIR CL Core</span> del CENS/MINSAL.
        </p>
      </div>

      {/* Resource grid legend */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Patient", desc: "PacienteCL · RUN identifier" },
          { label: "Encounter", desc: "EncounterCL · Último encuentro" },
          { label: "Condition", desc: "Diagnósticos CIF SOAP" },
          { label: "Observation", desc: "CoreObservacionCL · Signos vitales" },
          { label: "CarePlan", desc: "Plan e intervenciones SOAP" },
        ].map(({ label, desc }) => (
          <div key={label} className="p-2 rounded-lg bg-surface-0 border border-kp-border">
            <div className="text-[0.65rem] font-bold font-mono text-kp-accent">{label}</div>
            <div className="text-[0.6rem] text-ink-3 mt-0.5 leading-tight">{desc}</div>
          </div>
        ))}
      </div>

      {/* JSON Viewer */}
      <FhirPreview
        patient={fhirPatient}
        encounter={fhirEncounter}
        observations={fhirObservations}
        conditions={fhirConditions}
        carePlan={fhirCarePlan}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd C:/Users/alexi/korporis-fce && npm run build
```

Expected: 0 errors.

---

## Task 6: Final build + commit

- [ ] **Step 1: Full lint + build**

```bash
cd C:/Users/alexi/korporis-fce && npm run lint && npm run build
```

Expected: 0 lint warnings, 0 build errors.

- [ ] **Step 2: Check no regressions in existing routes**

Verify these routes still compile (check build output shows them in the route list):
- `/dashboard`
- `/dashboard/pacientes`
- `/dashboard/pacientes/[id]`
- `/dashboard/pacientes/[id]/anamnesis`
- `/dashboard/pacientes/[id]/evaluacion`
- `/dashboard/pacientes/[id]/evolucion`
- `/dashboard/pacientes/[id]/consentimiento`
- `/dashboard/pacientes/[id]/auditoria`
- NEW: `/dashboard/pacientes/[id]/exportar-pdf`
- NEW: `/dashboard/pacientes/[id]/fhir`

- [ ] **Step 3: Commit**

```bash
cd C:/Users/alexi/korporis-fce
git add -A
git commit -m "feat: PDF export (Ley 20.584), FHIR R4 CL Core preview y branding dinámico desde Supabase"
```

- [ ] **Step 4: Push**

```bash
cd C:/Users/alexi/korporis-fce && git push origin main
```

---

## Self-Review — Spec Coverage Check

| Spec Requirement | Covered by |
|---|---|
| Botón "Exportar PDF" en PatientActionNav | Task 3 Step 4 |
| npm install html2pdf.js | Task 1 Step 1 |
| PDF: header logo + clínica + fecha | Task 3 Step 2 (PdfExportView header section) |
| PDF: M1, Anamnesis, Vitales, Evaluaciones, SOAP, Consentimientos | Task 3 Step 2 (all sections) |
| PDF: footer Ley 20.584 + nº página | Task 3 Step 2 (FOOTER div) |
| Ruta /exportar-pdf | Task 3 Step 3 |
| Audit log exportar_ficha | Task 3 Step 1 (getPdfPatientData) |
| Ruta /fhir | Task 5 Step 2 |
| FHIR: Patient (PacienteCL + RUN) | Task 4 + Task 5 |
| FHIR: Encounter (EncounterCL) | Task 4 + Task 5 |
| FHIR: Condition (CIF del último SOAP) | Task 4 + Task 5 |
| FHIR: Observation (CoreObservacionCL vitales) | Task 4 + Task 5 |
| FHIR: CarePlan (plan e intervenciones SOAP) | Task 4 + Task 5 |
| JSON con syntax highlighting en `<pre>` | Task 5 Step 1 (FhirPreview `highlight()`) |
| Tabs por recurso | Task 5 Step 1 (FhirPreview TABS) |
| Badge "FHIR R4 · CL Core" | Task 5 Step 2 (fhir/page.tsx header) |
| Banner informativo Ley 21.668 | Task 5 Step 2 (Info banner) |
| Link sidebar "Interoperabilidad (FHIR)" | Task 2 Step 4 (Sidebar.tsx + DashboardShell SECTION_TO_PATH) |
| Fetch clinicas.config.branding | Task 2 Step 2 (dashboard/layout.tsx) |
| Inyectar CSS custom properties | Task 2 Step 1 (BrandingInjector useEffect) |
| Sidebar logo_url + clinic_short_name | Task 2 Step 4 (Sidebar branding prop) |
| PDF usa logo_url + nombre dinámico | Task 3 Step 1 (getPdfPatientData.clinicName) + Step 2 (PdfExportView) |
| CERO apply_migration | ✅ No migrations anywhere in this plan |
| npm run build = 0 errores | Task 1 Step 3, Task 2 Step 5, Task 3 Step 5, Task 4 Step 2, Task 5 Step 3, Task 6 Step 1 |

**No placeholder issues found — all steps contain complete code.**

**Type consistency:** `DbEncounter`, `DbSoapNote` defined in Task 4 and imported in Task 5. `BrandingConfig` defined in Task 2 and used consistently in Tasks 2, 3. `PdfPatientData` defined in Task 3 Step 1 and used in Step 2 and 3.
