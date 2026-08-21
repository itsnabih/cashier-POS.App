'use client';

import { Trophy, PackageOpen } from 'lucide-react';

interface TopProduct {
  id: string;
  name: string;
  total_sold: number;
}

export default function TopProductsWidget({ products }: { products: TopProduct[] }) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-800">Top 5 Produk (Bulan Ini)</h3>
      </div>
      
      <div className="flex-1">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[150px]">
            <PackageOpen className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Belum ada penjualan bulan ini.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {products.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-slate-200 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-baby-600 transition-colors">
                      {product.name}
                    </p>
                  </div>
                </div>
                <div className="text-right pl-3">
                  <p className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-md">
                    {product.total_sold} <span className="text-[10px] font-medium text-slate-500">terjual</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
