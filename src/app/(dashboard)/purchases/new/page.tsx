'use client';

import ReceiveGoodsForm from '@/components/inventory/ReceiveGoodsForm';
import Link from 'next/link';

export default function NewPurchasePage() {
  return (
    <div className="space-y-6 animate-in">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4">
        <Link
          href="/purchases"
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          title="Kembali ke Riwayat Pembelian"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catat Barang Masuk Baru</h1>
          <p className="text-xs text-slate-500 mt-0.5">Input penerimaan stok dari supplier, nomor batch, dan tanggal kedaluwarsa</p>
        </div>
      </div>

      {/* Barang Masuk Form Component */}
      <ReceiveGoodsForm />
    </div>
  );
}
