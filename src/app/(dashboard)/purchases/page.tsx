'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string | null;
  receivedByName: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/purchases?limit=50');
      const data = await res.json();
      if (data.success) setPurchases(data.data);
    } catch {
      addToast('Gagal memuat data pembelian', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const statusLabel: Record<string, { text: string; cls: string }> = {
    draft: { text: 'Draft', cls: 'bg-slate-100 text-slate-600' },
    received: { text: 'Diterima', cls: 'bg-emerald-50 text-emerald-700' },
    cancelled: { text: 'Batal', cls: 'bg-red-50 text-red-600' },
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pembelian</h2>
          <p className="text-xs text-slate-500 mt-0.5">Riwayat penerimaan barang dari supplier</p>
        </div>
        <Link
          href="/purchases/new"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
        >
          Terima Barang
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">No. PO</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Supplier</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Diterima Oleh</th>
              <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 w-24">Status</th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-32">Total</th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  <td className="py-3 px-4"><div className="h-3 bg-slate-100 rounded w-28" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-24" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-20" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 mx-auto" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-20 ml-auto" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-slate-100 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                  Belum ada data pembelian.
                </td>
              </tr>
            ) : (
              purchases.map((po) => {
                const s = statusLabel[po.status] || statusLabel.draft;
                return (
                  <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-sm font-mono text-slate-800">{po.poNumber}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-600">{po.supplierName || '-'}</td>
                    <td className="py-2.5 px-3 text-sm text-slate-600">{po.receivedByName || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded ${s.cls}`}>
                        {s.text}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-sm font-medium text-slate-800">
                      {(po.totalAmount / 100).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-slate-500">
                      {new Date(po.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
