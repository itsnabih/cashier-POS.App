'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

// ============================================================
// Zod Schema — validates entire form including dynamic items
// ============================================================

const ReceiveItemSchema = z.object({
  productId: z.string().min(1, 'Pilih produk'),
  quantity: z.number().int().positive('Qty harus > 0'),
  unitCost: z.number().positive('Harga beli harus > 0'),
  expiredDate: z.string().optional().or(z.literal('')),
});

const ReceiveFormSchema = z.object({
  supplierId: z.string().min(1, 'Pilih supplier'),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z.array(ReceiveItemSchema).min(1, 'Tambahkan minimal 1 item'),
});

type ReceiveFormValues = z.infer<typeof ReceiveFormSchema>;

// ============================================================
// Supporting types
// ============================================================

interface Supplier { id: string; name: string; }

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  buyPrice?: number;
  sellPrice: number;
}

// ============================================================
// Component
// ============================================================

export default function ReceiveGoodsForm() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const router = useRouter();
  const { addToast } = useToast();

  // ---- react-hook-form + zod ----
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveFormValues, unknown, ReceiveFormValues>({
    resolver: zodResolver(ReceiveFormSchema),
    defaultValues: {
      supplierId: '',
      notes: '',
      items: [],
    },
  });

  // ---- useFieldArray for dynamic item rows ----
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // ---- Watch all items for MAC preview ----
  const watchedItems = useWatch({ control, name: 'items' });

  // ---- Fetch reference data ----
  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers?all=true').then((r) => r.json()),
      fetch('/api/products?limit=200&active=true').then((r) => r.json()),
    ])
      .then(([supData, prodData]) => {
        if (supData.success) setSuppliers(supData.data);
        if (prodData.success) setProducts(prodData.data);
      })
      .catch(() => addToast('Gagal memuat data referensi', 'error'))
      .finally(() => setLoadingRef(false));
  }, [addToast]);

  // ---- MAC preview calculations (derived, not stored) ----
  const macPreviews = useMemo(() => {
    if (!watchedItems) return [];
    return watchedItems.map((item) => {
      const product = products.find((p) => p.id === item?.productId);
      if (!product) return { newAvgCost: 0, newStock: 0, currentStock: 0, subtotal: 0 };

      const oldStock = product.stock;
      const oldCost = product.buyPrice ?? 0; // already in sen
      const newQty = Number(item?.quantity) || 0;
      const newCostSen = Math.round((Number(item?.unitCost) || 0) * 100);
      const subtotal = newQty * (Number(item?.unitCost) || 0);

      let newAvgCost = newCostSen;
      if (oldStock + newQty > 0) {
        newAvgCost = Math.round(
          (oldStock * oldCost + newQty * newCostSen) / (oldStock + newQty)
        );
      }

      return {
        currentStock: oldStock,
        newStock: oldStock + newQty,
        newAvgCost,
        subtotal,
      };
    });
  }, [watchedItems, products]);

  // ---- Total purchase amount ----
  const totalAmount = useMemo(() => {
    return macPreviews.reduce((sum, p) => sum + p.subtotal, 0);
  }, [macPreviews]);

  // ---- Add item row ----
  function addItem() {
    append({ productId: '', quantity: 1, unitCost: 0, expiredDate: '' });
  }

  // ---- Submit ----
  async function onSubmit(values: ReceiveFormValues) {
    const payload = {
      supplierId: values.supplierId,
      notes: values.notes || null,
      autoReceive: true,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: Math.round(item.unitCost * 100), // Rupiah → sen
        expiredDate: item.expiredDate || null,
      })),
    };

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        addToast(data.error?.message || 'Gagal menyimpan penerimaan', 'error');
        return;
      }

      addToast(`Penerimaan ${data.data.poNumber} berhasil disimpan`, 'success');
      router.push('/purchases');
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    }
  }

  if (loadingRef) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-400">Memuat data referensi...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
      {/* === Header === */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Penerimaan Barang</h2>
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label htmlFor="rcv-supplier" className="block text-xs font-medium text-slate-600 mb-1.5">
              Supplier <span className="text-red-400">*</span>
            </label>
            <select
              {...register('supplierId')}
              id="rcv-supplier"
              className={inputCls(errors.supplierId)}
            >
              <option value="">Pilih Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="mt-1 text-xs text-red-500">{errors.supplierId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="rcv-notes" className="block text-xs font-medium text-slate-600 mb-1.5">
              Catatan
            </label>
            <input
              {...register('notes')}
              id="rcv-notes"
              type="text"
              className={inputCls()}
              placeholder="No. faktur, keterangan, dll."
            />
          </div>
        </div>
      </section>

      {/* === Items Table === */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Daftar Barang</h2>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
          >
            + Tambah Item
          </button>
        </div>

        {errors.items?.root && (
          <p className="mb-3 text-xs text-red-500">{errors.items.root.message}</p>
        )}
        {errors.items?.message && (
          <p className="mb-3 text-xs text-red-500">{errors.items.message}</p>
        )}

        {fields.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            Belum ada item. Klik &quot;Tambah Item&quot; untuk memulai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 w-[240px]">Produk</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-20">Stok</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-20">Qty</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-32">Harga Beli (Rp)</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-28">Subtotal</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-slate-500 w-32">Kedaluwarsa</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-28">MAC Baru</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const preview = macPreviews[index];
                  const itemErrors = errors.items?.[index];

                  return (
                    <tr key={field.id} className="border-b border-slate-100 animate-in">
                      {/* Product */}
                      <td className="py-2 px-2">
                        <select
                          {...register(`items.${index}.productId`)}
                          className={inputCls(itemErrors?.productId) + ' text-sm'}
                        >
                          <option value="">Pilih produk</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sku ? `(${p.sku})` : ''}
                            </option>
                          ))}
                        </select>
                        {itemErrors?.productId && (
                          <p className="text-[10px] text-red-500 mt-0.5">{itemErrors.productId.message}</p>
                        )}
                      </td>

                      {/* Current stock (derived) */}
                      <td className="py-2 px-2 text-right text-slate-500 tabular-nums">
                        {preview?.currentStock ?? '-'}
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2">
                        <input
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          type="number"
                          className={inputCls(itemErrors?.quantity) + ' text-right tabular-nums'}
                          min={1}
                        />
                      </td>

                      {/* Unit cost */}
                      <td className="py-2 px-2">
                        <input
                          {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                          type="number"
                          className={inputCls(itemErrors?.unitCost) + ' text-right tabular-nums'}
                          min={0}
                        />
                      </td>

                      {/* Subtotal (derived) */}
                      <td className="py-2 px-2 text-right text-slate-700 tabular-nums font-medium">
                        {preview?.subtotal
                          ? preview.subtotal.toLocaleString('id-ID')
                          : '-'}
                      </td>

                      {/* Expired date */}
                      <td className="py-2 px-2">
                        <input
                          {...register(`items.${index}.expiredDate`)}
                          type="date"
                          className={inputCls() + ' text-xs'}
                        />
                      </td>

                      {/* MAC preview (derived) */}
                      <td className="py-2 px-2 text-right">
                        {preview && preview.newAvgCost > 0 && (
                          <span className="text-xs tabular-nums text-indigo-600 font-medium">
                            {(preview.newAvgCost / 100).toLocaleString('id-ID')}
                          </span>
                        )}
                      </td>

                      {/* Remove */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none"
                          aria-label="Hapus item"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: MAC explanation + total */}
        {fields.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              MAC = (Stok Lama x Harga Lama + Qty Baru x Harga Baru) / (Stok Lama + Qty Baru)
            </p>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Pembelian</p>
              <p className="text-base font-semibold text-slate-800 tabular-nums">
                Rp {totalAmount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* === Actions === */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/purchases')}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting || fields.length === 0}
          className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Memproses...' : 'Terima Barang'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Shared input class helper
// ============================================================

function inputCls(error?: object): string {
  const base = 'w-full px-2 py-1.5 text-sm border rounded bg-white outline-none transition-colors text-slate-900';
  return error
    ? `${base} border-red-300 focus:border-red-500`
    : `${base} border-slate-200 focus:border-indigo-500`;
}
