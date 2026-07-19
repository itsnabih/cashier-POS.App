import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiInternal } from '@/lib/api-response';
import { mapTransactionRow, type TransactionRow } from '@/types/transaction';

// ============================================================
// GET /api/transactions
// Fetch transaction history with pagination and filtering
// ACCESS: ALL LOGGED IN USERS (Cashier, Admin, Owner)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Silakan login terlebih dahulu');
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const receiptNumber = searchParams.get('receipt_number');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (receiptNumber) {
      conditions.push(`t.receipt_number ILIKE $${paramIndex}`);
      params.push(`%${receiptNumber}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`t.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`t.created_at <= $${paramIndex}::timestamp + interval '1 day'`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Get total count
    const countQuery = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
    const countResult = await queryOne<{ total: string }>(countQuery, params);
    const total = parseInt(countResult?.total || '0', 10);

    // 2. Get data with joined cashier name
    const dataQuery = `
      SELECT 
        t.*,
        u.full_name as cashier_name,
        v.full_name as voided_by_name
      FROM transactions t
      LEFT JOIN users u ON t.cashier_id = u.id
      LEFT JOIN users v ON t.voided_by = v.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const queryParams = [...params, limit, offset];
    const rows = await query<TransactionRow>(dataQuery, queryParams);

    // 3. Get Summary (Today's revenue, transactions count, void count)
    // Summary is not filtered by pagination, but optionally by the same date filters
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE status = 'voided') as total_voided
      FROM transactions t
      ${whereClause}
    `;
    const summaryResult = await queryOne<{ total_revenue: string, total_completed: string, total_voided: string }>(summaryQuery, params);

    return apiSuccess({
      data: rows.map(mapTransactionRow),
      summary: {
        totalRevenue: parseInt(summaryResult?.total_revenue || '0', 10),
        totalCompleted: parseInt(summaryResult?.total_completed || '0', 10),
        totalVoided: parseInt(summaryResult?.total_voided || '0', 10),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('[TRANSACTIONS_API] Failed to fetch transactions:', error);
    return apiInternal('Terjadi kesalahan saat memuat transaksi');
  }
}
