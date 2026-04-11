"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { anamnesisSchema, vitalSignsSchema, type AnamnesisSchemaType, type VitalSignsSchemaType } from "@/lib/validations";
import type { Anamnesis, VitalSigns } from "@/types";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";

// ── Helper ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, accion: string, tablaAfectada: string, registroId: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
    });
  } catch { /* no bloquea el flujo */ }
}

// ── getAnamnesis ───────────────────────────────────────────────────────────

export async function getAnamnesis(
  patientId: string
): Promise<ActionResult<Anamnesis | null>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_anamnesis")
    .select("*")
    .eq("id_paciente", patientId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Anamnesis | null };
}

// ── upsertAnamnesis ────────────────────────────────────────────────────────

export async function upsertAnamnesis(
  patientId: string,
  formData: AnamnesisSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = anamnesisSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  // ¿Ya existe una anamnesis para este paciente?
  const { data: existing } = await supabase
    .from("fce_anamnesis")
    .select("id")
    .eq("id_paciente", patientId)
    .maybeSingle();

  let id: string;

  if (existing?.id) {
    // UPDATE
    const { error } = await supabase
      .from("fce_anamnesis")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit(supabase, user.id, "update", "anamnesis", id);
  } else {
    // INSERT
    const idClinica = await getIdClinica(supabase, user.id);
    const { data: created, error } = await supabase
      .from("fce_anamnesis")
      .insert({
        id_paciente: patientId,
        ...parsed.data,
        created_by: user.id,
        ...(idClinica ? { id_clinica: idClinica } : {}),
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "create", "anamnesis", id);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}/anamnesis`);
  return { success: true, data: { id } };
}

// ── getLatestVitalSigns ────────────────────────────────────────────────────

export async function getLatestVitalSigns(
  patientId: string
): Promise<ActionResult<VitalSigns | null>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_signos_vitales")
    .select("*")
    .eq("id_paciente", patientId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as VitalSigns | null };
}

// ── saveVitalSigns ─────────────────────────────────────────────────────────

export async function saveVitalSigns(
  patientId: string,
  formData: VitalSignsSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = vitalSignsSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  const { data, error } = await supabase
    .from("fce_signos_vitales")
    .insert({
      id_paciente: patientId,
      id_encuentro: null, // Registro de M2 — sin encuentro activo
      ...parsed.data,
      recorded_by: user.id,
      recorded_at: new Date().toISOString(),
      ...(idClinica ? { id_clinica: idClinica } : {}),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit(supabase, user.id, "create", "vital_signs", data.id);

  revalidatePath(`/dashboard/pacientes/${patientId}/anamnesis`);
  return { success: true, data: { id: data.id } };
}
