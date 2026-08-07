# BabyPOS

A lightweight, web-based Point of Sale (POS) and inventory management system designed for retail operations, built with Next.js (App Router), PostgreSQL, and Tailwind CSS.

## Key Features

- **Keyboard-Driven POS Interface**: Fast cashier checkout workflow supporting barcode scanners, keyboard shortcuts, and multi-tab cart holding (park up to 5 transactions).
- **Role-Based Access Control**: Pre-configured roles (`owner`, `admin`, `kasir`) with distinct page and API route permissions.
- **Inventory & Category Management**: Stock tracking, low-stock warnings, purchase price vs. selling price calculation, and category organization.
- **Receipt Printing**: Custom thermal receipt generator (80mm POS receipt layout) with browser print integration.
- **Analytics & Transaction History**: Revenue summaries, transaction filtering, receipt reprint, and void transaction handling with audit tracking.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16 (App Router, React 19) |
| **Database** | PostgreSQL (`pg`) |
| **Styling** | Tailwind CSS v4 |
| **Auth** | Custom JWT (`jose`) with HTTP-only cookies |
| **Validation** | Zod + React Hook Form |
| **Reporting / Export** | ExcelJS, Recharts, pdfmake |

---

## Getting Started

### Prerequisites

- Node.js 20+ installed
- PostgreSQL 14+ database instance running locally or on a server

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itsnabih/cashier-POS.App.git
   cd cashier-POS.App
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your database credentials and secret key:
   ```ini
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/babypos
   JWT_SECRET=your-random-secret-key-at-least-64-characters-long
   NEXT_PUBLIC_APP_NAME=BabyPOS
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run Database Migrations & Seed Data**:
   ```bash
   npm run db:setup
   ```
   *(This runs migration SQL files and seeds initial admin/cashier accounts and product categories).*

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Default Accounts

After running `npm run db:setup`, use these credentials to log in:

| Username | Default Password | Role | Access Level |
| --- | --- | --- | --- |
| `owner` | `123456` | `owner` | Full access (Reports, Settings, Void Transaction) |
| `admin` | `123456` | `admin` | Inventory, Categories, Transaction logs |
| `kasir` | `123456` | `kasir` | POS Checkout screen only |

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Next.js dev server |
| `npm run build` | Builds application for production |
| `npm run start` | Runs production build server |
| `npm run db:migrate` | Executes SQL migrations in `migrations/` |
| `npm run db:seed` | Seeds database with initial accounts & categories |
| `npm run db:setup` | Runs migration and seed scripts in sequence |

---

## Project Structure

```text
.
├── migrations/          # SQL database migration scripts
├── scripts/             # TypeScript runner scripts (migrate.ts, seed.ts)
├── src/
│   ├── app/             # Next.js App Router (pages & API endpoints)
│   │   ├── (dashboard)/ # Authenticated dashboard routes (pos, transactions, stock, etc.)
│   │   ├── api/         # Backend API routes (auth, pos, products, settings)
│   │   └── login/       # Login page
│   ├── components/      # Reusable UI & POS components (ReceiptContent, POS layout)
│   ├── hooks/          # Custom React hooks (useAuth, useKeyboardShortcut, etc.)
│   ├── lib/             # Database connection pool and JWT auth helpers
│   └── types/           # Shared TypeScript interfaces
└── public/              # Static assets
```

---

## License

Private / Proprietary.
