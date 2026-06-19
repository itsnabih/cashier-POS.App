'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/lib/rbac';
import { useToast } from '@/hooks/useToast';

// ============================================================
// Products list page
// ============================================================

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  buyPrice?: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  categoryName: string | null;
  isActive: boolean;
  expiredDate: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const canCreate = hasPermission(PERMISSIONS.PRODUCT_CREATE);
  const canSeeBuyPrice = hasPermission(PERMISSIONS.PRODUCT_VIEW_BUY_PRICE);

  const fetchProducts = useCallback(async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        if (data.meta) {
          setPagination(data.meta);
        }
      }
    } catch {
      addToast('Gagal memuat data produk', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts(1, search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchProducts]);

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Daftar Produk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pagination.total} produk terdaftar
          </p>
        </div>
        {canCreate && (
          <Link
            href="/products/new"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
          >
            Tambah Produk
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="card p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, SKU, atau barcode..."
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors text-slate-900"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Produk</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 w-24">SKU</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 w-24">Kategori</th>
                {canSeeBuyPrice && (
                  <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Harga Beli</th>
                )}
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Harga Jual</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-20">Stok</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 w-28">Kedaluwarsa</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16" /></td>
                    {canSeeBuyPrice && <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>}
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-8 ml-auto" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 mx-auto" /></td>
                    <td />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canSeeBuyPrice ? 8 : 7} className="text-center py-8 text-sm text-slate-400">
                    {search ? 'Tidak ada produk yang cocok.' : 'Belum ada produk.'}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <p className="text-sm text-slate-800 font-medium">{product.name}</p>
                      {product.barcode && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.barcode}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500 font-mono">
                      {product.sku || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">
                      {product.categoryName || '-'}
                    </td>
                    {canSeeBuyPrice && (
                      <td className="py-2.5 px-3 text-right text-xs tabular-nums text-slate-600">
                        {product.buyPrice != null
                          ? (product.buyPrice / 100).toLocaleString('id-ID')
                          : '-'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-slate-800 font-medium">
                      {(product.sellPrice / 100).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-xs tabular-nums font-medium ${
                          product.stock <= product.minStock ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {product.stock}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-0.5">{product.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {product.expiredDate ? (
                        <ExpiryLabel date={product.expiredDate} />
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Halaman {pagination.page} dari {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchProducts(pagination.page - 1, search)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => fetchProducts(pagination.page + 1, search)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpiryLabel({ date }: { date: string }) {
  const daysLeft = Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const formatted = new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });

  if (daysLeft <= 0) {
    return <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">EXP</span>;
  }
  if (daysLeft <= 30) {
    return <span className="text-[10px] font-medium text-red-600">{formatted}</span>;
  }
  if (daysLeft <= 60) {
    return <span className="text-[10px] font-medium text-amber-600">{formatted}</span>;
  }
  return <span className="text-[10px] text-slate-500">{formatted}</span>;
}
