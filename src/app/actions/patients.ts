"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { patientSchema, type PatientSchemaType } from "@/lib/validations";
import { formatRut } from "@/lib/run-validator";
import type { Patient } from "@/types";

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

export async function getPatients(): Promise<ActionResult<Patient[]>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("apellido_paterno", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Patient[] };
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
