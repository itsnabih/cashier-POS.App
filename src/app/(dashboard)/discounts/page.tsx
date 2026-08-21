'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tag, Clock, PackageOpen, Percent, Check, AlertTriangle, TrendingDown } from 'lucide-react';

interface DiscountedProduct {
  id: string;
  name: string;
  sku: string | null;
  sellPrice: number;
  stock: number;
  unit: string;
  expiredDate: string | null;
  lastSoldAt: string | null;
  createdAt: string;
  categoryName: string | null;
  discountType: 'near_expiry' | 'slow_moving';
  discountPct: number;
  discountAmount: number;
  finalPrice: number;
  /** For near_expiry: days until expired. For slow_moving: days since last sold */
  daysMeta: number;
}

export default function DiscountsPage() {
  const [settings, setSettings] = useState({
    'inventory.near_expiry_days': '180',
    'inventory.slow_moving_days': '60',
    'discount.near_expiry_pct': '10',
    'discount.slow_moving_pct': '5',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [products, setProducts] = useState<DiscountedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'near_expiry' | 'slow_moving'>('all');

  // Fetch settings
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch products and compute which ones have discounts
  const fetchDiscountedProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products?limit=500&active=true');
      const data = await res.json();
      if (!data.success) return;

      const nearExpiryDays = parseInt(settings['inventory.near_expiry_days'] || '180', 10);
      const nearExpiryPct = parseInt(settings['discount.near_expiry_pct'] || '10', 10);
      const slowMovingDays = parseInt(settings['inventory.slow_moving_days'] || '60', 10);
      const slowMovingPct = parseInt(settings['discount.slow_moving_pct'] || '5', 10);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const discounted: DiscountedProduct[] = [];

      for (const p of data.data) {
        // Check near expiry
        if (p.expiredDate) {
          const expDate = new Date(p.expiredDate);
          expDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= nearExpiryDays) {
            const discountAmount = Math.floor(p.sellPrice * (nearExpiryPct / 100));
            discounted.push({
              id: p.id,
              name: p.name,
              sku: p.sku,
              sellPrice: p.sellPrice,
              stock: p.stock,
              unit: p.unit,
              expiredDate: p.expiredDate,
              lastSoldAt: p.lastSoldAt,
              createdAt: p.createdAt,
              categoryName: p.categoryName || null,
              discountType: 'near_expiry',
              discountPct: nearExpiryPct,
              discountAmount,
              finalPrice: p.sellPrice - discountAmount,
              daysMeta: diffDays,
            });
            continue; // Skip slow-moving check if already near-expiry (matches discount.ts logic: max)
          }
        }

        // Check slow moving
        const refDate = p.lastSoldAt ? new Date(p.lastSoldAt) : new Date(p.createdAt);
        refDate.setHours(0, 0, 0, 0);
        const daysIdle = Math.abs(Math.ceil((refDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysIdle >= slowMovingDays) {
          const discountAmount = Math.floor(p.sellPrice * (slowMovingPct / 100));
          discounted.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            sellPrice: p.sellPrice,
            stock: p.stock,
            unit: p.unit,
            expiredDate: p.expiredDate,
            lastSoldAt: p.lastSoldAt,
            createdAt: p.createdAt,
            categoryName: p.categoryName || null,
            discountType: 'slow_moving',
            discountPct: slowMovingPct,
            discountAmount,
            finalPrice: p.sellPrice - discountAmount,
            daysMeta: daysIdle,
          });
        }
      }

      setProducts(discounted);
    } catch (err) {
      console.error('Failed to fetch products for discount', err);
    } finally {
      setProductsLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    if (!isLoading) {
      fetchDiscountedProducts();
    }
  }, [isLoading, fetchDiscountedProducts]);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSuccessMsg('Pengaturan diskon berhasil disimpan!');
        setTimeout(() => setSuccessMsg(''), 3000);
        // Re-fetch products with new settings
        fetchDiscountedProducts();
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch {
      alert('Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + (val / 100).toLocaleString('id-ID');

  const filteredProducts = activeFilter === 'all'
    ? products
    : products.filter(p => p.discountType === activeFilter);

  const nearExpiryCount = products.filter(p => p.discountType === 'near_expiry').length;
  const slowMovingCount = products.filter(p => p.discountType === 'slow_moving').length;

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Diskon</h2>
        <p className="text-sm text-slate-500 mt-0.5">Kelola diskon otomatis dan lihat produk yang mendapat potongan harga</p>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="card p-5 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-brand-pink-light/50">
              <Tag className="w-5 h-5 text-brand-pink-dark" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{products.length}</p>
              <p className="text-xs font-medium text-slate-500">Total Produk Diskon</p>
            </div>
          </div>
        </div>

        <div className="card p-5 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-red-50">
              <Clock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{nearExpiryCount}</p>
              <p className="text-xs font-medium text-slate-500">Mendekati Kedaluwarsa</p>
            </div>
          </div>
        </div>

        <div className="card p-5 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50">
              <TrendingDown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{slowMovingCount}</p>
              <p className="text-xs font-medium text-slate-500">Lambat Terjual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="card p-6">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Percent className="w-4.5 h-4.5 text-brand-blue" />
              Pengaturan Diskon Otomatis
            </h3>
            <p className="text-xs text-slate-500 mt-1">Diskon otomatis diterapkan di POS berdasarkan parameter berikut.</p>
          </div>
          {successMsg && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium animate-in flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{successMsg}</span>
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Memuat pengaturan...</div>
        ) : (
          <div className="space-y-5">
            {/* Near Expiry Section */}
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h4 className="text-sm font-bold text-red-800">Diskon Mendekati Kedaluwarsa</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Batas Hari Sebelum Expired</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings['inventory.near_expiry_days']}
                      onChange={e => handleChange('inventory.near_expiry_days', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-right pr-14 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">hari</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Persentase Diskon</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings['discount.near_expiry_pct']}
                      onChange={e => handleChange('discount.near_expiry_pct', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-right pr-8 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">%</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-red-600/70">
                Produk yang expired dalam {settings['inventory.near_expiry_days']} hari akan otomatis mendapat diskon {settings['discount.near_expiry_pct']}% di kasir POS.
              </p>
            </div>

            {/* Slow Moving Section */}
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <PackageOpen className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-amber-800">Diskon Produk Lambat Terjual</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Batas Hari Tidak Terjual</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings['inventory.slow_moving_days']}
                      onChange={e => handleChange('inventory.slow_moving_days', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-right pr-14 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">hari</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Persentase Diskon</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings['discount.slow_moving_pct']}
                      onChange={e => handleChange('discount.slow_moving_pct', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-right pr-8 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">%</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-amber-600/70">
                Produk yang tidak terjual selama {settings['inventory.slow_moving_days']} hari akan otomatis mendapat diskon {settings['discount.slow_moving_pct']}% di kasir POS.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-baby-600 text-white text-sm font-semibold rounded-lg hover:bg-baby-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-baby-500 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discounted Products Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Produk dengan Diskon Aktif</h3>
            <p className="text-xs text-slate-500 mt-0.5">Daftar produk yang saat ini otomatis mendapat potongan harga di POS.</p>
          </div>
          <div className="flex gap-1.5">
            {[
              { id: 'all' as const, label: 'Semua', count: products.length },
              { id: 'near_expiry' as const, label: 'Kedaluwarsa', count: nearExpiryCount },
              { id: 'slow_moving' as const, label: 'Lambat Jual', count: slowMovingCount },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeFilter === f.id
                    ? 'bg-baby-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.id ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Produk</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 w-24">Jenis Diskon</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Harga Normal</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 w-16">Diskon</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Harga Diskon</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-20">Stok</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-24">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {productsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-10 mx-auto" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-8 ml-auto" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Tag className="w-8 h-8 text-slate-200" />
                      <p>Tidak ada produk yang mendapat diskon otomatis saat ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={`${product.id}-${product.discountType}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="text-sm text-slate-800 font-medium">{product.name}</p>
                      {product.sku && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.sku}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {product.discountType === 'near_expiry' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-red-50 text-red-700 rounded-full border border-red-100">
                          <Clock className="w-3 h-3" />
                          Kedaluwarsa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                          <TrendingDown className="w-3 h-3" />
                          Lambat Jual
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-slate-500 line-through">
                      {formatRupiah(product.sellPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-brand-pink-light/40 text-brand-pink-dark text-[10px] font-black rounded-full">
                        -{product.discountPct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-slate-800 font-bold">
                      {formatRupiah(product.finalPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-xs tabular-nums font-medium ${product.stock <= 5 ? 'text-red-600' : 'text-slate-700'}`}>
                        {product.stock}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-0.5">{product.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-slate-500">
                      {product.discountType === 'near_expiry' ? (
                        <span className={product.daysMeta <= 7 ? 'text-red-600 font-semibold' : ''}>
                          {product.daysMeta <= 0 ? 'Hari ini!' : `${product.daysMeta} hari lagi`}
                        </span>
                      ) : (
                        <span>{product.daysMeta} hari idle</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
