'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { type PurchaseOrder } from '@/types/purchase';
import { type ProductBatch } from '@/types/batch';

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'batches'>('purchases');

  // Purchase orders state
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [poPage, setPoPage] = useState(1);
  const [poTotalPages, setPoTotalPages] = useState(1);

  // Detail / Edit / Delete Modals State
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [poDetailLoading, setPoDetailLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSource, setEditSource] = useState('');
  const [editRefNum, setEditRefNum] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batches state
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatus, setBatchStatus] = useState('active');
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotalPages, setBatchTotalPages] = useState(1);

  const { addToast } = useToast();

  // Fetch Purchase Orders
  const fetchPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`/api/purchases?page=${poPage}&limit=15`);
      const json = await res.json();
      if (json.success) {
        setPurchases(json.data);
        if (json.meta) {
          setPoTotalPages(json.meta.totalPages || 1);
        }
      }
    } catch {
      addToast('Gagal memuat data pembelian', 'error');
    } finally {
      setLoadingPurchases(false);
    }
  }, [poPage, addToast]);

  // Fetch Batches
  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(batchPage),
        limit: '15',
        status: batchStatus,
      });
      if (batchSearch) queryParams.set('search', batchSearch);

      const res = await fetch(`/api/batches?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setBatches(json.data);
        if (json.meta) {
          setBatchTotalPages(json.meta.totalPages || 1);
        }
      }
    } catch {
      addToast('Gagal memuat data batch produk', 'error');
    } finally {
      setLoadingBatches(false);
    }
  }, [batchPage, batchStatus, batchSearch, addToast]);

  useEffect(() => {
    if (activeTab === 'purchases') fetchPurchases();
    if (activeTab === 'batches') fetchBatches();
  }, [activeTab, fetchPurchases, fetchBatches]);

  // ---- Open Detail Modal ----
  const handleOpenDetail = async (po: PurchaseOrder) => {
    setSelectedPo(po);
    setIsDetailModalOpen(true);
    setPoDetailLoading(true);

    try {
      const res = await fetch(`/api/purchases/${po.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedPo(json.data);
      }
    } catch {
      addToast('Gagal memuat detail barang masuk', 'error');
    } finally {
      setPoDetailLoading(false);
    }
  };

  // ---- Open Edit Modal ----
  const handleOpenEdit = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setEditSource(po.source || '');
    setEditRefNum(po.referenceNumber || '');
    setEditNotes(po.notes || '');
    setIsEditModalOpen(true);
  };

  // ---- Save Edit PO Header ----
  const handleSaveEdit = async () => {
    if (!selectedPo) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/purchases/${selectedPo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: editSource || null,
          referenceNumber: editRefNum || null,
          notes: editNotes || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        addToast('Data penerimaan barang berhasil diperbarui', 'success');
        setIsEditModalOpen(false);
        fetchPurchases();
      } else {
        addToast(json.error?.message || 'Gagal mengupdate data', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan saat mengupdate data', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ---- Open Delete Modal ----
  const handleOpenDelete = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setIsDeleteModalOpen(true);
  };

  // ---- Confirm Delete / Cancel PO ----
  const handleConfirmDelete = async () => {
    if (!selectedPo) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/purchases/${selectedPo.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (json.success) {
        addToast(json.data?.message || 'Pembelian berhasil dibatalkan & stok dikembalikan', 'success');
        setIsDeleteModalOpen(false);
        fetchPurchases();
      } else {
        addToast(json.error?.message || 'Gagal membatalkan pembelian', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan saat membatalkan pembelian', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val / 100);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Helper for expiry urgency badge
  const getExpiryBadge = (expStr?: string | null) => {
    if (!expStr) return <span className="text-slate-400 text-xs">-</span>;
    const exp = new Date(expStr);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          Kedaluwarsa
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          H-{diffDays} Hari
        </span>
      );
    }
    if (diffDays <= 90) {
      return (
        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          {diffDays} Hari
        </span>
      );
    }
    return <span className="text-xs text-slate-700">{formatDate(expStr)}</span>;
  };

  return (
    <div className="space-y-6 animate-in">

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pembelian & Manajemen Batch Stok</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola penerimaan barang masuk, lot supplier, dan pemantauan masa kedaluwarsa</p>
        </div>

        <Link
          href="/purchases/new"
          className="inline-flex items-center justify-center gap-2 bg-baby-600 text-white font-semibold py-2 px-4 rounded-xl hover:bg-baby-700 transition-colors text-xs shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Catat Barang Masuk Baru
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'purchases'
              ? 'text-baby-600 border-b-2 border-baby-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
          Riwayat Barang Masuk
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'batches'
              ? 'text-baby-600 border-b-2 border-baby-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          Batch Stok & Expired Tracker
        </button>
      </div>

      {/* TAB 1: PURCHASES HISTORY */}
      {activeTab === 'purchases' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">No. PO / Nota</th>
                  <th className="px-4 py-3">Sumber / Tempat Beli</th>
                  <th className="px-4 py-3">Penerima</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total Pembelian</th>
                  <th className="px-4 py-3 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loadingPurchases ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Memuat riwayat barang masuk...</td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Belum ada riwayat pembelian.</td>
                  </tr>
                ) : (
                  purchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600">{formatDate(po.createdAt)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-baby-600">{po.poNumber}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{po.source || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{po.receivedByName || '-'}</td>
                      <td className="px-4 py-3">
                        {po.status === 'cancelled' ? (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            Diterima
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(po.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetail(po)}
                            className="p-1.5 text-slate-400 hover:text-baby-600 hover:bg-baby-50 rounded-lg transition-colors"
                            title="Lihat Detail"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {po.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(po)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit Info Pembelian"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleOpenDelete(po)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Batalkan & Hapus"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loadingPurchases && poTotalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Halaman {poPage} dari {poTotalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPoPage((p) => Math.max(1, p - 1))}
                  disabled={poPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setPoPage((p) => Math.min(poTotalPages, p + 1))}
                  disabled={poPage === poTotalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BATCH & EXPIRY TRACKER */}
      {activeTab === 'batches' && (
        <div className="space-y-4">

          {/* Batch Filters */}
          <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <input
              type="text"
              placeholder="Cari No. Batch, Nama Produk, SKU..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setBatchPage(1), fetchBatches())}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-baby-500 min-w-[240px]"
            />

            <select
              value={batchStatus}
              onChange={(e) => { setBatchStatus(e.target.value); setBatchPage(1); }}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-baby-500 bg-white"
            >
              <option value="active">Stok Aktif (Tersedia)</option>
              <option value="depleted">Stok Habis</option>
              <option value="expired">Kedaluwarsa</option>
              <option value="all">Semua Batch</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No. Batch / Lot</th>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3 text-center">Sisa Stok / Diterima</th>
                    <th className="px-4 py-3 text-right">Harga Modal (Net)</th>
                    <th className="px-4 py-3 text-center">Tgl Kedaluwarsa</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loadingBatches ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">Memuat data batch produk...</td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">Tidak ada batch produk ditemukan.</td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{batch.batchNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{batch.productName || 'Produk'}</p>
                          <p className="text-[10px] text-slate-400">SKU: {batch.productSku || '-'} | Barcode: {batch.productBarcode || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          <span className="text-baby-600">{batch.quantityRemaining}</span>
                          <span className="text-slate-400 font-normal"> / {batch.quantityReceived}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatCurrency(batch.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getExpiryBadge(batch.expiredDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {batch.status === 'active' && (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Tersedia</span>
                          )}
                          {batch.status === 'depleted' && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Habis</span>
                          )}
                          {batch.status === 'expired' && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">Kedaluwarsa</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loadingBatches && batchTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Halaman {batchPage} dari {batchTotalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setBatchPage((p) => Math.max(1, p - 1))}
                    disabled={batchPage === 1}
                    className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setBatchPage((p) => Math.min(batchTotalPages, p + 1))}
                    disabled={batchPage === batchTotalPages}
                    className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-baby-50 text-baby-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Detail Penerimaan Barang</h3>
                  <p className="text-xs text-slate-500">No. PO: <span className="font-mono font-bold text-baby-600">{selectedPo.poNumber}</span></p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400">Tanggal Masuk</p>
                  <p className="font-semibold text-slate-800">{formatDate(selectedPo.createdAt)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Penerima</p>
                  <p className="font-semibold text-slate-800">{selectedPo.receivedByName || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Sumber / Toko</p>
                  <p className="font-semibold text-slate-800">{selectedPo.source || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">No. Referensi / Nota</p>
                  <p className="font-semibold text-slate-800">{selectedPo.referenceNumber || '-'}</p>
                </div>
              </div>

              {selectedPo.notes && (
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                  <p className="text-slate-500 font-semibold mb-0.5">Catatan:</p>
                  <p className="text-slate-700">{selectedPo.notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Daftar Barang Masuk</h4>
                {poDetailLoading ? (
                  <p className="text-center py-6 text-slate-400">Memuat rincian item...</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 font-semibold border-b text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Produk</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Harga Beli</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                          <th className="px-3 py-2 text-center">Exp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedPo.items || []).map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 font-medium text-slate-900">{item.productName}</td>
                            <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                            <td className="px-3 py-2 text-center">{formatDate(item.expiredDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span>Grand Total</span>
                <span className="text-baby-600">{formatCurrency(selectedPo.grandTotal)}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Edit Info Pembelian</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sumber / Place of Purchase</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  placeholder="Misal: Toko Grosir Jaya / Supplier A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-baby-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. Referensi / No. Nota</label>
                <input
                  type="text"
                  value={editRefNum}
                  onChange={(e) => setEditRefNum(e.target.value)}
                  placeholder="Misal: INV-88912"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-baby-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan tambahan penerimaan barang..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-baby-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 bg-baby-600 text-white rounded-xl font-bold hover:bg-baby-700 disabled:opacity-50"
              >
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE / CANCEL CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Batalkan & Hapus Barang Masuk?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pembelian <strong className="text-slate-800">{selectedPo.poNumber}</strong> akan dibatalkan. Stok produk yang diterima dari nota ini akan <strong>otomatis dikurangkan kembali</strong> dari inventaris.
            </p>

            <div className="flex justify-center gap-2 text-xs">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl font-semibold hover:bg-slate-100 w-full"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 w-full"
              >
                {isDeleting ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
