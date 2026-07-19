import { NextRequest } from 'next/server';
import { transaction as dbTransaction, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiForbidden, apiBadRequest, apiInternal, apiNotFound } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import type { TransactionRow, TransactionItemRow } from '@/types/transaction';
import { z } from 'zod';
import { sanitizeString } from '@/lib/sanitize';

// ============================================================
// POST /api/transactions/[id]/void
// Void a transaction, restock items, and log audit
// ACCESS: OWNER ONLY
// ============================================================

const VoidSchema = z.object({
  reason: z.string().min(3, 'Alasan wajib diisi minimal 3 karakter').transform(sanitizeString),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Silakan login terlebih dahulu');
    }

    // Explicit check for owner only (user feedback: "void hanya untuk owner")
    if (user.role !== 'owner') {
      return apiForbidden('Hanya Owner yang diizinkan membatalkan transaksi');
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = VoidSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const reason = parsed.data.reason;

    // Use a DB transaction to ensure atomicity
    await dbTransaction(async (client) => {
      // 1. Fetch current transaction (FOR UPDATE to lock the row)
      const trxResult = await client.query<TransactionRow>(
        'SELECT * FROM transactions WHERE id = $1 FOR UPDATE',
        [id]
      );
      
      const trx = trxResult.rows[0];
      if (!trx) {
        throw new Error('NOT_FOUND');
      }

      if (trx.status === 'voided') {
        throw new Error('ALREADY_VOIDED');
      }

      // 2. Fetch all items
      const itemsResult = await client.query<TransactionItemRow>(
        'SELECT * FROM transaction_items WHERE transaction_id = $1',
        [id]
      );
      const items = itemsResult.rows;

      // 3. Restock items
      for (const item of items) {
        if (item.product_id) {
          // Add back the quantity to the product stock
          await client.query(
            'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      // 4. Update transaction status
      await client.query(
        `UPDATE transactions 
         SET status = 'voided', voided_by = $1, voided_at = NOW(), void_reason = $2 
         WHERE id = $3`,
        [user.userId, reason, id]
      );

      // 5. Audit Log
      // Since audit_logs uses its own query function which gets a connection from pool,
      // it might not be strictly within the same client transaction, but it's safe enough.
      // To be perfectly atomic we should insert using `client`, but `query` from `auditLog` 
      // is acceptable as fire-and-forget. Let's do a direct insert with `client` for true atomicity.
      
      const requestIp = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
      const userAgent = request.headers.get('user-agent') ?? null;

      await client.query(
        `INSERT INTO audit_logs
          (user_id, username, user_role, action, entity_type, entity_id,
           old_values, new_values, ip_address, user_agent, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          user.userId,
          user.username,
          user.role,
          'VOID',
          'transaction',
          trx.id,
          JSON.stringify({ status: trx.status }), // Old
          JSON.stringify({ status: 'voided', void_reason: reason }), // New
          requestIp,
          userAgent,
          `Membatalkan struk ${trx.receipt_number}: ${reason}`
        ]
      );
    });

    return apiSuccess({ message: 'Transaksi berhasil dibatalkan dan stok dikembalikan' });

  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return apiNotFound('Transaksi tidak ditemukan');
    }
    if (error.message === 'ALREADY_VOIDED') {
      return apiBadRequest('Transaksi ini sudah dibatalkan sebelumnya');
    }
    
    console.error('[TRANSACTIONS_API] Failed to void transaction:', error);
    return apiInternal('Terjadi kesalahan saat membatalkan transaksi');
  }
}
