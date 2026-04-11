"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";
import type { Evaluation } from "@/types";

// ── Helper ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, action: string, resourceId: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      user_id: userId,
      action,
      resource_type: "evaluacion",
      resource_id: resourceId,
    });
  } catch { /* no bloquea */ }
}

// ── getEvaluaciones ────────────────────────────────────────────────────────

export async function getEvaluaciones(
  patientId: string
): Promise<ActionResult<Evaluation[]>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_evaluaciones")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Evaluation[] };
}

// ── upsertEvaluacion ───────────────────────────────────────────────────────
// Upsert por patient_id + especialidad + sub_area (una ficha por sub-área).

export async function upsertEvaluacion(
  patientId: string,
  especialidad: string,
  subArea: string,
  data: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireAuth();

  const { data: existing } = await supabase
    .from("fce_evaluaciones")
    .select("id")
    .eq("patient_id", patientId)
    .eq("especialidad", especialidad)
    .eq("sub_area", subArea)
    .maybeSingle();

  let id: string;

  if (existing?.id) {
    const { error } = await supabase
      .from("fce_evaluaciones")
      .update({ data, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit(supabase, user.id, "update", id);
  } else {
    const idClinica = await getIdClinica(supabase, user.id);
    const { data: created, error } = await supabase
      .from("fce_evaluaciones")
      .insert({
        patient_id: patientId,
        encounter_id: null,
        especialidad,
        sub_area: subArea,
        data,
        created_by: user.id,
        ...(idClinica ? { id_clinica: idClinica } : {}),
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "create", id);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}/evaluacion`);
  return { success: true, data: { id } };
}
