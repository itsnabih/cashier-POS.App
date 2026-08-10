'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BatchLabelModal } from './BatchLabelModal';

// ============================================================
// Zod Schema — validates entire form including dynamic items
// ============================================================

const ReceiveItemSchema = z.object({
  productId: z.string().min(1, 'Pilih produk'),
  quantity: z.number().int().positive('Qty harus > 0'),
  unitCost: z.number().min(0, 'Harga beli tidak boleh negatif'),
  batchNumber: z.string().optional().or(z.literal('')),
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
  barcode: string | null;
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  // ---- react-hook-form + zod ----
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
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

  // ---- Handle Barcode Scan / Lookup ----
  const handleScanProduct = async (codeStr: string) => {
    const code = codeStr.trim();
    if (!code) return;

    // 1. Search locally in loaded products
    let prod = products.find(p => (p.barcode && p.barcode === code) || (p.sku && p.sku === code));

    // 2. If not found locally, fetch API
    if (!prod) {
      try {
        const res = await fetch(`/api/products/by-barcode/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (json.success && json.data) {
          prod = json.data;
          setProducts(prev => [...prev, json.data]);
        }
      } catch {
        // error handled below
      }
    }

    if (!prod) {
      addToast(`Produk dengan barcode "${code}" tidak ditemukan`, 'error');
      setBarcodeInput('');
      return;
    }

    // 3. Add to items array or increment Qty
    const currentItems = getValues('items') || [];
    const existingIndex = currentItems.findIndex(i => i.productId === prod!.id);

    if (existingIndex >= 0) {
      const currentQty = Number(currentItems[existingIndex].quantity) || 1;
      setValue(`items.${existingIndex}.quantity`, currentQty + 1);
      addToast(`Qty ${prod.name} bertambah (+1)`, 'success');
    } else {
      append({
        productId: prod.id,
        quantity: 1,
        unitCost: prod.buyPrice ? prod.buyPrice / 100 : 0,
        batchNumber: '',
        expiredDate: '',
      });
      addToast(`${prod.name} ditambahkan`, 'success');
    }

    setBarcodeInput('');
  };

  // Enable HID barcode scanner listener
  useBarcodeScanner({
    onScan: (code) => {
      handleScanProduct(code);
    },
    enabled: !loadingRef,
  });

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
    append({ productId: '', quantity: 1, unitCost: 0, batchNumber: '', expiredDate: '' });
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
        unitCost: item.unitCost,
        batchNumber: item.batchNumber || undefined,
        expiredDate: item.expiredDate || undefined,
      })),
    };

    const finalPayload = {
      ...payload,
      discountValue: payload.discountType === 'fixed' ? payload.discountValue * 100 : payload.discountValue,
      taxValue: payload.taxType === 'fixed' ? payload.taxValue * 100 : payload.taxValue,
      items: payload.items.map(i => ({
        ...i,
        unitCost: Math.round(i.unitCost * 100),
        batchNumber: i.batchNumber,
        expiredDate: i.expiredDate,
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

          {/* === Barcode Scanner & Items Table === */}
          <section className="card p-5">
            {/* Barcode Quick Input Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0c-.693.047-1.328.437-1.737 1.04l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Barcode Scanner</span>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Scanner Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Scan barcode / SKU produk untuk memasukkan barang langsung ke daftar</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScanProduct(barcodeInput);
                    }
                  }}
                  placeholder="Scan / Ketik Barcode/SKU + Enter..."
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-baby-500/20 focus:border-baby-500 w-full sm:w-64"
                />
                <button
                  type="button"
                  onClick={() => handleScanProduct(barcodeInput)}
                  className="px-3 py-1.5 text-xs font-bold bg-baby-600 text-white rounded-lg hover:bg-baby-700 transition-colors shrink-0"
                >
                  Cari
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">Daftar Barang ({fields.length} Item)</h2>
              <div className="flex gap-2">
                {fields.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsLabelModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    Cetak Label Barcode
                  </button>
                )}
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 text-xs font-medium text-baby-600 bg-baby-50 border border-baby-200 rounded-md hover:bg-baby-100 transition-colors"
                >
                  + Tambah Item
                </button>
              </div>
            </div>

            {errors.items?.root && (
              <p className="mb-3 text-xs text-red-500">{errors.items.root.message}</p>
            )}
            {errors.items?.message && (
              <p className="mb-3 text-xs text-red-500">{errors.items.message}</p>
            )}

            {fields.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                Belum ada item. Scan barcode atau klik &quot;Tambah Item&quot; untuk memulai.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 w-[200px]">Produk</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 w-28">No. Batch / Lot</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-16">Stok</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-20">Qty</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-28">Harga Satuan (Rp)</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-24">Subtotal</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-slate-500 w-32">Kedaluwarsa</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 w-24">MAC Baru</th>
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
                              className={inputCls(itemErrors?.productId) + ' text-xs'}
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

                          {/* Batch Number */}
                          <td className="py-2 px-2">
                            <input
                              {...register(`items.${index}.batchNumber`)}
                              type="text"
                              placeholder="Otomatis / Supplier Lot"
                              className={inputCls() + ' text-xs font-mono uppercase'}
                            />
                          </td>

                          {/* Current stock (derived) */}
                          <td className="py-2 px-2 text-right text-slate-500 tabular-nums text-xs">
                            {preview?.currentStock ?? '-'}
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-2">
                            <input
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                              type="number"
                              className={inputCls(itemErrors?.quantity) + ' text-right tabular-nums text-xs font-semibold'}
                              min={1}
                            />
                          </td>

                          {/* Unit cost */}
                          <td className="py-2 px-2">
                            <input
                              {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                              type="number"
                              className={inputCls(itemErrors?.unitCost) + ' text-right tabular-nums text-xs'}
                              min={0}
                            />
                          </td>

                          {/* Subtotal (derived) */}
                          <td className="py-2 px-2 text-right text-slate-700 tabular-nums font-medium text-xs">
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

      {/* Batch Barcode Label Modal */}
      <BatchLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        items={(watchedItems || []).map((item, idx) => {
          const prod = products.find(p => p.id === item.productId);
          return {
            productName: prod?.name || 'Produk',
            productSku: prod?.sku,
            barcode: prod?.barcode,
            batchNumber: item.batchNumber || `BATCH-${idx + 1}`,
            expiredDate: item.expiredDate,
            sellPrice: prod?.sellPrice,
            quantity: item.quantity || 1,
          };
        })}
      />
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
