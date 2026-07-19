'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import type { Transaction, TransactionItem } from '@/types/transaction';
import './print.css';

type DatePreset = 'today' | '7days' | '30days' | 'this-month' | 'custom';

function getPresetDates(p: DatePreset) {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];
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
    <div className="space-y-6 animate-in print:p-0 print:m-0">
      
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
                        <button className="text-baby-600 hover:bg-baby-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                          Detail
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

      {/* ---------- MODAL DETAIL / RECEIPT (VISIBLE ON SCREEN & PRINTED) ---------- */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in print:relative print:inset-auto print:bg-transparent print:p-0">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden print:w-[80mm] print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
            
            {/* Modal Header (Screen Only) */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <h3 className="text-sm font-semibold text-slate-900">Detail Struk</h3>
              <button onClick={() => setSelectedTrx(null)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>
            
            {/* Receipt Area (POS-80 Format) */}
            <div className="p-4 overflow-y-auto print:overflow-visible print:p-0 pos-receipt font-mono text-xs text-black">
              <div className="text-center mb-4">
                <h2 className="text-base font-bold uppercase mb-1">SUMBER BABY SHOP</h2>
                <p className="text-[10px] leading-tight">Jl. Raya Baby shop No. 123</p>
                <p className="text-[10px] leading-tight">Telp: 0812-3456-7890</p>
              </div>

              <div className="border-t border-dashed border-black/30 py-2 mb-2 text-[10px]">
                <div className="flex justify-between"><span>No.struk</span><span>{selectedTrx.receiptNumber}</span></div>
                <div className="flex justify-between"><span>Oleh</span><span className="uppercase">{selectedTrx.cashierName}</span></div>
                <div className="flex justify-between"><span>Tanggal & jam</span><span>{formatDateTime(selectedTrx.createdAt)}</span></div>
                {selectedTrx.status === 'voided' && (
                  <div className="text-center font-bold text-red-600 mt-1 uppercase border border-red-600 p-0.5 print:text-black print:border-black">*** VOIDED ***</div>
                )}
              </div>

              <div className="border-t border-dashed border-black/30 pt-2 mb-2">
                <div className="flex justify-between text-[10px] font-bold mb-1 pb-1 border-b border-dashed border-black/30">
                  <span>Barang</span>
                  <div className="flex gap-2 text-right">
                    <span className="w-14">Harga</span>
                    <span className="w-6">Jml</span>
                    <span className="w-16">Total</span>
                  </div>
                </div>
                {loadingItems ? (
                  <div className="text-center py-4 print:hidden">Memuat barang...</div>
                ) : (
                  trxItems.map((item, idx) => (
                    <div key={idx} className="mb-1 text-[10px]">
                      <div className="font-semibold line-clamp-1">{item.productName}</div>
                      <div className="flex justify-between">
                        <span className="opacity-0">-</span>
                        <div className="flex gap-2 text-right">
                          <span className="w-14">{fmt(item.unitPrice)}</span>
                          <span className="w-6">{item.quantity}</span>
                          <span className="w-16">{fmt(item.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-dashed border-black/30 pt-2 text-[10px]">
                <div className="flex justify-between mb-0.5"><span>Sub total</span><span>{fmt(selectedTrx.subtotal)}</span></div>
                {selectedTrx.discount > 0 && <div className="flex justify-between mb-0.5"><span>Diskon</span><span>-{fmt(selectedTrx.discount)}</span></div>}
                {selectedTrx.discount > 0 && <div className="flex justify-between mb-0.5"><span>Total diskon</span><span>-{fmt(selectedTrx.discount)}</span></div>}
                <div className="flex justify-between font-bold text-sm mt-1 border-t border-black/10 pt-1"><span>Total nett</span><span>{fmt(selectedTrx.total)}</span></div>
              </div>

              <div className="mt-2 pt-2 border-t border-dashed border-black/30 text-[10px]">
                <div className="flex justify-between"><span>Tunai</span><span>{fmt(selectedTrx.paymentAmount)}</span></div>
                <div className="flex justify-between"><span>Kembalian</span><span>{fmt(selectedTrx.changeAmount)}</span></div>
              </div>

              <div className="text-center mt-6 text-[10px] border-t border-dashed border-black/30 pt-4">
                <p>TERIMA KASIH</p>
                <p>SELAMAT BELANJA KEMBALI</p>
              </div>
            </div>
            
            {/* Modal Footer (Screen Only) */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 print:hidden">
              {/* Void Prompt */}
              {showVoidPrompt && selectedTrx.status === 'completed' && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-2">
                  <p className="text-xs font-semibold text-red-800 mb-2">Alasan Pembatalan:</p>
                  <input 
                    type="text" 
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Contoh: Salah input barang"
                    className="w-full px-2 py-1 text-sm border border-red-200 rounded mb-2 outline-none focus:border-red-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleVoidTransaction}
                      disabled={isVoiding}
                      className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isVoiding ? 'Memproses...' : 'Konfirmasi Void'}
                    </button>
                    <button 
                      onClick={() => setShowVoidPrompt(false)}
                      className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded text-xs font-medium"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!showVoidPrompt && (
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={handlePrint}
                    className="flex-1 flex justify-center items-center gap-2 bg-baby-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-baby-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Cetak Ulang
                  </button>
                  
                  {/* Only Owner can see the Void button */}
                  {user?.role === 'owner' && selectedTrx.status === 'completed' && (
                    <button 
                      onClick={() => setShowVoidPrompt(true)}
                      className="flex items-center justify-center bg-red-100 text-red-600 font-medium py-2 px-4 rounded-lg hover:bg-red-200 transition-colors"
                      title="Batalkan Transaksi"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
