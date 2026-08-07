import { useState, useEffect } from 'react';
import { type POSCart } from '@/types/pos';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { ReceiptContent, type ReceiptItem } from '@/components/pos/ReceiptContent';

export interface CompletedTransaction {
  receiptNumber: string;
  timestamp: Date;
  cart: POSCart;
  paymentMethod: 'cash' | 'qris' | 'transfer';
  paymentAmount: number;
  changeAmount: number;
  cashierName: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: CompletedTransaction | null;
  storeName?: string;
}

export function ReceiptModal({ isOpen, onClose, transaction, storeName: propStoreName }: ReceiptModalProps) {
  const [storeSettings, setStoreSettings] = useState({
    storeName: propStoreName || 'Sumber Baby Shop',
    storeAddress: 'Jl. Raya Bayi No. 123, Kota Balita',
    storePhone: '0812-3456-7890',
    footerTitle: 'TERIMA KASIH',
    footerSub: 'SELAMAT BELANJA KEMBALI',
  });

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const s = data.data;
            setStoreSettings({
              storeName: s['store.name'] || propStoreName || 'Sumber Baby Shop',
              storeAddress: s['store.address'] || 'Jl. Raya Bayi No. 123, Kota Balita',
              storePhone: s['store.phone'] || '0812-3456-7890',
              footerTitle: s['receipt.footer_title'] || 'TERIMA KASIH',
              footerSub: s['receipt.footer_sub'] || 'SELAMAT BELANJA KEMBALI',
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, propStoreName]);

  useKeyboardShortcut([
    {
      options: { key: 'Escape', enabled: isOpen },
      handler: onClose,
    },
    {
      options: { key: 'p', ctrlKey: true, preventDefault: true, enabled: isOpen },
      handler: () => window.print(),
    },
    {
      options: { key: 'Enter', enabled: isOpen },
      handler: onClose,
    }
  ]);

  if (!isOpen || !transaction) return null;

  const { cart, receiptNumber, timestamp, paymentAmount, changeAmount, cashierName } = transaction;

  const items: ReceiptItem[] = cart.items.map(item => {
    const itemSubtotal = (item.originalPrice * item.quantity) - (item.discount * item.quantity);
    return {
      name: item.name,
      price: item.originalPrice,
      quantity: item.quantity,
      discount: item.discount,
      subtotal: itemSubtotal,
    };
  });

  const totalDiscount = cart.items.reduce((sum, item) => sum + (item.discount * item.quantity), 0) + (cart.discount || 0);

  const receiptProps = {
    storeName: storeSettings.storeName,
    storeAddress: storeSettings.storeAddress,
    storePhone: storeSettings.storePhone,
    receiptNumber,
    cashierName,
    timestamp,
    items,
    subtotal: cart.subtotal,
    totalDiscount,
    totalNett: cart.total,
    paymentAmount,
    changeAmount,
    footerTitle: storeSettings.footerTitle,
    footerSub: storeSettings.footerSub,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-transparent print:p-0 print:backdrop-blur-none print:items-start print:justify-start">
      
      {/* Modal Container (Hidden in print) */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-scale-in border border-slate-200 print:hidden relative">
        <div className="p-4 bg-white border-b flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Transaksi Berhasil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
            ✕
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-6 bg-slate-100 overflow-y-auto max-h-[60vh] flex justify-center">
          <div className="bg-white w-[80mm] min-h-[100mm] p-4 shadow-md rounded border border-slate-200">
            <ReceiptContent {...receiptProps} />
          </div>
        </div>

        <div className="p-4 bg-white border-t flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-brand-blue text-white font-bold rounded-lg hover:bg-brand-blue-dark transition-colors flex items-center justify-center gap-2"
          >
            🖨️ Cetak Struk (Ctrl+P)
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Selesai (Enter)
          </button>
        </div>
      </div>

      {/* Actual Print Content (Visible only in print mode) */}
      <div className="hidden print:block w-[80mm] text-black bg-white p-2">
        <ReceiptContent {...receiptProps} />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}} />
    </div>
  );
}
