'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';

interface StockOpname {
  id: string;
  opnameNumber: string;
  conductedByName: string | null;
  status: string;
  totalShrinkage: number;
  totalSurplus: number;
  finalizedAt: string | null;
  createdAt: string;
}

export default function StockOpnamePage() {
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchOpnames = useCallback(async () => {
    try {
      const res = await fetch('/api/stock-opname?limit=50');
      const data = await res.json();
      if (data.success) setOpnames(data.data);
    } catch {
      addToast('Gagal memuat data stok opname', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchOpnames(); }, [fetchOpnames]);

  async function handleFinalize(id: string) {
    if (!confirm('Finalisasi stok opname? Stok produk akan disesuaikan dan selisih dicatat sebagai penyusutan.')) return;

    try {
      const res = await fetch(`/api/stock-opname/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addToast('Stok opname berhasil difinalisasi', 'success');
        fetchOpnames();
      } else {
        addToast(data.error?.message || 'Gagal memfinalisasi', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    }
  }

  const statusLabel: Record<string, { text: string; cls: string }> = {
    in_progress: { text: 'Berlangsung', cls: 'bg-amber-50 text-amber-700' },
    finalized: { text: 'Selesai', cls: 'bg-emerald-50 text-emerald-700' },
    cancelled: { text: 'Batal', cls: 'bg-red-50 text-red-600' },
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Stok Opname</h2>
          <p className="text-xs text-slate-500 mt-0.5">Riwayat rekonsiliasi stok fisik vs sistem</p>
        </div>
        <Link
          href="/stock-opname/new"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
        >
          Opname Baru
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">No. Opname</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Dilakukan Oleh</th>
              <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 w-24">Status</th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-32">Penyusutan</th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Tanggal</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  <td className="py-3 px-4"><div className="h-3 bg-slate-100 rounded w-28" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 mx-auto" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-20 ml-auto" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>
                  <td />
                </tr>
              ))
            ) : opnames.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                  Belum ada data stok opname.
                </td>
              </tr>
            ) : (
              opnames.map((o) => {
                const s = statusLabel[o.status] || statusLabel.in_progress;
                return (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-sm font-mono text-slate-800">{o.opnameNumber}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-600">{o.conductedByName || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded ${s.cls}`}>
                        {s.text}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-sm font-medium text-red-600">
                      {o.totalShrinkage > 0
                        ? `Rp ${(o.totalShrinkage / 100).toLocaleString('id-ID')}`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {o.status === 'in_progress' && (
                        <button
                          onClick={() => handleFinalize(o.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                          Finalisasi
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
