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
import type { PatientSummary } from "@/app/actions/timeline";

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

  // ── Auth ───────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // ── Fetch paralelo ─────────────────────────────────────────────────────
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

  const entries = timelineResult.success ? timelineResult.data.entries : [];

  const emptySummary: PatientSummary = {
    motivo_consulta: null,
    red_flags_activos: [],
    cif_activos: 0,
    plan_actual: null,
    proxima_sesion: null,
    vitales: null,
  };
  const summary = timelineResult.success
    ? timelineResult.data.summary
    : emptySummary;

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

      {/* PatientHeader — banner M1 */}
      <PatientHeader patient={p} hasConsent={hasConsent} />

      {/*
        Grid 3 columnas:
          xl  (≥1280px): [220px  |  1fr  |  280px]
          lg  (≥1024px): [200px  |  1fr]            — panel resumen oculto
          <lg (mobile):  [1col stacked]
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr_280px] gap-4 items-start">

        {/* ── Columna 1: Nav de acciones ── */}
        <div className="lg:sticky lg:top-4 self-start">
          <PatientActionNav patientId={id} isAdmin={isAdmin} />
        </div>

        {/* ── Columna 2: Timeline clínico ── */}
        <div className="min-w-0">
          <ClinicalTimeline entries={entries} currentUserId={user.id} />
        </div>

        {/* ── Columna 3: Panel resumen (solo xl) ── */}
        <div className="hidden xl:block xl:sticky xl:top-4 self-start">
          <SummaryPanel summary={summary} />
        </div>

      </div>
    </div>
  );
}
