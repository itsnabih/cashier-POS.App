import { useState, useEffect, useRef } from 'react';
import { type POSCart } from '@/types/pos';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: POSCart;
  onProcessPayment: (method: 'cash' | 'qris' | 'transfer' | 'bon', amount: number, notes: string) => Promise<void>;
}

const QUICK_AMOUNTS = [1000000, 2000000, 5000000, 10000000]; // in cents (Rp 10.000, 20.000, 50.000, 100.000)

export function PaymentModal({ isOpen, onClose, cart, onProcessPayment }: PaymentModalProps) {
  const [method, setMethod] = useState<'cash' | 'qris' | 'transfer' | 'bon'>('cash');
  const [cashAmountStr, setCashAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setCashAmountStr('');
      setNotes('');
      // Slight delay to allow modal to render before focusing
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const total = cart.total;
  const cashAmount = parseInt(cashAmountStr.replace(/[^0-9]/g, '')) * 100 || 0; // Convert typed string back to cents
  const change = cashAmount - total;
  const isCashValid = method !== 'cash' || cashAmount >= total;

  // Keybindings inside modal
  useKeyboardShortcut([
    {
      options: { key: 'Escape', enabled: isOpen },
      handler: onClose,
    },
    {
      options: { key: 'Enter', enabled: isOpen && !isProcessing && isCashValid },
      handler: () => {
        handleProcess();
      },
    },
  ]);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const amountToRecord = method === 'cash' ? cashAmount : total;
      await onProcessPayment(method, amountToRecord, notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val / 100).toLocaleString('id-ID');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Pembayaran</h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
            <kbd className="bg-indigo-800/50 px-2 py-1 rounded text-xs">Esc</kbd>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Total Tagihan</p>
            <p className="text-4xl font-extrabold text-indigo-700 tracking-tight">
              {formatRupiah(total)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Metode Pembayaran</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Tunai' },
                { id: 'qris', label: 'QRIS' },
                { id: 'transfer', label: 'Transfer' },
                { id: 'bon', label: 'Bon/Hutang' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMethod(m.id as any);
                    if (m.id === 'cash') setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    method === m.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === 'cash' ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nominal Uang Diterima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">Rp</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={cashAmountStr}
                    onChange={(e) => {
                      // Allow only numbers
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      // Format with thousand separators just for display
                      const formatted = val ? parseInt(val).toLocaleString('id-ID') : '';
                      setCashAmountStr(formatted);
                    }}
                    className="w-full pl-12 pr-4 py-3 text-2xl font-bold text-slate-900 border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCashAmountStr((total / 100).toString())}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition-colors"
                >
                  Uang Pas
                </button>
                {QUICK_AMOUNTS.filter((amt) => amt >= total).slice(0, 3).map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashAmountStr((amt / 100).toString())}
                    className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded transition-colors"
                  >
                    {(amt / 100 / 1000)}k
                  </button>
                ))}
              </div>

              {cashAmount > 0 && (
                <div className={`p-4 rounded-xl border ${change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {change >= 0 ? 'Kembalian:' : 'Kurang:'}
                    </span>
                    <span className={`text-2xl font-bold ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatRupiah(Math.abs(change))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-2 space-y-4">
              {method === 'bon' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pelanggan & Catatan Hutang <span className="text-red-500">*</span></label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={3}
                    placeholder="Misal: Bapak Budi - Janji bayar minggu depan"
                    autoFocus
                  />
                </div>
              )}
              {method !== 'bon' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Referensi transfer / catatan"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleProcess}
            disabled={!isCashValid || isProcessing || (method === 'bon' && !notes.trim())}
            className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isProcessing ? 'Memproses...' : 'Proses Pembayaran'}
            {!isProcessing && <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1">Enter</kbd>}
          </button>
        </div>
      </div>
    </div>
  );
}
