export default function SuppliersPage() {
  return (
    <div className="p-8 max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Catatan Pengembangan: Manajemen Supplier</h1>
      <p className="text-slate-500 mb-8 border-b border-slate-100 pb-6">Halaman ini dikosongkan sementara sebagai catatan panduan untuk dikembangkan lebih lanjut.</p>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">1. Komponen Layar (UI Elements)</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Tombol <strong>"Tambah Supplier Baru"</strong> (membuka modal form input).</li>
            <li>Kolom Pencarian (Search Bar untuk mencari nama pemasok atau orang kontak).</li>
            <li>Tabel Data Supplier.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">2. Kolom (Field) Tabel Data</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Nama Perusahaan / Toko</strong> (Contoh: Grosir Tanah Abang).</li>
            <li><strong>Nama Kontak (Contact Person)</strong>.</li>
            <li><strong>Nomor Telepon / WhatsApp</strong> (Ditampilkan sebagai link/tautan yang bisa diklik).</li>
            <li><strong>Alamat Lengkap</strong> (Digunakan untuk keperluan logistik / retur).</li>
            <li><strong>Catatan Tambahan</strong>.</li>
            <li><strong>Aksi</strong> (Tombol Edit dan Hapus).</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">3. Perilaku Khusus & Fungsionalitas</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Integrasi Input Pembelian:</strong> Data supplier yang didaftarkan di sini akan disedot (di-<em>fetch</em>) ke dalam <em>Dropdown</em> saat admin menginput faktur Barang Masuk.</li>
            <li><strong>Tombol Riwayat (Opsional Lanjutan):</strong> Kemampuan untuk mengeklik tombol yang akan membuka daftar riwayat seluruh transaksi / belanja dari supplier tersebut.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
