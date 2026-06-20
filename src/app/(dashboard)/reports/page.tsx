'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/lib/rbac';
import { exportProfitLossExcel, exportCashFlowExcel, exportBestSellersExcel } from '@/utils/export-excel';
import { exportProfitLossPDF, exportCashFlowPDF, exportBestSellersPDF } from '@/utils/export-pdf';

// ============================================================
// Reports Page — Owner/Admin financial reports
// ============================================================

type ReportTab = 'profit-loss' | 'cash-flow' | 'best-sellers';
type DatePreset = 'today' | '7days' | '30days' | 'this-month' | 'custom';

// ---- Format currency ----
function fmtRp(cents: number): string {
  return 'Rp ' + (cents / 100).toLocaleString('id-ID');
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const todayStr = formatDate(today);

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case '7days': {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: formatDate(d), to: todayStr };
    }
    case '30days': {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { from: formatDate(d), to: todayStr };
    }
    case 'this-month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatDate(first), to: todayStr };
    }
    default:
      return { from: todayStr, to: todayStr };
  }
}

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const canViewProfit = hasPermission(PERMISSIONS.REPORT_PROFIT);

  const [activeTab, setActiveTab] = useState<ReportTab>(canViewProfit ? 'profit-loss' : 'cash-flow');
  const [preset, setPreset] = useState<DatePreset>('30days');
  const [dateFrom, setDateFrom] = useState(() => getPresetDates('30days').from);
  const [dateTo, setDateTo] = useState(() => getPresetDates('30days').to);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Report data states
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [bestSellers, setBestSellers] = useState<any>(null);

  // ---- Preset handler ----
  const handlePreset = (p: DatePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const dates = getPresetDates(p);
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  };

  // ---- Fetch report data ----
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = `from=${dateFrom}&to=${dateTo}`;

      if (activeTab === 'profit-loss' && canViewProfit) {
        const res = await fetch(`/api/reports/profit-loss?${params}`);
        const data = await res.json();
        if (data.success) setProfitLoss(data.data);
      } else if (activeTab === 'cash-flow') {
        const res = await fetch(`/api/reports/cash-flow?${params}`);
        const data = await res.json();
        if (data.success) setCashFlow(data.data);
      } else if (activeTab === 'best-sellers') {
        const res = await fetch(`/api/reports/best-sellers?${params}`);
        const data = await res.json();
        if (data.success) setBestSellers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo, canViewProfit]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ---- Export handlers ----
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (activeTab === 'profit-loss' && profitLoss) await exportProfitLossExcel(profitLoss);
      else if (activeTab === 'cash-flow' && cashFlow) await exportCashFlowExcel(cashFlow);
      else if (activeTab === 'best-sellers' && bestSellers) await exportBestSellersExcel(bestSellers);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'profit-loss' && profitLoss) exportProfitLossPDF(profitLoss);
    else if (activeTab === 'cash-flow' && cashFlow) exportCashFlowPDF(cashFlow);
    else if (activeTab === 'best-sellers' && bestSellers) exportBestSellersPDF(bestSellers);
  };

  const hasData = (activeTab === 'profit-loss' && profitLoss) ||
    (activeTab === 'cash-flow' && cashFlow) ||
    (activeTab === 'best-sellers' && bestSellers);

  // ---- Tab definitions ----
  const tabs: { key: ReportTab; label: string; show: boolean }[] = [
    { key: 'profit-loss', label: 'Laba Rugi', show: canViewProfit },
    { key: 'cash-flow', label: 'Arus Kas', show: true },
    { key: 'best-sellers', label: 'Best Seller', show: true },
  ];

  const presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Hari Ini' },
    { key: '7days', label: '7 Hari' },
    { key: '30days', label: '30 Hari' },
    { key: 'this-month', label: 'Bulan Ini' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">Analisis kinerja bisnis Anda</p>
        </div>

        {/* Export Buttons */}
        {hasData && (
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {tabs.filter(t => t.show).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              preset === p.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-slate-400">
          <div className="inline-block w-6 h-6 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Memuat data laporan...</p>
        </div>
      )}

      {/* Tab Content */}
      {!loading && activeTab === 'profit-loss' && profitLoss && (
        <ProfitLossReport data={profitLoss} />
      )}
      {!loading && activeTab === 'cash-flow' && cashFlow && (
        <CashFlowReport data={cashFlow} />
      )}
      {!loading && activeTab === 'best-sellers' && bestSellers && (
        <BestSellersReport data={bestSellers} />
      )}
    </div>
  );
}

// ============================================================
// Profit/Loss Tab
// ============================================================

function ProfitLossReport({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <SummaryCard label="Total Omset" value={fmtRp(data.summary.totalRevenue)} />
        <SummaryCard label="Total HPP" value={fmtRp(data.summary.totalCogs)} />
        <SummaryCard label="Total Profit" value={fmtRp(data.summary.totalProfit)} />
        <SummaryCard label="Margin" value={`${data.summary.marginPercent}%`} sub={`${data.summary.transactionCount} transaksi`} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Omset</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">HPP</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Profit</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.daily.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Tidak ada data di periode ini</td></tr>
            ) : (
              data.daily.map((row: any) => (
                <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800">{row.date}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtRp(row.revenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{fmtRp(row.cogs)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtRp(row.profit)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{row.marginPercent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Cash Flow Tab
// ============================================================

function CashFlowReport({ data }: { data: any }) {
  const methodLabel = (m: string) => m === 'cash' ? 'Tunai (Cash)' : m === 'qris' ? 'QRIS' : 'Transfer Bank';
  const methodColor = (m: string) => m === 'cash' ? 'emerald' : m === 'qris' ? 'blue' : 'purple';

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <SummaryCard label="Grand Total" value={fmtRp(data.summary.grandTotal)} sub={`${data.summary.transactionCount} transaksi`} />
        {data.byMethod.map((m: any) => (
          <SummaryCard key={m.method} label={methodLabel(m.method)} value={fmtRp(m.totalAmount)} sub={`${m.percentage}% · ${m.transactionCount} trx`} />
        ))}
      </div>

      {/* Daily Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Trx</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Total</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Tunai</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">QRIS</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Transfer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.daily.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada data di periode ini</td></tr>
            ) : (
              data.daily.map((row: any) => (
                <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800">{row.date}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{row.transactionCount}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-bold">{fmtRp(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtRp(row.cashAmount)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmtRp(row.qrisAmount)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmtRp(row.transferAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Best Sellers Tab
// ============================================================

function BestSellersReport({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <SummaryCard label="Total Qty Terjual" value={data.summary.totalQuantity.toLocaleString('id-ID')} />
        <SummaryCard label="Total Penjualan" value={fmtRp(data.summary.totalRevenue)} />
        <SummaryCard label="Total Transaksi" value={data.summary.transactionCount.toLocaleString('id-ID')} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-4 py-3 font-semibold text-slate-700 w-12">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Produk</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">SKU</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Qty</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Total Penjualan</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Trx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada data di periode ini</td></tr>
            ) : (
              data.products.map((p: any) => (
                <tr key={p.productId || p.rank} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-400 font-medium">
                    {p.rank <= 3 ? (
                      <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold text-white ${
                        p.rank === 1 ? 'bg-amber-500' : p.rank === 2 ? 'bg-slate-400' : 'bg-amber-700'
                      }`}>{p.rank}</span>
                    ) : p.rank}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{p.productName}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.productSku || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-bold">{p.totalQuantity}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmtRp(p.totalRevenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{p.transactionCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Summary Card Component
// ============================================================

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-md" style={{ border: '1px solid #cbd5e1' }}>
      <p className="font-semibold" style={{ fontSize: '0.875rem', color: '#475569' }}>{label}</p>
      <p className="font-bold truncate" style={{ fontSize: '1.5rem', color: '#000000', marginTop: '0.5rem' }}>{value}</p>
      {sub && <p className="font-medium mt-1" style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub}</p>}
    </div>
  );
}
