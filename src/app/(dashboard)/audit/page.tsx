'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditLog, AuditAction } from '@/types/audit';
import { useToast } from '@/hooks/useToast';

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

export default function AuditLogPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  
  // Date filter
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
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(actionFilter && { action: actionFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(search && { search })
      });

      const res = await fetch(`/api/audit?${params.toString()}`);
      
      if (res.status === 401 || res.status === 403) {
        showToast('Akses ditolak. Fitur ini hanya untuk Owner.', 'error');
        router.push('/dashboard');
        return;
      }
      
      const data = await res.json();
      
      if (data.success) {
        setLogs(data.data.data);
        setTotalPages(data.data.meta.totalPages || 1);
      } else {
        showToast(data.error?.message || 'Gagal memuat log audit', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, startDate, endDate, search, router, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getActionBadge = (action: AuditAction) => {
    const styles: Record<AuditAction, string> = {
      CREATE: 'bg-green-100 text-green-700',
      UPDATE: 'bg-blue-100 text-blue-700',
      DELETE: 'bg-red-100 text-red-700',
      VOID: 'bg-orange-100 text-orange-700',
      LOGIN: 'bg-slate-100 text-slate-700',
      LOGOUT: 'bg-slate-100 text-slate-700',
    };
    return <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${styles[action] || 'bg-gray-100 text-gray-700'}`}>{action}</span>;
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau seluruh aktivitas pengguna dan perubahan data sistem</p>
        </div>
        <button onClick={() => fetchLogs()} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Top Row: Search & Action */}
        <div className="flex flex-wrap gap-3">
          <input 
            type="text" 
            placeholder="Cari (User / Entitas)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchLogs())}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-baby-500 min-w-[200px]"
          />
          <select 
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-baby-500 bg-white"
          >
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="VOID">VOID</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
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
                <th className="px-4 py-3 whitespace-nowrap">User</th>
                <th className="px-4 py-3 whitespace-nowrap">Aksi</th>
                <th className="px-4 py-3 whitespace-nowrap">Modul / Entitas</th>
                <th className="px-4 py-3 min-w-[200px]">Deskripsi</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">Tidak ada log aktivitas ditemukan</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{log.username}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{log.userRole}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 capitalize">{log.entityType}</div>
                      {log.entityId && <div className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]" title={log.entityId}>{log.entityId}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs line-clamp-2">{log.description || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        disabled={!log.oldValues && !log.newValues && !log.ipAddress}
                        className="text-baby-600 hover:text-baby-900 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Lihat
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
              >
                Sebelumnnya
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs font-medium border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Detail Audit Log</h3>
                <p className="text-xs text-slate-500 mt-0.5">ID: {selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="block text-xs font-medium text-slate-500 mb-1">IP Address</span>
                  <span className="text-slate-800 font-mono text-xs bg-slate-100 px-2 py-1 rounded">{selectedLog.ipAddress || 'Unknown'}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 mb-1">User Agent</span>
                  <span className="text-slate-800 text-xs line-clamp-2" title={selectedLog.userAgent || ''}>{selectedLog.userAgent || 'Unknown'}</span>
                </div>
              </div>

              {selectedLog.oldValues || selectedLog.newValues ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-red-100 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-3 py-2 border-b border-red-100 text-xs font-semibold text-red-800">
                      Sebelum (Old Values)
                    </div>
                    <pre className="p-3 text-[10px] font-mono text-slate-700 bg-white overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.oldValues ? JSON.stringify(selectedLog.oldValues, null, 2) : 'Null'}
                    </pre>
                  </div>
                  <div className="border border-green-100 rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-3 py-2 border-b border-green-100 text-xs font-semibold text-green-800">
                      Sesudah (New Values)
                    </div>
                    <pre className="p-3 text-[10px] font-mono text-slate-700 bg-white overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.newValues ? JSON.stringify(selectedLog.newValues, null, 2) : 'Null'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                  <span className="text-sm text-slate-500">Tidak ada payload data yang direkam untuk aksi ini.</span>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
