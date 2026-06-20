import { NextRequest } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { apiSuccess, apiForbidden, apiBadRequest, apiInternal } from '@/lib/api-response';
import pool from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { z } from 'zod/v4';

// ============================================================
// POST /api/sync/transactions
//
// Receives a single offline transaction from POS and persists
// it to PostgreSQL. Called by the transaction sync engine.
// ============================================================

const transactionItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(1),
  productSku: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
});

const syncTransactionSchema = z.object({
  receiptNumber: z.string().min(1),
  items: z.array(transactionItemSchema).min(1),
  subtotal: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  paymentMethod: z.enum(['cash', 'qris', 'transfer', 'bon']),
  paymentAmount: z.number().int().nonnegative(),
  changeAmount: z.number().int().nonnegative(),
  notes: z.string().default(''),
  createdAt: z.string().optional(), // ISO string from client
});

export async function POST(request: NextRequest) {
  try {
    // ---- Auth ----
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return apiForbidden('Autentikasi diperlukan');
    }

    if (!hasPermission(user.role, PERMISSIONS.TRANSACTION_CREATE)) {
      return apiForbidden('Anda tidak memiliki akses untuk membuat transaksi');
    }

    // ---- Validate ----
    const body = await request.json();
    const parsed = syncTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Data transaksi tidak valid');
    }

    const data = parsed.data;

    // ---- Insert in a single DB transaction ----
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Insert transaction
      const txResult = await client.query(
        `INSERT INTO transactions (
          receipt_number, cashier_id, subtotal, discount, tax, total,
          payment_method, payment_amount, change_amount, status, notes,
          synced_from, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, receipt_number`,
        [
          data.receiptNumber,
          user.userId,
          data.subtotal,
          data.discount,
          0, // tax
          data.total,
          data.paymentMethod,
          data.paymentAmount,
          data.changeAmount,
          'completed',
          data.notes || null,
          'offline-pwa', // synced_from marker
          data.createdAt || new Date().toISOString(),
        ]
      );

      const transactionId = txResult.rows[0].id;

      // 2. Insert transaction items
      for (const item of data.items) {
        await client.query(
          `INSERT INTO transaction_items (
            transaction_id, product_id, product_name, product_sku,
            quantity, unit_price, discount, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            transactionId,
            item.productId,
            item.productName,
            item.productSku,
            item.quantity,
            item.unitPrice,
            item.discount,
            item.subtotal,
          ]
        );

        // 3. Decrease product stock
        await client.query(
          `UPDATE products SET stock = stock - $1, updated_at = NOW()
           WHERE id = $2 AND stock >= $1`,
          [item.quantity, item.productId]
        );
      }

      await client.query('COMMIT');

      // 4. Audit log
      await auditLog({
        userId: user.userId,
        username: user.username,
        role: user.role,
        action: 'CREATE',
        entity: 'transaction',
        entityId: transactionId,
        newValues: {
          receiptNumber: data.receiptNumber,
          total: data.total,
          paymentMethod: data.paymentMethod,
          syncedFrom: 'offline-pwa',
          itemCount: data.items.length,
        },
        request,
      });

      return apiSuccess({
        id: transactionId,
        receiptNumber: txResult.rows[0].receipt_number,
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[SYNC] Transaction sync error:', error);
    return apiInternal('Gagal menyimpan transaksi: ' + (error.message || ''));
  }
}
