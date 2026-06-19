import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne, transaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString, sanitizePagination } from '@/lib/sanitize';
import { apiSuccess, apiPaginated, apiBadRequest, apiUnauthorized, apiForbidden, apiInternal, apiCreated } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type PurchaseOrderRow, mapPurchaseOrderRow } from '@/types/purchase';

// ============================================================
// GET /api/purchases — List purchase orders
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_VIEW)) return apiForbidden();

    const params = request.nextUrl.searchParams;
    const status = params.get('status');
    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`po.status = $${idx}`);
      values.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM purchase_orders po ${whereClause}`,
      values
    );
    const total = Number(countResult?.count ?? 0);

    const rows = await query<PurchaseOrderRow>(
      `SELECT po.*, s.name as supplier_name, u.full_name as received_by_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN users u ON u.id = po.received_by
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return apiPaginated(rows.map(mapPurchaseOrderRow), { page, limit, total });
  } catch (error) {
    console.error('[PURCHASES] List error:', error);
    return apiInternal('Gagal mengambil data pembelian');
  }
}

// ============================================================
// POST /api/purchases — Create purchase order + receive goods
// Implements Moving Average Cost (MAC) for HPP calculation
//
// MAC Formula:
// new_buy_price = (old_stock * old_buy_price + new_qty * new_unit_cost)
//                 / (old_stock + new_qty)
// ============================================================

const PurchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Kuantitas harus lebih dari 0'),
  unitCost: z.number().int().min(0, 'Harga beli tidak boleh negatif'),
  expiredDate: z.string().nullable().optional(),
});

const CreatePurchaseSchema = z.object({
  supplierId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).transform(sanitizeString).nullable().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'Minimal 1 item'),
  autoReceive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreatePurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Generate PO number: PO-YYYYMMDD-XXXX
    const now = new Date();
    const datePrefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seqResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE po_number LIKE $1`,
      [`${datePrefix}%`]
    );
    const seq = String(Number(seqResult?.count ?? 0) + 1).padStart(4, '0');
    const poNumber = `${datePrefix}-${seq}`;

    // Calculate total
    const totalAmount = d.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    const result = await transaction(async (client) => {
      // Create PO header
      const poResult = await client.query(
        `INSERT INTO purchase_orders (po_number, supplier_id, received_by, status, total_amount, notes, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          poNumber,
          d.supplierId ?? null,
          d.autoReceive ? user.userId : null,
          d.autoReceive ? 'received' : 'draft',
          totalAmount,
          d.notes ?? null,
          d.autoReceive ? now.toISOString() : null,
        ]
      );
      const po = poResult.rows[0];

      // Insert items + apply MAC if autoReceive
      for (const item of d.items) {
        const productRow = await client.query(
          'SELECT id, name, buy_price, stock FROM products WHERE id = $1',
          [item.productId]
        );

        if (productRow.rows.length === 0) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        const product = productRow.rows[0];
        const subtotal = item.quantity * item.unitCost;

        // Insert PO item
        await client.query(
          `INSERT INTO purchase_order_items (po_id, product_id, product_name, quantity, unit_cost, subtotal, expired_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [po.id, item.productId, product.name, item.quantity, item.unitCost, subtotal, item.expiredDate ?? null]
        );

        if (d.autoReceive) {
          // ---- MOVING AVERAGE COST (MAC) CALCULATION ----
          const oldStock = Number(product.stock);
          const oldBuyPrice = Number(product.buy_price);
          const newQty = item.quantity;
          const newUnitCost = item.unitCost;

          let newBuyPrice: number;
          if (oldStock + newQty === 0) {
            newBuyPrice = newUnitCost;
          } else {
            // MAC = (oldStock * oldBuyPrice + newQty * newUnitCost) / (oldStock + newQty)
            newBuyPrice = Math.round(
              (oldStock * oldBuyPrice + newQty * newUnitCost) / (oldStock + newQty)
            );
          }
          const newStock = oldStock + newQty;

          // Update product: stock + buy_price (MAC) + expired_date
          const updateFields = [newBuyPrice, newStock, item.productId];
          let updateQuery = 'UPDATE products SET buy_price = $1, stock = $2';

          if (item.expiredDate) {
            updateQuery += ', expired_date = $4';
            updateFields.push(item.expiredDate as unknown as string);
          }

          updateQuery += ' WHERE id = $3';
          await client.query(updateQuery, updateFields);

          // Record inventory adjustment
          await client.query(
            `INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity_change, unit_cost, total_value, reference_type, reference_id, reason, adjusted_by)
             VALUES ($1, 'purchase', $2, $3, $4, 'purchase_order', $5, $6, $7)`,
            [item.productId, newQty, newUnitCost, subtotal, po.id,
             `Penerimaan barang PO ${poNumber}`, user.userId]
          );
        }
      }

      return po;
    });

    // Audit trail
    await auditLog(user, 'CREATE', 'purchase_order', result.id, {
      newValues: { poNumber, totalAmount, itemCount: d.items.length, autoReceive: d.autoReceive },
      description: `PO ${poNumber} dibuat${d.autoReceive ? ' dan diterima' : ''}`,
      request,
    });

    return apiCreated(mapPurchaseOrderRow(result));
  } catch (error) {
    console.error('[PURCHASES] Create error:', error);
    const message = error instanceof Error ? error.message : 'Gagal membuat pembelian';
    return apiInternal(message);
  }
}
