'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ReceiptContent, type ReceiptItem } from '@/components/pos/ReceiptContent';
import type { Transaction, TransactionItem } from '@/types/transaction';
import './print.css';

type DatePreset = 'today' | '7days' | '30days' | 'this-month' | 'custom';

function getPresetDates(p: DatePreset) {
  const today = new Date();
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = format(today);

  switch (p) {
    case 'today': return { from: todayStr, to: todayStr };
    case '7days': { const d = new Date(); d.setDate(d.getDate() - 6); return { from: format(d), to: todayStr }; }
    case '30days': { const d = new Date(); d.setDate(d.getDate() - 29); return { from: format(d), to: todayStr }; }
    case 'this-month': { const first = new Date(today.getFullYear(), today.getMonth(), 1); return { from: format(first), to: todayStr }; }
    default: return { from: todayStr, to: todayStr };
  }
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalCompleted: 0, totalVoided: 0 });
  const [loading, setLoading] = useState(true);
  
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Sumber Baby Shop',
    storeAddress: 'Jl. Raya Bayi No. 123, Kota Balita',
    storePhone: '0812-3456-7890',
    footerTitle: 'TERIMA KASIH',
    footerSub: 'SELAMAT BELANJA KEMBALI',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const s = data.data;
          setStoreSettings({
            storeName: s['store.name'] || 'Sumber Baby Shop',
            storeAddress: s['store.address'] || 'Jl. Raya Bayi No. 123, Kota Balita',
            storePhone: s['store.phone'] || '0812-3456-7890',
            footerTitle: s['receipt.footer_title'] || 'TERIMA KASIH',
            footerSub: s['receipt.footer_sub'] || 'SELAMAT BELANJA KEMBALI',
          });
        }
      })
      .catch(() => {});
  }, []);
  
  // Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  
  const [preset, setPreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState(() => getPresetDates('today').from);
  const [endDate, setEndDate] = useState(() => getPresetDates('today').to);

  const presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Hari Ini' },
    { key: '7days', label: '7 Hari' },
    { key: '30days', label: '30 Hari' },
    { key: 'this-month', label: 'Bulan Ini' },
    { key: 'custom', label: 'Custom' },
  ];

  const handlePreset = (p: DatePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const dates = getPresetDates(p);
      setStartDate(dates.from);
      setEndDate(dates.to);
      setPage(1);
    }
  };

  // Modal State
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [trxItems, setTrxItems] = useState<TransactionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidPrompt, setShowVoidPrompt] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { receipt_number: search }),
        ...(status && { status }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await fetch(`/api/transactions?${params.toString()}`);
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      
      if (data.success) {
        setTransactions(data.data.data);
        setSummary(data.data.summary);
        setTotalPages(data.data.meta.totalPages || 1);
      } else {
        showToast(data.error?.message || 'Gagal memuat transaksi', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, startDate, endDate, router, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleViewDetail = async (trx: Transaction) => {
    setSelectedTrx(trx);
    setShowVoidPrompt(false);
    setVoidReason('');
    setTrxItems([]);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/transactions/${trx.id}`);
      const data = await res.json();
      if (data.success) {
        setTrxItems(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleVoidTransaction = async () => {
    if (!selectedTrx) return;
    if (voidReason.length < 3) {
      showToast('Alasan pembatalan terlalu pendek', 'error');
      return;
    }

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/transactions/${selectedTrx.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Transaksi berhasil dibatalkan', 'success');
        setSelectedTrx(null);
        fetchTransactions(); // Refresh list
      } else {
        showToast(data.error?.message || 'Gagal membatalkan transaksi', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount / 100);
  };

  const fmt = (val: number) => (val / 100).toLocaleString('id-ID');

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
  };

  return (
    <>
      <div className="space-y-6 print:p-0 print:m-0">
      
      {/* ---------- HEADER & SUMMARY (HIDDEN ON PRINT) ---------- */}
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Riwayat Transaksi</h2>
            <p className="text-sm text-slate-500 mt-0.5">Pantau penjualan dan retur barang</p>
          </div>
          <button onClick={() => fetchTransactions()} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            Refresh
          </button>
        </div>

        <div className="flex flex-row gap-4 mb-6 overflow-x-auto pb-2">
          <div className="flex-1 min-w-[200px] bg-white rounded-lg border border-gray-200 p-4 border-l-4 border-l-baby-500 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-1">Total Omzet (Berhasil)</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="flex-1 min-w-[200px] bg-white rounded-lg border border-slate-200 p-4 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-1">Jml Transaksi (Berhasil)</p>
            <p className="text-xl font-bold text-slate-800">{summary.totalCompleted}</p>
          </div>
          <div className="flex-1 min-w-[200px] bg-white rounded-lg border border-slate-200 p-4 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-1">Dibatalkan (Void)</p>
            <p className="text-xl font-bold text-slate-800">{summary.totalVoided}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-6">
          {/* Top Row: Search & Status */}
          <div className="flex flex-wrap gap-3">
            <input 
              type="text" 
              placeholder="Cari No Struk (TRX-...)" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchTransactions())}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-baby-500 min-w-[200px]"
            />
            <select 
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-baby-500 bg-white"
            >
              <option value="">Semua Status</option>
              <option value="completed">Berhasil</option>
              <option value="voided">Dibatalkan (Void)</option>
            </select>
          </div>
          
          {/* Bottom Row: Dates */}
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  preset === p.key
                    ? 'bg-baby-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); setPage(1); }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-baby-500"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); setPage(1); }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-baby-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Waktu</th>
                  <th className="px-4 py-3 whitespace-nowrap">No. Struk</th>
                  <th className="px-4 py-3 whitespace-nowrap">Kasir</th>
                  <th className="px-4 py-3 whitespace-nowrap">Pembayaran</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Total</th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Memuat data...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Tidak ada transaksi ditemukan</td></tr>
                ) : (
                  transactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleViewDetail(trx)}>
                      <td className="px-4 py-3 text-slate-600 text-xs">{formatDateTime(trx.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-baby-600">{trx.receiptNumber}</td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{trx.cashierName || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 uppercase text-xs">{trx.paymentMethod}</td>
                      <td className="px-4 py-3">
                        {trx.status === 'completed' 
                          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Berhasil</span>
                          : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Voided</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(trx.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="p-1.5 text-slate-400 hover:text-baby-600 hover:bg-baby-50 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Lihat Detail Transaksi"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Halaman {page} dari {totalPages}</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 text-xs font-medium border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >Sebelumnnya</button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 text-xs font-medium border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ---------- MODAL DETAIL / RECEIPT (SCREEN & PRINT) ---------- */}
      {selectedTrx && (
        <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in print:bg-transparent print:p-0">
          
          {/* SCREEN UI: Clean, proportional, modern modal */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 print:hidden my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-baby-50 text-baby-600 flex items-center justify-center font-semibold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Detail Transaksi</h3>
                    {selectedTrx.status === 'completed' ? (
                      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Berhasil
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Dibatalkan (Void)
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedTrx.receiptNumber}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTrx(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                title="Tutup"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
              
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">Waktu</span>
                  <span className="text-xs font-semibold text-slate-800">{formatDateTime(selectedTrx.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">Kasir</span>
                  <span className="text-xs font-semibold text-slate-800">{selectedTrx.cashierName || 'Kasir'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">Metode Bayar</span>
                  <span className="inline-block px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[11px] font-bold rounded uppercase">
                    {selectedTrx.paymentMethod}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">Total Akhir</span>
                  <span className="text-xs font-bold text-baby-600">{formatCurrency(selectedTrx.total)}</span>
                </div>
              </div>

              {/* Void Warning Alert */}
              {selectedTrx.status === 'voided' && (
                <div className="bg-red-50/80 border border-red-200/80 text-red-800 rounded-xl p-3.5 text-xs flex items-start gap-3">
                  <span className="text-lg leading-none">⚠️</span>
                  <div>
                    <p className="font-bold text-red-900 mb-0.5">Transaksi Ini Telah Dibatalkan (VOID)</p>
                    {selectedTrx.voidReason && (
                      <p className="text-red-700">Alasan: <span className="italic">"{selectedTrx.voidReason}"</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Product Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daftar Barang</h4>
                {loadingItems ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Memuat daftar barang...</div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-3.5 py-2.5">Produk</th>
                          <th className="px-3.5 py-2.5 text-right">Harga</th>
                          <th className="px-3.5 py-2.5 text-center">Qty</th>
                          <th className="px-3.5 py-2.5 text-right">Diskon</th>
                          <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {trxItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3.5 py-2.5 font-medium text-slate-800">{item.productName}</td>
                            <td className="px-3.5 py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3.5 py-2.5 text-center font-semibold text-slate-700">{item.quantity}</td>
                            <td className="px-3.5 py-2.5 text-right text-slate-500">
                              {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Summary Box */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedTrx.subtotal)}</span>
                  </div>
                  {selectedTrx.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Total Diskon</span>
                      <span className="font-medium">-{formatCurrency(selectedTrx.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Total Nett</span>
                    <span className="text-baby-600">{formatCurrency(selectedTrx.total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Nominal Bayar</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedTrx.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Kembalian</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedTrx.changeAmount)}</span>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
              {/* Void Prompt */}
              {showVoidPrompt && selectedTrx.status === 'completed' && (
                <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 mb-1">
                  <p className="text-xs font-semibold text-red-800 mb-2">Masukkan Alasan Pembatalan Transaksi:</p>
                  <input 
                    type="text" 
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Contoh: Salah input barang / pelanggan retur"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-red-200 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => setShowVoidPrompt(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleVoidTransaction}
                      disabled={isVoiding}
                      className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isVoiding ? 'Memproses...' : 'Konfirmasi Void'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!showVoidPrompt && (
                <div className="flex items-center gap-3 w-full">
                  <button 
                    onClick={handlePrint}
                    className="flex-1 flex justify-center items-center gap-2 bg-baby-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-baby-700 transition-colors shadow-sm text-xs"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Cetak Ulang Struk
                  </button>
                  
                  {/* Only Owner can see the Void button */}
                  {user?.role === 'owner' && selectedTrx.status === 'completed' && (
                    <button 
                      onClick={() => setShowVoidPrompt(true)}
                      className="flex items-center justify-center bg-red-50 text-red-600 border border-red-100 font-semibold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors text-xs"
                      title="Batalkan Transaksi"
                    >
                      Batalkan Transaksi
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedTrx(null)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-xs"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PRINT ONLY: POS-80 Thermal Receipt Container */}
          <div className="hidden print:block pos-receipt">
            {selectedTrx.status === 'voided' && (
              <div className="text-center font-bold text-red-600 mb-2 uppercase border border-red-600 p-1 print:text-black print:border-black">
                *** VOIDED ***
              </div>
            )}
            <ReceiptContent
              storeName={storeSettings.storeName}
              storeAddress={storeSettings.storeAddress}
              storePhone={storeSettings.storePhone}
              receiptNumber={selectedTrx.receiptNumber}
              cashierName={selectedTrx.cashierName || 'Kasir'}
              timestamp={selectedTrx.createdAt}
              items={trxItems.map(item => ({
                name: item.productName,
                price: item.unitPrice,
                quantity: item.quantity,
                discount: item.discount || 0,
                subtotal: item.subtotal,
              }))}
              subtotal={selectedTrx.subtotal}
              totalDiscount={selectedTrx.discount}
              totalNett={selectedTrx.total}
              paymentAmount={selectedTrx.paymentAmount}
              changeAmount={selectedTrx.changeAmount}
              footerTitle={storeSettings.footerTitle}
              footerSub={storeSettings.footerSub}
            />
          </div>

        </div>
      )}
    </>
  );
}
