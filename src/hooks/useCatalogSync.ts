// ============================================================
// Catalog Sync Hook
//
// Manages product catalog synchronization between server (API)
// and local IndexedDB. Falls back to local data when offline.
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDb, setSyncMeta, getSyncMeta, type OfflineProduct } from '@/lib/offline-db';
import { type ProductCashierView } from '@/types/product';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useCatalogSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ---- Online/Offline detection ----
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ---- Sync catalog from server to IndexedDB ----
  const syncCatalog = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);

    try {
      const res = await fetch('/api/products?limit=9999');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) return;

      const products: OfflineProduct[] = data.data.map((p: ProductCashierView) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        sellPrice: p.sellPrice,
        stock: p.stock,
        unit: p.unit,
        categoryId: p.categoryId,
        isActive: p.isActive,
        lastSynced: Date.now(),
      }));

      // Bulk replace: clear then add
      await offlineDb.transaction('rw', offlineDb.products, async () => {
        await offlineDb.products.clear();
        await offlineDb.products.bulkAdd(products);
      });

      const now = new Date().toISOString();
      await setSyncMeta('catalog_last_synced', now);
      setLastSynced(now);
    } catch (err) {
      console.error('[CatalogSync] Failed to sync catalog:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---- Initial sync + interval ----
  useEffect(() => {
    // Load last synced time
    getSyncMeta('catalog_last_synced').then(setLastSynced);

    // Sync immediately on mount
    syncCatalog();

    // Set up periodic sync
    intervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        syncCatalog();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncCatalog]);

  // ---- Sync when coming back online ----
  useEffect(() => {
    if (isOnline) {
      syncCatalog();
    }
  }, [isOnline, syncCatalog]);

  // ---- Search products from IndexedDB (for offline use) ----
  const searchOfflineProducts = useCallback(async (query: string): Promise<ProductCashierView[]> => {
    let results: OfflineProduct[];

    if (!query || query.trim() === '') {
      results = await offlineDb.products
        .where('isActive')
        .equals(1 as any) // Dexie stores booleans as 0/1
        .limit(20)
        .toArray();

      // Fallback: if indexed boolean query fails, get all and filter
      if (results.length === 0) {
        results = await offlineDb.products.limit(20).toArray();
        results = results.filter(p => p.isActive);
      }
    } else {
      const q = query.toLowerCase();
      // Search by name, SKU, or barcode
      const all = await offlineDb.products.toArray();
      results = all
        .filter(p =>
          p.isActive &&
          (p.name.toLowerCase().includes(q) ||
           (p.sku && p.sku.toLowerCase().includes(q)) ||
           (p.barcode && p.barcode.includes(q)))
        )
        .slice(0, 20);
    }

    // Map to ProductCashierView
    return results.map(p => ({
      id: p.id,
      categoryId: p.categoryId,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: null,
      sellPrice: p.sellPrice,
      stock: p.stock,
      minStock: 0,
      unit: p.unit,
      imageUrl: null,
      isActive: p.isActive,
      expiredDate: null,
      createdAt: '',
      updatedAt: '',
    }));
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSynced,
    syncCatalog,
    searchOfflineProducts,
  };
}
