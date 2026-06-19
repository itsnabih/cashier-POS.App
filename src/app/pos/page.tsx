'use client';

import { useState } from 'react';
import { PosLayout } from '@/components/pos/PosLayout';
import { TabNavigation } from '@/components/pos/TabNavigation';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { usePOS } from '@/hooks/usePOS';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useToast } from '@/hooks/useToast';

export default function PosPage() {
  const pos = usePOS();
  const { addToast } = useToast();
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);

  // Global Keyboard Shortcuts
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

  const handleProcessPayment = async (method: 'cash' | 'qris' | 'transfer' | 'bon', amount: number, notes: string) => {
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));

      addToast('Transaksi berhasil disimpan!', 'success');
      setPaymentModalOpen(false);
      pos.clearCurrentTab();
    } catch (err: any) {
      addToast(err.message || 'Gagal memproses transaksi', 'error');
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
              <ProductSearch onAddProduct={pos.addToCart} />
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
