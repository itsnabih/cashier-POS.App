import { useState, useEffect, useRef } from 'react';
import { Percent, DollarSign, X } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (type: 'nominal' | 'percent', value: number) => void;
  /** Name of the item, or null for cart-level discount */
  itemName: string | null;
  /** Current price to show the discount preview */
  currentPrice: number;
  /** Existing manual discount value to pre-fill */
  existingValue?: number;
  /** Existing manual discount type to pre-fill */
  existingType?: 'nominal' | 'percent';
}

export function DiscountModal({
  isOpen,
  onClose,
  onApply,
  itemName,
  currentPrice,
  existingValue = 0,
  existingType = 'nominal',
}: DiscountModalProps) {
  const [type, setType] = useState<'nominal' | 'percent'>(existingType);
  const [valueStr, setValueStr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(existingType);
      if (existingValue > 0) {
        if (existingType === 'nominal') {
          // Convert from cents to rupiah for display
          setValueStr((existingValue / 100).toLocaleString('id-ID'));
        } else {
          setValueStr(existingValue.toString());
        }
      } else {
        setValueStr('');
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, existingValue, existingType]);

  if (!isOpen) return null;

  const rawNumericValue = parseInt(valueStr.replace(/[^0-9]/g, ''), 10) || 0;

  // Preview discount amount in cents
  let previewAmount = 0;
  if (type === 'nominal') {
    previewAmount = rawNumericValue * 100; // convert Rp to cents
  } else {
    previewAmount = Math.floor(currentPrice * (rawNumericValue / 100));
  }

  const isValid = rawNumericValue > 0 && previewAmount <= currentPrice;
  const isPercent = type === 'percent';
  const isPercentOverflow = isPercent && rawNumericValue > 100;

  const handleApply = () => {
    if (!isValid || isPercentOverflow) return;
    if (type === 'nominal') {
      // Pass as cents
      onApply('nominal', rawNumericValue * 100);
    } else {
      onApply('percent', rawNumericValue);
    }
    onClose();
  };

  const handleClear = () => {
    onApply('nominal', 0);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isPercentOverflow) {
      e.preventDefault();
      handleApply();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + (val / 100).toLocaleString('id-ID');

  const title = itemName ? `Diskon — ${itemName}` : 'Diskon Keranjang';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-scale-in border border-white/20"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white flex justify-between items-center shadow-sm">
          <h2 className="text-lg font-bold tracking-wide truncate">{title}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors active-scale">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Harga Asli */}
          <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              {itemName ? 'Harga Item' : 'Total Keranjang'}
            </p>
            <p className="text-2xl font-black text-slate-800">{formatRupiah(currentPrice)}</p>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Diskon</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => { setType('nominal'); setValueStr(''); setTimeout(() => inputRef.current?.focus(), 0); }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all duration-200 hover-lift flex items-center justify-center gap-2 ${
                  type === 'nominal'
                    ? 'border-brand-pink bg-brand-pink-light/40 text-brand-pink-dark shadow-md shadow-brand-pink/10 ring-2 ring-brand-pink/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Rupiah
              </button>
              <button
                onClick={() => { setType('percent'); setValueStr(''); setTimeout(() => inputRef.current?.focus(), 0); }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all duration-200 hover-lift flex items-center justify-center gap-2 ${
                  type === 'percent'
                    ? 'border-brand-pink bg-brand-pink-light/40 text-brand-pink-dark shadow-md shadow-brand-pink/10 ring-2 ring-brand-pink/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Percent className="w-4 h-4" />
                Persen
              </button>
            </div>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {isPercent ? 'Persen Diskon (%)' : 'Nominal Diskon (Rp)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                {isPercent ? '%' : 'Rp'}
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={valueStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (isPercent) {
                    // Don't format with separators for percent
                    setValueStr(val);
                  } else {
                    const formatted = val ? parseInt(val).toLocaleString('id-ID') : '';
                    setValueStr(formatted);
                  }
                }}
                className="w-full pl-12 pr-4 py-3.5 text-2xl font-black text-slate-900 border-2 border-slate-200 rounded-xl focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/20 outline-none transition-all shadow-sm"
                placeholder="0"
              />
            </div>
            {isPercentOverflow && (
              <p className="text-xs text-red-500 font-medium mt-1.5">Maksimal 100%</p>
            )}
          </div>

          {/* Quick Percents */}
          {isPercent && (
            <div className="flex gap-2 animate-in slide-in-from-bottom-2">
              {[5, 10, 15, 20, 25, 50].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setValueStr(pct.toString())}
                  className="flex-1 py-2 bg-brand-pink-light/40 hover:bg-brand-pink-light/60 text-brand-pink-dark text-sm font-bold rounded-lg transition-colors hover-lift shadow-sm"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {/* Preview */}
          {rawNumericValue > 0 && !isPercentOverflow && (
            <div className={`p-3.5 rounded-xl border shadow-sm animate-scale-in ${
              previewAmount <= currentPrice
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${previewAmount <= currentPrice ? 'text-emerald-700' : 'text-red-700'}`}>
                  Potongan:
                </span>
                <span className={`text-xl font-black ${previewAmount <= currentPrice ? 'text-emerald-700' : 'text-red-700'}`}>
                  -{formatRupiah(previewAmount)}
                </span>
              </div>
              {previewAmount <= currentPrice && (
                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-600">Harga Setelah Diskon:</span>
                  <span className="text-sm font-black text-emerald-800">
                    {formatRupiah(currentPrice - previewAmount)}
                  </span>
                </div>
              )}
              {previewAmount > currentPrice && (
                <p className="text-xs text-red-600 font-medium mt-1">Diskon melebihi harga!</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          {existingValue > 0 && (
            <button
              onClick={handleClear}
              className="py-3 px-4 bg-white border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:text-red-600 transition-all active-scale text-sm"
            >
              Hapus
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all active-scale text-sm"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid || isPercentOverflow}
            className="flex-1 py-3 bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-brand-pink/30 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover-lift"
          >
            Terapkan
            <kbd className="bg-white/20 px-2 py-0.5 rounded shadow-sm text-[11px] font-mono tracking-normal">Enter</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
