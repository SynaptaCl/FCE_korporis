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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Fetch paciente + admin en paralelo
  const [patientRes, adminRes] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", patientId).single(),
    supabase.from("admin_users").select("id_clinica").eq("auth_id", user.id).maybeSingle(),
  ]);

  if (patientRes.error || !patientRes.data) {
    return { success: false, error: "Paciente no encontrado" };
  }

  const idClinica = adminRes.data?.id_clinica ?? null;

  // Fetch resto de datos en paralelo
  const [anamnesisRes, vitalesRes, evaluacionesRes, soapsRes, consentimientosRes, clinicaRes] =
    await Promise.all([
      supabase
        .from("fce_anamnesis")
        .select(
          "motivo_consulta, antecedentes_medicos, antecedentes_quirurgicos, farmacologia, alergias, red_flags, habitos"
        )
        .eq("id_paciente", patientId)
        .maybeSingle(),
      supabase
        .from("fce_signos_vitales")
        .select(
          "presion_arterial, frecuencia_cardiaca, spo2, temperatura, frecuencia_respiratoria, recorded_at"
        )
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
        .select(
          "id, subjetivo, objetivo, analisis_cif, plan, intervenciones, tareas_domiciliarias, proxima_sesion, firmado, firmado_at, created_at"
        )
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
        : Promise.resolve({ data: null, error: null }),
    ]);

  // Registrar exportación en logs_auditoria
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
  } catch {
    // No bloquear la generación del PDF
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clinicaData = clinicaRes.data as any;
  const branding: BrandingConfig | null = clinicaData?.config?.branding ?? null;
  const clinicName: string =
    clinicaData?.nombre ?? branding?.clinic_short_name ?? "KORPORIS CENTRO DE SALUD";

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
