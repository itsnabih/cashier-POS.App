'use client';

import { useState, useEffect } from 'react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories?all=true')
      .then(res => res.json())
      .then(data => {
        if(data.success) setCategories(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kategori Produk</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar kategori barang jualan</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm">
          + Tambah Kategori
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Nama Kategori</th>
              <th className="text-right px-6 py-4 font-semibold text-slate-700">Jumlah Produk</th>
              <th className="text-right px-6 py-4 font-semibold text-slate-700">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan={3} className="text-center py-8 text-slate-400">Memuat data...</td></tr>
            ) : categories.length === 0 ? (
               <tr><td colSpan={3} className="text-center py-8 text-slate-400">Belum ada kategori yang ditambahkan.</td></tr>
            ) : (
              categories.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold">
                      {c.productCount || 0} Produk
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium mr-4">Edit</button>
                    <button className="text-red-600 hover:text-red-900 text-sm font-medium">Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
