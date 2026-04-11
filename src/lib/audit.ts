import type { AuditAction, AuditResourceType } from "@/types";

/**
 * Creates an audit log entry object ready to insert into Supabase.
 * In v1, this returns the object. When Supabase is connected,
 * this will call supabase.from('audit_log').insert().
 */
export function createAuditEntry({
  userId,
  action,
  resourceType,
  resourceId,
  details,
}: {
  userId: string;
  action: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
}) {
  return {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date().toISOString(),
  };
}
