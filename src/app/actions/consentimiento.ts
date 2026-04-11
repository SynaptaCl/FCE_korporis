"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { consentSchema, type ConsentSchemaType } from "@/lib/validations";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";
import type { Consent } from "@/types";

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
  } catch { /* no bloquea el flujo */ }
}

export async function getConsentimientos(
  patientId: string
): Promise<ActionResult<Consent[]>> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("fce_consentimientos")
    .select("*")
    .eq("id_paciente", patientId)
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Consent[] };
}

export async function createConsentimiento(
  patientId: string,
  formData: ConsentSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = consentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { supabase, user } = await requireAuth();
  const idClinica = await getIdClinica(supabase, user.id);

  // Versión: +1 sobre la más alta del mismo tipo
  const { data: existing } = await supabase
    .from("fce_consentimientos")
    .select("version")
    .eq("id_paciente", patientId)
    .eq("tipo", parsed.data.tipo)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = existing ? existing.version + 1 : 1;

  const { data, error } = await supabase
    .from("fce_consentimientos")
    .insert({
      id_paciente: patientId,
      tipo: parsed.data.tipo,
      contenido: parsed.data.contenido,
      version: nextVersion,
      created_by: user.id,
      ...(idClinica ? { id_clinica: idClinica } : {}),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  await logAudit(supabase, user.id, "create", "fce_consentimientos", data.id, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: { id: data.id } };
}

export async function signConsentimiento(
  consentId: string,
  patientId: string,
  firmaDataUrl: string
): Promise<ActionResult<void>> {
  if (!firmaDataUrl.startsWith("data:image/")) {
    return { success: false, error: "Firma inválida" };
  }
  const { supabase, user } = await requireAuth();
  const timestamp = new Date().toISOString();
  const hash = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  const { error } = await supabase
    .from("fce_consentimientos")
    .update({
      firma_paciente: { data_url: firmaDataUrl, timestamp },
      firma_profesional: { id_profesional: user.id, timestamp, hash },
      firmado: true,
      firmado_at: timestamp,
    })
    .eq("id", consentId)
    .eq("firmado", false);

  if (error) return { success: false, error: error.message };
  await logAudit(supabase, user.id, "sign", "fce_consentimientos", consentId, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}/consentimiento`);
  return { success: true, data: undefined };
}
