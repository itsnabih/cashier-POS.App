'use client';

import { use } from 'react';
import ItemForm from '@/components/inventory/ItemForm';

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Edit Produk</h2>
        <p className="text-xs text-slate-500 mt-0.5">Perbarui informasi produk</p>
      </div>
      <ItemForm productId={id} />
    </div>
  );
}
