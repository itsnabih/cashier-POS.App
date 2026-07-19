import { useState, useEffect, useRef } from 'react';
import { type POSCart } from '@/types/pos';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: POSCart;
  onProcessPayment: (method: 'cash' | 'qris' | 'transfer', amount: number, notes: string) => Promise<void>;
}

const QUICK_AMOUNTS = [1000000, 2000000, 5000000, 10000000]; // in cents (Rp 10.000, 20.000, 50.000, 100.000)

export function PaymentModal({ isOpen, onClose, cart, onProcessPayment }: PaymentModalProps) {
  const [method, setMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in border border-white/20">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-brand-blue to-brand-sky-dark text-white flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-bold tracking-wide">Pembayaran</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors active-scale">
            <kbd className="bg-white/20 px-2 py-1 rounded shadow-sm text-xs font-mono font-bold tracking-normal">Esc</kbd>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center p-5 bg-brand-sky-light/30 rounded-2xl border border-brand-sky-light/50 shadow-inner">
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Tagihan</p>
            <p className="text-4xl font-black text-brand-blue-dark tracking-tight">
              {formatRupiah(total)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Metode Pembayaran</label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'cash', label: 'Tunai' },
                { id: 'qris', label: 'QRIS' },
                { id: 'transfer', label: 'Transfer' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMethod(m.id as any);
                    if (m.id === 'cash') setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all duration-200 hover-lift ${method === m.id
                    ? 'border-brand-blue bg-brand-sky-light/40 text-brand-blue-dark shadow-md shadow-brand-blue/10 ring-2 ring-brand-blue/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === 'cash' ? (
            <div className="space-y-5 animate-in slide-in-from-bottom-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nominal Uang Diterima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">Rp</span>
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
                    className="w-full pl-12 pr-4 py-3.5 text-2xl font-black text-slate-900 border-2 border-slate-200 rounded-xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/20 outline-none transition-all shadow-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setCashAmountStr((total / 100).toString())}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors hover-lift shadow-sm"
                >
                  Uang Pas
                </button>
                {QUICK_AMOUNTS.filter((amt) => amt >= total).slice(0, 3).map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashAmountStr((amt / 100).toString())}
                    className="flex-1 py-2 bg-brand-sky-light hover:bg-brand-sky-light/80 text-brand-blue-dark text-sm font-bold rounded-lg transition-colors hover-lift shadow-sm"
                  >
                    {(amt / 100 / 1000)}k
                  </button>
                ))}
              </div>

              {cashAmount > 0 && (
                <div className={`p-4 rounded-xl border shadow-sm animate-scale-in ${change >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold ${change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {change >= 0 ? 'Kembalian:' : 'Kurang:'}
                    </span>
                    <span className={`text-2xl font-black ${change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatRupiah(Math.abs(change))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-2 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Catatan Tambahan (Opsional)</label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-medium text-slate-800"
                    placeholder="Referensi transfer / catatan"
                    autoFocus
                  />
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all active-scale"
          >
            Batal
          </button>
          <button
            onClick={handleProcess}
            disabled={!isCashValid || isProcessing}
            className="flex-1 py-3.5 bg-gradient-to-r from-brand-blue to-brand-sky-dark text-white font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-brand-blue/30 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover-lift"
          >
            {isProcessing ? 'Memproses...' : 'Proses Pembayaran'}
            {!isProcessing && <kbd className="bg-white/20 px-2 py-0.5 rounded shadow-sm text-[11px] font-mono tracking-normal ml-1">Enter</kbd>}
          </button>
        </div>
      </div>
    </div>
  );
}
