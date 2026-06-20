// ============================================================
// Offline Database (Dexie.js / IndexedDB)
//
// Tables:
// - products: local product catalog cache
// - pendingTransactions: offline transaction queue
// - syncMeta: metadata for last sync timestamps
// ============================================================

import Dexie, { type EntityTable } from 'dexie';

// ---- Schema Interfaces ----

export interface OfflineProduct {
  id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  sellPrice: number;
  stock: number;
  unit: string;
  categoryId: string | null;
  isActive: boolean;
  lastSynced: number; // Date.now()
}

export interface PendingTransactionItem {
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface PendingTransaction {
  localId?: number; // auto-increment
  receiptNumber: string;
  items: PendingTransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'qris' | 'transfer' | 'bon';
  paymentAmount: number;
  changeAmount: number;
  notes: string;
  createdAt: string; // ISO string
  syncStatus: 'pending' | 'syncing' | 'failed' | 'synced';
  syncError: string | null;
  syncAttempts: number;
  serverTransactionId: string | null;
}

export interface SyncMeta {
  key: string;
  value: string;
  updatedAt: number;
}

// ---- Dexie Instance ----

class BabyPosDB extends Dexie {
  products!: EntityTable<OfflineProduct, 'id'>;
  pendingTransactions!: EntityTable<PendingTransaction, 'localId'>;
  syncMeta!: EntityTable<SyncMeta, 'key'>;

  constructor() {
    super('babypos-offline');

    this.version(1).stores({
      // Indexed fields only (Dexie stores all fields automatically)
      products: 'id, sku, barcode, name, categoryId, isActive',
      pendingTransactions: '++localId, syncStatus, createdAt',
      syncMeta: 'key',
    });
  }
}

// Singleton instance
export const offlineDb = new BabyPosDB();

// ---- Helper Functions ----

/**
 * Get a sync metadata value.
 */
export async function getSyncMeta(key: string): Promise<string | null> {
  const record = await offlineDb.syncMeta.get(key);
  return record?.value ?? null;
}

/**
 * Set a sync metadata value.
 */
export async function setSyncMeta(key: string, value: string): Promise<void> {
  await offlineDb.syncMeta.put({ key, value, updatedAt: Date.now() });
}

/**
 * Get the count of pending (unsynced) transactions.
 */
export async function getPendingCount(): Promise<number> {
  return offlineDb.pendingTransactions
    .where('syncStatus')
    .anyOf('pending', 'failed')
    .count();
}

/**
 * Clear all cached products (before full re-sync).
 */
export async function clearProductCache(): Promise<void> {
  await offlineDb.products.clear();
}
