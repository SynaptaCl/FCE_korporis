"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { patientSchema, type PatientSchemaType } from "@/lib/validations";
import { formatRut } from "@/lib/run-validator";
import type { Patient, PacienteClinico, CitaAgenda } from "@/types";

// ── Tipos de respuesta ─────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Helper: sesión activa ──────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// ── Helper: id_clinica del usuario autenticado ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getIdClinica(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", userId)
    .single();
  return (data?.id_clinica as string) ?? null;
}

// ── Helper: profesional id ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProfesionalId(supabase: any, authId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profesionales")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

// ── Helper: audit log ──────────────────────────────────────────────────────

async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  accion: string,
  tablaAfectada: string,
  registroId: string,
  idClinica?: string | null,
  idPaciente?: string | null
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch {
    // El audit log no debe romper el flujo principal
  }
}

// ── getPatients ────────────────────────────────────────────────────────────

export async function getPatients(): Promise<ActionResult<PacienteClinico[]>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("vista_pacientes_clinicos")
    .select("*")
    .eq("id_clinica", idClinica)
    .order("ultima_atencion", { ascending: false, nullsFirst: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PacienteClinico[] };
}

// ── getAgendaDiaria ────────────────────────────────────────────────────────

export async function getAgendaDiaria(): Promise<ActionResult<CitaAgenda[]>> {
  const { supabase, user } = await requireAuth();

  // Resolver id_clinica y profesional en paralelo (son independientes)
  const [idClinica, { data: prof }] = await Promise.all([
    getIdClinica(supabase, user.id),
    supabase
      .from("profesionales")
      .select("id, especialidad")
      .eq("auth_id", user.id)
      .maybeSingle(),
  ]);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  // Fecha en zona horaria de Santiago (UTC-3/UTC-4) para evitar el desfase de medianoche
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" }); // "YYYY-MM-DD"

  const baseQuery = supabase
    .from("vista_agenda_diaria")
    .select(
      "id_cita, estado, fecha, hora_inicio, hora_fin, id_paciente, " +
      "paciente_nombre, paciente_apellido, paciente_rut, " +
      "id_profesional, profesional_nombre, profesional_especialidad, " +
      "color_agenda, notas_cita, id_encuentro, encuentro_status, id_clinica"
    )
    .eq("id_clinica", idClinica)
    .eq("fecha", hoy)
    .in("estado", ["confirmada", "completada"])
    .order("hora_inicio");

  // Profesional clínico → solo su agenda; admin sin match → toda la clínica
  const { data, error } = await (prof ? baseQuery.eq("id_profesional", prof.id) : baseQuery);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as unknown as CitaAgenda[] };
}

// ── getPatientById ─────────────────────────────────────────────────────────

export async function getPatientById(
  id: string
): Promise<ActionResult<Patient>> {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit(supabase, user.id, "read", "pacientes", id);

  return { success: true, data: data as Patient };
}

// ── createPatient ──────────────────────────────────────────────────────────

export async function createPatient(
  formData: PatientSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = patientSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  // Normalizar RUT al formato canónico XX.XXX.XXX-K antes de persistir
  const payload = { ...parsed.data, rut: formatRut(parsed.data.rut), id_clinica: idClinica };

  const { data, error } = await supabase
    .from("pacientes")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una ficha con este RUN." };
    }
    return { success: false, error: error.message };
  }

  await logAudit(supabase, user.id, "create", "pacientes", data.id, idClinica, data.id);

  revalidatePath("/dashboard/pacientes");
  return { success: true, data: { id: data.id } };
}

// ── updatePatient ──────────────────────────────────────────────────────────

export async function updatePatient(
  id: string,
  formData: PatientSchemaType
): Promise<ActionResult<void>> {
  const parsed = patientSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const payload = {
    ...parsed.data,
    rut: formatRut(parsed.data.rut),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("pacientes")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una ficha con este RUN." };
    }
    return { success: false, error: error.message };
  }

  await logAudit(supabase, user.id, "update", "pacientes", id, null, id);

  revalidatePath("/dashboard/pacientes");
  revalidatePath(`/dashboard/pacientes/${id}`);
  return { success: true, data: undefined };
}
