import { type POSCart } from '@/types/pos';
import { Trash2, Plus, Minus } from 'lucide-react';

interface CartPanelProps {
  cart: POSCart;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onPay: () => void;
}

export function CartPanel({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPay,
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white relative rounded-r-2xl overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="p-4 border-b border-sky-50 bg-slate-50/50 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 tracking-tight">Keranjang</h2>
        <button
          onClick={onClearCart}
          disabled={cart.items.length === 0}
          className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium px-2 py-1 flex items-center gap-1.5"
        >
          <span>Kosongkan</span>
          <kbd className="bg-red-50 text-[10px] px-1.5 rounded shadow-sm border border-red-100 hidden sm:inline-block font-sans">Ctrl+Del</kbd>
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm">Belum ada barang</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div key={item.id} className="flex flex-col p-3.5 bg-white rounded-xl border border-sky-100 shadow-sm animate-in hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.discount > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400 line-through">
                        Rp {(item.originalPrice / 100).toLocaleString('id-ID')}
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-500">
                      Rp {(item.unitPrice / 100).toLocaleString('id-ID')}
                    </p>
                    {item.discount > 0 && (
                      <span className="px-1.5 py-0.5 bg-brand-pink-light/30 text-brand-pink-dark text-[9px] font-black rounded-sm border border-brand-pink-light/50">
                        DISC
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-bold text-brand-blue-dark">
                  Rp {((item.unitPrice * item.quantity) / 100).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center border border-sky-100 rounded-lg bg-slate-50 overflow-hidden shadow-inner">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-sky-light/50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    disabled={item.quantity >= item.stock}
                    className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-sky-light/50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 active-scale"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary & Pay Button */}
      <div className="p-5 bg-white border-t border-sky-100 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] z-10">
        <div className="space-y-3 mb-5">
          <div className="flex justify-between text-sm text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-bold text-slate-700">Rp {(cart.subtotal / 100).toLocaleString('id-ID')}</span>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between text-sm text-brand-pink-dark font-medium">
              <span>Diskon</span>
              <span className="font-bold">- Rp {(cart.discount / 100).toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xl font-black text-slate-900 pt-3 border-t border-sky-50 mt-2">
            <span>Total</span>
            <span className="text-brand-blue-dark">Rp {(cart.total / 100).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <button
          onClick={onPay}
          disabled={cart.items.length === 0}
          className="w-full py-4 bg-gradient-to-r from-brand-blue to-brand-sky-dark text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-blue/30 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed hover-lift transition-all flex items-center justify-center gap-2"
        >
          <span className="tracking-wide">BAYAR</span>
          <kbd className="bg-white/20 px-2 py-0.5 rounded shadow-sm text-[11px] font-mono font-bold tracking-normal">F12</kbd>
        </button>
      </div>
    </div>
  );
}
