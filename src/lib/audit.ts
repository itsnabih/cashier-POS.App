import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

// ============================================================
// Audit Trail Logger
// Records every CRUD action: WHO, WHEN, WHAT
// Prevents internal fraud and provides accountability
// ============================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'LOGIN' | 'LOGOUT';

export interface AuditLogEntry {
  userId: string | null;
  username: string;
  userRole: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

/**
 * Write an audit log entry to the database.
 * This is fire-and-forget — errors are logged but don't block the request.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
        (user_id, username, user_role, action, entity_type, entity_id,
         old_values, new_values, ip_address, user_agent, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.userId,
        entry.username,
        entry.userRole,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        entry.description ?? null,
      ]
    );
  } catch (error) {
    // Never let audit logging break the main flow
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

/**
 * Convenience function: log a CRUD action from an authenticated user.
 */
export async function auditLog(
  user: AuthUser,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  options?: {
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    description?: string;
    request?: Request;
  }
): Promise<void> {
  const ipAddress = options?.request?.headers.get('x-forwarded-for')
    ?? options?.request?.headers.get('x-real-ip')
    ?? undefined;
  const userAgent = options?.request?.headers.get('user-agent') ?? undefined;

  await writeAuditLog({
    userId: user.userId,
    username: user.username,
    userRole: user.role,
    action,
    entityType,
    entityId,
    oldValues: options?.oldValues,
    newValues: options?.newValues,
    ipAddress,
    userAgent,
    description: options?.description,
  });
}

/**
 * Log an auth event (login/logout) — may not have full AuthUser yet.
 */
export async function auditAuthEvent(
  action: 'LOGIN' | 'LOGOUT',
  userId: string | null,
  username: string,
  role: string,
  request?: Request,
  description?: string
): Promise<void> {
  const ipAddress = request?.headers.get('x-forwarded-for')
    ?? request?.headers.get('x-real-ip')
    ?? undefined;
  const userAgent = request?.headers.get('user-agent') ?? undefined;

  await writeAuditLog({
    userId,
    username,
    userRole: role,
    action,
    entityType: 'auth',
    entityId: userId ?? undefined,
    ipAddress,
    userAgent,
    description: description ?? `User ${username} ${action.toLowerCase()}`,
  });
}
