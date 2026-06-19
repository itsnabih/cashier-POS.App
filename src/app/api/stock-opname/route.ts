import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne, transaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString, sanitizePagination } from '@/lib/sanitize';
import {
  apiSuccess, apiPaginated, apiBadRequest,
  apiUnauthorized, apiForbidden, apiInternal, apiCreated,
} from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type StockOpnameRow, mapStockOpnameRow } from '@/types/stock-opname';

// ============================================================
// GET /api/stock-opname — List stock opname sessions
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.STOCK_OPNAME_VIEW)) return apiForbidden();

    const params = request.nextUrl.searchParams;
    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM stock_opnames'
    );
    const total = Number(countResult?.count ?? 0);

    const rows = await query<StockOpnameRow>(
      `SELECT so.*, u.full_name as conducted_by_name
       FROM stock_opnames so
       LEFT JOIN users u ON u.id = so.conducted_by
       ORDER BY so.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return apiPaginated(rows.map(mapStockOpnameRow), { page, limit, total });
  } catch (error) {
    console.error('[STOCK_OPNAME] List error:', error);
    return apiInternal('Gagal mengambil data stok opname');
  }
}

// ============================================================
// POST /api/stock-opname — Create new stock opname session
// Compares system stock vs physical count, calculates shrinkage
// ============================================================
const OpnameItemSchema = z.object({
  productId: z.string().uuid(),
  physicalStock: z.number().int().min(0, 'Stok fisik tidak boleh negatif'),
  reason: z.string().max(200).transform(sanitizeString).nullable().optional(),
});

const CreateOpnameSchema = z.object({
  notes: z.string().max(500).transform(sanitizeString).nullable().optional(),
  items: z.array(OpnameItemSchema).min(1, 'Minimal 1 item untuk opname'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.STOCK_OPNAME_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreateOpnameSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Generate opname number: SO-YYYYMMDD-XXXX
    const now = new Date();
    const datePrefix = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seqResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM stock_opnames WHERE opname_number LIKE $1`,
      [`${datePrefix}%`]
    );
    const seq = String(Number(seqResult?.count ?? 0) + 1).padStart(4, '0');
    const opnameNumber = `${datePrefix}-${seq}`;

    const result = await transaction(async (client) => {
      let totalShrinkage = 0;
      let totalSurplus = 0;

      // Create opname header
      const headerResult = await client.query(
        `INSERT INTO stock_opnames (opname_number, conducted_by, status, notes)
         VALUES ($1, $2, 'in_progress', $3) RETURNING *`,
        [opnameNumber, user.userId, d.notes ?? null]
      );
      const opname = headerResult.rows[0];

      for (const item of d.items) {
        // Get current product data
        const productResult = await client.query(
          'SELECT id, name, stock, buy_price FROM products WHERE id = $1',
          [item.productId]
        );
        if (productResult.rows.length === 0) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        const product = productResult.rows[0];
        const systemStock = Number(product.stock);
        const physicalStock = item.physicalStock;
        const difference = physicalStock - systemStock;
        const unitCost = Number(product.buy_price);
        const lossValue = difference < 0 ? Math.abs(difference) * unitCost : 0;

        if (difference < 0) {
          totalShrinkage += lossValue;
        } else if (difference > 0) {
          totalSurplus += difference * unitCost;
        }

        // Insert opname item
        await client.query(
          `INSERT INTO stock_opname_items
           (opname_id, product_id, product_name, system_stock, physical_stock, difference, unit_cost, loss_value, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [opname.id, item.productId, product.name, systemStock, physicalStock,
           difference, unitCost, lossValue, item.reason ?? null]
        );
      }

      // Update totals on header
      await client.query(
        `UPDATE stock_opnames SET total_shrinkage = $1, total_surplus = $2 WHERE id = $3`,
        [totalShrinkage, totalSurplus, opname.id]
      );

      return { ...opname, total_shrinkage: String(totalShrinkage), total_surplus: String(totalSurplus) };
    });

    await auditLog(user, 'CREATE', 'stock_opname', result.id, {
      newValues: { opnameNumber, itemCount: d.items.length },
      description: `Stok opname ${opnameNumber} dibuat`,
      request,
    });

    return apiCreated(mapStockOpnameRow(result));
  } catch (error) {
    console.error('[STOCK_OPNAME] Create error:', error);
    const message = error instanceof Error ? error.message : 'Gagal membuat stok opname';
    return apiInternal(message);
  }
}
