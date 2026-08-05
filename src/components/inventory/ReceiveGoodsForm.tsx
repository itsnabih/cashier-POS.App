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
  unitCost: z.number().min(0, 'Harga beli tidak boleh negatif'),
  expiredDate: z.string().optional().or(z.literal('')),
});

const ReceiveFormSchema = z.object({
  source: z.string().max(255).optional().or(z.literal('')),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  discountType: z.enum(['percentage', 'fixed']).optional().or(z.literal('')),
  discountValue: z.number().min(0).default(0),
  taxType: z.enum(['percentage', 'fixed']).optional().or(z.literal('')),
  taxValue: z.number().min(0).default(0),
  items: z.array(ReceiveItemSchema).min(1, 'Tambahkan minimal 1 item'),
});

type ReceiveFormValues = z.infer<typeof ReceiveFormSchema>;

// ============================================================
// Supporting types
// ============================================================

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const router = useRouter();
  const { addToast } = useToast();

  // ---- react-hook-form + zod ----
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof ReceiveFormSchema>, any, ReceiveFormValues>({
    resolver: zodResolver(ReceiveFormSchema),
    defaultValues: {
      source: '',
      referenceNumber: '',
      notes: '',
      discountType: 'fixed',
      discountValue: 0,
      taxType: 'fixed',
      taxValue: 0,
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
  const watchedDiscountType = useWatch({ control, name: 'discountType' });
  const watchedDiscountValue = useWatch({ control, name: 'discountValue' });
  const watchedTaxType = useWatch({ control, name: 'taxType' });
  const watchedTaxValue = useWatch({ control, name: 'taxValue' });

  // ---- Fetch reference data ----
  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200&active=true').then((r) => r.json()),
    ])
      .then(([prodData]) => {
        if (prodData.success) setProducts(prodData.data);
      })
      .catch(() => addToast('Gagal memuat data referensi', 'error'))
      .finally(() => setLoadingRef(false));
  }, [addToast]);

  // ---- Financial Calculations ----
  const totalAmount = useMemo(() => {
    if (!watchedItems) return 0;
    return watchedItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)), 0);
  }, [watchedItems]);

  const discountAmount = useMemo(() => {
    const val = Number(watchedDiscountValue) || 0;
    if (watchedDiscountType === 'percentage') {
      return Math.round(totalAmount * (val / 100));
    }
    return val;
  }, [watchedDiscountType, watchedDiscountValue, totalAmount]);

  const cappedDiscount = Math.min(discountAmount, totalAmount);
  const afterDiscount = totalAmount - cappedDiscount;

  const taxAmount = useMemo(() => {
    const val = Number(watchedTaxValue) || 0;
    if (watchedTaxType === 'percentage') {
      return Math.round(afterDiscount * (val / 100));
    }
    return val;
  }, [watchedTaxType, watchedTaxValue, afterDiscount]);

  const grandTotal = afterDiscount + taxAmount;

  // ---- MAC preview calculations (derived, not stored) ----
  const macPreviews = useMemo(() => {
    if (!watchedItems) return [];
    
    let remainingDiscount = cappedDiscount;
    let remainingTax = taxAmount;

    return watchedItems.map((item, index) => {
      const product = products.find((p) => p.id === item?.productId);
      if (!product) return { newAvgCost: 0, newStock: 0, currentStock: 0, subtotal: 0, netUnitCost: 0 };

      const oldStock = product.stock;
      const oldCost = product.buyPrice ?? 0; // already in sen
      const newQty = Number(item?.quantity) || 0;
      const newCostRupiah = Number(item?.unitCost) || 0;
      const subtotalRupiah = newQty * newCostRupiah;
      
      const isLast = index === watchedItems.length - 1;
      let itemDiscountRupiah = 0;
      let itemTaxRupiah = 0;

      if (totalAmount > 0) {
        const ratio = subtotalRupiah / totalAmount;
        if (isLast) {
          itemDiscountRupiah = remainingDiscount;
          itemTaxRupiah = remainingTax;
        } else {
          itemDiscountRupiah = Math.round(cappedDiscount * ratio);
          itemTaxRupiah = Math.round(taxAmount * ratio);
          remainingDiscount -= itemDiscountRupiah;
          remainingTax -= itemTaxRupiah;
        }
      }

      const netSubtotalRupiah = subtotalRupiah - itemDiscountRupiah + itemTaxRupiah;
      const netUnitCostRupiah = newQty > 0 ? Math.round(netSubtotalRupiah / newQty) : 0;
      const netUnitCostSen = netUnitCostRupiah * 100;

      let newAvgCost = netUnitCostSen;
      if (oldStock + newQty > 0) {
        newAvgCost = Math.round(
          (oldStock * oldCost + newQty * netUnitCostSen) / (oldStock + newQty)
        );
      }

      return {
        currentStock: oldStock,
        newStock: oldStock + newQty,
        newAvgCost,
        subtotal: subtotalRupiah,
        netUnitCost: netUnitCostRupiah
      };
    });
  }, [watchedItems, products, totalAmount, cappedDiscount, taxAmount]);

  // ---- Add item row ----
  function addItem() {
    append({ productId: '', quantity: 1, unitCost: 0, expiredDate: '' });
  }

  // ---- Submit ----
  async function onSubmit(values: ReceiveFormValues) {
    const payload = {
      source: values.source || null,
      referenceNumber: values.referenceNumber || null,
      notes: values.notes || null,
      discountType: values.discountType || null,
      discountValue: values.discountValue || 0,
      taxType: values.taxType || null,
      taxValue: values.taxValue || 0,
      autoReceive: true,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost, // Send as Rupiah, API converts to sen if needed (wait, no. API needs to convert to sen?? Let's check API. Ah, wait. The API assumes item.unitCost is what is sent. In the old code we did Math.round(item.unitCost * 100). Wait, yes.)
      })),
    };

    // Wait, the API I rewrote doesn't multiply unitCost by 100! 
    // Let me convert it here.
    const finalPayload = {
      ...payload,
      discountValue: payload.discountType === 'fixed' ? payload.discountValue * 100 : payload.discountValue,
      taxValue: payload.taxType === 'fixed' ? payload.taxValue * 100 : payload.taxValue,
      items: payload.items.map(i => ({
        ...i,
        unitCost: Math.round(i.unitCost * 100),
      }))
    };

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();

      if (!data.success) {
        addToast(data.error?.message || 'Gagal menyimpan penerimaan', 'error');
        return;
      }

      addToast(`Penerimaan ${data.data.poNumber} berhasil dicatat`, 'success');
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Header */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Informasi Barang Masuk</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label htmlFor="rcv-source" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Sumber / Tempat Beli (Opsional)
                </label>
                <input
                  {...register('source')}
                  id="rcv-source"
                  type="text"
                  className={inputCls(errors.source)}
                  placeholder="Grosir, Toko A, dll."
                />
              </div>

              <div>
                <label htmlFor="rcv-ref" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nomor Nota / Referensi (Opsional)
                </label>
                <input
                  {...register('referenceNumber')}
                  id="rcv-ref"
                  type="text"
                  className={inputCls(errors.referenceNumber)}
                  placeholder="INV-XXXXX"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="rcv-notes" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Catatan (Opsional)
                </label>
                <textarea
                  {...register('notes')}
                  id="rcv-notes"
                  rows={2}
                  className={inputCls(errors.notes)}
                  placeholder="Catatan tambahan..."
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
                className="px-3 py-1.5 text-xs font-medium text-baby-600 bg-baby-50 border border-baby-200 rounded-md hover:bg-baby-100 transition-colors"
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
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-32">Harga Satuan (Rp)</th>
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
                              <div className="flex flex-col items-end">
                                <span className="text-xs tabular-nums text-baby-600 font-medium" title="MAC (Moving Average Cost) baru">
                                  {(preview.newAvgCost / 100).toLocaleString('id-ID')}
                                </span>
                                {preview.netUnitCost !== Number(watchedItems[index]?.unitCost) && (
                                  <span className="text-[9px] text-slate-400" title="Net Unit Cost">
                                    H.B: {preview.netUnitCost.toLocaleString('id-ID')}
                                  </span>
                                )}
                              </div>
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
            {fields.length > 0 && (
              <p className="mt-4 text-[10px] text-slate-400">
                * MAC (Moving Average Cost) baru akan terpengaruh jika ada Diskon / Pajak Nota. Harga Beli Bersih (H.B) akan dihitung proporsional.
              </p>
            )}
          </section>
        </div>

        {/* Right Column: Summary & Finalization */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Ringkasan</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-800 tabular-nums">Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>

              {/* Discount Input */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-medium text-slate-600">Diskon Pembelian</label>
                <div className="flex gap-2">
                  <select 
                    {...register('discountType')} 
                    className={inputCls() + ' w-20 text-xs'}
                  >
                    <option value="fixed">Rp</option>
                    <option value="percentage">%</option>
                  </select>
                  <input
                    {...register('discountValue', { valueAsNumber: true })}
                    type="number"
                    className={inputCls(errors.discountValue) + ' flex-1 text-right tabular-nums text-xs'}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {discountAmount > 0 && (
                  <p className="text-right text-xs text-emerald-600 tabular-nums">
                    - Rp {cappedDiscount.toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              {/* Tax Input */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-medium text-slate-600">Pajak Pembelian</label>
                <div className="flex gap-2">
                  <select 
                    {...register('taxType')} 
                    className={inputCls() + ' w-20 text-xs'}
                  >
                    <option value="fixed">Rp</option>
                    <option value="percentage">%</option>
                  </select>
                  <input
                    {...register('taxValue', { valueAsNumber: true })}
                    type="number"
                    className={inputCls(errors.taxValue) + ' flex-1 text-right tabular-nums text-xs'}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {taxAmount > 0 && (
                  <p className="text-right text-xs text-red-500 tabular-nums">
                    + Rp {taxAmount.toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 mt-4">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-semibold text-slate-800">Grand Total</span>
                  <span className="text-lg font-bold text-baby-600 tabular-nums">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* === Actions === */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting || fields.length === 0}
              className="w-full px-5 py-2.5 text-sm font-medium text-white bg-baby-600 rounded-md hover:bg-baby-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Memproses...' : 'Selesai & Catat Barang Masuk'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/purchases')}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ============================================================
// Shared input class helper
// ============================================================

function inputCls(error?: object): string {
  const base = 'w-full px-2 py-1.5 text-sm border rounded bg-white outline-none transition-colors text-gray-900';
  return error
    ? `${base} border-red-300 focus:border-red-500`
    : `${base} border-gray-200 focus:border-baby-500`;
}
