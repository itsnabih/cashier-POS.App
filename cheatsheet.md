# BabyPOS - Cheatsheet & Panduan

Dokumen ini berisi panduan singkat, kredensial login default, dan informasi penting mengenai aplikasi BabyPOS.

## Menjalankan Aplikasi (Development)

- **Start Development Server:** `npm run dev` (Akses di http://localhost:3000)
- **Reset/Seed Database:** `npx tsx scripts/seed.ts` (Akan menghapus data lama dan membuat data dummy awal)

## Kredensial Login Default

Gunakan kredensial ini untuk masuk ke aplikasi setelah database di-seed:

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner` | `owner123` | Akses penuh ke semua fitur, termasuk melihat harga modal (HPP) dan laporan laba rugi. |
| **Admin** | `admin` | `admin123` | Akses manajemen inventaris (produk, kategori, supplier, pembelian, opname). **Tidak bisa** melihat harga modal. |
| **Kasir** | `kasir` | `kasir123` | Akses terbatas hanya ke layar POS (Point of Sale) dan melihat transaksi sendiri. |

> [!WARNING]
> Sangat disarankan untuk segera mengganti password default setelah login pertama kali di environment produksi.

## Role-Based Access Control (RBAC)

Sistem menggunakan middleware Next.js Edge untuk mengamankan route berdasarkan role pengguna:

- `owner` diarahkan ke `/dashboard` secara default.
- `admin` diarahkan ke `/dashboard` secara default.
- `kasir` diarahkan ke `/pos` secara default.
- Jika pengguna mencoba mengakses URL yang tidak diizinkan, mereka akan otomatis dialihkan ke halaman default role mereka atau mendapatkan pesan error.

## Fitur Utama & Logika Bisnis (Fase 1 & 2)

### 1. Manajemen Inventaris (Master Data)
- **Produk:** Mendukung auto-generate SKU, input barcode scanner, penetapan stok minimum, dan tanggal kedaluwarsa.
- **Kategori & Supplier:** Manajemen data referensi untuk produk dan pembelian.
- **Peringatan Kedaluwarsa:** Widget di Dashboard menampilkan alert berjenjang: Kritis (30 hari), Peringatan (60 hari), dan Info (90 hari).

### 2. Penerimaan Barang & Moving Average Cost (MAC)
- Fitur ini digunakan saat menerima barang dari supplier (Purchase Order).
- **Logika HPP (Harga Pokok Penjualan):** BabyPOS menggunakan metode MAC, bukan FIFO.
- Saat barang diterima, sistem otomatis menghitung ulang harga modal rata-rata: 
  `MAC Baru = ((Stok Lama x Harga Beli Lama) + (Stok Baru x Harga Beli Baru)) / (Stok Lama + Stok Baru)`
- Hanya `owner` yang dapat melihat harga modal ini.

### 3. Stok Opname & Penyusutan (Shrinkage)
- Fitur untuk mencocokkan stok fisik di toko dengan stok di sistem.
- Jika terdapat selisih kurang (barang hilang/rusak), sistem akan mencatatnya sebagai **Inventory Shrinkage (Penyusutan)**.
- Nilai penyusutan ini nantinya akan otomatis memotong Laporan Laba/Rugi.
- Wajib menyertakan "Catatan/Alasan" untuk setiap selisih.

## Teknologi yang Digunakan
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS & komponen shadcn/ui (Enterprise aesthetic)
- **Database Utama:** PostgreSQL (diakses via `pg` driver, tanpa ORM untuk performa maksimal)
- **Database Offline (PWA):** Dexie.js / IndexedDB (Untuk mode kasir offline - Fase mendatang)
- **State & Validasi Form:** `react-hook-form` + `zod`
- **Autentikasi:** JWT via `jose` disimpan di HTTP-only Cookies
