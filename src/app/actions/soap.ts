"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { soapSchema } from "@/lib/validations";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";
import type { SoapNote } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  } catch { /* no bloquea */ }
}

// ── getOrCreateEncounter ────────────────────────────────────────────────────
// Busca un encuentro abierto para hoy; si no existe, crea uno nuevo.

async function getOrCreateEncounter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  patientId: string,
  userId: string,
  especialidad: string,
): Promise<string> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("fce_encuentros")
    .select("id")
    .eq("id_paciente", patientId)
    .eq("id_profesional", userId)
    .eq("status", "en_progreso")
    .gte("created_at", todayStart.toISOString())
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const idClinica = await getIdClinica(supabase, userId);
  const { data: created, error } = await supabase
    .from("fce_encuentros")
    .insert({
      id_paciente: patientId,
      id_profesional: userId,
      especialidad,
      modalidad: "presencial",
      status: "en_progreso",
      started_at: new Date().toISOString(),
      ...(idClinica ? { id_clinica: idClinica } : {}),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

// ── getSoapNotes ─────────────────────────────────────────────────────────────

export async function getSoapNotes(
  patientId: string,
): Promise<ActionResult<SoapNote[]>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_notas_soap")
    .select("*")
    .eq("id_paciente", patientId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as SoapNote[] };
}

// ── upsertSoapNote ───────────────────────────────────────────────────────────

export async function upsertSoapNote(
  patientId: string,
  formData: Record<string, unknown>,
  noteId?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = soapSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  // Obtener especialidad del profesional para el encuentro
  const { data: prof } = await supabase
    .from("profesionales")
    .select("especialidad")
    .eq("id", user.id)
    .single();
  const especialidad = (prof?.especialidad as string) ?? "kinesiologia";

  let id: string;

  if (noteId) {
    // UPDATE — solo si no está firmado
    const { data: existing } = await supabase
      .from("fce_notas_soap")
      .select("firmado")
      .eq("id", noteId)
      .single();

    if (existing?.firmado) {
      return { success: false, error: "La nota está firmada y no puede modificarse." };
    }

    const { error } = await supabase
      .from("fce_notas_soap")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", noteId);

    if (error) return { success: false, error: error.message };
    id = noteId;
    await logAudit(supabase, user.id, "update", "soap_note", id);
  } else {
    // CREATE — auto-crear encuentro
    let encounterId: string;
    try {
      encounterId = await getOrCreateEncounter(supabase, patientId, user.id, especialidad);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }

    const { data: created, error } = await supabase
      .from("fce_notas_soap")
      .insert({
        id_paciente: patientId,
        id_encuentro: encounterId,
        ...parsed.data,
        firmado: false,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "create", "soap_note", id);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}/evolucion`);
  return { success: true, data: { id } };
}

// ── signSoapNote ─────────────────────────────────────────────────────────────

export async function signSoapNote(
  noteId: string,
  patientId: string,
): Promise<ActionResult<void>> {
  const { supabase, user } = await requireAuth();

  // Obtener nombre del profesional
  const { data: prof } = await supabase
    .from("profesionales")
    .select("nombre, apellidos")
    .eq("id", user.id)
    .single();

  const firmadoPor = prof
    ? `${prof.nombre} ${prof.apellidos}`.trim()
    : user.email ?? user.id;

  const { error } = await supabase
    .from("fce_notas_soap")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: firmadoPor,
    })
    .eq("id", noteId)
    .eq("firmado", false); // solo si no estaba ya firmado

  if (error) return { success: false, error: error.message };

  // Cerrar el encuentro asociado
  await supabase
    .from("fce_encuentros")
    .update({ status: "finalizado", ended_at: new Date().toISOString() })
    .eq("id_paciente", patientId)
    .eq("status", "en_progreso");

  await logAudit(supabase, user.id, "sign", "soap_note", noteId);

  revalidatePath(`/dashboard/pacientes/${patientId}/evolucion`);
  return { success: true, data: undefined };
}
