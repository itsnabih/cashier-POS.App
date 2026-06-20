'use client';

import { useState, useEffect } from 'react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/suppliers?all=true')
      .then(res => res.json())
      .then(data => {
        if(data.success) setSuppliers(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Supplier</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar pemasok barang / distributor toko Anda</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm">
          + Tambah Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Nama Perusahaan / Toko</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Kontak Person</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-700">No. Telepon / WA</th>
              <th className="text-right px-6 py-4 font-semibold text-slate-700">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan={4} className="text-center py-8 text-slate-400">Memuat data...</td></tr>
            ) : suppliers.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8 text-slate-400">Belum ada data supplier yang ditambahkan.</td></tr>
            ) : (
              suppliers.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {s.name}
                    {s.address && <p className="text-xs text-slate-400 font-normal mt-1">{s.address}</p>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.contactPerson || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {s.phone ? (
                      <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:underline">
                        {s.phone}
                      </a>
                    ) : '-'}
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
