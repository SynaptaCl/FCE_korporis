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
async function logAudit(supabase: any, userId: string, accion: string, tablaAfectada: string, registroId: string, idPaciente?: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch { /* no bloquea */ }
}

// ── getOrCreateEncounter ────────────────────────────────────────────────────
// 1. Busca un encuentro pre-creado por check-in (planificado, con id_cita, de hoy)
// 2. Si lo encuentra → transiciona a en_progreso y retorna su id
// 3. Si no → crea un walk-in nuevo (sin id_cita)

async function getOrCreateEncounter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  patientId: string,
  userId: string,
  idClinica: string | null,
  especialidad: string,
): Promise<string> {
  // Calcular rango del día en zona horaria de Santiago para evitar desfase UTC
  const hoySantiago = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const todayStart = new Date(`${hoySantiago}T00:00:00-04:00`);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // 1. Buscar encuentro pre-creado por check-in de hoy
  if (idClinica) {
    const { data: preplanned } = await supabase
      .from("fce_encuentros")
      .select("id")
      .eq("id_paciente", patientId)
      .eq("id_clinica", idClinica)
      .eq("status", "planificado")
      .not("id_cita", "is", null)
      .gte("started_at", todayStart.toISOString())
      .lt("started_at", tomorrowStart.toISOString())
      .maybeSingle();

    if (preplanned?.id) {
      const { error: updateError } = await supabase
        .from("fce_encuentros")
        .update({ status: "en_progreso", started_at: new Date().toISOString() })
        .eq("id", preplanned.id);
      if (updateError) throw new Error(updateError.message);
      return preplanned.id as string;
    }
  }

  // 2. Fallback: crear walk-in (atención sin agenda)
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

  // Obtener id y especialidad del profesional para el encuentro y FK
  const { data: prof } = await supabase
    .from("profesionales")
    .select("id, especialidad")
    .eq("auth_id", user.id)
    .maybeSingle();
  const especialidad = (prof?.especialidad as string) ?? "kinesiologia";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const profesionalId = prof?.id ?? null;

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
      .update({ ...parsed.data })
      .eq("id", noteId);

    if (error) return { success: false, error: error.message };
    id = noteId;
    await logAudit(supabase, user.id, "update", "soap_note", id, patientId);
  } else {
    // CREATE — buscar encuentro pre-creado o crear walk-in
    const idClinica = await getIdClinica(supabase, user.id);
    let encounterId: string;
    try {
      encounterId = await getOrCreateEncounter(supabase, patientId, user.id, idClinica, especialidad);
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
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "create", "soap_note", id, patientId);
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

  // firmado_por almacena el UUID del profesional (FK)
  const firmadoPor = user.id;

  // Leer id_encuentro ANTES de firmar para garantizar que lo obtenemos
  const { data: notaConEncuentro } = await supabase
    .from("fce_notas_soap")
    .select("id_encuentro")
    .eq("id", noteId)
    .single();

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

  if (notaConEncuentro?.id_encuentro) {
    await supabase
      .from("fce_encuentros")
      .update({ status: "finalizado", ended_at: new Date().toISOString() })
      .eq("id", notaConEncuentro.id_encuentro)
      .eq("status", "en_progreso");
  }

  await logAudit(supabase, user.id, "sign", "soap_note", noteId, patientId);

  revalidatePath(`/dashboard/pacientes/${patientId}/evolucion`);
  return { success: true, data: undefined };
}
