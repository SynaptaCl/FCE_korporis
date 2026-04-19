"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import { getProfesionalId } from "./patients";
import type { Evaluation } from "@/types";

// ── Mapa normalizado → código del catálogo ──────────────────────────────────
// Convierte cualquier variante lowercase/sin-tilde al valor exacto que
// acepta el trigger validate_especialidad_fce (especialidades_catalogo.codigo).
const ESPECIALIDAD_DB: Record<string, string> = {
  kinesiologia:              "Kinesiología",
  fonoaudiologia:            "Fonoaudiología",
  masoterapia:               "Masoterapia",
  "administracion clinica":  "Administración Clínica",
  "administracion-clinica":  "Administración Clínica",
  odontologia:               "Odontología",
  "medicina general":        "Medicina General",
  psicologia:                "Psicología",
  nutricion:                 "Nutrición",
  "terapia ocupacional":     "Terapia Ocupacional",
  podologia:                 "Podología",
};

/**
 * Devuelve el código exacto del catálogo de especialidades.
 * Si ya viene con tilde/capitalizado (ej. desde profesionales.especialidad),
 * lo devuelve tal cual. Si viene normalizado, lo mapea.
 */
function toEspecialidadDB(raw: string): string {
  const normalizado = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ESPECIALIDAD_DB[normalizado] ?? raw;
}

// ── Helper ─────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, accion: string, registroId: string, idPaciente?: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: "fce_evaluaciones",
      registro_id: registroId,
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
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

  const profesionalId = await getProfesionalId(supabase, user.id);
  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };

  // Garantizar que el valor escrito en DB coincide con especialidades_catalogo.codigo
  const especialidadDB = toEspecialidadDB(especialidad);

  const { data: existing } = await supabase
    .from("fce_evaluaciones")
    .select("id")
    .eq("id_paciente", patientId)
    .eq("especialidad", especialidadDB)
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
    await logAudit(supabase, user.id, "update", id, patientId);
  } else {
    const { data: created, error } = await supabase
      .from("fce_evaluaciones")
      .insert({
        id_paciente: patientId,
        id_encuentro: null,
        especialidad: especialidadDB,
        sub_area: subArea,
        data,
        created_by: profesionalId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "create", id, patientId);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}/evaluacion`);
  return { success: true, data: { id } };
}
