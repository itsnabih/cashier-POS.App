import ItemForm from '@/components/inventory/ItemForm';

export default function NewProductPage() {
  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Tambah Produk</h2>
        <p className="text-xs text-slate-500 mt-0.5">Isi data produk baru untuk inventaris</p>
      </div>
      <ItemForm />
    </div>
  );
}
