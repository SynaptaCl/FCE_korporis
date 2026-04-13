// src/lib/permissions.ts
// Control de acceso para la FCE de Korporis.
// No modifica la base de datos — solo evalúa permisos en base al contexto del usuario.

import type { Especialidad, Rol } from "@/lib/constants";

export interface UserContext {
  userId: string;                        // auth.uid() — solo para audit logs
  idClinica: string | null;
  rol: Rol;                              // "profesional" | "recepcion" | "admin"
  idProfesional: string | null;          // profesionales.id — para FKs
  especialidad: Especialidad | null;
}

/**
 * ¿Puede este usuario escribir en el módulo de la especialidad indicada?
 * - admin: puede escribir en cualquier especialidad
 * - profesional: solo en su propia especialidad
 * - recepcion: nunca puede escribir en módulos clínicos
 */
export function canWrite(ctx: UserContext, moduloEspecialidad: Especialidad): boolean {
  if (ctx.rol === "admin") return true;
  if (ctx.rol === "recepcion") return false;
  if (ctx.rol === "profesional") {
    return ctx.especialidad === moduloEspecialidad;
  }
  return false;
}

/**
 * ¿Puede este usuario acceder a la FCE (leer datos clínicos)?
 * Recepcionistas no tienen acceso a la FCE.
 */
export function canAccessFCE(ctx: UserContext): boolean {
  return ctx.rol !== "recepcion";
}

/**
 * ¿Puede este usuario firmar notas SOAP de la especialidad indicada?
 * Solo profesionales de esa especialidad pueden firmar.
 */
export function canSignSOAP(ctx: UserContext, moduloEspecialidad: Especialidad): boolean {
  return ctx.rol === "profesional" && ctx.especialidad === moduloEspecialidad;
}
