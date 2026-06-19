'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/lib/rbac';

// ============================================================
// Zod Schema — single source of truth for validation
// ============================================================

const ItemFormSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(200),
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  sku: z.string().max(50).optional().or(z.literal('')),
  barcode: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  buyPrice: z.number().min(0, 'Harga beli tidak valid'),
  sellPrice: z.number().min(0, 'Harga jual tidak valid'),
  stock: z.number().int().min(0, 'Stok tidak valid'),
  minStock: z.number().int().min(0),
  unit: z.string().min(1),
  expiredDate: z.string().optional().or(z.literal('')),
});

type ItemFormValues = z.infer<typeof ItemFormSchema>;

// ============================================================
// Constants
// ============================================================

const UNITS = ['pcs', 'box', 'pack', 'karton', 'lusin', 'botol', 'tube', 'sachet', 'kg', 'gram'];

function generateSKU(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SKU-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================
// Component
// ============================================================

interface Category { id: string; name: string; }

interface ItemFormProps {
  productId?: string;
  initialData?: ItemFormValues;
}

export default function ItemForm({ productId, initialData }: ItemFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const router = useRouter();
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const isEditing = !!productId;
  const canSeeBuyPrice = hasPermission(PERMISSIONS.PRODUCT_VIEW_BUY_PRICE);

  // ---- react-hook-form + zod ----
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues, unknown, ItemFormValues>({
    resolver: zodResolver(ItemFormSchema),
    defaultValues: initialData || {
      name: '',
      categoryId: '',
      sku: '',
      barcode: '',
      description: '',
      buyPrice: 0,
      sellPrice: 0,
      stock: 0,
      minStock: 5,
      unit: 'pcs',
      expiredDate: '',
    },
  });

  const buyPrice = watch('buyPrice');
  const sellPrice = watch('sellPrice');

  // ---- Fetch categories ----
  useEffect(() => {
    fetch('/api/categories?all=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
      })
      .catch(() => addToast('Gagal memuat kategori', 'error'))
      .finally(() => setLoadingCategories(false));
  }, [addToast]);

  // ---- Load product data if editing ----
  useEffect(() => {
    if (!productId || initialData) return;
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const p = data.data;
          reset({
            name: p.name || '',
            categoryId: p.categoryId || '',
            sku: p.sku || '',
            barcode: p.barcode || '',
            description: p.description || '',
            buyPrice: p.buyPrice ? p.buyPrice / 100 : 0,
            sellPrice: p.sellPrice / 100,
            stock: p.stock,
            minStock: p.minStock,
            unit: p.unit || 'pcs',
            expiredDate: p.expiredDate || '',
          });
        }
      })
      .catch(() => addToast('Gagal memuat data produk', 'error'));
  }, [productId, initialData, addToast, reset]);

  // ---- Auto-generate SKU ----
  const handleAutoSKU = useCallback(() => {
    setValue('sku', generateSKU(), { shouldValidate: true });
  }, [setValue]);

  // ---- Submit ----
  async function onSubmit(values: ItemFormValues) {
    const payload = {
      ...values,
      buyPrice: Math.round(values.buyPrice * 100),
      sellPrice: Math.round(values.sellPrice * 100),
      sku: values.sku || null,
      barcode: values.barcode || null,
      description: values.description || null,
      expiredDate: values.expiredDate || null,
    };

    try {
      const url = isEditing ? `/api/products/${productId}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        addToast(data.error?.message || 'Gagal menyimpan produk', 'error');
        return;
      }

      addToast(isEditing ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan', 'success');
      router.push('/products');
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    }
  }

  // ---- Margin calculation ----
  const margin = buyPrice > 0 && sellPrice > 0 ? sellPrice - buyPrice : 0;
  const marginPct = buyPrice > 0 ? ((margin / buyPrice) * 100).toFixed(1) : '0';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      {/* === Informasi Produk === */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Informasi Produk</h2>
        <div className="grid grid-cols-1 gap-4">

          {/* Nama */}
          <Field label="Nama Produk" htmlFor="item-name" error={errors.name?.message} required>
            <input
              {...register('name')}
              id="item-name"
              type="text"
              className={inputCls(errors.name)}
              placeholder="Nama lengkap produk"
              autoFocus
            />
          </Field>

          {/* Kategori */}
          <Field label="Kategori" htmlFor="item-category" error={errors.categoryId?.message} required>
            <select
              {...register('categoryId')}
              id="item-category"
              className={inputCls(errors.categoryId)}
              disabled={loadingCategories}
            >
              <option value="">Pilih Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </Field>

          {/* SKU + Barcode */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" htmlFor="item-sku" error={errors.sku?.message}>
              <div className="flex gap-2">
                <input
                  {...register('sku')}
                  id="item-sku"
                  type="text"
                  className={inputCls(errors.sku) + ' flex-1'}
                  placeholder="SKU-XXXXXXXX"
                  onInput={(e) => {
                    (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAutoSKU}
                  className="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap"
                >
                  Auto
                </button>
              </div>
            </Field>

            <Field label="Barcode" htmlFor="item-barcode" error={errors.barcode?.message}>
              <input
                {...register('barcode')}
                id="item-barcode"
                type="text"
                className={inputCls(errors.barcode)}
                placeholder="Scan atau input manual"
              />
            </Field>
          </div>

          {/* Deskripsi */}
          <Field label="Deskripsi" htmlFor="item-desc" error={errors.description?.message}>
            <textarea
              {...register('description')}
              id="item-desc"
              className={inputCls(errors.description) + ' resize-none'}
              rows={2}
              placeholder="Opsional"
            />
          </Field>
        </div>
      </section>

      {/* === Harga & Stok === */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Harga &amp; Stok</h2>
        <div className="grid grid-cols-2 gap-4">

          {canSeeBuyPrice && (
            <Field label="Harga Beli (Rp)" htmlFor="item-buy" error={errors.buyPrice?.message}>
              <input
                {...register('buyPrice', { valueAsNumber: true })}
                id="item-buy"
                type="number"
                className={inputCls(errors.buyPrice)}
                placeholder="0"
                min={0}
              />
            </Field>
          )}

          <Field label="Harga Jual (Rp)" htmlFor="item-sell" error={errors.sellPrice?.message} required>
            <input
              {...register('sellPrice', { valueAsNumber: true })}
              id="item-sell"
              type="number"
              className={inputCls(errors.sellPrice)}
              placeholder="0"
              min={0}
            />
          </Field>

          {!isEditing && (
            <Field label="Stok Awal" htmlFor="item-stock" error={errors.stock?.message}>
              <input
                {...register('stock', { valueAsNumber: true })}
                id="item-stock"
                type="number"
                className={inputCls(errors.stock)}
                min={0}
              />
            </Field>
          )}

          <Field label="Stok Minimum" htmlFor="item-minstock" error={errors.minStock?.message}>
            <input
              {...register('minStock', { valueAsNumber: true })}
              id="item-minstock"
              type="number"
              className={inputCls(errors.minStock)}
              min={0}
            />
          </Field>

          <Field label="Satuan" htmlFor="item-unit" error={errors.unit?.message}>
            <select {...register('unit')} id="item-unit" className={inputCls(errors.unit)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>

          <Field label="Tanggal Kedaluwarsa" htmlFor="item-expired" error={errors.expiredDate?.message}>
            <input
              {...register('expiredDate')}
              id="item-expired"
              type="date"
              className={inputCls(errors.expiredDate)}
            />
          </Field>
        </div>

        {/* Margin indicator */}
        {canSeeBuyPrice && buyPrice > 0 && sellPrice > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500">Margin:</span>
              <span className={`font-semibold ${margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Rp {margin.toLocaleString('id-ID')} ({marginPct}%)
              </span>
            </div>
          </div>
        )}
      </section>

      {/* === Actions === */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/products')}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Menyimpan...' : isEditing ? 'Perbarui Produk' : 'Simpan Produk'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Shared sub-components
// ============================================================

function Field({
  label, htmlFor, error, required, children,
}: {
  label: string; htmlFor: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputCls(error?: object): string {
  const base = 'w-full px-3 py-2 text-sm border rounded-md bg-slate-50 focus:bg-white outline-none transition-colors text-slate-900';
  return error
    ? `${base} border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500`
    : `${base} border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500`;
}
