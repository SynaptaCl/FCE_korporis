export type AuditAction =
  | "login"
  | "logout"
  | "read"
  | "create"
  | "update"
  | "sign"
  | "export";

export type AuditActorTipo = "profesional" | "admin" | "sistema";

export interface AuditEntry {
  id: number;
  id_clinica?: string;
  id_paciente?: string | null;
  actor_id: string;
  actor_tipo: AuditActorTipo;
  accion: AuditAction;
  tabla_afectada?: string;
  registro_id?: string;
  datos_antes?: Record<string, unknown>;
  datos_despues?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  canal?: string;
  created_at: string;
}
