'use client';

import { useState, useEffect, useCallback } from 'react';
import { PosLayout } from '@/components/pos/PosLayout';
import { TabNavigation } from '@/components/pos/TabNavigation';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { usePOS } from '@/hooks/usePOS';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useToast } from '@/hooks/useToast';
import { useCatalogSync } from '@/hooks/useCatalogSync';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { saveTransactionLocally, syncPendingTransactions } from '@/lib/transaction-sync';

export default function PosPage() {
  const pos = usePOS();
  const { addToast } = useToast();
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const { isOnline, searchOfflineProducts } = useCatalogSync();

  // ---- Auto-sync pending transactions when online ----
  useEffect(() => {
    if (!isOnline) return;

    // Sync on reconnect
    syncPendingTransactions().then((result) => {
      if (result.synced > 0) {
        addToast(`${result.synced} transaksi offline berhasil disinkronkan`, 'success');
      }
    });

    // Periodic sync every 30 seconds
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const result = await syncPendingTransactions();
        if (result.synced > 0) {
          addToast(`${result.synced} transaksi offline berhasil disinkronkan`, 'success');
        }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [isOnline, addToast]);

  // ---- Listen for SW sync trigger ----
  useEffect(() => {
    const handleSWSync = () => {
      syncPendingTransactions().then((result) => {
        if (result.synced > 0) {
          addToast(`${result.synced} transaksi offline berhasil disinkronkan`, 'success');
        }
      });
    };

    window.addEventListener('sw-sync-transactions', handleSWSync);
    return () => window.removeEventListener('sw-sync-transactions', handleSWSync);
  }, [addToast]);

  // ---- Barcode Scanner ----
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    // Search for product by barcode in local DB first, then API
    try {
      const offlineResults = await searchOfflineProducts(barcode);
      const matched = offlineResults.find(p => p.barcode === barcode);

      if (matched) {
        pos.addToCart(matched);
        addToast(`Scan: ${matched.name}`, 'success');
      } else {
        // Try API as fallback
        const res = await fetch(`/api/products?search=${encodeURIComponent(barcode)}&limit=1`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const product = data.data.find((p: any) => p.barcode === barcode) || data.data[0];
          pos.addToCart(product);
          addToast(`Scan: ${product.name}`, 'success');
        } else {
          addToast(`Barcode "${barcode}" tidak ditemukan`, 'error');
        }
      }
    } catch {
      addToast(`Gagal mencari barcode "${barcode}"`, 'error');
    }
  }, [searchOfflineProducts, pos, addToast]);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 4,
  });

  // ---- Global Keyboard Shortcuts ----
  useKeyboardShortcut([
    { options: { key: 'F1', preventDefault: true }, handler: () => pos.switchTab(0) },
    { options: { key: 'F2', preventDefault: true }, handler: () => pos.switchTab(1) },
    { options: { key: 'F3', preventDefault: true }, handler: () => pos.switchTab(2) },
    { options: { key: 'F4', preventDefault: true }, handler: () => pos.switchTab(3) },
    { options: { key: 'F5', preventDefault: true }, handler: () => pos.switchTab(4) },
    {
      options: { key: 'F12', preventDefault: true },
      handler: () => {
        if (pos.currentCart.items.length > 0 && !isPaymentModalOpen) {
          setPaymentModalOpen(true);
        }
      },
    },
    // Space also opens payment IF no input is focused
    {
      options: { key: ' ', preventDefault: true },
      handler: (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          if (pos.currentCart.items.length > 0 && !isPaymentModalOpen) {
            setPaymentModalOpen(true);
          }
        }
      },
    },
    // Shift+Delete to clear cart
    {
      options: { key: 'Delete', shiftKey: true, preventDefault: true },
      handler: () => {
        if (pos.currentCart.items.length > 0 && !isPaymentModalOpen) {
          if (window.confirm('Yakin ingin mengosongkan keranjang di tab ini?')) {
            pos.clearCurrentTab();
          }
        }
      },
    },
  ]);

  // ---- Payment Handler (online/offline aware) ----
  const handleProcessPayment = async (method: 'cash' | 'qris' | 'transfer' | 'bon', amount: number, notes: string) => {
    const cart = pos.currentCart;

    const payload = {
      items: cart.items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        productSku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        subtotal: item.unitPrice * item.quantity,
      })),
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      paymentMethod: method,
      paymentAmount: amount,
      changeAmount: Math.max(0, amount - cart.total),
      notes,
    };

    try {
      if (navigator.onLine) {
        // Try to save directly to server
        const res = await fetch('/api/sync/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error('Server error');
        }

        addToast('Transaksi berhasil disimpan!', 'success');
      } else {
        // Save locally for later sync
        const receiptNo = await saveTransactionLocally(payload);
        addToast(`Transaksi tersimpan offline (${receiptNo}). Akan sinkron saat online.`, 'info');
      }

      setPaymentModalOpen(false);
      pos.clearCurrentTab();
    } catch {
      // Network failed — fallback to offline
      try {
        const receiptNo = await saveTransactionLocally(payload);
        addToast(`Koneksi gagal. Transaksi tersimpan offline (${receiptNo}).`, 'info');
        setPaymentModalOpen(false);
        pos.clearCurrentTab();
      } catch (err: any) {
        addToast(err.message || 'Gagal memproses transaksi', 'error');
      }
    }
  };

  return (
    <>
      <PosLayout
        leftContent={
          <div className="flex flex-col h-full">
            <TabNavigation
              activeTab={pos.activeTab}
              onSwitchTab={pos.switchTab}
              tabItemCounts={pos.tabs.map(t => t.items.length)}
            />
            <div className="flex-1 overflow-hidden relative">
              <ProductSearch
                onAddProduct={pos.addToCart}
                isOnline={isOnline}
                searchOffline={searchOfflineProducts}
              />
            </div>
          </div>
        }
        rightContent={
          <CartPanel
            cart={pos.currentCart}
            onUpdateQuantity={pos.updateQuantity}
            onRemoveItem={pos.removeFromCart}
            onClearCart={pos.clearCurrentTab}
            onPay={() => setPaymentModalOpen(true)}
          />
        }
      />

      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          cart={pos.currentCart}
          onProcessPayment={handleProcessPayment}
        />
      )}
    </>
  );
}
