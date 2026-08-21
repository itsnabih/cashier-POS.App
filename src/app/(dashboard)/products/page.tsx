'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/lib/rbac';
import { useToast } from '@/hooks/useToast';
import { Search, Plus, PackageOpen, MoreVertical, Edit2 } from 'lucide-react';

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
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  expiredDate: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  
  const canCreate = hasPermission(PERMISSIONS.PRODUCT_CREATE);
  const canSeeBuyPrice = hasPermission(PERMISSIONS.PRODUCT_VIEW_BUY_PRICE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products?all=true'),
        fetch('/api/categories?all=true')
      ]);
      
      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (prodData.success) setProducts(prodData.data);
      if (catData.success) setCategories(catData.data);
    } catch {
      addToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [products, search]);

  // Group filtered products by category
  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    
    // Initialize map with all categories
    categories.forEach(c => map.set(c.id, []));
    map.set('uncategorized', []);

    filteredProducts.forEach(p => {
      if (p.categoryId && map.has(p.categoryId)) {
        map.get(p.categoryId)!.push(p);
      } else {
        map.get('uncategorized')!.push(p);
      }
    });

    return map;
  }, [categories, filteredProducts]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Produk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola produk berdasarkan kategori
          </p>
        </div>
        {canCreate && (
          <Link
            href="/products/new"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-baby-600 rounded-md hover:bg-baby-500 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Link>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4 flex-shrink-0">
        <div className="flex gap-0 border-b border-slate-200 w-full sm:w-auto">
          <span
            className="flex items-center gap-1.5 px-4 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-b-baby-500 text-gray-800 cursor-default"
          >
            Daftar Produk
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">
              {filteredProducts.length}
            </span>
          </span>
          <Link
            href="/products/categories"
            className="flex items-center gap-1.5 px-4 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-b-transparent text-slate-400 hover:text-slate-600"
          >
            Kategori
          </Link>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, SKU..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-baby-500 focus:border-baby-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {loading ? (
          <div className="flex gap-4 h-full">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-80 flex-shrink-0 bg-slate-50/50 rounded-xl border border-slate-100 p-3 h-full animate-pulse">
                <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-24 bg-white rounded-lg border border-slate-100"></div>
                  <div className="h-24 bg-white rounded-lg border border-slate-100"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full items-start">
            {categories.map(category => (
              <CategoryColumn 
                key={category.id} 
                categoryName={category.name} 
                products={groupedProducts.get(category.id) || []} 
                canSeeBuyPrice={canSeeBuyPrice}
              />
            ))}
            
            {/* Uncategorized Column (only show if it has items) */}
            {(groupedProducts.get('uncategorized')?.length ?? 0) > 0 && (
              <CategoryColumn 
                categoryName="Tanpa Kategori" 
                products={groupedProducts.get('uncategorized') || []} 
                canSeeBuyPrice={canSeeBuyPrice}
                isWarning
              />
            )}

            {categories.length === 0 && (groupedProducts.get('uncategorized')?.length ?? 0) === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <PackageOpen className="w-12 h-12 mb-2 text-slate-200" />
                <p>Belum ada produk atau kategori.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryColumn({ 
  categoryName, 
  products, 
  canSeeBuyPrice,
  isWarning = false 
}: { 
  categoryName: string, 
  products: Product[],
  canSeeBuyPrice: boolean,
  isWarning?: boolean
}) {
  return (
    <div className={`w-80 flex-shrink-0 flex flex-col h-full rounded-xl border ${isWarning ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
      {/* Column Header */}
      <div className={`p-3 border-b flex justify-between items-center bg-white/50 rounded-t-xl ${isWarning ? 'border-amber-100' : 'border-slate-200'}`}>
        <h3 className={`font-bold text-sm ${isWarning ? 'text-amber-800' : 'text-slate-800'}`}>
          {categoryName}
        </h3>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full">
          {products.length}
        </span>
      </div>

      {/* Product Cards Container (Vertical Scroll) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {products.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Kosong
          </div>
        ) : (
          products.map(product => (
            <div 
              key={product.id} 
              className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-baby-300 transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 leading-tight">
                    {product.name}
                  </h4>
                  <div className="flex gap-2 mt-1">
                    {product.sku && <span className="text-[10px] font-mono text-slate-400">SKU: {product.sku}</span>}
                    {product.barcode && <span className="text-[10px] font-mono text-slate-400">BC: {product.barcode}</span>}
                  </div>
                </div>
                <Link 
                  href={`/products/${product.id}/edit`}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-baby-600 transition-all rounded hover:bg-baby-50"
                  title="Edit Produk"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-slate-50 rounded-md">
                <div>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Harga Jual</p>
                  <p className="text-xs font-bold text-slate-700">Rp {(product.sellPrice / 100).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Stok</p>
                  <p className="text-xs font-bold flex items-baseline gap-1">
                    <span className={product.stock <= product.minStock ? 'text-red-600' : 'text-slate-700'}>
                      {product.stock}
                    </span>
                    <span className="text-[9px] text-slate-500 font-normal">{product.unit}</span>
                  </p>
                </div>
                
                {canSeeBuyPrice && product.buyPrice != null && (
                  <div className="col-span-2 pt-1.5 mt-1.5 border-t border-slate-200/60">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Harga Beli</p>
                      <p className="text-[10px] font-semibold text-slate-500">Rp {(product.buyPrice / 100).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
