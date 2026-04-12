"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import type { SoapNote, VitalSigns } from "@/types";
import type { Evaluation } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

export type TimelineEntryType = "soap" | "evaluacion" | "signos_vitales" | "consentimiento";

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  date: string; // ISO
  especialidad?: string;
  autor_id?: string;
  profesional_nombre?: string;
  titulo: string;
  resumen: string;
  firmado?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export interface PatientSummary {
  motivo_consulta: string | null;
  red_flags_activos: string[];
  cif_activos: number;
  plan_actual: string | null;
  proxima_sesion: string | null;
  vitales: VitalSigns | null;
}

// ── Helper ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// ── getPatientTimeline ─────────────────────────────────────────────────────

export async function getPatientTimeline(
  patientId: string
): Promise<ActionResult<{ entries: TimelineEntry[]; summary: PatientSummary }>> {
  const { supabase } = await requireAuth();

  // Fetch all data in parallel
  const [soapRes, evalRes, vitalsRes, consentRes, anamnesisRes] = await Promise.all([
    supabase
      .from("fce_notas_soap")
      .select("*")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_evaluaciones")
      .select("*")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_signos_vitales")
      .select("*")
      .eq("id_paciente", patientId)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("fce_consentimientos")
      .select("id, id_paciente, tipo, version, firmado, created_at")
      .eq("id_paciente", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fce_anamnesis")
      .select("motivo_consulta, red_flags")
      .eq("id_paciente", patientId)
      .maybeSingle(),
  ]);

  // Collect all professional IDs for name batch lookup
  const profIds = new Set<string>();
  for (const s of soapRes.data ?? []) {
    if (s.firmado_por) profIds.add(s.firmado_por);
  }
  for (const e of evalRes.data ?? []) {
    if (e.created_by) profIds.add(e.created_by);
  }
  for (const v of vitalsRes.data ?? []) {
    if (v.recorded_by) profIds.add(v.recorded_by);
  }

  const profMap = new Map<string, string>();
  if (profIds.size > 0) {
    const { data: profs } = await supabase
      .from("profesionales")
      .select("id, nombre, apellidos")
      .in("id", Array.from(profIds));
    for (const p of profs ?? []) {
      profMap.set(p.id, `${p.nombre} ${p.apellidos ?? ""}`.trim());
    }
  }

  const entries: TimelineEntry[] = [];

  // SOAP notes
  for (const soap of (soapRes.data ?? []) as SoapNote[]) {
    const cifItems = [
      ...(soap.analisis_cif?.funciones ?? []),
      ...(soap.analisis_cif?.actividades ?? []),
      ...(soap.analisis_cif?.participacion ?? []),
      ...(soap.analisis_cif?.contexto ?? []),
    ];
    entries.push({
      id: soap.id,
      type: "soap",
      date: soap.created_at,
      autor_id: soap.firmado_por,
      profesional_nombre: soap.firmado_por ? profMap.get(soap.firmado_por) : undefined,
      titulo: "Nota SOAP",
      resumen: soap.subjetivo?.slice(0, 150) || "Sin descripción subjetiva",
      firmado: soap.firmado,
      data: {
        subjetivo: soap.subjetivo,
        objetivo: soap.objetivo,
        plan: soap.plan,
        proxima_sesion: soap.proxima_sesion,
        tareas_domiciliarias: soap.tareas_domiciliarias,
        intervenciones: soap.intervenciones ?? [],
        cif_count: cifItems.length,
        firmado_at: soap.firmado_at,
      },
    });
  }

  // Evaluaciones
  for (const ev of (evalRes.data ?? []) as Evaluation[]) {
    const subAreaLabel = String(ev.sub_area ?? "").replace(/_/g, " ");
    entries.push({
      id: ev.id,
      type: "evaluacion",
      date: ev.created_at,
      especialidad: ev.especialidad,
      autor_id: ev.created_by,
      profesional_nombre: ev.created_by ? profMap.get(ev.created_by) : undefined,
      titulo: `Evaluación — ${ev.especialidad ?? "Sin especialidad"}`,
      resumen: subAreaLabel
        ? `Área: ${subAreaLabel}`
        : "Evaluación registrada",
      data: {
        especialidad: ev.especialidad,
        sub_area: ev.sub_area,
        contraindicaciones_certificadas: ev.contraindicaciones_certificadas,
      },
    });
  }

  // Signos vitales
  for (const vs of (vitalsRes.data ?? []) as VitalSigns[]) {
    entries.push({
      id: vs.id,
      type: "signos_vitales",
      date: vs.recorded_at,
      autor_id: vs.recorded_by,
      profesional_nombre: vs.recorded_by ? profMap.get(vs.recorded_by) : undefined,
      titulo: "Signos Vitales",
      resumen: `PA ${vs.presion_arterial ?? "—"} · FC ${vs.frecuencia_cardiaca ?? "—"} bpm · SpO₂ ${vs.spo2 ?? "—"}%`,
      data: {
        presion_arterial: vs.presion_arterial,
        frecuencia_cardiaca: vs.frecuencia_cardiaca,
        spo2: vs.spo2,
        temperatura: vs.temperatura,
        frecuencia_respiratoria: vs.frecuencia_respiratoria,
      },
    });
  }

  // Consentimientos
  for (const c of consentRes.data ?? []) {
    const tipo = String(c.tipo ?? "");
    const tipoLabel = tipo === "general" ? "General" : tipo === "menores" ? "Menores" : tipo === "teleconsulta" ? "Teleconsulta" : tipo;
    entries.push({
      id: c.id,
      type: "consentimiento",
      date: c.created_at,
      titulo: `Consentimiento ${tipoLabel}`,
      resumen: c.firmado ? "Firmado por el paciente" : "Pendiente de firma",
      firmado: Boolean(c.firmado),
      data: { tipo: c.tipo, version: c.version },
    });
  }

  // Sort by date descending
  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // ── Summary ──────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anamnesis = anamnesisRes.data as any;
  const redFlagsActivos: string[] = [];
  if (anamnesis?.red_flags) {
    const rf = anamnesis.red_flags as Record<string, boolean>;
    const LABELS: Record<string, string> = {
      marcapasos: "Marcapasos",
      embarazo: "Embarazo",
      tvp: "TVP",
      oncologico: "Oncológico",
      fiebre: "Fiebre",
      alergias_severas: "Alergias severas",
      infeccion_cutanea: "Infección cutánea",
      fragilidad_capilar: "Fragilidad capilar",
    };
    for (const [key, label] of Object.entries(LABELS)) {
      if (rf[key]) redFlagsActivos.push(label);
    }
  }

  const latestSoap = ((soapRes.data ?? [])[0] ?? null) as SoapNote | null;
  const latestCifCount = latestSoap
    ? [
        ...(latestSoap.analisis_cif?.funciones ?? []),
        ...(latestSoap.analisis_cif?.actividades ?? []),
        ...(latestSoap.analisis_cif?.participacion ?? []),
        ...(latestSoap.analisis_cif?.contexto ?? []),
      ].length
    : 0;

  const latestVitals = ((vitalsRes.data ?? [])[0] ?? null) as VitalSigns | null;

  const summary: PatientSummary = {
    motivo_consulta: anamnesis?.motivo_consulta ?? null,
    red_flags_activos: redFlagsActivos,
    cif_activos: latestCifCount,
    plan_actual: latestSoap?.plan ?? null,
    proxima_sesion: latestSoap?.proxima_sesion ?? null,
    vitales: latestVitals,
  };

  return { success: true, data: { entries, summary } };
}
