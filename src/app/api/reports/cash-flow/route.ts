import { NextRequest } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { apiSuccess, apiForbidden, apiBadRequest, apiInternal } from '@/lib/api-response';
import pool from '@/lib/db';

// ============================================================
// GET /api/reports/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Arus Kas: breakdown per metode pembayaran
// Owner & Admin (requires REPORT_VIEW permission)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) return apiForbidden('Autentikasi diperlukan');
    if (!hasPermission(user.role, PERMISSIONS.REPORT_VIEW)) {
      return apiForbidden('Anda tidak memiliki akses untuk melihat laporan');
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return apiBadRequest('Parameter "from" dan "to" wajib diisi (format: YYYY-MM-DD)');
    }

    // Breakdown by payment method
    const methodResult = await pool.query(
      `SELECT
        t.payment_method,
        COUNT(*)::INT AS tx_count,
        COALESCE(SUM(t.total), 0)::BIGINT AS total_amount
      FROM transactions t
      WHERE t.status = 'completed'
        AND t.created_at >= $1::DATE
        AND t.created_at < ($2::DATE + INTERVAL '1 day')
      GROUP BY t.payment_method
      ORDER BY total_amount DESC`,
      [from, to]
    );

    // Daily totals
    const dailyResult = await pool.query(
      `SELECT
        DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') AS date,
        COUNT(*)::INT AS tx_count,
        COALESCE(SUM(t.total), 0)::BIGINT AS total_amount,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total ELSE 0 END), 0)::BIGINT AS cash_amount,
        COALESCE(SUM(CASE WHEN t.payment_method = 'qris' THEN t.total ELSE 0 END), 0)::BIGINT AS qris_amount,
        COALESCE(SUM(CASE WHEN t.payment_method = 'transfer' THEN t.total ELSE 0 END), 0)::BIGINT AS transfer_amount
      FROM transactions t
      WHERE t.status = 'completed'
        AND t.created_at >= $1::DATE
        AND t.created_at < ($2::DATE + INTERVAL '1 day')
      GROUP BY DATE(t.created_at AT TIME ZONE 'Asia/Jakarta')
      ORDER BY date DESC`,
      [from, to]
    );

    // Grand totals
    const grandTotal = methodResult.rows.reduce(
      (acc, row) => acc + Number(row.total_amount), 0
    );
    const totalTxCount = methodResult.rows.reduce(
      (acc, row) => acc + row.tx_count, 0
    );

    return apiSuccess({
      period: { from, to },
      summary: {
        grandTotal,
        transactionCount: totalTxCount,
      },
      byMethod: methodResult.rows.map((row) => ({
        method: row.payment_method,
        transactionCount: row.tx_count,
        totalAmount: Number(row.total_amount),
        percentage: grandTotal > 0
          ? Math.round((Number(row.total_amount) / grandTotal) * 10000) / 100
          : 0,
      })),
      daily: dailyResult.rows.map((row) => ({
        date: row.date,
        transactionCount: row.tx_count,
        totalAmount: Number(row.total_amount),
        cashAmount: Number(row.cash_amount),
        qrisAmount: Number(row.qris_amount),
        transferAmount: Number(row.transfer_amount),
      })),
    });
  } catch (error: any) {
    console.error('[REPORT] Cash Flow error:', error);
    return apiInternal('Gagal mengambil laporan arus kas');
  }
}
