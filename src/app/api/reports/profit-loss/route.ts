import { NextRequest } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { apiSuccess, apiForbidden, apiBadRequest, apiInternal } from '@/lib/api-response';
import pool from '@/lib/db';

// ============================================================
// GET /api/reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Laporan Laba Rugi: omset (harga jual) - HPP (harga modal)
// Owner only (requires REPORT_PROFIT permission)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) return apiForbidden('Autentikasi diperlukan');
    if (!hasPermission(user.role, PERMISSIONS.REPORT_PROFIT)) {
      return apiForbidden('Hanya Owner yang dapat melihat laporan laba rugi');
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return apiBadRequest('Parameter "from" dan "to" wajib diisi (format: YYYY-MM-DD)');
    }

    // Daily breakdown
    const dailyResult = await pool.query(
      `SELECT
        DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') AS date,
        SUM(ti.subtotal)::BIGINT AS revenue,
        COALESCE(SUM(ti.quantity * p.buy_price), 0)::BIGINT AS cogs,
        (SUM(ti.subtotal) - COALESCE(SUM(ti.quantity * p.buy_price), 0))::BIGINT AS profit
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.id
      LEFT JOIN products p ON p.id = ti.product_id
      WHERE t.status = 'completed'
        AND t.created_at >= $1::DATE
        AND t.created_at < ($2::DATE + INTERVAL '1 day')
      GROUP BY DATE(t.created_at AT TIME ZONE 'Asia/Jakarta')
      ORDER BY date DESC`,
      [from, to]
    );

    // Summary totals
    const summaryResult = await pool.query(
      `SELECT
        COUNT(DISTINCT t.id)::INT AS tx_count,
        COALESCE(SUM(ti.subtotal), 0)::BIGINT AS total_revenue,
        COALESCE(SUM(ti.quantity * p.buy_price), 0)::BIGINT AS total_cogs,
        (COALESCE(SUM(ti.subtotal), 0) - COALESCE(SUM(ti.quantity * p.buy_price), 0))::BIGINT AS total_profit
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.id
      LEFT JOIN products p ON p.id = ti.product_id
      WHERE t.status = 'completed'
        AND t.created_at >= $1::DATE
        AND t.created_at < ($2::DATE + INTERVAL '1 day')`,
      [from, to]
    );

    const summary = summaryResult.rows[0];
    const totalRevenue = Number(summary.total_revenue);
    const totalCogs = Number(summary.total_cogs);
    const totalProfit = Number(summary.total_profit);

    return apiSuccess({
      period: { from, to },
      summary: {
        transactionCount: summary.tx_count,
        totalRevenue,
        totalCogs,
        totalProfit,
        marginPercent: totalRevenue > 0
          ? Math.round((totalProfit / totalRevenue) * 10000) / 100
          : 0,
      },
      daily: dailyResult.rows.map((row) => ({
        date: row.date,
        revenue: Number(row.revenue),
        cogs: Number(row.cogs),
        profit: Number(row.profit),
        marginPercent: Number(row.revenue) > 0
          ? Math.round((Number(row.profit) / Number(row.revenue)) * 10000) / 100
          : 0,
      })),
    });
  } catch (error: any) {
    console.error('[REPORT] Profit/Loss error:', error);
    return apiInternal('Gagal mengambil laporan laba rugi');
  }
}
