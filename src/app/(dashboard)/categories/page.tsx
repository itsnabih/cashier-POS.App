export default function CategoriesPage() {
  return (
    <div className="p-8 max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Catatan Pengembangan: Kategori Produk</h1>
      <p className="text-slate-500 mb-8 border-b border-slate-100 pb-6">Halaman ini dikosongkan sementara sebagai catatan panduan untuk dikembangkan lebih lanjut.</p>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">1. Komponen Layar (UI Elements)</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Tombol <strong>"Tambah Kategori Baru"</strong> (membuka modal form input).</li>
            <li>Kolom Pencarian (Search Bar).</li>
            <li>Tabel Data Kategori.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">2. Kolom (Field) Tabel Data</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Nama Kategori</strong> (Contoh: Susu Formula, Popok, Pakaian).</li>
            <li><strong>Deskripsi Singkat</strong> (Opsional).</li>
            <li><strong>Jumlah Produk</strong> (Angka indikator berapa banyak produk di kategori ini).</li>
            <li><strong>Aksi</strong> (Tombol Edit dan Hapus).</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">3. Perilaku Khusus & Validasi</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Validasi Nama:</strong> Mencegah pembuatan nama kategori yang ganda/duplikat.</li>
            <li><strong>Pencegahan Hapus:</strong> Jika kategori akan dihapus, sistem harus menolak apabila masih ada produk aktif yang terkait dengan kategori tersebut.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
