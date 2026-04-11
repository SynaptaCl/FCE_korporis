export type AuditAction =
  | "login"
  | "logout"
  | "read"
  | "create"
  | "update"
  | "sign"
  | "export";

export type AuditResourceType =
  | "patient"
  | "anamnesis"
  | "encounter"
  | "evaluation"
  | "soap_note"
  | "consent"
  | "vital_signs";

export interface AuditEntry {
  id: number;
  user_id: string;
  action: AuditAction;
  resource_type?: AuditResourceType;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
