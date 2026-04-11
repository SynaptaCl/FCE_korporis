"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import type { Evaluation } from "@/types";

// ── Helper ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, accion: string, registroId: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: "fce_evaluaciones",
      registro_id: registroId,
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
    .eq("id_paciente", patientId)
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
    .eq("id_paciente", patientId)
    .eq("especialidad", especialidad)
    .eq("sub_area", subArea)
    .maybeSingle();

  let id: string;

  if (existing?.id) {
    const { error } = await supabase
      .from("fce_evaluaciones")
      .update({ data })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit(supabase, user.id, "update", id);
  } else {
    const { data: created, error } = await supabase
      .from("fce_evaluaciones")
      .insert({
        id_paciente: patientId,
        id_encuentro: null,
        especialidad,
        sub_area: subArea,
        data,
        created_by: user.id,
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
