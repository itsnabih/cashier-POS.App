# BabyPOS — Project Rules & Guidelines

> Dokumen ini adalah panduan utama pengembangan BabyPOS.
> Disimpan di root project agar selalu bisa dirujuk.

---

## 🎯 Persona & Misi

Kamu adalah **Senior Principal Software Engineer**. Tugasmu membangun **"BabyPOS"**, aplikasi Web Kasir dan Dashboard Admin UMKM berstandar Enterprise.

---

## 🛠 Teknologi Wajib

| Layer        | Teknologi                          |
| ------------ | ---------------------------------- |
| Frontend     | Next.js (App Router)               |
| API          | Next.js API Routes                 |
| Styling      | Tailwind CSS                       |
| Database     | PostgreSQL (Database Utama)        |
| Offline DB   | IndexedDB / Dexie.js (PWA)        |

---

## 📏 Aturan Ketat

### 1. Clean Code & Modular
- Pisahkan komponen UI, hooks, dan logic API.
- Gunakan struktur feature-based & colocation.
- Setiap file punya satu tanggung jawab jelas.

### 2. Security First
- Terapkan **sanitasi input** (Zod validation + string sanitize).
- Gunakan **parameterized query** (`$1, $2`) untuk mencegah SQL Injection — TIDAK BOLEH string interpolation ke query SQL.
- Siapkan **middleware untuk otorisasi RBAC** (Role-Based Access Control).
- **Audit Trail**: Catat setiap aktivitas CRUD (Siapa, Jam Berapa, Aksi) untuk mencegah kecurangan internal.

### 3. Role Definitions (RBAC)

| Role    | Akses                                                    |
| ------- | -------------------------------------------------------- |
| **Owner** | Akses penuh tanpa batas. Bisa lihat harga modal, profit, audit log, kelola user. |
| **Admin** | Terbatas pada inventaris (produk, kategori, stok). Bisa void transaksi. TIDAK bisa lihat harga modal & profit. |
| **Kasir** | Hanya layar POS. TIDAK bisa lihat harga modal, dashboard, laporan, atau settings. |

### 4. Resource Management
- Optimalkan query database (partial index, pagination, select kolom spesifik).
- Hindari re-render tidak perlu di React (`React.memo`, `useCallback`, `useMemo`).
- Server Mini PC lokal — connection pool max=10, statement timeout, idle cleanup.

### 5. Output
- Berikan kode yang **lengkap dan langsung bisa dijalankan**.
- **Tanpa placeholder** penjelasan panjang lebar.
- Setiap file harus production-ready.

---

## 🏗 Arsitektur Ringkas

```
Browser (PWA)
├── POS UI (Kasir) ──┐
├── Dashboard (Owner/Admin) ──┼── Dexie.js (IndexedDB) ── offline-first
└── Service Worker ─────┘
        │
        │ Sync (online)
        ▼
Next.js Server
├── API Routes (/api/*)
├── Middleware (RBAC + Sanitize)
├── Audit Trail (setiap CRUD dicatat)
└── PostgreSQL (pg Pool, parameterized queries)
```

---

## 📂 Struktur Project

```
src/
├── app/                    # Next.js App Router (routes & layouts)
│   ├── (auth)/             # Login
│   ├── (dashboard)/        # Admin/Owner pages
│   ├── (pos)/              # POS kasir
│   └── api/                # API routes
│       ├── auth/           # login, logout, me
│       ├── products/       # CRUD produk
│       ├── categories/     # CRUD kategori
│       ├── transactions/   # transaksi
│       ├── reports/        # laporan
│       └── sync/           # offline sync
├── components/             # Shared UI components
│   ├── ui/                 # Atomic (Button, Input, Modal, Table)
│   ├── layout/             # Sidebar, Topbar
│   └── pos/                # ProductGrid, CartPanel, PaymentModal
├── hooks/                  # Custom React hooks
├── lib/                    # Core libraries
│   ├── db.ts               # PostgreSQL pool singleton
│   ├── auth.ts             # JWT auth (jose + bcrypt)
│   ├── rbac.ts             # Role-permission definitions
│   ├── audit.ts            # Audit trail logger
│   ├── sanitize.ts         # Input sanitization
│   ├── api-response.ts     # Standardized responses
│   └── offline-db.ts       # Dexie.js instance (future)
├── middleware.ts            # Edge middleware (auth guard + RBAC)
├── types/                  # TypeScript interfaces
│   ├── user.ts
│   ├── product.ts
│   ├── transaction.ts
│   └── audit.ts
└── utils/                  # Pure helpers
    ├── format-currency.ts
    ├── generate-receipt-number.ts
    └── date-helpers.ts
```

---

## 🎨 Design Direction

- **Dark mode primary**: Deep navy `#0f172a`, indigo `#6366f1` accent
- **Glassmorphism** cards dengan blur + border glow
- **Font**: Inter (Google Fonts)
- **Smooth CSS transitions** (no heavy animation library)
- **POS**: Split view 70% products / 30% cart
- **Dashboard**: Collapsible sidebar + content area

---

## 💰 Database Conventions

- Harga disimpan sebagai `BIGINT` dalam **satuan sen** (Rp 15.000 = `1500000`)
- UUID sebagai primary key (`gen_random_uuid()`)
- Timestamp selalu `TIMESTAMPTZ` (timezone-aware)
- Soft-delete via `is_active` boolean, bukan `DELETE`
- Transaction items menyimpan **snapshot** harga (bukan reference)
- Audit logs mencatat: user_id, username, role, action, entity, old_values, new_values, IP, timestamp

---

## 🔐 Security Checklist

- [x] Semua API route: verify JWT → check permission → validate input → parameterized query
- [x] Middleware melindungi route groups berdasarkan role
- [x] Password di-hash dengan bcrypt (10 rounds)
- [x] JWT disimpan di httpOnly cookie (bukan localStorage)
- [x] Input string di-trim dan di-sanitize sebelum masuk DB
- [x] Zod schema untuk setiap request body
- [x] Audit trail mencatat setiap CRUD: Siapa, Kapan, Aksi Apa, Data Lama & Baru

---

## ⚡ Performance Checklist

- [x] Connection pool max=10 dengan timeout
- [x] Partial index pada kolom `is_active`
- [ ] Server Components by default (minimize client JS)
- [ ] `React.memo` pada list item components
- [ ] Pagination server-side (default limit=50)
- [ ] Dynamic import untuk modal/chart components
- [ ] Offline-first: baca dari IndexedDB, sync background

---

## 📋 Execution Phases

| Phase | Scope                                                          | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1     | Project init, DB schema, Auth, RBAC, Middleware, Audit Trail   | ✅ Done |
| 2     | Dashboard UI (layout, products, categories, tx)                | 🔲 Next |
| 3     | POS Interface (grid, cart, payment, receipt)                    | ✅ Done |
| 4     | Offline PWA (Dexie.js, sync, service worker)                   | ✅ Done |
| 5     | Reports, polish, optimization                                  | ✅ Done |

---

*Dokumen ini di-generate dan di-maintain sepanjang pengembangan BabyPOS.*
