// ============================================================
// Audit Log Types
// ============================================================

export interface AuditLog {
  id: string;
  userId: string | null;
  username: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  description: string | null;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  username: string;
  user_role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'LOGIN' | 'LOGOUT';
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  description: string | null;
  created_at: string;
}

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userRole: row.user_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    description: row.description,
    createdAt: row.created_at,
  };
}
