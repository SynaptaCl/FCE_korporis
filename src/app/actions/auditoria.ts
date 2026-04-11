"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./patients";
import type { AuditEntry, AuditAction } from "@/types";

// ── Helper: requiere rol admin ─────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  // admin_users tiene el rol, NO profesionales
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("rol")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (adminUser?.rol !== "admin") redirect("/dashboard");

  return { supabase, user };
}

// ── getAuditLogs ───────────────────────────────────────────────────────────

export type AuditFilter = {
  patientId?: string;
  accion?: AuditAction | "";
  desde?: string; // "YYYY-MM-DD"
  hasta?: string; // "YYYY-MM-DD"
};

export async function getAuditLogs(
  filter: AuditFilter = {}
): Promise<ActionResult<AuditEntry[]>> {
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("logs_auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter.patientId) {
    query = query.eq("id_paciente", filter.patientId);
  }
  if (filter.accion) {
    query = query.eq("accion", filter.accion);
  }
  if (filter.desde) {
    query = query.gte("created_at", `${filter.desde}T00:00:00Z`);
  }
  if (filter.hasta) {
    query = query.lte("created_at", `${filter.hasta}T23:59:59Z`);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as AuditEntry[] };
}
