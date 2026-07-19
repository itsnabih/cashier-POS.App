import Link from 'next/link';

export default function CategoriesPage() {
  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Produk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola produk dan kategori toko
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-slate-200">
        <Link
          href="/products"
          className="flex items-center gap-1.5 px-4 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-b-transparent text-slate-400 hover:text-slate-600"
        >
          Daftar Produk
        </Link>
        <span
          className="flex items-center gap-1.5 px-4 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-b-baby-500 text-gray-800 cursor-default"
        >
          Kategori
        </span>
      </div>

      {/* Dev notes */}
      <div className="card p-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-baby-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-baby-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Catatan Pengembangan: Kategori Produk</h3>
            <p className="text-xs text-slate-500">Panduan untuk dikembangkan lebih lanjut</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3">1. Komponen Layar (UI Elements)</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>Tombol <strong>&quot;Tambah Kategori Baru&quot;</strong> (membuka modal form input).</li>
              <li>Kolom Pencarian (Search Bar).</li>
              <li>Tabel Data Kategori.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3">2. Kolom (Field) Tabel Data</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li><strong>Nama Kategori</strong> (Contoh: Susu Formula, Popok, Pakaian).</li>
              <li><strong>Deskripsi Singkat</strong> (Opsional).</li>
              <li><strong>Jumlah Produk</strong> (Angka indikator berapa banyak produk di kategori ini).</li>
              <li><strong>Aksi</strong> (Tombol Edit dan Hapus).</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3">3. Perilaku Khusus &amp; Validasi</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li><strong>Validasi Nama:</strong> Mencegah pembuatan nama kategori yang ganda/duplikat.</li>
              <li><strong>Pencegahan Hapus:</strong> Jika kategori akan dihapus, sistem harus menolak apabila masih ada produk aktif yang terkait dengan kategori tersebut.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
