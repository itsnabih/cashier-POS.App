import { useEffect } from 'react';
import { type POSCart } from '@/types/pos';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

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

export function ReceiptModal({ isOpen, onClose, transaction, storeName = 'BabyPOS' }: ReceiptModalProps) {
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
      handler: onClose, // also close on enter to quickly move to next customer
    }
  ]);

  if (!isOpen || !transaction) return null;

  const { cart, receiptNumber, timestamp, paymentMethod, paymentAmount, changeAmount, cashierName } = transaction;

  const formatRupiah = (val: number) => {
    return (val / 100).toLocaleString('id-ID');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMethodName = (m: string) => {
    switch (m) {
      case 'cash': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'transfer': return 'Transfer';
      default: return m;
    }
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
          {/* This inner div mimics the printed receipt visually */}
          <div className="bg-white w-[80mm] min-h-[100mm] p-4 shadow-sm border border-slate-200" style={{ fontFamily: 'monospace' }}>
            <ReceiptContent 
              storeName={storeName} 
              receiptNumber={receiptNumber} 
              timestamp={timestamp} 
              cart={cart} 
              paymentMethod={paymentMethod} 
              paymentAmount={paymentAmount} 
              changeAmount={changeAmount} 
              cashierName={cashierName}
              formatRupiah={formatRupiah} 
              formatDate={formatDate} 
              getMethodName={getMethodName} 
            />
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
      <div className="hidden print:block w-[80mm] text-black bg-white" style={{ fontFamily: 'monospace' }}>
        <ReceiptContent 
          storeName={storeName} 
          receiptNumber={receiptNumber} 
          timestamp={timestamp} 
          cart={cart} 
          paymentMethod={paymentMethod} 
          paymentAmount={paymentAmount} 
          changeAmount={changeAmount}
          cashierName={cashierName}
          formatRupiah={formatRupiah} 
          formatDate={formatDate} 
          getMethodName={getMethodName} 
        />
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

interface ReceiptContentProps {
  storeName: string;
  receiptNumber: string;
  timestamp: Date;
  cart: POSCart;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
  cashierName: string;
  formatRupiah: (v: number) => string;
  formatDate: (d: Date) => string;
  getMethodName: (m: string) => string;
}

function ReceiptContent({ storeName, receiptNumber, timestamp, cart, paymentMethod, paymentAmount, changeAmount, cashierName, formatRupiah, formatDate, getMethodName }: ReceiptContentProps) {
  return (
    <div className="text-xs leading-tight">
      <div className="text-center mb-4">
        <h1 className="text-base font-bold mb-1">{storeName}</h1>
        <p>Struk Pembelian</p>
      </div>

      <div className="mb-3">
        <p>No   : {receiptNumber}</p>
        <p>Tgl  : {formatDate(timestamp)}</p>
        <p>Kasir: {cashierName}</p>
      </div>

      <div className="border-t border-b border-dashed border-black py-2 mb-2 space-y-2">
        {cart.items.map((item, idx) => {
          const itemSubtotal = (item.originalPrice * item.quantity) - (item.discount * item.quantity);
          return (
            <div key={idx}>
              <div className="font-semibold">{item.name}</div>
              <div className="flex justify-between mt-1">
                <div>
                  {item.quantity} x {formatRupiah(item.originalPrice)}
                  {item.discount > 0 && ` (-${formatRupiah(item.discount)})`}
                </div>
                <div>{formatRupiah(itemSubtotal)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1 mt-3">
        {cart.discount > 0 && (
          <div className="flex justify-between text-black">
            <span>Diskon:</span>
            <span>-{formatRupiah(cart.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>Total:</span>
          <span>{formatRupiah(cart.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar ({getMethodName(paymentMethod)}):</span>
          <span>{formatRupiah(paymentAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kembali:</span>
          <span>{formatRupiah(changeAmount)}</span>
        </div>
      </div>

      <div className="text-center mt-6 text-[10px]">
        <p>Terima Kasih</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
      </div>
    </div>
  );
}
