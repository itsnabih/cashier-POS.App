import { NextRequest } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { apiSuccess, apiForbidden, apiBadRequest, apiInternal } from '@/lib/api-response';
import pool from '@/lib/db';

// ============================================================
// GET /api/reports/best-sellers?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Penjualan per Barang: top 50 produk terlaris
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

    // Top 50 best sellers
    const result = await pool.query(
      `SELECT
        ti.product_id,
        ti.product_name,
        ti.product_sku,
        SUM(ti.quantity)::INT AS total_qty,
        COALESCE(SUM(ti.subtotal), 0)::BIGINT AS total_revenue,
        COUNT(DISTINCT t.id)::INT AS tx_count
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.status = 'completed'
        AND t.created_at >= $1::DATE
        AND t.created_at < ($2::DATE + INTERVAL '1 day')
      GROUP BY ti.product_id, ti.product_name, ti.product_sku
      ORDER BY total_qty DESC
      LIMIT 50`,
      [from, to]
    );

    // Grand totals
    const totalsResult = await pool.query(
      `SELECT
        COALESCE(SUM(ti.quantity), 0)::INT AS grand_qty,
        COALESCE(SUM(ti.subtotal), 0)::BIGINT AS grand_revenue,
        COUNT(DISTINCT t.id)::INT AS grand_tx_count
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.status = 'completed'
        AND t.created_at >= $1::DATE
        AND t.created_at < ($2::DATE + INTERVAL '1 day')`,
      [from, to]
    );

    const totals = totalsResult.rows[0];

    return apiSuccess({
      period: { from, to },
      summary: {
        totalQuantity: totals.grand_qty,
        totalRevenue: Number(totals.grand_revenue),
        transactionCount: totals.grand_tx_count,
      },
      products: result.rows.map((row, idx) => ({
        rank: idx + 1,
        productId: row.product_id,
        productName: row.product_name,
        productSku: row.product_sku,
        totalQuantity: row.total_qty,
        totalRevenue: Number(row.total_revenue),
        transactionCount: row.tx_count,
      })),
    });
  } catch (error: any) {
    console.error('[REPORT] Best Sellers error:', error);
    return apiInternal('Gagal mengambil laporan best seller');
  }
}
