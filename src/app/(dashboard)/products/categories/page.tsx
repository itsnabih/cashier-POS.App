'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/lib/rbac';
import { useToast } from '@/hooks/useToast';
import { Tag, Plus, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  isActive: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const canCreate = hasPermission(PERMISSIONS.CATEGORY_CREATE);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories?all=true');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch {
      addToast('Gagal memuat data kategori', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        addToast('Kategori berhasil ditambahkan', 'success');
        setNewCatName('');
        setIsModalOpen(false);
        fetchCategories(); // refresh
      } else {
        addToast(data.error?.message || 'Gagal menambahkan kategori', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Kategori Produk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pengelompokan produk
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-baby-600 rounded-md hover:bg-baby-500 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Kategori
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-slate-200">
        <Link
          href="/products"
          className="flex items-center gap-1.5 px-4 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-b-transparent text-slate-400 hover:text-slate-600"
        >
          Daftar Produk
        </Link>
        <span
          className="flex items-center gap-1.5 px-4 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-b-baby-500 text-gray-800 cursor-default"
        >
          Kategori
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">
            {categories.length}
          </span>
        </span>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Nama Kategori</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Slug</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 w-32">Total Produk</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-12 mx-auto" /></td>
                    <td />
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Tag className="w-8 h-8 text-slate-200" />
                      <p>Belum ada kategori. Silakan tambahkan kategori baru.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{cat.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{cat.slug}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        {cat.productCount} produk
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Placeholder for future edit/delete actions */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kategori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Tambah Kategori Baru</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Kategori <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: Susu Formula"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-baby-500 focus:border-baby-500 text-sm"
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newCatName.trim()}
                  className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-white bg-baby-600 rounded-md hover:bg-baby-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
