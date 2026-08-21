import { useState, useEffect } from 'react';
import { type POSCart } from '@/types/pos';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { ReceiptContent, type ReceiptItem } from '@/components/pos/ReceiptContent';
import { exportReceiptPDF } from '@/utils/export-pdf';
import { Printer, FileText, X } from 'lucide-react';

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

  const totalDiscount = cart.items.reduce((sum, item) => sum + (item.discount * item.quantity), 0) + (cart.manualCartDiscount || 0);

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

  const handleDownloadPDF = () => {
    exportReceiptPDF({
      ...receiptProps,
      isVoided: false,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-transparent print:p-0 print:backdrop-blur-none print:items-start print:justify-start">
      
      {/* Modal Container (Hidden in print) */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in border border-slate-200 print:hidden relative">
        <div className="p-4 bg-white border-b flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Transaksi Berhasil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-6 bg-slate-100 overflow-y-auto max-h-[60vh] flex justify-center">
          <div className="bg-white w-[80mm] min-h-[100mm] p-4 shadow-md rounded border border-slate-200">
            <ReceiptContent {...receiptProps} />
          </div>
        </div>

        <div className="p-4 bg-white border-t flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 px-3 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-brand-blue-dark transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 py-2.5 px-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Unduh PDF (A4)</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors mt-1"
          >
            Selesai (Enter)
          </button>
        </div>
      </div>

      {/* Actual Print Content (Visible only in print mode) */}
      <div className="hidden print:block w-[78mm] max-w-[78mm] text-black bg-white p-2 mx-auto">
        <ReceiptContent {...receiptProps} />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print\\:block, .print\\:block * {
            visibility: visible !important;
          }
          .print\\:block {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            margin: 0 auto !important;
            padding: 2mm !important;
            width: 78mm !important;
            max-width: 78mm !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
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
