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
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Keranjang</h2>
        <button
          onClick={onClearCart}
          disabled={cart.items.length === 0}
          className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium px-2 py-1 flex items-center gap-1.5"
        >
          <span>Kosongkan</span>
          <kbd className="bg-red-50 text-[10px] px-1.5 rounded border border-red-100 hidden sm:inline-block">Shift+Del</kbd>
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm">Belum ada barang</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div key={item.id} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{item.name}</h4>
                  <p className="text-xs text-slate-500">
                    Rp {(item.unitPrice / 100).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Rp {((item.unitPrice * item.quantity) / 100).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center border border-slate-200 rounded-md bg-white">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-l-md transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    disabled={item.quantity >= item.stock}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-r-md transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary & Pay Button */}
      <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700">Rp {(cart.subtotal / 100).toLocaleString('id-ID')}</span>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Diskon</span>
              <span className="font-medium">- Rp {(cart.discount / 100).toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2">
            <span>Total</span>
            <span className="text-indigo-700">Rp {(cart.total / 100).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <button
          onClick={onPay}
          disabled={cart.items.length === 0}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <span>BAYAR</span>
          <kbd className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-mono">F12</kbd>
        </button>
      </div>
    </div>
  );
}
