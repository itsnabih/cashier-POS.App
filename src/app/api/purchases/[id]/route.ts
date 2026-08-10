import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne, transaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString } from '@/lib/sanitize';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiForbidden, apiNotFound, apiInternal } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type PurchaseOrderRow, mapPurchaseOrderRow, type PurchaseOrderItemRow, mapPurchaseOrderItemRow } from '@/types/purchase';

// ============================================================
// GET /api/purchases/[id] — Fetch single PO details & items
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_VIEW)) return apiForbidden();

    const { id } = await params;

    const poRow = await queryOne<PurchaseOrderRow>(
      `SELECT po.*, u.full_name as received_by_name
       FROM purchase_orders po
       LEFT JOIN users u ON u.id = po.received_by
       WHERE po.id = $1`,
      [id]
    );

    if (!poRow) return apiNotFound('Data barang masuk tidak ditemukan');

    const itemRows = await query<PurchaseOrderItemRow>(
      `SELECT * FROM purchase_order_items WHERE po_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    const po = mapPurchaseOrderRow(poRow);
    po.items = itemRows.map(mapPurchaseOrderItemRow);

    return apiSuccess(po);
  } catch (error) {
    console.error('[PURCHASES] GET detail error:', error);
    return apiInternal('Gagal mengambil detail barang masuk');
  }
}

// ============================================================
// PUT /api/purchases/[id] — Update PO header (Catatan, Sumber, No Ref)
// ============================================================
const UpdatePurchaseSchema = z.object({
  source: z.string().max(255).transform(sanitizeString).nullable().optional(),
  referenceNumber: z.string().max(100).transform(sanitizeString).nullable().optional(),
  notes: z.string().max(500).transform(sanitizeString).nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_CREATE)) return apiForbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdatePurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    const existing = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM purchase_orders WHERE id = $1',
      [id]
    );

    if (!existing) return apiNotFound('Data barang masuk tidak ditemukan');
    if (existing.status === 'cancelled') {
      return apiBadRequest('Data pembelian yang sudah dibatalkan tidak dapat diubah');
    }

    const updated = await queryOne<PurchaseOrderRow>(
      `UPDATE purchase_orders
       SET source = $1, reference_number = $2, notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [d.source ?? null, d.referenceNumber ?? null, d.notes ?? null, id]
    );

    if (!updated) return apiInternal('Gagal memperbarui data pembelian');

    await auditLog(user, 'UPDATE', 'purchase_order', id, {
      newValues: { source: d.source, referenceNumber: d.referenceNumber, notes: d.notes },
      description: `Memperbarui info barang masuk ${updated.po_number}`,
      request,
    });

    return apiSuccess(mapPurchaseOrderRow(updated));
  } catch (error) {
    console.error('[PURCHASES] PUT update error:', error);
    return apiInternal('Gagal mengupdate data barang masuk');
  }
}

// ============================================================
// DELETE /api/purchases/[id] — Hapus / Batalkan Barang Masuk
// Reverts product stock and associated product_batches
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_CREATE)) return apiForbidden();

    const { id } = await params;

    const poRow = await queryOne<{ id: string; po_number: string; status: string }>(
      'SELECT id, po_number, status FROM purchase_orders WHERE id = $1',
      [id]
    );

    if (!poRow) return apiNotFound('Data barang masuk tidak ditemukan');
    if (poRow.status === 'cancelled') {
      return apiBadRequest('Data pembelian sudah dibatalkan sebelumnya');
    }

    await transaction(async (client) => {
      // 1. Fetch all items in this PO
      const itemRows = await client.query<{ product_id: string; quantity: number; unit_cost: number; batch_id: string | null }>(
        'SELECT product_id, quantity, unit_cost, batch_id FROM purchase_order_items WHERE po_id = $1',
        [id]
      );

      // 2. Revert stock & batches for each item
      for (const item of itemRows.rows) {
        // Decrease product stock
        await client.query(
          `UPDATE products 
           SET stock = GREATEST(0, stock - $1), updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );

        // Delete/deplete product_batches linked to this PO
        if (item.batch_id) {
          await client.query(
            `UPDATE product_batches 
             SET quantity_remaining = 0, status = 'depleted', updated_at = NOW()
             WHERE id = $1`,
            [item.batch_id]
          );
        } else {
          await client.query(
            `UPDATE product_batches 
             SET quantity_remaining = 0, status = 'depleted', updated_at = NOW()
             WHERE po_id = $1 AND product_id = $2`,
            [id, item.product_id]
          );
        }

        // Record inventory adjustment for stock deduction
        await client.query(
          `INSERT INTO inventory_adjustments (
            product_id, adjustment_type, quantity_change, unit_cost, total_value, 
            reference_type, reference_id, reason, adjusted_by
           )
           VALUES ($1, 'correction', $2, $3, $4, 'purchase_order', $5, $6, $7)`,
          [
            item.product_id,
            -item.quantity,
            item.unit_cost,
            item.quantity * item.unit_cost,
            id,
            `Pembatalan/Hapus Barang Masuk ${poRow.po_number}`,
            user.userId,
          ]
        );
      }

      // 3. Mark PO as cancelled
      await client.query(
        `UPDATE purchase_orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id]
      );
    });

    await auditLog(user, 'DELETE', 'purchase_order', id, {
      description: `Membatalkan/Menghapus penerimaan barang masuk ${poRow.po_number}`,
      request,
    });

    return apiSuccess({ message: `Pembelian ${poRow.po_number} berhasil dibatalkan` });
  } catch (error) {
    console.error('[PURCHASES] DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Gagal menghapus barang masuk';
    return apiInternal(message);
  }
}
