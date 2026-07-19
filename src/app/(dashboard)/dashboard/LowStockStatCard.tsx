'use client';

import { useState } from 'react';

type LowStockProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  min_stock: number;
};

export default function LowStockStatCard({ count, products }: { count: number, products: LowStockProduct[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className="p-3 bg-slate-50 rounded-md relative group cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
        onClick={() => setIsOpen(true)}
      >
        <p className="text-xs text-slate-500">Stok Rendah</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xl font-semibold text-slate-800 tabular-nums">{count}</p>
          <button 
            className="text-gray-400 group-hover:text-baby-600 transition-colors p-1 rounded hover:bg-baby-50"
            title="Lihat Produk Stok Rendah"
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Produk Stok Rendah</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftar produk dengan stok di bawah minimum</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto">
              {products.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Tidak ada produk dengan stok rendah.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 whitespace-nowrap">Produk</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Stok</th>
                      <th className="px-4 py-2 text-right whitespace-nowrap">Min. Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-red-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 line-clamp-1" title={p.name}>{p.name}</div>
                          {p.sku && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.sku}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                          {p.min_stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
