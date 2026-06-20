// ============================================================
// Transaction Sync Engine
//
// Handles saving transactions locally (IndexedDB) and syncing
// them to PostgreSQL when the network is available.
// ============================================================

import {
  offlineDb,
  type PendingTransaction,
  type PendingTransactionItem,
} from './offline-db';

// ---- Types ----

export interface TransactionPayload {
  items: PendingTransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'qris' | 'transfer' | 'bon';
  paymentAmount: number;
  changeAmount: number;
  notes: string;
}

// ---- Receipt Number Generator ----

function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TX-${date}-${time}-${rand}`;
}

// ---- Save Transaction Locally ----

/**
 * Save a transaction to IndexedDB pending queue.
 * Returns the local receipt number.
 */
export async function saveTransactionLocally(
  payload: TransactionPayload
): Promise<string> {
  const receiptNumber = generateReceiptNumber();

  const record: PendingTransaction = {
    receiptNumber,
    items: payload.items,
    subtotal: payload.subtotal,
    discount: payload.discount,
    total: payload.total,
    paymentMethod: payload.paymentMethod,
    paymentAmount: payload.paymentAmount,
    changeAmount: payload.changeAmount,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    syncError: null,
    syncAttempts: 0,
    serverTransactionId: null,
  };

  await offlineDb.pendingTransactions.add(record);
  return receiptNumber;
}

// ---- Sync Pending Transactions ----

const MAX_RETRY = 3;

/**
 * Attempt to sync all pending/failed transactions to the server.
 * Returns the number of successfully synced transactions.
 */
export async function syncPendingTransactions(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const pending = await offlineDb.pendingTransactions
    .where('syncStatus')
    .anyOf('pending', 'failed')
    .toArray();

  let synced = 0;
  let failed = 0;

  for (const tx of pending) {
    if (tx.syncAttempts >= MAX_RETRY) {
      // Permanently failed — skip but count
      failed++;
      continue;
    }

    // Mark as syncing
    await offlineDb.pendingTransactions.update(tx.localId!, {
      syncStatus: 'syncing',
    });

    try {
      const res = await fetch('/api/sync/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber: tx.receiptNumber,
          items: tx.items,
          subtotal: tx.subtotal,
          discount: tx.discount,
          total: tx.total,
          paymentMethod: tx.paymentMethod,
          paymentAmount: tx.paymentAmount,
          changeAmount: tx.changeAmount,
          notes: tx.notes,
          createdAt: tx.createdAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      await offlineDb.pendingTransactions.update(tx.localId!, {
        syncStatus: 'synced',
        serverTransactionId: data.data?.id || null,
        syncError: null,
      });

      synced++;
    } catch (err: any) {
      await offlineDb.pendingTransactions.update(tx.localId!, {
        syncStatus: 'failed',
        syncAttempts: (tx.syncAttempts || 0) + 1,
        syncError: err.message || 'Unknown error',
      });
      failed++;
    }
  }

  const remaining = await offlineDb.pendingTransactions
    .where('syncStatus')
    .anyOf('pending', 'failed')
    .count();

  return { synced, failed, remaining };
}

/**
 * Get all pending transactions for display/debugging.
 */
export async function getAllPendingTransactions(): Promise<PendingTransaction[]> {
  return offlineDb.pendingTransactions
    .where('syncStatus')
    .anyOf('pending', 'failed', 'syncing')
    .toArray();
}
