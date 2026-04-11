import type { AuditAction, AuditActorTipo } from "@/types";

/**
 * Creates an audit log entry object ready to insert into logs_auditoria.
 */
export function createAuditEntry({
  actorId,
  actorTipo = "profesional",
  accion,
  tablaAfectada,
  registroId,
  idClinica,
}: {
  actorId: string;
  actorTipo?: AuditActorTipo;
  accion: AuditAction;
  tablaAfectada?: string;
  registroId?: string;
  idClinica?: string;
}) {
  return {
    actor_id: actorId,
    actor_tipo: actorTipo,
    accion,
    tabla_afectada: tablaAfectada,
    registro_id: registroId,
    ...(idClinica ? { id_clinica: idClinica } : {}),
    created_at: new Date().toISOString(),
  };
}
