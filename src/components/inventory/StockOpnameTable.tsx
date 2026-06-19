'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

// ============================================================
// StockOpnameTable — Interactive stock reconciliation
//
// Flow:
// 1. Loads all active products with system stock
// 2. User inputs physical count per product
// 3. System calculates difference (physical - system)
// 4. User adds reason/notes for each discrepancy
// 5. On submit → POST /api/stock-opname (creates session)
// 6. On finalize → POST /api/stock-opname/[id]/finalize
//      → adjusts stock, records shrinkage to P&L
// ============================================================

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  buyPrice?: number;
  unit: string;
  categoryName?: string;
}

interface OpnameRow {
  productId: string;
  productName: string;
  sku: string | null;
  unit: string;
  systemStock: number;
  physicalStock: number | '';
  difference: number;
  lossValue: number;
  unitCost: number;
  reason: string;
}

type FilterMode = 'all' | 'discrepancy' | 'filled';

export default function StockOpnameTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<OpnameRow[]>([]);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addToast } = useToast();

  // Load products
  useEffect(() => {
    fetch('/api/products?limit=500&active=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const prods: Product[] = data.data;
          setProducts(prods);
          setRows(
            prods.map((p) => ({
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              unit: p.unit || 'pcs',
              systemStock: p.stock,
              physicalStock: '',
              difference: 0,
              lossValue: 0,
              unitCost: p.buyPrice ?? 0,
              reason: '',
            }))
          );
        }
      })
      .catch(() => addToast('Gagal memuat data produk', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  // Update physical stock for a product
  const updatePhysicalStock = useCallback((productId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.productId !== productId) return row;
        const physical = value === '' ? '' : Math.max(0, parseInt(value) || 0);
        const diff = physical === '' ? 0 : physical - row.systemStock;
        const lossVal = diff < 0 ? Math.abs(diff) * row.unitCost : 0;
        return { ...row, physicalStock: physical, difference: diff, lossValue: lossVal };
      })
    );
  }, []);

  // Update reason for a product
  const updateReason = useCallback((productId: string, reason: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.productId === productId ? { ...row, reason } : row
      )
    );
  }, []);

  // Filter and search
  const filteredRows = rows.filter((row) => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !row.productName.toLowerCase().includes(term) &&
        !(row.sku || '').toLowerCase().includes(term)
      ) {
        return false;
      }
    }

    // Tab filter
    if (filter === 'discrepancy') return row.physicalStock !== '' && row.difference !== 0;
    if (filter === 'filled') return row.physicalStock !== '';
    return true;
  });

  // Summary stats
  const filledCount = rows.filter((r) => r.physicalStock !== '').length;
  const discrepancyCount = rows.filter((r) => r.physicalStock !== '' && r.difference !== 0).length;
  const totalShrinkage = rows
    .filter((r) => r.difference < 0)
    .reduce((sum, r) => sum + r.lossValue, 0);
  const totalSurplus = rows
    .filter((r) => r.difference > 0)
    .reduce((sum, r) => sum + r.difference * r.unitCost, 0);

  async function handleSubmit() {
    // Only submit rows where physical stock was entered
    const filledRows = rows.filter((r) => r.physicalStock !== '');

    if (filledRows.length === 0) {
      addToast('Masukkan stok fisik minimal 1 produk', 'warning');
      return;
    }

    // Validate reasons for discrepancies
    const missingReasons = filledRows.filter(
      (r) => r.difference !== 0 && !r.reason.trim()
    );
    if (missingReasons.length > 0) {
      addToast(`${missingReasons.length} item dengan selisih belum memiliki alasan`, 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes || null,
          items: filledRows.map((r) => ({
            productId: r.productId,
            physicalStock: r.physicalStock as number,
            reason: r.reason || null,
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        addToast(data.error?.message || 'Gagal membuat stok opname', 'error');
        setSubmitting(false);
        return;
      }

      addToast(`Stok opname ${data.data.opnameNumber} berhasil dibuat`, 'success');
      router.push('/stock-opname');
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-400">Memuat data produk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari produk atau SKU..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors text-slate-900"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
            {([
              { key: 'all', label: `Semua (${rows.length})` },
              { key: 'filled', label: `Diisi (${filledCount})` },
              { key: 'discrepancy', label: `Selisih (${discrepancyCount})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan opname..."
            className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors text-slate-900"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Total Produk" value={String(rows.length)} />
        <SummaryCard label="Sudah Dihitung" value={`${filledCount} / ${rows.length}`} />
        <SummaryCard
          label="Penyusutan (Shrinkage)"
          value={`Rp ${(totalShrinkage / 100).toLocaleString('id-ID')}`}
          danger={totalShrinkage > 0}
        />
        <SummaryCard
          label="Surplus"
          value={`Rp ${(totalSurplus / 100).toLocaleString('id-ID')}`}
          success={totalSurplus > 0}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Produk</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 w-16">Satuan</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-24">Stok Sistem</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-28">Stok Fisik</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-24">Selisih</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 w-32">Nilai Kerugian</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 min-w-[160px]">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-slate-400">
                    {searchTerm ? 'Tidak ada produk yang cocok.' : 'Tidak ada data.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.productId}
                    className={`border-b border-slate-100 transition-colors ${
                      row.difference < 0
                        ? 'bg-red-50/40'
                        : row.difference > 0
                        ? 'bg-emerald-50/40'
                        : ''
                    }`}
                  >
                    {/* Product info */}
                    <td className="py-2.5 px-4">
                      <p className="text-sm text-slate-800 font-medium">{row.productName}</p>
                      {row.sku && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.sku}</p>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-3 text-center text-slate-500 text-xs">{row.unit}</td>

                    {/* System stock */}
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-700">
                      {row.systemStock}
                    </td>

                    {/* Physical stock input */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={row.physicalStock}
                        onChange={(e) => updatePhysicalStock(row.productId, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 rounded bg-white focus:border-indigo-500 outline-none tabular-nums text-slate-900"
                        min={0}
                        placeholder="-"
                      />
                    </td>

                    {/* Difference */}
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                      {row.physicalStock === '' ? (
                        <span className="text-slate-300">-</span>
                      ) : row.difference === 0 ? (
                        <span className="text-slate-400">0</span>
                      ) : row.difference < 0 ? (
                        <span className="text-red-600">{row.difference}</span>
                      ) : (
                        <span className="text-emerald-600">+{row.difference}</span>
                      )}
                    </td>

                    {/* Loss value */}
                    <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                      {row.lossValue > 0 ? (
                        <span className="text-red-600 font-medium">
                          {(row.lossValue / 100).toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-2.5 px-3">
                      {row.physicalStock !== '' && row.difference !== 0 ? (
                        <input
                          type="text"
                          value={row.reason}
                          onChange={(e) => updateReason(row.productId, e.target.value)}
                          className={`w-full px-2 py-1.5 text-xs border rounded bg-white outline-none transition-colors text-slate-900 ${
                            !row.reason.trim()
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-slate-200 focus:border-indigo-500'
                          }`}
                          placeholder="Wajib diisi"
                        />
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Stok opname akan menyesuaikan stok sistem ke stok fisik. Selisih kurang dicatat sebagai penyusutan (shrinkage).
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/stock-opname')}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || filledCount === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Memproses...' : 'Simpan Opname'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Summary Card sub-component
// ============================================================
function SummaryCard({
  label,
  value,
  danger,
  success,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p
        className={`text-lg font-semibold tabular-nums ${
          danger ? 'text-red-600' : success ? 'text-emerald-600' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
