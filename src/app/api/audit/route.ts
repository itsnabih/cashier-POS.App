import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiForbidden, apiInternal } from '@/lib/api-response';
import { mapAuditLogRow, type AuditLogRow } from '@/types/audit';

// ============================================================
// GET /api/audit
// Fetch audit logs with pagination and filtering
// ACCESS: OWNER ONLY
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate & Authorize
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Silakan login terlebih dahulu');
    }
    
    // Strict Anti-Repudiation: Only Owner can view audit logs
    if (user.role !== 'owner') {
      return apiForbidden('Anda tidak memiliki izin untuk melihat log audit');
    }

    // 2. Parse Query Parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const actionFilter = searchParams.get('action'); // e.g., 'CREATE', 'UPDATE'
    const startDate = searchParams.get('startDate'); // ISO Date
    const endDate = searchParams.get('endDate'); // ISO Date
    const search = searchParams.get('search'); // Match username or entity_type

    // 3. Build Dynamic Query
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (actionFilter) {
      conditions.push(`action = $${paramIndex}`);
      params.push(actionFilter);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      // Add 1 day to include the entire end date if it's just YYYY-MM-DD
      conditions.push(`created_at <= $${paramIndex}::timestamp + interval '1 day'`);
      params.push(endDate);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(username ILIKE $${paramIndex} OR entity_type ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 4. Execute Count Query
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countQuery, params);
    const total = parseInt(countResult?.total || '0', 10);

    // 5. Execute Data Query
    const dataQuery = `
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const queryParams = [...params, limit, offset];
    const rows = await query<AuditLogRow>(dataQuery, queryParams);

    // 6. Return Response
    return apiSuccess({
      data: rows.map(mapAuditLogRow),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('[AUDIT_API] Failed to fetch audit logs:', error);
    return apiInternal('Terjadi kesalahan saat memuat log audit');
  }
}
