import { type NextRequest } from 'next/server';
import { transaction, queryOne, query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeUUID } from '@/lib/sanitize';
import {
  apiSuccess, apiBadRequest, apiUnauthorized,
  apiForbidden, apiNotFound, apiInternal,
} from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import {
  type StockOpnameRow, type StockOpnameItemRow,
  mapStockOpnameRow, mapStockOpnameItemRow,
} from '@/types/stock-opname';

// ============================================================
// GET /api/stock-opname/[id] — Get opname detail with items
// ============================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.STOCK_OPNAME_VIEW)) return apiForbidden();

    const { id } = await params;
    const cleanId = sanitizeUUID(id);
    if (!cleanId) return apiBadRequest('ID tidak valid');

    const header = await queryOne<StockOpnameRow & { conducted_by_name: string }>(
      `SELECT so.*, u.full_name as conducted_by_name
       FROM stock_opnames so
       LEFT JOIN users u ON u.id = so.conducted_by
       WHERE so.id = $1`,
      [cleanId]
    );
    if (!header) return apiNotFound('Stok opname tidak ditemukan');

    const items = await query<StockOpnameItemRow>(
      `SELECT * FROM stock_opname_items WHERE opname_id = $1 ORDER BY product_name ASC`,
      [cleanId]
    );

    return apiSuccess({
      ...mapStockOpnameRow(header),
      items: items.map(mapStockOpnameItemRow),
    });
  } catch (error) {
    console.error('[STOCK_OPNAME] Get error:', error);
    return apiInternal('Gagal mengambil data stok opname');
  }
}

// ============================================================
// POST /api/stock-opname/[id]/finalize
// Finalizes opname: adjusts stock, records shrinkage/surplus
// as inventory adjustments for P&L impact
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.STOCK_OPNAME_FINALIZE)) return apiForbidden();

    const { id } = await params;
    const cleanId = sanitizeUUID(id);
    if (!cleanId) return apiBadRequest('ID tidak valid');

    const header = await queryOne<StockOpnameRow>(
      'SELECT * FROM stock_opnames WHERE id = $1',
      [cleanId]
    );
    if (!header) return apiNotFound('Stok opname tidak ditemukan');
    if (header.status !== 'in_progress') {
      return apiBadRequest('Stok opname sudah difinalisasi atau dibatalkan');
    }

    // Get all items
    const items = await query<StockOpnameItemRow>(
      'SELECT * FROM stock_opname_items WHERE opname_id = $1',
      [cleanId]
    );

    await transaction(async (client) => {
      for (const item of items) {
        if (item.difference === 0) continue;

        // Adjust product stock to match physical count
        await client.query(
          'UPDATE products SET stock = $1 WHERE id = $2',
          [item.physical_stock, item.product_id]
        );

        // Record inventory adjustment
        const adjustmentType = item.difference < 0 ? 'shrinkage' : 'surplus';
        const totalValue = Math.abs(item.difference) * Number(item.unit_cost);

        await client.query(
          `INSERT INTO inventory_adjustments
           (product_id, adjustment_type, quantity_change, unit_cost, total_value,
            reference_type, reference_id, reason, adjusted_by)
           VALUES ($1, $2, $3, $4, $5, 'stock_opname', $6, $7, $8)`,
          [
            item.product_id,
            adjustmentType,
            item.difference,
            Number(item.unit_cost),
            totalValue,
            cleanId,
            item.reason ?? `Selisih stok opname ${header.opname_number}`,
            user.userId,
          ]
        );
      }

      // Mark opname as finalized
      await client.query(
        `UPDATE stock_opnames SET status = 'finalized', finalized_at = NOW() WHERE id = $1`,
        [cleanId]
      );
    });

    await auditLog(user, 'UPDATE', 'stock_opname', cleanId, {
      oldValues: { status: 'in_progress' },
      newValues: { status: 'finalized' },
      description: `Stok opname ${header.opname_number} difinalisasi. Shrinkage: ${header.total_shrinkage}, Surplus: ${header.total_surplus}`,
      request,
    });

    return apiSuccess({ message: 'Stok opname berhasil difinalisasi' });
  } catch (error) {
    console.error('[STOCK_OPNAME] Finalize error:', error);
    return apiInternal('Gagal memfinalisasi stok opname');
  }
}
