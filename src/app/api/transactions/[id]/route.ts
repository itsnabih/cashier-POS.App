import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiInternal, apiNotFound } from '@/lib/api-response';
import { mapTransactionItemRow, type TransactionItemRow } from '@/types/transaction';

// ============================================================
// GET /api/transactions/[id]
// Fetch items for a specific transaction
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Silakan login terlebih dahulu');
    }

    const { id } = await params;

    const rows = await query<TransactionItemRow>(
      'SELECT * FROM transaction_items WHERE transaction_id = $1 ORDER BY product_name ASC',
      [id]
    );

    if (!rows || rows.length === 0) {
      // It's possible the transaction has no items (data error) or transaction doesn't exist
      // We will just return an empty array if so, but usually a transaction has items
    }

    return apiSuccess(rows.map(mapTransactionItemRow));

  } catch (error) {
    console.error('[TRANSACTIONS_API] Failed to fetch transaction items:', error);
    return apiInternal('Terjadi kesalahan saat memuat detail transaksi');
  }
}
