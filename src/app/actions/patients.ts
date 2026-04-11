"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { patientSchema, type PatientSchemaType } from "@/lib/validations";
import { formatRun } from "@/lib/run-validator";
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

// ── Helper: audit log ──────────────────────────────────────────────────────

async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from("logs_auditoria").insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details ?? null,
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

  await logAudit(supabase, user.id, "read", "patient", id);

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

  // Normalizar RUN al formato canónico XX.XXX.XXX-K antes de persistir
  const payload = { ...parsed.data, run: formatRun(parsed.data.run) };

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

  await logAudit(supabase, user.id, "create", "patient", data.id, {
    run: payload.run,
    creado_por: user.id,
  });

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
    run: formatRun(parsed.data.run),
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

  await logAudit(supabase, user.id, "update", "patient", id, {
    run: payload.run,
    actualizado_por: user.id,
  });

  revalidatePath("/dashboard/pacientes");
  revalidatePath(`/dashboard/pacientes/${id}`);
  return { success: true, data: undefined };
}
